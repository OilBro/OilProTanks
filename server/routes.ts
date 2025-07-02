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
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
      ];
      const isAllowed = allowedTypes.includes(file.mimetype) || 
                       file.originalname.toLowerCase().endsWith('.xlsx') ||
                       file.originalname.toLowerCase().endsWith('.xls') ||
                       file.originalname.toLowerCase().endsWith('.xlsm');
      cb(null, isAllowed);
    }
  });

  // Excel Import endpoint
  app.post("/api/reports/import", upload.single('excelFile'), async (req, res) => {
    try {
      console.log('Upload request received');
      console.log('File:', req.file);
      console.log('Body:', req.body);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log('File buffer size:', req.file.buffer.length);
      console.log('File mimetype:', req.file.mimetype);
      console.log('File original name:', req.file.originalname);

      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      } catch (xlsxError) {
        console.error('Error reading Excel file:', xlsxError);
        return res.status(400).json({ 
          message: "Unable to read Excel file. Please ensure it's a valid Excel file (.xlsx or .xls).",
          error: xlsxError instanceof Error ? xlsxError.message : String(xlsxError)
        });
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ message: "No sheets found in Excel file" });
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      console.log('Sheet name:', sheetName);
      console.log('Number of rows:', data.length);
      
      // Log first few rows to see structure
      if (data.length > 0) {
        console.log('Sample data (first row):', data[0]);
        console.log('Column headers:', Object.keys(data[0] as any));
      }

      // Enhanced Excel parsing for API 653 inspection reports
      const importedData: any = {};
      const thicknessMeasurements: any[] = [];
      const checklistItems: any[] = [];
      
      // Define common field patterns for API 653 reports
      const fieldPatterns = {
        tankId: ['Tank ID', 'Tank Id', 'TankID', 'Tank Number', 'Tank No', 'Vessel ID'],
        reportNumber: ['Report Number', 'Report No', 'ReportNumber', 'Inspection Report No', 'IR No'],
        service: ['Service', 'Product', 'Contents', 'Stored Product', 'Tank Service'],
        inspector: ['Inspector', 'Inspector Name', 'Inspected By', 'API Inspector', 'Certified Inspector'],
        inspectionDate: ['Date', 'Inspection Date', 'Date of Inspection', 'Inspection Performed'],
        diameter: ['Diameter', 'Tank Diameter', 'Shell Diameter', 'Nominal Diameter'],
        height: ['Height', 'Tank Height', 'Shell Height', 'Overall Height'],
        originalThickness: ['Original Thickness', 'Nominal Thickness', 'Design Thickness', 'Min Thickness'],
        location: ['Location', 'Site', 'Facility', 'Plant Location'],
        owner: ['Owner', 'Client', 'Company', 'Facility Owner'],
        lastInspection: ['Last Inspection', 'Previous Inspection', 'Last Internal Inspection']
      };

      // Helper function to find field value by pattern matching
      const findFieldValue = (rowObj: any, patterns: string[]) => {
        for (const pattern of patterns) {
          if (rowObj[pattern] !== undefined && rowObj[pattern] !== null && rowObj[pattern] !== '') {
            return rowObj[pattern];
          }
        }
        return null;
      };

      // Process each row to extract data
      for (const row of data) {
        const rowObj = row as any;
        
        // Extract main report fields
        for (const [field, patterns] of Object.entries(fieldPatterns)) {
          const value = findFieldValue(rowObj, patterns);
          if (value && !importedData[field]) {
            if (field === 'inspectionDate' || field === 'lastInspection') {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                importedData[field] = date.toISOString().split('T')[0];
              }
            } else if (field === 'service') {
              importedData[field] = String(value).toLowerCase();
            } else {
              importedData[field] = String(value);
            }
          }
        }

        // Look for thickness measurement data
        const thicknessFields = ['Thickness', 'Current Thickness', 'Measured Thickness', 'Reading'];
        const locationFields = ['Location', 'Position', 'Point', 'Measurement Point'];
        const elevationFields = ['Elevation', 'Height', 'Level'];
        
        for (const thicknessField of thicknessFields) {
          if (rowObj[thicknessField] && !isNaN(parseFloat(rowObj[thicknessField]))) {
            const measurement = {
              location: findFieldValue(rowObj, locationFields) || `Point ${thicknessMeasurements.length + 1}`,
              elevation: findFieldValue(rowObj, elevationFields) || '0',
              currentThickness: parseFloat(rowObj[thicknessField]),
              originalThickness: importedData.originalThickness ? parseFloat(importedData.originalThickness) : 0.25
            };
            thicknessMeasurements.push(measurement);
            break; // Only take one thickness per row
          }
        }

        // Look for checklist items
        const checklistPatterns = ['Item', 'Check', 'Inspection Item', 'Requirement'];
        const statusPatterns = ['Status', 'Result', 'Pass/Fail', 'OK/Not OK', 'Satisfactory'];
        
        for (const checkPattern of checklistPatterns) {
          if (rowObj[checkPattern]) {
            const status = findFieldValue(rowObj, statusPatterns);
            const item = {
              item: String(rowObj[checkPattern]),
              checked: status ? ['pass', 'ok', 'satisfactory', 'yes', 'true'].includes(String(status).toLowerCase()) : false,
              notes: rowObj['Notes'] || rowObj['Comments'] || rowObj['Remarks'] || ''
            };
            checklistItems.push(item);
            break;
          }
        }
      }

      // Calculate years since last inspection if both dates are available
      if (importedData.inspectionDate && importedData.lastInspection) {
        const currentDate = new Date(importedData.inspectionDate);
        const lastDate = new Date(importedData.lastInspection);
        const yearsDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        importedData.yearsSinceLastInspection = Math.round(yearsDiff);
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
        thicknessMeasurements,
        checklistItems,
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
  app.get("/api/thickness-measurements", async (req, res) => {
    try {
      const reportId = req.query.reportId ? parseInt(req.query.reportId as string) : undefined;
      if (!reportId) {
        return res.status(400).json({ message: "Report ID is required" });
      }
      const measurements = await storage.getThicknessMeasurements(reportId);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

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
  app.get("/api/inspection-checklists", async (req, res) => {
    try {
      const reportId = req.query.reportId ? parseInt(req.query.reportId as string) : undefined;
      if (!reportId) {
        return res.status(400).json({ message: "Report ID is required" });
      }
      const checklists = await storage.getInspectionChecklists(reportId);
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklists" });
    }
  });

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

  // Appurtenance Inspections
  app.get("/api/reports/:reportId/appurtenances", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const appurtenances = await storage.getAppurtenanceInspections(reportId);
      res.json(appurtenances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appurtenance inspections" });
    }
  });

  // Repair Recommendations
  app.get("/api/reports/:reportId/repairs", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const repairs = await storage.getRepairRecommendations(reportId);
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repair recommendations" });
    }
  });

  // Venting System Inspections
  app.get("/api/reports/:reportId/venting", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const venting = await storage.getVentingSystemInspections(reportId);
      res.json(venting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch venting system inspections" });
    }
  });

  // Report Attachments
  app.get("/api/reports/:reportId/attachments", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const attachments = await storage.getReportAttachments(reportId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report attachments" });
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
