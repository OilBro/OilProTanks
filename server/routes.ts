import { componentSchema, componentPatchSchema, nozzleSchema, nozzlePatchSchema, cmlPointSchema, cmlPointPatchSchema, cmlBulkSchema, shellCoursesPutSchema, appendixSchema, tminOverrideSchema, writeupPutSchema, validate } from './validation-schemas.ts';
import { registerComponentRoutes, registerNozzleRoutes } from './routes/components.routes.ts';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.ts";
import { 
  insertInspectionReportSchema, 
  insertThicknessMeasurementSchema,
  insertInspectionChecklistSchema,
  inspectionReports,
  thicknessMeasurements,
  inspectionChecklists,
  reportComponents,
  reportNozzles,
  cmlPoints,
  reportShellCourses,
  reportAppendices,
  reportWriteup,
  reportPracticalTminOverrides
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq } from "drizzle-orm";
import { handleExcelImport } from "./import-handler.ts";
import { persistImportedReport, cleanupOrphanedReportChildren } from './import-persist.ts';
import { handleChecklistUpload, standardChecklists } from "./checklist-handler.ts";
import { checklistTemplates, insertChecklistTemplateSchema } from "../shared/schema.ts";
import { generateInspectionTemplate, generateChecklistTemplateExcel } from "./template-generator.ts";
import { exportFlatCSV, exportWholePacketZip } from "./exporter.ts";
import { 
  generateDataIngestionPackage,
  parseBasePageNominals,
  parseShellTMLs,
  parseNozzleTMLs
} from "./csv-templates.ts";
import {
  performAPI653Evaluation,
  calculateKPIMetrics,
  type TankParameters,
  type ComponentThickness
} from "./api653-calculator.ts";
import { 
  calculateCorrosionRate,
  calculateRemainingLife,
  calculateMinimumRequiredThickness,
  determineInspectionStatus
} from "./api653-calculations.ts";

