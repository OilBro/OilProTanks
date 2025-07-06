import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { 
  insertInspectionReportSchema, 
  insertThicknessMeasurementSchema,
  insertInspectionChecklistSchema,
  inspectionReports,
  thicknessMeasurements,
  inspectionChecklists
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { handleExcelImport } from "./import-handler";
import { generateInspectionTemplate } from "./template-generator";

// Unit converter utilities
const UnitConverter = {
  // Length conversions
  toFeet: (value: number, unit: string): number => {
    const conversions: Record<string, number> = {
      'ft': 1,
      'in': 0.0833333,
      'm': 3.28084,
      'mm': 0.00328084
    };
    return value * (conversions[unit] || 1);
  },
  
  // Volume conversions
  toGallons: (value: number, unit: string): number => {
    const conversions: Record<string, number> = {
      'gal': 1,
      'L': 0.264172,
      'bbl': 42,
      'm3': 264.172
    };
    return value * (conversions[unit] || 1);
  },
  
  // Thickness conversions
  toInches: (value: number, unit: string): number => {
    const conversions: Record<string, number> = {
      'in': 1,
      'mm': 0.0393701,
      'mils': 0.001
    };
    return value * (conversions[unit] || 1);
  },
  
  // Pressure conversions
  toPSI: (value: number, unit: string): number => {
    const conversions: Record<string, number> = {
      'psi': 1,
      'kPa': 0.145038,
      'bar': 14.5038,
      'atm': 14.6959
    };
    return value * (conversions[unit] || 1);
  }
};

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

  // Excel Template Download endpoint
  app.get("/api/template/download", (req, res) => {
    try {
      const templateBuffer = generateInspectionTemplate();
      const filename = `API_653_Inspection_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', templateBuffer.byteLength.toString());
      
      res.send(Buffer.from(templateBuffer));
    } catch (error) {
      console.error('Template generation error:', error);
      res.status(500).json({ message: 'Failed to generate template' });
    }
  });

  // Excel Import endpoint
  app.post("/api/reports/import", upload.single('excelFile'), async (req, res) => {
    try {
      console.log('=== Excel Import Request ===');
      console.log('File received:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file');
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Use the import handler with AI analysis
      console.log('Calling handleExcelImport...');
      const result = await handleExcelImport(req.file.buffer, req.file.originalname);
      
      console.log('Import result summary:');
      console.log('- Total rows:', result.totalRows);
      console.log('- AI Confidence:', result.aiAnalysis?.confidence);
      console.log('- Imported data fields:', Object.keys(result.importedData || {}));
      console.log('- Thickness measurements count:', result.thicknessMeasurements?.length || 0);
      console.log('- Checklist items count:', result.checklistItems?.length || 0);
      
      // CRITICAL FIX: Actually create the report from imported data
      
      // Clean up tank ID to prevent filenames being used
      if (result.importedData.tankId?.endsWith('.xlsx') || 
          result.importedData.tankId?.endsWith('.xls') || 
          result.importedData.tankId?.endsWith('.xlsm')) {
        // Extract actual tank ID from the imported data or use a default
        result.importedData.tankId = result.importedData.equipmentId || 
                                    result.importedData.unitNumber || 
                                    `TANK-${Date.now()}`;
      }
      
      // Standardize service types
      const serviceMapping: Record<string, string> = {
        'crude_oil': 'crude',
        'crude oil': 'crude',
        'diesel': 'diesel',
        'gasoline': 'gasoline',
        'alcohol': 'alcohol',
        'fish oil and sludge oil': 'other',
        'other': 'other'
      };
      
      if (result.importedData.service) {
        const normalizedService = result.importedData.service.toLowerCase();
        result.importedData.service = serviceMapping[normalizedService] || 'other';
      }
      
      // Extract special fields that shouldn't be in constructor
      const { findings, reportWriteUp, recommendations, notes, ...reportData } = result.importedData;
      
      // Create the report with valid fields only
      try {
        console.log('Creating report from imported data:', reportData);
        
        // Parse and validate the report data
        const validatedData = insertInspectionReportSchema.parse({
          ...reportData,
          status: reportData.status || null,
          yearsSinceLastInspection: reportData.yearsSinceLastInspection ? parseInt(reportData.yearsSinceLastInspection) : null
        });
        
        // Create the report
        const createdReport = await storage.createInspectionReport(validatedData);
        console.log('Report created successfully with ID:', createdReport.id);
        
        // Create thickness measurements if any
        if (result.thicknessMeasurements && result.thicknessMeasurements.length > 0) {
          console.log(`Creating ${result.thicknessMeasurements.length} thickness measurements`);
          
          for (const measurement of result.thicknessMeasurements) {
            try {
              const measurementData = {
                ...measurement,
                reportId: createdReport.id,
                currentThickness: String(measurement.currentThickness || 0),
                originalThickness: String(measurement.originalThickness || 0.375)
              };
              
              await storage.createThicknessMeasurement(measurementData);
            } catch (error) {
              console.error('Failed to create thickness measurement:', error);
            }
          }
        }
        
        // Create checklist items if any
        if (result.checklistItems && result.checklistItems.length > 0) {
          console.log(`Creating ${result.checklistItems.length} checklist items`);
          
          for (const item of result.checklistItems) {
            try {
              await storage.createInspectionChecklist({
                ...item,
                reportId: createdReport.id
              });
            } catch (error) {
              console.error('Failed to create checklist item:', error);
            }
          }
        }
        
        // Update report with findings if present
        if (findings || reportWriteUp || recommendations || notes) {
          const updateData: any = {};
          if (findings) updateData.findings = findings;
          if (reportWriteUp) updateData.reportWriteUp = reportWriteUp;
          if (recommendations) updateData.recommendations = recommendations;
          if (notes) updateData.notes = notes;
          
          // Note: We might need to add these fields to the schema if they don't exist
          console.log('Special fields to update:', updateData);
        }
        
        res.json({
          success: true,
          message: `Successfully imported inspection report ${createdReport.reportNumber}`,
          reportId: createdReport.id,
          reportNumber: createdReport.reportNumber,
          importedData: result.importedData,
          thicknessMeasurements: result.thicknessMeasurements?.length || 0,
          checklistItems: result.checklistItems?.length || 0,
          totalRows: result.totalRows,
          preview: result.preview,
          aiInsights: {
            confidence: result.aiAnalysis.confidence,
            detectedColumns: result.aiAnalysis.detectedColumns,
            mappingSuggestions: result.aiAnalysis.mappingSuggestions
          }
        });
        
      } catch (validationError) {
        console.error('Report creation failed:', validationError);
        
        // Return the error but still show the extracted data
        res.status(400).json({
          success: false,
          message: "Failed to create report from imported data. Please review and correct the data.",
          error: validationError instanceof Error ? validationError.message : 'Validation failed',
          importedData: result.importedData,
          thicknessMeasurements: result.thicknessMeasurements,
          checklistItems: result.checklistItems,
          totalRows: result.totalRows,
          preview: result.preview,
          aiInsights: {
            confidence: result.aiAnalysis.confidence,
            detectedColumns: result.aiAnalysis.detectedColumns,
            mappingSuggestions: result.aiAnalysis.mappingSuggestions
          }
        });
      }

    } catch (error) {
      console.error('Excel import error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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

  // Get all reports
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getInspectionReports();
      res.json(reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Inspection Reports
  app.get("/api/reports/:id", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      console.log(`Fetching report with ID: ${reportId}`);

      // Get the main report
      const reportResult = await db.select().from(inspectionReports).where(eq(inspectionReports.id, reportId));

      if (reportResult.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult[0]; // ✅ FIX: Extract single object
      console.log('Report found: Yes');

      // ✅ FIX: Get related data
      const thicknessMeasurementsData = await db.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.reportId, reportId));
      const checklistItemsData = await db.select().from(inspectionChecklists).where(eq(inspectionChecklists.reportId, reportId));

      // ✅ FIX: Return properly structured response
      const fullReport = {
        ...report,
        thicknessMeasurements: thicknessMeasurementsData || [],
        checklistItems: checklistItemsData || [],
        inspectionDate: report.inspectionDate ? new Date(report.inspectionDate).toISOString().split('T')[0] : null,
        createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : null,
        updatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : null
      };

      console.log(`Returning report with ${thicknessMeasurementsData.length} measurements and ${checklistItemsData.length} checklist items`);
      res.json(fullReport);
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      console.log(`Fetching report with ID: ${reportId}`);
      
      // Get the main report
      const reportResult = await db.select().from(inspectionReports).where(eq(inspectionReports.id, reportId));
      
      if (reportResult.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      const report = reportResult[0]; // ✅ FIX: Extract single object
      console.log('Report found: Yes');
      
      // ✅ FIX: Get related data
      const thicknessMeasurementsData = await db.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.reportId, reportId));
      const checklistItems = await db.select().from(inspectionChecklists).where(eq(inspectionChecklists.reportId, reportId));
      
      // ✅ FIX: Return properly structured response
      const fullReport = {
        ...report,
        thicknessMeasurements: thicknessMeasurementsData || [],
        checklistItems: checklistItems || [],
        inspectionDate: report.inspectionDate ? new Date(report.inspectionDate).toISOString().split('T')[0] : null,
        createdAt: report.createdAt ? new Date(report.createdAt).toISOString() : null,
        updatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : null
      };
      
      console.log(`Returning report with ${thicknessMeasurementsData.length} measurements and ${checklistItems.length} checklist items`);
      res.json(fullReport);
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/reports', async (req, res) => {
    try {
      const reportData = req.body;
      console.log('Creating report with data:', reportData);
      
      // Process data to match database schema
      const processedData = {
        tankId: reportData.tankId ? String(reportData.tankId).trim() : null,
        service: reportData.service ? String(reportData.service).trim() : null,
        diameter: reportData.diameter ? String(reportData.diameter) : null,
        height: reportData.height ? String(reportData.height) : null,
        inspector: reportData.inspector ? String(reportData.inspector).trim() : null,
        inspectionDate: reportData.inspectionDate || null,
        originalThickness: reportData.originalThickness ? String(reportData.originalThickness) : null,
        yearsSinceLastInspection: reportData.yearsSinceLastInspection ? parseInt(reportData.yearsSinceLastInspection) : null,
        reportNumber: reportData.reportNumber || `REP-${Date.now()}`,
        status: reportData.status || 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Processed data for validation:', processedData);
      
      // Use the storage interface which handles validation
      const newReport = await storage.createInspectionReport(processedData);
      console.log(`Report created successfully with ID: ${newReport.id}`);
      
      res.status(201).json(newReport);
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(400).json({ 
        message: "Failed to create report", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
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
      console.log('Creating thickness measurement:');
      console.log('ReportId:', reportId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const dataToValidate = {
        ...req.body,
        reportId
      };
      console.log('Data to validate:', JSON.stringify(dataToValidate, null, 2));
      
      const validatedData = insertThicknessMeasurementSchema.parse(dataToValidate);
      const measurement = await storage.createThicknessMeasurement(validatedData);
      res.status(201).json(measurement);
    } catch (error: any) {
      console.error('Thickness measurement creation error:', error);
      console.error('Error details:', error.issues || error.message);
      
      let detailedMessage = "Invalid measurement data";
      if (error.issues) {
        console.error('Validation issues:');
        const issueMessages = error.issues.map((issue: any) => {
          const fieldPath = issue.path.join('.');
          console.error(`- Field: ${fieldPath}, Message: ${issue.message}`);
          return `${fieldPath}: ${issue.message}`;
        });
        detailedMessage = `Validation failed: ${issueMessages.join(', ')}`;
      }
      
      res.status(400).json({ 
        message: detailedMessage, 
        error: error.issues || error.message,
        receivedData: req.body,
        validationDetails: error.issues
      });
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
