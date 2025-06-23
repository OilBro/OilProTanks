import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { 
  insertInspectionReportSchema, 
  insertThicknessMeasurementSchema,
  insertInspectionChecklistSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      cb(null, allowedTypes.includes(file.mimetype));
    }
  });

  // Excel Import endpoint
  app.post("/api/reports/import", upload.single('excelFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Basic Excel parsing - look for common inspection report fields
      const importedData: any = {};
      
      // Try to extract report data from common Excel patterns
      for (const row of data) {
        const rowObj = row as any;
        
        // Look for tank information
        if (rowObj['Tank ID'] || rowObj['Tank Id'] || rowObj['TankID']) {
          importedData.tankId = rowObj['Tank ID'] || rowObj['Tank Id'] || rowObj['TankID'];
        }
        if (rowObj['Report Number'] || rowObj['Report No'] || rowObj['ReportNumber']) {
          importedData.reportNumber = rowObj['Report Number'] || rowObj['Report No'] || rowObj['ReportNumber'];
        }
        if (rowObj['Service'] || rowObj['Product']) {
          importedData.service = String(rowObj['Service'] || rowObj['Product']).toLowerCase();
        }
        if (rowObj['Inspector'] || rowObj['Inspector Name']) {
          importedData.inspector = rowObj['Inspector'] || rowObj['Inspector Name'];
        }
        if (rowObj['Date'] || rowObj['Inspection Date']) {
          const dateValue = rowObj['Date'] || rowObj['Inspection Date'];
          if (dateValue) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              importedData.inspectionDate = date.toISOString().split('T')[0];
            }
          }
        }
        if (rowObj['Diameter'] || rowObj['Tank Diameter']) {
          importedData.diameter = String(rowObj['Diameter'] || rowObj['Tank Diameter']);
        }
        if (rowObj['Height'] || rowObj['Tank Height']) {
          importedData.height = String(rowObj['Height'] || rowObj['Tank Height']);
        }
        if (rowObj['Original Thickness'] || rowObj['Nominal Thickness']) {
          importedData.originalThickness = String(rowObj['Original Thickness'] || rowObj['Nominal Thickness']);
        }
      }

      // Generate a unique report number if not found
      if (!importedData.reportNumber) {
        importedData.reportNumber = `IMP-${Date.now()}`;
      }
      
      // Set default values
      importedData.status = 'draft';
      importedData.yearsSinceLastInspection = importedData.yearsSinceLastInspection || 10;

      res.json({
        message: "Excel file processed successfully",
        extractedData: importedData,
        totalRows: data.length,
        preview: data.slice(0, 5) // First 5 rows for preview
      });

    } catch (error) {
      console.error('Excel import error:', error);
      res.status(500).json({ 
        message: "Failed to process Excel file", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Report Statistics - must come before the parameterized route
  app.get("/api/reports/stats", async (req, res) => {
    try {
      const reports = await storage.getInspectionReports();
      const stats = {
        totalReports: reports.length,
        inProgress: reports.filter(r => r.status === 'in_progress').length,
        completed: reports.filter(r => r.status === 'completed').length,
        requiresAction: reports.filter(r => r.status === 'action_required').length
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Inspection Reports
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getInspectionReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getInspectionReport(id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertInspectionReportSchema.parse(req.body);
      const report = await storage.createInspectionReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid report data", error });
    }
  });

  app.put("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInspectionReportSchema.partial().parse(req.body);
      const report = await storage.updateInspectionReport(id, validatedData);
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: "Failed to update report", error });
    }
  });

  app.delete("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInspectionReport(id);
      if (!success) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  // Thickness Measurements
  app.get("/api/reports/:reportId/measurements", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const measurements = await storage.getThicknessMeasurements(reportId);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

  app.post("/api/reports/:reportId/measurements", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const validatedData = insertThicknessMeasurementSchema.parse({
        ...req.body,
        reportId
      });
      const measurement = await storage.createThicknessMeasurement(validatedData);
      res.status(201).json(measurement);
    } catch (error) {
      res.status(400).json({ message: "Invalid measurement data", error });
    }
  });

  app.put("/api/measurements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertThicknessMeasurementSchema.partial().parse(req.body);
      const measurement = await storage.updateThicknessMeasurement(id, validatedData);
      res.json(measurement);
    } catch (error) {
      res.status(400).json({ message: "Failed to update measurement", error });
    }
  });

  app.delete("/api/measurements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteThicknessMeasurement(id);
      if (!success) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      res.json({ message: "Measurement deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete measurement" });
    }
  });

  // Inspection Checklists
  app.get("/api/reports/:reportId/checklists", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const checklists = await storage.getInspectionChecklists(reportId);
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

  app.post("/api/reports/:reportId/checklists", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const validatedData = insertInspectionChecklistSchema.parse({
        ...req.body,
        reportId
      });
      const checklist = await storage.createInspectionChecklist(validatedData);
      res.status(201).json(checklist);
    } catch (error) {
      res.status(400).json({ message: "Invalid checklist data", error });
    }
  });

  app.put("/api/checklists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInspectionChecklistSchema.partial().parse(req.body);
      const checklist = await storage.updateInspectionChecklist(id, validatedData);
      res.json(checklist);
    } catch (error) {
      res.status(400).json({ message: "Failed to update checklist", error });
    }
  });

  // Report Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getReportTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