// Unit converter utilities
const UnitConverter = {
  toFeet: (value: number, unit: string): number => {
    const conversions: Record<string, number> = { ft:1, in:0.0833333, m:3.28084, mm:0.00328084 };
    return value * (conversions[unit] || 1);
  },
  toGallons: (value:number, unit:string): number => {
    const conversions: Record<string, number> = { gal:1, L:0.264172, bbl:42, m3:264.172 };
    return value * (conversions[unit] || 1);
  },
  toInches: (value:number, unit:string): number => {
    const conversions: Record<string, number> = { in:1, mm:0.0393701, mils:0.001 };
    return value * (conversions[unit] || 1);
  },
  toPSI: (value:number, unit:string): number => {
    const conversions: Record<string, number> = { psi:1, kPa:0.145038, bar:14.5038, atm:14.6959 };
    return value * (conversions[unit] || 1);
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/pdf',
        'text/csv',
        'application/csv'
      ];
      const isAllowed = allowedTypes.includes(file.mimetype) || 
                       file.originalname.toLowerCase().endsWith('.xlsx') ||
                       file.originalname.toLowerCase().endsWith('.xls') ||
                       file.originalname.toLowerCase().endsWith('.xlsm') ||
                       file.originalname.toLowerCase().endsWith('.pdf') ||
                       file.originalname.toLowerCase().endsWith('.csv');
      if (isAllowed) cb(null,true); else cb(new Error('Invalid file type.'));
    }
  });

  // Delegate to modular route registrations (components/nozzles)
  registerComponentRoutes(app);
  registerNozzleRoutes(app);
  // Excel Import endpoint (restored)
  app.post("/api/reports/import", upload.single('excelFile'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileName = req.file.originalname.toLowerCase();
      let result;
      if (fileName.endsWith('.pdf')) {
        const { handlePDFImport } = await import('./import-handler.ts');
        result = await handlePDFImport(req.file.buffer, req.file.originalname);
      } else {
        result = await handleExcelImport(req.file.buffer, req.file.originalname);
      }

      const { importedData, thicknessMeasurements: tms, checklistItems: clItems } = result;
      const { findings, reportWriteUp, recommendations, notes, ...reportData } = importedData;

      // Normalize tankId edge cases
      if (reportData.tankId?.match(/\.xls/)) {
        reportData.tankId = reportData.equipmentId || reportData.unitNumber || `TANK-${Date.now()}`;
      }
      // Service mapping normalization
      const serviceMapping: Record<string,string> = { 'crude_oil':'crude','crude oil':'crude','diesel':'diesel','gasoline':'gasoline','alcohol':'alcohol','fish oil and sludge oil':'other','other':'other'};
      if (reportData.service) {
        const norm = String(reportData.service).toLowerCase();
        reportData.service = serviceMapping[norm] || 'other';
      }

      // Transactional persistence
      const persisted = await persistImportedReport({
        importedData: reportData,
        thicknessMeasurements: Array.isArray(tms) ? tms : [],
        checklistItems: Array.isArray(clItems) ? clItems : [],
        findings, reportWriteUp, recommendations, notes
      });

      res.json({
        success: true,
        reportId: persisted.report.id,
        reportNumber: persisted.report.reportNumber,
        origin: 'import',
        measurementsCreated: persisted.measurementsCreated,
        checklistCreated: persisted.checklistCreated,
        warnings: persisted.warnings,
        importedData: result.importedData
      });
    } catch (e: any) {
      console.error('Import failed (transaction rolled back):', e);
      res.status(500).json({ success:false, message: e.message || 'Import failed'});
    }
  });

  // Maintenance: cleanup orphaned child records
  app.post('/api/reports/maintenance/cleanup-orphans', async (req, res) => {
    try {
      const dryRun = req.query.dryRun !== 'false';
      const result = await cleanupOrphanedReportChildren(dryRun);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success:false, message: e.message || 'Cleanup failed'});
    }
  });

  // Feature flags exposure (non-sensitive UI flags only)
  app.get('/api/feature-flags', (req, res) => {
    try {
      const flags = {
        aiAnalysisUI: process.env.VITE_AI_ANALYSIS_UI === 'true',
        maintenanceUtilsUI: process.env.VITE_MAINTENANCE_UTILS_UI === 'true'
      };
      res.json({ success: true, flags });
    } catch (e: any) {
      res.status(500).json({ success:false, message: e.message || 'Failed to read flags'});
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

  // Get all reports with optional origin filter & pagination
  app.get("/api/reports", async (req, res) => {
    try {
      const origin = (req.query.origin as string | undefined)?.trim();
      const limitParam = req.query.limit as string | undefined;
      const offsetParam = req.query.offset as string | undefined;
      const limit = limitParam ? Math.min(Math.max(parseInt(limitParam,10),1), 200) : undefined;
      const offset = offsetParam ? Math.max(parseInt(offsetParam,10), 0) : undefined;

      // Fetch total count separately (without pagination) for header if pagination used
      let total: number | undefined;
      if (limit !== undefined || offset !== undefined) {
        const all = await storage.getInspectionReports(origin); // unpaginated for count
        total = all.length;
      }
      const reports = await storage.getInspectionReports(origin, { limit, offset });
      if (typeof total === 'number') {
        res.setHeader('X-Total-Count', String(total));
      } else {
        res.setHeader('X-Total-Count', String(reports.length));
      }
      res.json(reports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Get report by number (for URL compatibility)
  app.get("/api/reports/by-number/:reportNumber", async (req, res) => {
    try {
      const reportNumber = req.params.reportNumber;
      console.log(`Fetching report with number: ${reportNumber}`);

      // Get the main report by report number
      const reports = await storage.getInspectionReports();
      const report = reports.find(r => r.reportNumber === reportNumber);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Get related data (basic measurements and checklists first)
      const [measurements, checklists] = await Promise.all([
        storage.getThicknessMeasurements(report.id),
        storage.getInspectionChecklists(report.id)
      ]);

      const reportWithRelations = {
        ...report,
        thicknessMeasurements: measurements,
        inspectionChecklists: checklists,
        appurtenanceInspections: [],
        repairRecommendations: [],
        ventingInspections: [],
        attachments: []
      };

      console.log(`Report found: Yes`);
      console.log(`Returning report with ${measurements.length} measurements and ${checklists.length} checklist items`);
      
      res.json(reportWithRelations);
    } catch (error) {
      console.error('Error fetching report by number:', error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // Inspection Reports - Single endpoint for fetching report by ID
  app.get("/api/reports/:id", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      console.log(`Fetching report with ID: ${reportId}`);

      // Get the main report
      const reportResult = await db.select().from(inspectionReports).where(eq(inspectionReports.id, reportId));

      if (reportResult.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult[0];
      console.log('Report found: Yes');

      // Get related data
      const thicknessMeasurementsData = await db.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.reportId, reportId));
      const checklistItemsData = await db.select().from(inspectionChecklists).where(eq(inspectionChecklists.reportId, reportId));

      // Return properly structured response
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
  const newReport = await storage.createInspectionReport({ ...processedData, origin: reportData.origin || 'manual' });
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
      
      console.log('=== MEASUREMENT CREATION DEBUG ===');
      console.log('Report ID:', reportId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Get the report to have tank parameters for calculations
      const report = await storage.getInspectionReport(reportId);
      if (!report) {
        console.log('Report not found:', reportId);
        return res.status(404).json({ message: "Report not found" });
      }
      
      // More robust measurementType determination
      let measurementType = req.body.measurementType || "shell";
      if (!req.body.measurementType && req.body.component) {
        const componentLower = req.body.component.toLowerCase().trim();
        console.log('Auto-detecting measurement type for component:', componentLower);
        
        // Enhanced pattern matching for measurement types
        if (componentLower.includes("bottom") || componentLower.includes("floor") || componentLower.includes("plate")) {
          measurementType = "bottom_plate";
        } else if (componentLower.includes("critical") || componentLower.includes("zone")) {
          measurementType = "critical_zone";
        } else if (componentLower.includes("roof") || componentLower.includes("top")) {
          measurementType = "roof";
        } else if (componentLower.includes("nozzle") || componentLower.includes("outlet") || componentLower.includes("inlet")) {
          measurementType = "nozzle";
        } else if (componentLower.includes("annular") || componentLower.includes("ring")) {
          measurementType = "internal_annular";
        } else if (componentLower.includes("repad") || componentLower.includes("reinforcement")) {
          measurementType = "external_repad";
        } else if (componentLower.includes("chime") || componentLower.includes("angle")) {
          measurementType = "chime";
        } else if (componentLower.includes("appurtenance") || componentLower.includes("fitting")) {
          measurementType = "nozzle"; // Default appurtenances to nozzle type
        } else if (componentLower.includes("shell") || componentLower.includes("course")) {
          measurementType = "shell";
        }
      }
      
      console.log('Determined measurement type:', measurementType);
      
      const dataToValidate = {
        ...req.body,
        measurementType,
        reportId
      };
      
      // Perform API 653 calculations if we have necessary data
      if (dataToValidate.currentThickness && report.originalThickness) {
        const currentThickness = parseFloat(dataToValidate.currentThickness);
        const nominalThickness = parseFloat(dataToValidate.nominalThickness || dataToValidate.originalThickness || report.originalThickness || '0.375');
        const yearBuilt = report.yearBuilt ? parseInt(report.yearBuilt) : null;
        const ageInYears = yearBuilt ? new Date().getFullYear() - yearBuilt : report.yearsSinceLastInspection || 10;
        
        // Calculate corrosion rate
        const { rateInchesPerYear, rateMPY } = calculateCorrosionRate(
          nominalThickness,
          currentThickness,
          ageInYears
        );
        
        // Calculate minimum required thickness based on component type
        let minimumRequired = 0.1; // Default minimum
        if (measurementType === 'shell' && report.diameter && report.height) {
          const courseNumber = dataToValidate.component?.match(/\d+/)?.[0] || '1';
          minimumRequired = calculateMinimumRequiredThickness(
            parseInt(courseNumber),
            parseFloat(report.diameter),
            report.specificGravity ? parseFloat(report.specificGravity) : 0.85,
            parseFloat(report.height),
            0.85 // Default joint efficiency
          );
        } else if (measurementType === 'bottom_plate') {
          minimumRequired = 0.1; // API 653 minimum for bottom plates
        } else if (measurementType === 'roof') {
          minimumRequired = 0.09; // API 653 minimum for roof plates  
        } else if (measurementType === 'critical_zone') {
          // Critical zones typically use shell minimum requirements
          minimumRequired = 0.1;
        } else if (measurementType === 'internal_annular') {
          minimumRequired = 0.1; // Same as bottom plate
        } else if (measurementType === 'nozzle') {
          minimumRequired = 0.125; // Typical nozzle minimum
        } else if (measurementType === 'external_repad') {
          minimumRequired = 0.1; // Repad minimum
        } else if (measurementType === 'chime') {
          minimumRequired = 0.1; // Chime minimum
        }
        
        // Calculate remaining life
        const remainingLife = calculateRemainingLife(
          currentThickness,
          minimumRequired,
          rateInchesPerYear
        );
        
        // Determine status
        const status = determineInspectionStatus(
          remainingLife,
          currentThickness,
          minimumRequired
        );
        
        // Add calculated values to the measurement data
        dataToValidate.corrosionRate = rateInchesPerYear.toFixed(4);
        dataToValidate.remainingLife = remainingLife.toFixed(1);
        dataToValidate.status = status;
        
        console.log('API 653 Calculations performed:', {
          nominalThickness,
          currentThickness,
          minimumRequired,
          corrosionRate: dataToValidate.corrosionRate,
          remainingLife: dataToValidate.remainingLife,
          status: dataToValidate.status
        });
      }
      
      console.log('Data to validate:', JSON.stringify(dataToValidate, null, 2));
      
      // Better validation error handling
      let validatedData;
      try {
        validatedData = insertThicknessMeasurementSchema.parse(dataToValidate);
        console.log('Schema validation passed');
      } catch (validationError: any) {
        console.error('Schema validation failed:', validationError);
        return res.status(400).json({ 
          message: "Validation failed",
          error: validationError.message,
          issues: validationError.issues,
          receivedData: dataToValidate
        });
      }
      
      // Better database error handling
      let measurement;
      try {
        measurement = await storage.createThicknessMeasurement(validatedData);
        console.log('Measurement created successfully:', measurement.id);
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          message: "Database error",
          error: dbError.message,
          validatedData: validatedData
        });
      }
      
      console.log('=== MEASUREMENT CREATION SUCCESS ===');
      res.status(201).json(measurement);
      
    } catch (error: any) {
      console.error('=== MEASUREMENT CREATION FAILED ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      
      let detailedMessage = "Invalid measurement data";
      if (error.issues) {
        const issueMessages = error.issues.map((issue: any) => {
          const fieldPath = issue.path.join('.');
          return `${fieldPath}: ${issue.message}`;
        });
        detailedMessage = `Validation errors: ${issueMessages.join(', ')}`;
      }
      
      res.status(400).json({ 
        message: detailedMessage,
        error: error.message,
        issues: error.issues,
        stack: error.stack
      });
    }
  });

  app.put("/api/measurements/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get existing measurement to get report ID for calculations
      const existingMeasurements = await db.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.id, id));
      if (existingMeasurements.length === 0) {
        return res.status(404).json({ message: "Measurement not found" });
      }
      
      const reportId = existingMeasurements[0].reportId;
      if (!reportId) {
        return res.status(400).json({ message: "Measurement has no associated report" });
      }
      const report = await storage.getInspectionReport(reportId);
      
      // Perform calculations if thickness values are being updated
      const dataToUpdate = { ...req.body };
      if ((dataToUpdate.currentThickness || existingMeasurements[0].currentThickness) && report) {
        const currentThickness = parseFloat(dataToUpdate.currentThickness || existingMeasurements[0].currentThickness);
        const nominalThickness = parseFloat(dataToUpdate.nominalThickness || existingMeasurements[0].originalThickness || report.originalThickness || '0.375');
        const yearBuilt = report.yearBuilt ? parseInt(report.yearBuilt) : null;
        const ageInYears = yearBuilt ? new Date().getFullYear() - yearBuilt : report.yearsSinceLastInspection || 10;
        
        // Calculate corrosion rate
        const { rateInchesPerYear } = calculateCorrosionRate(
          nominalThickness,
          currentThickness,
          ageInYears
        );
        
        // Calculate minimum required thickness
        let minimumRequired = 0.1;
        const measurementType = existingMeasurements[0].measurementType;
        if (measurementType === 'shell' && report.diameter && report.height) {
          const courseNumber = existingMeasurements[0].component?.match(/\d+/)?.[0] || '1';
          minimumRequired = calculateMinimumRequiredThickness(
            parseInt(courseNumber),
            parseFloat(report.diameter),
            report.specificGravity ? parseFloat(report.specificGravity) : 0.85,
            parseFloat(report.height),
            0.85
          );
        } else if (measurementType === 'bottom_plate') {
          minimumRequired = 0.1; // API 653 minimum for bottom plates
        } else if (measurementType === 'roof') {
          minimumRequired = 0.09; // API 653 minimum for roof plates  
        } else if (measurementType === 'critical_zone') {
          minimumRequired = 0.1; // Critical zones
        } else if (measurementType === 'internal_annular') {
          minimumRequired = 0.1; // Same as bottom plate
        } else if (measurementType === 'nozzle') {
          minimumRequired = 0.125; // Typical nozzle minimum
        } else if (measurementType === 'external_repad') {
          minimumRequired = 0.1; // Repad minimum
        } else if (measurementType === 'chime') {
          minimumRequired = 0.1; // Chime minimum
        }
        
        // Calculate remaining life
        const remainingLife = calculateRemainingLife(
          currentThickness,
          minimumRequired,
          rateInchesPerYear
        );
        
        // Determine status
        const status = determineInspectionStatus(
          remainingLife,
          currentThickness,
          minimumRequired
        );
        
        dataToUpdate.corrosionRate = rateInchesPerYear.toFixed(4);
        dataToUpdate.remainingLife = remainingLife.toFixed(1);
        dataToUpdate.status = status;
      }
      
      const validatedData = insertThicknessMeasurementSchema.partial().parse(dataToUpdate);
      const measurement = await storage.updateThicknessMeasurement(id, validatedData);
      res.json(measurement);
    } catch (error) {
      console.error('Error updating measurement:', error);
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

  // Singular checklist endpoint for compatibility
  app.get("/api/reports/:reportId/checklist", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const checklists = await storage.getInspectionChecklists(reportId);
      res.json(checklists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch checklist" });
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
      console.log(`Fetching repair recommendations for report ${reportId}`);
      const repairs = await storage.getRepairRecommendations(reportId);
      console.log(`Found ${repairs.length} repair recommendations`);
      res.json(repairs);
    } catch (error) {
      console.error('Error fetching repair recommendations:', error);
      res.status(500).json({ 
        message: "Failed to fetch repair recommendations", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
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

  // Checklist Templates Management
  app.get("/api/checklist-templates", async (req, res) => {
    try {
      const templates = await db.select().from(checklistTemplates).where(eq(checklistTemplates.isActive, true));
      res.json(templates);
    } catch (error) {
      console.error('Failed to fetch checklist templates:', error);
      res.status(500).json({ message: "Failed to fetch checklist templates" });
    }
  });

  app.post("/api/checklist-templates", async (req, res) => {
    try {
      const validatedData = insertChecklistTemplateSchema.parse(req.body);
      const [template] = await db.insert(checklistTemplates).values(validatedData).returning();
      res.json(template);
    } catch (error) {
      console.error('Failed to create checklist template:', error);
      res.status(500).json({ message: "Failed to create checklist template" });
    }
  });

  app.post("/api/checklist-templates/upload", upload.single('checklistFile'), async (req, res) => {
    try {
      console.log('=== Checklist Upload Request ===');
      console.log('File received:', req.file ? {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file');
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Extract checklist data from file
      const checklistData = await handleChecklistUpload(req.file.buffer, req.file.originalname);
      
      // Save to database
      const templateData = {
        name: checklistData.name,
        description: checklistData.description || '',
        category: checklistData.category,
        items: JSON.stringify(checklistData.items),
        createdBy: 'Uploaded'
      };
      
      const [template] = await db.insert(checklistTemplates).values(templateData).returning();
      
      res.json({
        success: true,
        message: `Successfully uploaded checklist template: ${template.name}`,
        template,
        itemsCount: checklistData.items.length
      });
      
    } catch (error) {
      console.error('Checklist upload error:', error);
      res.status(500).json({ 
        message: "Failed to process checklist file", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post("/api/checklist-templates/standard", async (req, res) => {
    try {
      const { templateType } = req.body;
      
      if (!standardChecklists[templateType as keyof typeof standardChecklists]) {
        return res.status(400).json({ message: "Invalid template type" });
      }
      
      const standardTemplate = standardChecklists[templateType as keyof typeof standardChecklists];
      
      // Check if template already exists
      const existing = await db.select().from(checklistTemplates)
        .where(eq(checklistTemplates.name, standardTemplate.name));
      
      if (existing.length > 0) {
        return res.status(400).json({ message: "Standard template already exists" });
      }
      
      const templateData = {
        name: standardTemplate.name,
        description: standardTemplate.description,
        category: standardTemplate.category,
        items: JSON.stringify(standardTemplate.items),
        createdBy: 'System'
      };
      
      const [template] = await db.insert(checklistTemplates).values(templateData).returning();
      
      res.json({
        success: true,
        message: `Successfully created standard template: ${template.name}`,
        template
      });
      
    } catch (error) {
      console.error('Standard template creation error:', error);
      res.status(500).json({ 
        message: "Failed to create standard template", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // ---- Export Endpoints ----
  app.get("/api/reports/:id/export.csv", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { filename, buffer } = await exportFlatCSV(id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      res.send(buffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to export flat CSV" });
    }
  });

  app.get("/api/reports/:id/packet.zip", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { filename, stream } = await exportWholePacketZip(id);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
      stream.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to export packet" });
    }
  });

  // Download Excel template
  app.get("/api/templates/download/excel", (req, res) => {
    try {
      const workbook = generateInspectionTemplate();
      const buffer = Buffer.from(workbook);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="API653_Inspection_Template.xlsx"');
      res.send(buffer);
    } catch (err) {
      console.error("Error generating Excel template:", err);
      res.status(500).json({ message: "Failed to generate Excel template" });
    }
  });

  // Download individual checklist template as Excel
  app.get("/api/checklist-templates/:id/download/excel", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // Get template from database
      const [template] = await db
        .select()
        .from(checklistTemplates)
        .where(eq(checklistTemplates.id, templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Generate Excel file for this template
      const workbook = generateChecklistTemplateExcel(template);
      const buffer = Buffer.from(workbook);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${template.name.replace(/\s+/g, '_')}_template.xlsx"`);
      res.send(buffer);
    } catch (err) {
      console.error("Error generating template Excel:", err);
      res.status(500).json({ message: "Failed to generate template Excel" });
    }
  });

  // ---- CSV Data Ingestion Package ----
  app.get("/api/data-ingestion/package", async (req, res) => {
    try {
      const { filename, stream } = await generateDataIngestionPackage();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (err) {
      console.error("Error generating data ingestion package:", err);
      res.status(500).json({ message: "Failed to generate data ingestion package" });
    }
  });

  // CSV Import Endpoints
  app.post("/api/reports/:reportId/import-csv", upload.single('file'), async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const { type } = req.body; // 'basepage', 'shell', 'nozzle', 'exception', 'settlement'
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const csvContent = req.file.buffer.toString('utf-8');
      let processedData: any[] = [];
      
      switch (type) {
        case 'basepage':
          processedData = parseBasePageNominals(csvContent);
          // Store in database or process further
          break;
        case 'shell':
          processedData = parseShellTMLs(csvContent);
          // Convert to thickness measurements and save
          for (const tml of processedData) {
            const avgThickness = tml.avg_thickness || 
              ((tml.q1_thickness || 0) + (tml.q2_thickness || 0) + 
               (tml.q3_thickness || 0) + (tml.q4_thickness || 0)) / 4;
            
            await storage.createThicknessMeasurement({
              reportId,
              component: `Shell Course ${tml.course}`,
              location: tml.location,
              currentThickness: avgThickness.toString(),
              originalThickness: "0", // Would come from basepage nominals
              corrosionRate: "0", // Will be calculated
              remainingLife: "0", // Will be calculated
              status: 'acceptable'
            });
          }
          break;
        case 'nozzle':
          processedData = parseNozzleTMLs(csvContent);
          // Process nozzle measurements
          break;
      }
      
      res.json({ 
        message: "CSV data imported successfully", 
        recordsProcessed: processedData?.length || 0 
      });
    } catch (err) {
      console.error("CSV import error:", err);
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });

  // ---- KPI and API 653 Evaluation Endpoints ----
  app.get("/api/reports/:reportId/api653-evaluation", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      
      // Get report and measurements
      const report = await storage.getInspectionReport(reportId);
      const measurements = await storage.getThicknessMeasurements(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // Prepare tank parameters
      const tankParams: TankParameters = {
        diameter: parseFloat(report.diameter || '0'),
        height: parseFloat(report.height || '0'),
        specificGravity: parseFloat(report.specificGravity || '1.0'),
        jointEfficiency: 0.85,
        yieldStrength: 30000,
        designStress: 20000,
        api650Edition: 'Unknown', // These fields don't exist in schema yet
        constructionCode: 'API 650'
      };
      
      // Prepare component thickness data
      const components: ComponentThickness[] = measurements.map(m => ({
        component: m.component || 'Unknown',
        nominalThickness: parseFloat(m.originalThickness || report.originalThickness || '0'),
        currentThickness: parseFloat(m.currentThickness || '0'),
        previousThickness: 0, // previousThickness field doesn't exist in schema yet
        corrosionAllowance: 0.0625,
        dateCurrent: new Date(report.inspectionDate || Date.now()),
        datePrevious: new Date(report.inspectionDate || Date.now()) // lastInspectionDate field doesn't exist yet
      }));
      
      // Perform API 653 evaluation
      const evaluationResults = performAPI653Evaluation(components, tankParams);
      
      res.json(evaluationResults);
    } catch (err) {
      console.error("API 653 evaluation error:", err);
      res.status(500).json({ message: "Failed to perform API 653 evaluation" });
    }
  });

  app.get("/api/reports/:reportId/kpi", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      
      // Get evaluation results
      const evaluationResponse = await fetch(`http://localhost:5000/api/reports/${reportId}/api653-evaluation`);
      const evaluationResults = await evaluationResponse.json();
      
      // Get measurements count
      const measurements = await storage.getThicknessMeasurements(reportId);
      const expectedTMLs = 32; // 8 courses x 4 locations
      
      // Calculate KPI metrics
      const kpiMetrics = calculateKPIMetrics(
        evaluationResults,
        expectedTMLs,
        measurements.length,
        undefined, // containment capacity - would need to fetch from dyke data
        undefined  // required capacity
      );
      
      res.json(kpiMetrics);
    } catch (err) {
      console.error("KPI calculation error:", err);
      res.status(500).json({ message: "Failed to calculate KPI metrics" });
    }
  });

  app.get("/api/kpi/overall", async (req, res) => {
    try {
      // Get all reports and their measurements
      const reports = await storage.getInspectionReports();
      
      // Calculate overall fleet KPIs
      const totalReports = reports.length;
      const completedReports = reports.filter(r => r.status === 'completed').length;
      const inProgressReports = reports.filter(r => r.status === 'in_progress').length;
      
      // Calculate actual metrics from all reports
      let totalMeasurements = 0;
      let completedMeasurements = 0;
      let minRemainingLife = 999;
      let totalCorrosionRate = 0;
      let corrosionCount = 0;
      let criticalFindings = 0;
      let majorFindings = 0;
      let minorFindings = 0;
      
      // Process each report's measurements
      for (const report of reports) {
        const measurements = await storage.getThicknessMeasurements(report.id);
        totalMeasurements += measurements.length;
        
        for (const measurement of measurements) {
          // Count completed measurements (those with current thickness)
          if (measurement.currentThickness) {
            completedMeasurements++;
          }
          
          // Track minimum remaining life
          if (measurement.remainingLife) {
            const life = parseFloat(measurement.remainingLife);
            if (!isNaN(life) && life < minRemainingLife) {
              minRemainingLife = life;
            }
          }
          
          // Calculate average corrosion rate
          if (measurement.corrosionRate) {
            const rate = parseFloat(measurement.corrosionRate);
            if (!isNaN(rate) && rate > 0) {
              totalCorrosionRate += rate;
              corrosionCount++;
            }
          }
          
          // Count findings by severity - Fixed mapping
          // 'critical' status or remaining life < 1 year = critical finding
          // 'action_required' status or remaining life < 2 years = major finding  
          // 'monitor' status or remaining life < 5 years = minor finding
          const life = measurement.remainingLife ? parseFloat(measurement.remainingLife) : 999;
          
          if (measurement.status === 'critical' || life < 1) {
            criticalFindings++;
          } else if (measurement.status === 'action_required' || life < 2) {
            majorFindings++;
          } else if (measurement.status === 'monitor' || life < 5) {
            minorFindings++;
          }
        }
      }
      
      // Calculate percentages and averages
      const percentTMLsComplete = totalMeasurements > 0 
        ? (completedMeasurements / totalMeasurements) * 100 
        : 0;
      
      const avgCorrosionRate = corrosionCount > 0 
        ? totalCorrosionRate / corrosionCount 
        : 0;
      
      // Determine overall status based on findings
      // Fixed: Only NO-GO if actual critical findings (not just low remaining life)
      let overallStatus: 'GO' | 'NO-GO' | 'CONDITIONAL' = 'GO';
      if (criticalFindings > 0) {
        overallStatus = 'NO-GO';
      } else if (majorFindings > 0 || minRemainingLife < 5 || percentTMLsComplete < 90) {
        overallStatus = 'CONDITIONAL';
      }
      
      // Calculate next inspection due based on minimum remaining life
      const inspectionInterval = minRemainingLife < 5 ? 1 : minRemainingLife < 10 ? 2.5 : 5;
      const nextInspectionDue = new Date(Date.now() + inspectionInterval * 365 * 24 * 60 * 60 * 1000).toISOString();
      
      // Calculate compliance score
      const complianceScore = Math.max(0, Math.min(100, 
        100 - (criticalFindings * 10) - (majorFindings * 3) - (minorFindings * 0.5)
      ));
      
      const overallKPI = {
        percentTMLsComplete: Math.round(percentTMLsComplete),
        minRemainingLife: minRemainingLife === 999 ? 10 : minRemainingLife,
        criticalFindings,
        majorFindings,
        minorFindings,
        overallStatus,
        nextInspectionDue,
        containmentMargin: 15, // This would need secondary containment data
        tankCount: totalReports,
        reportsInProgress: inProgressReports,
        reportsCompleted: completedReports,
        avgCorrosionRate,
        complianceScore: Math.round(complianceScore)
      };
      
      res.json(overallKPI);
    } catch (err) {
      console.error("Overall KPI error:", err);
      res.status(500).json({ message: "Failed to calculate overall KPIs" });
    }
  });

  // Individual Report KPI endpoint
  app.get("/api/reports/:id/kpi", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getInspectionReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      
      // Get measurements for this specific report
      const measurements = await storage.getThicknessMeasurements(reportId);
      
      // Calculate metrics for this report
      let totalMeasurements = measurements.length;
      let completedMeasurements = 0;
      let minRemainingLife = 999;
      let totalCorrosionRate = 0;
      let corrosionCount = 0;
      let criticalFindings = 0;
      let majorFindings = 0;
      let minorFindings = 0;
      
      for (const measurement of measurements) {
        // Count completed measurements
        if (measurement.currentThickness) {
          completedMeasurements++;
        }
        
        // Track minimum remaining life
        if (measurement.remainingLife) {
          const life = parseFloat(measurement.remainingLife);
          if (!isNaN(life) && life < minRemainingLife) {
            minRemainingLife = life;
          }
        }
        
        // Calculate average corrosion rate
        if (measurement.corrosionRate) {
          const rate = parseFloat(measurement.corrosionRate);
          if (!isNaN(rate) && rate > 0) {
            totalCorrosionRate += rate;
            corrosionCount++;
          }
        }
        
        // Count findings by severity - Fixed mapping
        // 'critical' status or remaining life < 1 year = critical finding
        // 'action_required' status or remaining life < 2 years = major finding  
        // 'monitor' status or remaining life < 5 years = minor finding
        const life = measurement.remainingLife ? parseFloat(measurement.remainingLife) : 999;
        
        if (measurement.status === 'critical' || life < 1) {
          criticalFindings++;
        } else if (measurement.status === 'action_required' || life < 2) {
          majorFindings++;
        } else if (measurement.status === 'monitor' || life < 5) {
          minorFindings++;
        }
      }
      
      // Calculate percentages
      const percentTMLsComplete = totalMeasurements > 0 
        ? (completedMeasurements / totalMeasurements) * 100 
        : 0;
      
      const avgCorrosionRate = corrosionCount > 0 
        ? totalCorrosionRate / corrosionCount 
        : 0;
      
      // Determine status - Fixed: Only NO-GO if actual critical findings
      let overallStatus: 'GO' | 'NO-GO' | 'CONDITIONAL' = 'GO';
      if (criticalFindings > 0) {
        overallStatus = 'NO-GO';
      } else if (majorFindings > 0 || minRemainingLife < 5 || percentTMLsComplete < 90) {
        overallStatus = 'CONDITIONAL';
      }
      
      // Calculate next inspection due
      const inspectionInterval = minRemainingLife < 5 ? 1 : minRemainingLife < 10 ? 2.5 : 5;
      const nextInspectionDue = new Date(Date.now() + inspectionInterval * 365 * 24 * 60 * 60 * 1000).toISOString();
      
      const reportKPI = {
        percentTMLsComplete: Math.round(percentTMLsComplete),
        minRemainingLife: minRemainingLife === 999 ? 10 : minRemainingLife,
        criticalFindings,
        majorFindings,
        minorFindings,
        overallStatus,
        nextInspectionDue,
        containmentMargin: 15,
        tankCount: 1,
        reportsInProgress: report.status === 'in_progress' ? 1 : 0,
        reportsCompleted: report.status === 'completed' ? 1 : 0,
        avgCorrosionRate,
        complianceScore: Math.round(Math.max(0, Math.min(100, 
          100 - (criticalFindings * 10) - (majorFindings * 3) - (minorFindings * 0.5)
        )))
      };
      
      res.json(reportKPI);
    } catch (err) {
      console.error("Report KPI error:", err);
      res.status(500).json({ message: "Failed to calculate report KPIs" });
    }
  });

  // Advanced Settlement Survey Routes
  app.get("/api/reports/:reportId/settlement-surveys", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const surveys = await storage.getAdvancedSettlementSurveys(reportId);
      res.json(surveys);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch settlement surveys" });
    }
  });

  app.get("/api/settlement-surveys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const survey = await storage.getAdvancedSettlementSurvey(id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch settlement survey" });
    }
  });

  app.post("/api/reports/:reportId/settlement-surveys", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const surveyData = { ...req.body, reportId };
      const newSurvey = await storage.createAdvancedSettlementSurvey(surveyData);
      res.json(newSurvey);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create settlement survey" });
    }
  });

  app.patch("/api/settlement-surveys/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateAdvancedSettlementSurvey(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update settlement survey" });
    }
  });

  // AI Assistant Routes (guarded – may not be implemented in current storage layer)
  app.get("/api/ai/guidance-templates", async (req, res) => {
    try {
      const { section, category } = req.query;
      const sAny: any = storage as any; // dynamic capability
      if (typeof sAny["getAiGuidanceTemplates"] !== 'function') {
        return res.status(501).json({ message: "AI guidance templates not implemented" });
      }
      const templates = await sAny["getAiGuidanceTemplates"]({
        section: section as string,
        category: category as string
      });
      res.json(templates);
    } catch (err) {
      console.error('Error fetching guidance templates:', err);
      res.status(500).json({ message: "Failed to fetch guidance templates" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, reportId, sessionId, context, conversationHistory } = req.body;
      const sAny: any = storage as any;
      if (typeof sAny["processAiChat"] !== 'function') {
        return res.status(501).json({ message: "AI chat not implemented" });
      }
      const response = await sAny["processAiChat"]({
        message,
        reportId,
        sessionId,
        context,
        conversationHistory
      });
      res.json(response);
    } catch (err) {
      console.error('Error processing AI chat:', err);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get("/api/ai/conversations/:reportId/:sessionId", async (req, res) => {
    try {
      const { reportId, sessionId } = req.params;
      const sAny: any = storage as any;
      if (typeof sAny["getAiConversation"] !== 'function') {
        return res.status(501).json({ message: "AI conversations not implemented" });
      }
      const conversation = await sAny["getAiConversation"](parseInt(reportId), sessionId);
      res.json(conversation);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/ai/conversations", async (req, res) => {
    try {
      const sAny: any = storage as any;
      if (typeof sAny["saveAiConversation"] !== 'function') {
        return res.status(501).json({ message: "AI conversation persistence not implemented" });
      }
      const conversation = await sAny["saveAiConversation"](req.body);
      res.json(conversation);
    } catch (err) {
      console.error('Error saving conversation:', err);
      res.status(500).json({ message: "Failed to save conversation" });
    }
  });

  // Settlement Measurements Routes
  app.get("/api/settlement-surveys/:surveyId/measurements", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      const measurements = await storage.getAdvancedSettlementMeasurements(surveyId);
      res.json(measurements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch measurements" });
    }
  });

  app.post("/api/settlement-surveys/:surveyId/measurements", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      const measurementData = { ...req.body, surveyId };
      const newMeasurement = await storage.createAdvancedSettlementMeasurement(measurementData);
      res.json(newMeasurement);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create measurement" });
    }
  });

  app.post("/api/settlement-surveys/:surveyId/measurements/bulk", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      
      // Delete existing measurements for this survey first
      await storage.deleteAdvancedSettlementMeasurements(surveyId);
      
      // Create new measurements
      const measurements = req.body.measurements.map((m: any) => ({ ...m, surveyId }));
      const newMeasurements = await storage.createBulkAdvancedSettlementMeasurements(measurements);
      res.json(newMeasurements);
    } catch (err: any) {
      console.error('Error saving bulk measurements:', err);
      res.status(500).json({ message: "Failed to create measurements", error: err?.message || 'unknown error' });
    }
  });

  // Settlement Analysis Calculation Route
  app.post("/api/settlement-surveys/:surveyId/calculate", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      const { tankParams, tiePoints } = req.body;
      
      // Get measurements from database
      const measurements = await storage.getAdvancedSettlementMeasurements(surveyId);
      
      if (measurements.length === 0) {
        return res.status(400).json({ message: "No measurements found for this survey" });
      }
      
      // Import calculator functions
  const { calculateCosineFit, processExternalRingwallSurvey } = await import("./settlement-calculator.ts");
      
      // Convert measurements to points format
      let points = measurements.map(m => ({
        angle: Number(m.angle),
        elevation: Number(m.measuredElevation)
      }));
      
      // Process external ringwall survey if tie points provided
      if (tiePoints && tiePoints.length > 0) {
        points = processExternalRingwallSurvey(points, tiePoints);
      }
      
      // Calculate cosine fit
      const results = calculateCosineFit(points, tankParams);
      
      // Update survey with calculation results
      await storage.updateAdvancedSettlementSurvey(surveyId, {
        cosineAmplitude: results.amplitude.toString(),
        cosinePhase: results.phase.toString(),
        rSquared: results.rSquared.toString(),
        maxOutOfPlane: results.maxOutOfPlane.toString(),
        allowableSettlement: results.allowableSettlement.toString(),
        settlementAcceptance: results.settlementAcceptance,
        annexReference: results.annexReference,
        tankDiameter: tankParams.diameter.toString(),
        tankHeight: tankParams.height.toString(),
        shellYieldStrength: (tankParams.yieldStrength || 20000).toString(),
        elasticModulus: (tankParams.elasticModulus || 29000000).toString()
      });
      
      // Update measurements with calculated values
      for (let i = 0; i < measurements.length; i++) {
        const normalizedElevation = results.normalizedElevations[i];
        const cosineFitElevation = results.predictedElevations[i];
        const outOfPlane = results.outOfPlaneDeviations[i];
        
        // Update each measurement with calculated values
        await storage.updateAdvancedSettlementMeasurement(measurements[i].id, {
          normalizedElevation: normalizedElevation.toString(),
          cosineFitElevation: cosineFitElevation.toString(),
          outOfPlane: outOfPlane.toString()
        });
      }
      
      res.json(results);
    } catch (err) {
      console.error("Settlement calculation error:", err);
      res.status(500).json({ message: "Failed to calculate settlement analysis" });
    }
  });

  // Edge Settlement Routes
  app.get("/api/settlement-surveys/:surveyId/edge-settlements", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      const settlements = await storage.getEdgeSettlements(surveyId);
      res.json(settlements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch edge settlements" });
    }
  });

  app.post("/api/settlement-surveys/:surveyId/edge-settlements", async (req, res) => {
    try {
      const surveyId = parseInt(req.params.surveyId);
      const settlementData = { ...req.body, surveyId };
      const newSettlement = await storage.createEdgeSettlement(settlementData);
      res.json(newSettlement);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create edge settlement" });
    }
  });

  // ===== Extended Report Domain Endpoints =====
  // OpenAPI / Swagger (minimal schemas only)
  try {
    const spec = JSON.parse(readFileSync('openapi.json','utf-8'));
    app.get('/api/openapi.json', (_req,res)=>res.json(spec));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  } catch(e) {
    console.warn('OpenAPI spec not found; run `npm run openapi:gen` to generate.');
  }
  // Utility helpers
  const parseId = (val: any) => {
    const n = Number(val); return Number.isFinite(n) ? n : undefined;
  };

  // Components
  app.get('/api/reports/:reportId/components', async (req, res) => {
    const reportId = parseId(req.params.reportId);
    if (!reportId) return res.status(400).json({ success:false, message:'Invalid reportId' });
    // Pagination params
    const limitRaw = req.query.limit as string | undefined;
    const offsetRaw = req.query.offset as string | undefined;
    let limit = 50; // default
    let offset = 0;
    if (limitRaw !== undefined) {
      const n = Number(limitRaw); if(Number.isFinite(n) && n > 0 && n <= 500) limit = Math.floor(n);
    }
    if (offsetRaw !== undefined) {
      const n = Number(offsetRaw); if(Number.isFinite(n) && n >= 0) offset = Math.floor(n);
    }
    const rows = await db.select().from(reportComponents).where(eq(reportComponents.reportId, reportId)).limit(limit).offset(offset);
    res.json({ success:true, data: rows, pagination:{ limit, offset } });
  });
  app.post('/api/reports/:reportId/components', validate(componentSchema), async (req, res) => {
    try {
      const reportId = parseId(req.params.reportId);
      if (!reportId) return res.status(400).json({ success:false, message:'Invalid reportId' });
  const body = req.body;
      const inserted = await db.insert(reportComponents).values({
        reportId,
        componentId: body.componentId,
        description: body.description || null,
        componentType: body.componentType || null,
        nominalThickness: body.nominalThickness || null,
        actualThickness: body.actualThickness || null,
        previousThickness: body.previousThickness || null,
        corrosionRate: body.corrosionRate || null,
        remainingLife: body.remainingLife || null,
        governing: body.governing || false,
        notes: body.notes || null,
        createdAt: new Date().toISOString()
      }).returning();
      const fallback = {
        reportId,
        componentId: body.componentId,
        description: body.description || null,
        componentType: body.componentType || null,
        nominalThickness: body.nominalThickness || null,
        actualThickness: body.actualThickness || null,
        previousThickness: body.previousThickness || null,
        corrosionRate: body.corrosionRate || null,
        remainingLife: body.remainingLife || null,
        governing: body.governing || false,
        notes: body.notes || null
      };
      res.json({ success:true, data: inserted[0] || fallback });
    } catch (e:any) { res.status(500).json({ success:false, message:e.message }); }
  });
  app.patch('/api/reports/:reportId/components/:id', validate(componentPatchSchema), async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success:false, message:'Invalid id'});
    const patch = { ...req.body };
    await db.update(reportComponents).set(patch).where(eq(reportComponents.id, id));
    res.json({ success:true });
  });
  app.delete('/api/reports/:reportId/components/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportComponents).where(eq(reportComponents.id, id));
    res.json({ success:true });
  });

  // Nozzles
  app.get('/api/reports/:reportId/nozzles', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const limitRaw = req.query.limit as string | undefined;
    const offsetRaw = req.query.offset as string | undefined;
    let limit = 50; let offset = 0;
    if (limitRaw !== undefined) { const n = Number(limitRaw); if(Number.isFinite(n) && n > 0 && n <= 500) limit = Math.floor(n); }
    if (offsetRaw !== undefined) { const n = Number(offsetRaw); if(Number.isFinite(n) && n >= 0) offset = Math.floor(n); }
    const rows = await db.select().from(reportNozzles).where(eq(reportNozzles.reportId, reportId)).limit(limit).offset(offset);
    res.json({ success:true, data: rows, pagination:{ limit, offset } });
  });
  app.post('/api/reports/:reportId/nozzles', validate(nozzleSchema), async (req,res)=>{
    try {
      const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const b = req.body;
      const inserted = await db.insert(reportNozzles).values({
        reportId,
        nozzleTag: b.nozzleTag,
        size: b.size || null,
        service: b.service || null,
        elevation: b.elevation || null,
        orientation: b.orientation || null,
        nominalThickness: b.nominalThickness || null,
        actualThickness: b.actualThickness || null,
        previousThickness: b.previousThickness || null,
        corrosionRate: b.corrosionRate || null,
        remainingLife: b.remainingLife || null,
        tminPractical: b.tminPractical || null,
        tminUser: b.tminUser || null,
        status: b.status || null,
        notes: b.notes || null,
        createdAt: new Date().toISOString()
      }).returning();
      const fallback = {
        reportId,
        nozzleTag: b.nozzleTag,
        size: b.size || null,
        service: b.service || null,
        elevation: b.elevation || null,
        orientation: b.orientation || null,
        nominalThickness: b.nominalThickness || null,
        actualThickness: b.actualThickness || null,
        previousThickness: b.previousThickness || null,
        corrosionRate: b.corrosionRate || null,
        remainingLife: b.remainingLife || null,
        tminPractical: b.tminPractical || null,
        tminUser: b.tminUser || null,
        status: b.status || null,
        notes: b.notes || null
      };
      res.json({ success:true, data: inserted[0] || fallback });
    } catch(e:any){ res.status(500).json({ success:false, message:e.message }); }
  });
  app.patch('/api/reports/:reportId/nozzles/:id', validate(nozzlePatchSchema), async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.update(reportNozzles).set({ ...req.body }).where(eq(reportNozzles.id, id));
    res.json({ success:true });
  });
  app.delete('/api/reports/:reportId/nozzles/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportNozzles).where(eq(reportNozzles.id, id));
    res.json({ success:true });
  });

  // CML Points
  app.get('/api/reports/:reportId/cml-points', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const { parentType, parentId } = req.query as Record<string,string>;
    const limitRaw = req.query.limit as string | undefined;
    const offsetRaw = req.query.offset as string | undefined;
    let limit = 50; let offset = 0;
    if (limitRaw !== undefined) { const n = Number(limitRaw); if(Number.isFinite(n) && n>0 && n<=500) limit = Math.floor(n); }
    if (offsetRaw !== undefined) { const n = Number(offsetRaw); if(Number.isFinite(n) && n>=0) offset = Math.floor(n); }
    const baseRows = await db.select().from(cmlPoints).where(eq(cmlPoints.reportId, reportId));
    let filtered = baseRows;
    if (parentType || parentId) {
      if (!(parentType && parentId)) {
        return res.status(400).json({ success:false, message:'parentType and parentId must be provided together' });
      }
      if (!['component','nozzle'].includes(parentType)) {
        return res.status(400).json({ success:false, message:'Invalid parentType'});
      }
      const pid = Number(parentId);
      if (!Number.isFinite(pid)) return res.status(400).json({ success:false, message:'Invalid parentId'});
  filtered = filtered.filter((r: any) => r.parentType === parentType && r.parentId === pid);
    }
    const paged = filtered.slice(offset, offset + limit);
    res.json({ success:true, data: paged, pagination:{ limit, offset, total: filtered.length } });
  });
  app.post('/api/reports/:reportId/cml-points', validate(cmlPointSchema), async (req,res)=>{
    try {
      const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const b = req.body;
      const inserted = await db.insert(cmlPoints).values({
        reportId,
        parentType: b.parentType,
        parentId: b.parentId,
        cmlNumber: b.cmlNumber,
        point1: b.point1 || null,
        point2: b.point2 || null,
        point3: b.point3 || null,
        point4: b.point4 || null,
        point5: b.point5 || null,
        point6: b.point6 || null,
        governingPoint: b.governingPoint || null,
        notes: b.notes || null,
        createdAt: new Date().toISOString()
      }).returning();
      res.json({ success:true, data: inserted[0] });
    } catch(e:any){ res.status(500).json({ success:false, message:e.message }); }
  });
  app.put('/api/reports/:reportId/cml-points/bulk', validate(cmlBulkSchema), async (req,res)=>{
    try {
      const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const { parentType, parentId, points } = req.body;
      // Delete existing for parent
      const all = await db.select().from(cmlPoints).where(eq(cmlPoints.reportId, reportId));
  const toDelete = all.filter((r: any) => r.parentType === parentType && r.parentId === Number(parentId)).map((r: any) => r.id);
      for (const id of toDelete) {
        await db.delete(cmlPoints).where(eq(cmlPoints.id, id));
      }
      // Insert new
      const inserted: any[] = [];
      for (const p of points) {
        const ins = await db.insert(cmlPoints).values({
          reportId,
          parentType,
            parentId: Number(parentId),
          cmlNumber: p.cmlNumber,
          point1: p.readings?.[0] || null,
          point2: p.readings?.[1] || null,
          point3: p.readings?.[2] || null,
          point4: p.readings?.[3] || null,
          point5: p.readings?.[4] || null,
          point6: p.readings?.[5] || null,
          governingPoint: p.governingPoint || null,
          notes: p.notes || null,
          createdAt: new Date().toISOString()
        }).returning();
        inserted.push(ins[0]);
      }
      res.json({ success:true, data: inserted });
    } catch(e:any){ res.status(500).json({ success:false, message:e.message }); }
  });
  app.delete('/api/reports/:reportId/cml-points/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(cmlPoints).where(eq(cmlPoints.id, id));
    res.json({ success:true });
  });

  // Shell Courses
  app.get('/api/reports/:reportId/shell-courses', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const rows = await db.select().from(reportShellCourses).where(eq(reportShellCourses.reportId, reportId));
    res.json({ success:true, data: rows });
  });
  app.put('/api/reports/:reportId/shell-courses', validate(shellCoursesPutSchema), async (req,res)=>{
    try {
      const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const { courses } = req.body;
      // Simple strategy: delete existing then insert
      const existing = await db.select().from(reportShellCourses).where(eq(reportShellCourses.reportId, reportId));
      for (const r of existing) await db.delete(reportShellCourses).where(eq(reportShellCourses.id, r.id));
      const inserted: any[] = [];
      for (const c of courses) {
        const ins = await db.insert(reportShellCourses).values({
          reportId,
          courseNumber: c.courseNumber,
          courseHeight: c.courseHeight || null,
          nominalThickness: c.nominalThickness || null,
          actualThickness: c.actualThickness || null,
          previousThickness: c.previousThickness || null,
          corrosionRate: c.corrosionRate || null,
          remainingLife: c.remainingLife || null,
          jointEfficiency: c.jointEfficiency || null,
          stress: c.stress || null,
          altStress: c.altStress || null,
          tminCalc: c.tminCalc || null,
          tminAlt: c.tminAlt || null,
          fillHeight: c.fillHeight || null,
          governing: c.governing || false,
          notes: c.notes || null,
          createdAt: new Date().toISOString()
        }).returning();
        inserted.push(ins[0]);
      }
      res.json({ success:true, data: inserted });
    } catch(e:any){ res.status(500).json({ success:false, message:e.message }); }
  });
  app.patch('/api/reports/:reportId/shell-courses/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.update(reportShellCourses).set({ ...req.body }).where(eq(reportShellCourses.id, id));
    res.json({ success:true });
  });
  app.delete('/api/reports/:reportId/shell-courses/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportShellCourses).where(eq(reportShellCourses.id, id));
    res.json({ success:true });
  });

  // Appendices
  app.get('/api/reports/:reportId/appendices', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const rows = await db.select().from(reportAppendices).where(eq(reportAppendices.reportId, reportId));
    res.json({ success:true, data: rows });
  });
  app.get('/api/reports/:reportId/appendices/:code', async (req,res)=>{
    const reportId = parseId(req.params.reportId); const code = req.params.code;
    if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const rows = await db.select().from(reportAppendices).where(eq(reportAppendices.reportId, reportId));
  const appendix = rows.find((r: any) => r.appendixCode === code.toUpperCase());
    if(!appendix) return res.status(404).json({ success:false, message:'Not found'});
    res.json({ success:true, data: appendix });
  });
  app.put('/api/reports/:reportId/appendices/:code', validate(appendixSchema), async (req,res)=>{
    const reportId = parseId(req.params.reportId); const code = req.params.code?.toUpperCase();
    if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const existing = await db.select().from(reportAppendices).where(eq(reportAppendices.reportId, reportId));
  let target = existing.find((r: any) => r.appendixCode === code);
    if (!target) {
      const inserted = await db.insert(reportAppendices).values({
        reportId,
        appendixCode: code,
        subject: req.body.subject || null,
        defaultText: req.body.defaultText || null,
        userText: req.body.userText || null,
        applicable: req.body.applicable ?? true,
        orderIndex: req.body.orderIndex ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      target = inserted[0];
    } else {
      await db.update(reportAppendices).set({
        subject: req.body.subject ?? target.subject,
        userText: req.body.userText ?? target.userText,
        applicable: req.body.applicable ?? target.applicable,
        orderIndex: req.body.orderIndex ?? target.orderIndex,
        updatedAt: new Date().toISOString()
      }).where(eq(reportAppendices.id, target.id));
      const refreshed = await db.select().from(reportAppendices).where(eq(reportAppendices.id, target.id));
      target = refreshed[0];
    }
    res.json({ success:true, data: target });
  });

  // Writeup
  app.get('/api/reports/:reportId/writeup', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const rows = await db.select().from(reportWriteup).where(eq(reportWriteup.reportId, reportId));
    res.json({ success:true, data: rows[0] || null });
  });
  app.put('/api/reports/:reportId/writeup', validate(writeupPutSchema), async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const data = req.body;
    const existing = await db.select().from(reportWriteup).where(eq(reportWriteup.reportId, reportId));
    if (!existing.length) {
      const ins = await db.insert(reportWriteup).values({
        reportId,
        executiveSummary: data.executiveSummary || null,
        utResultsSummary: data.utResultsSummary || null,
        recommendationsSummary: data.recommendationsSummary || null,
        nextInternalYears: data.nextInternalYears || null,
        nextExternalYears: data.nextExternalYears || null,
        governingComponent: data.governingComponent || null,
        frozenNarrative: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      return res.json({ success:true, data: ins[0] });
    }
    const row = existing[0];
    await db.update(reportWriteup).set({
      executiveSummary: data.executiveSummary ?? row.executiveSummary,
      utResultsSummary: data.utResultsSummary ?? row.utResultsSummary,
      recommendationsSummary: data.recommendationsSummary ?? row.recommendationsSummary,
      nextInternalYears: data.nextInternalYears ?? row.nextInternalYears,
      nextExternalYears: data.nextExternalYears ?? row.nextExternalYears,
      governingComponent: data.governingComponent ?? row.governingComponent,
      updatedAt: new Date().toISOString()
    }).where(eq(reportWriteup.id, row.id));
    const refreshed = await db.select().from(reportWriteup).where(eq(reportWriteup.id, row.id));
    res.json({ success:true, data: refreshed[0] });
  });
  app.post('/api/reports/:reportId/writeup/freeze-narrative', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const existing = await db.select().from(reportWriteup).where(eq(reportWriteup.reportId, reportId));
    if (!existing.length) return res.status(404).json({ success:false, message:'Writeup not initialized'});
    await db.update(reportWriteup).set({ frozenNarrative: true, updatedAt: new Date().toISOString() }).where(eq(reportWriteup.id, existing[0].id));
    res.json({ success:true });
  });

  // Tmin Overrides
  app.get('/api/reports/:reportId/tmin-overrides', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const rows = await db.select().from(reportPracticalTminOverrides).where(eq(reportPracticalTminOverrides.reportId, reportId));
    res.json({ success:true, data: rows });
  });
  app.post('/api/reports/:reportId/tmin-overrides', validate(tminOverrideSchema), async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
  const b = req.body;
    const ins = await db.insert(reportPracticalTminOverrides).values({
      reportId,
      referenceType: b.referenceType,
      referenceId: b.referenceId,
      defaultTmin: b.defaultTmin || null,
      overrideTmin: b.overrideTmin || null,
      reason: b.reason || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    res.json({ success:true, data: ins[0] });
  });
  app.patch('/api/reports/:reportId/tmin-overrides/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.update(reportPracticalTminOverrides).set({ ...req.body, updatedAt: new Date().toISOString() }).where(eq(reportPracticalTminOverrides.id, id));
    res.json({ success:true });
  });
  app.delete('/api/reports/:reportId/tmin-overrides/:id', async (req,res)=>{
    const id = parseId(req.params.id); if(!id) return res.status(400).json({ success:false, message:'Invalid id'});
    await db.delete(reportPracticalTminOverrides).where(eq(reportPracticalTminOverrides.id, id));
    res.json({ success:true });
  });

  // OpenAPI / Swagger endpoints (if not already mounted earlier)
  try {
    const spec = JSON.parse(readFileSync('openapi.json','utf-8'));
    if (!(app as any)._openapiMounted) {
      app.get('/api/openapi.json', (_req,res)=>res.json(spec));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
      (app as any)._openapiMounted = true;
    }
  } catch {}

  return createServer(app);

  // Status aggregator
  app.get('/api/reports/:reportId/status', async (req,res)=>{
    const reportId = parseId(req.params.reportId); if(!reportId) return res.status(400).json({ success:false, message:'Invalid reportId'});
    const [components, nozzles, shell, appendices, writeupRow, tmin] = await Promise.all([
      db.select().from(reportComponents).where(eq(reportComponents.reportId, reportId)),
      db.select().from(reportNozzles).where(eq(reportNozzles.reportId, reportId)),
      db.select().from(reportShellCourses).where(eq(reportShellCourses.reportId, reportId)),
      db.select().from(reportAppendices).where(eq(reportAppendices.reportId, reportId)),
      db.select().from(reportWriteup).where(eq(reportWriteup.reportId, reportId)),
      db.select().from(reportPracticalTminOverrides).where(eq(reportPracticalTminOverrides.reportId, reportId))
    ]);

    const sectionStatus = (arr: any[], min=1) => arr.length >= min ? 'in_progress' : 'empty';

    const status = {
      components: sectionStatus(components),
      nozzles: sectionStatus(nozzles),
      shell: sectionStatus(shell),
      appendices: sectionStatus(appendices),
      writeup: writeupRow.length ? 'in_progress' : 'empty',
      tminOverrides: tmin.length ? 'in_progress' : 'empty'
    };
    res.json({ success:true, data: status });
  });

  // Ensure the function ends by creating and returning the HTTP server.
  // (Search for existing createServer usage to avoid duplication.)
  const httpServer = createServer(app);
  return httpServer;
}
