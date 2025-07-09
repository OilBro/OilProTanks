import { pgTable, text, serial, integer, decimal, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inspectionReports = pgTable("inspection_reports", {
  id: serial("id").primaryKey(),
  reportNumber: text("report_number").unique(),
  tankId: text("tank_id"),
  service: text("service"),
  diameter: decimal("diameter", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  inspector: text("inspector"),
  inspectionDate: text("inspection_date"),
  originalThickness: decimal("original_thickness", { precision: 10, scale: 3 }),
  yearsSinceLastInspection: integer("years_since_last_inspection"),
  status: text("status"), // draft, in_progress, completed, action_required
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const thicknessMeasurements = pgTable("thickness_measurements", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  component: text("component"),
  measurementType: text("measurement_type"), // shell, bottom_plate, internal_annular, critical_zone, roof, internal_component, external_repad, nozzle, flange, chime
  location: text("location"),
  elevation: text("elevation"),
  gridReference: text("grid_reference"), // For bottom plate grids (A1, B2, etc.)
  plateNumber: text("plate_number"), // Bottom plate identification
  annularRingPosition: text("annular_ring_position"), // Inner, outer, center for annular readings
  criticalZoneType: text("critical_zone_type"), // Settlement, corrosion, repair area
  repadNumber: text("repad_number"), // External repad identification
  repadType: text("repad_type"), // Full face, partial, reinforcement
  repadThickness: decimal("repad_thickness", { precision: 10, scale: 3 }), // Thickness of repad material
  nozzleId: text("nozzle_id"), // Nozzle identification (N1, N2, etc.)
  nozzleSize: text("nozzle_size"), // Nozzle diameter
  flangeClass: text("flange_class"), // ANSI flange class
  flangeType: text("flange_type"), // Weld neck, slip-on, blind, etc.
  originalThickness: decimal("original_thickness", { precision: 10, scale: 3 }),
  currentThickness: decimal("current_thickness", { precision: 10, scale: 3 }),
  corrosionRate: decimal("corrosion_rate", { precision: 10, scale: 4 }),
  remainingLife: decimal("remaining_life", { precision: 10, scale: 1 }),
  status: text("status"), // acceptable, monitor, action_required
  createdAt: text("created_at"),
});

// Appurtenance inspection records for detailed component tracking
export const appurtenanceInspections = pgTable("appurtenance_inspections", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  appurtenanceType: text("appurtenance_type"), // nozzle, manway, vent, ladder, platform, gauge, valve
  appurtenanceId: text("appurtenance_id"),
  location: text("location"),
  condition: text("condition"), // good, fair, poor, defective
  findings: text("findings"),
  recommendations: text("recommendations"),
  priority: text("priority"), // urgent, high, medium, routine
  photosAttached: boolean("photos_attached"),
  createdAt: text("created_at"),
});

// Document attachments for photos and supporting files
export const reportAttachments = pgTable("report_attachments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  filename: text("filename"),
  fileType: text("file_type"), // photo, document, drawing, ndt_report
  description: text("description"),
  category: text("category"), // general, defect, repair, nde, historical
  uploadedAt: text("uploaded_at"),
});

// Repair recommendations with tracking
export const repairRecommendations = pgTable("repair_recommendations", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  component: text("component"),
  location: text("location"),
  priority: text("priority"), // urgent, high, medium, routine
  description: text("description"),
  repairType: text("repair_type"),
  apiReference: text("api_reference"), // API 653 clause reference
  estimatedCompletion: text("estimated_completion"),
  createdAt: text("created_at"),
  defectDescription: text("defect_description"),
  recommendation: text("recommendation"),
  dueDate: text("due_date"),
  status: text("status"), // open, in_progress, completed, deferred
  completedDate: text("completed_date"),
  completionNotes: text("completion_notes"),
});

// Venting system inspection
export const ventingSystemInspections = pgTable("venting_system_inspections", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  ventType: text("vent_type"), // pressure_relief, vacuum_relief, conservation, emergency
  ventId: text("vent_id"),
  setpoint: text("setpoint"),
  condition: text("condition"),
  testResults: text("test_results"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  createdAt: text("created_at"),
});

export const inspectionChecklists = pgTable("inspection_checklists", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  category: text("category"), // external, internal
  item: text("item"),
  checked: boolean("checked"),
  notes: text("notes"),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name"),
  service: text("service"),
  description: text("description"),
  defaultComponents: jsonb("default_components"), // JSON array of components
  defaultChecklist: jsonb("default_checklist"), // JSON array of checklist items
  createdAt: text("created_at"),
});

export const settlementSurveys = pgTable("settlement_surveys", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  surveyType: text("survey_type", { enum: ["internal", "external"] }),
  measurementDate: text("measurement_date"),
  referencePoint: text("reference_point"),
  elevation: text("elevation"),
  location: text("location"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

export const dykeInspections = pgTable("dyke_inspections", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  dykeType: text("dyke_type"), // primary, secondary, ring_wall
  location: text("location"),
  condition: text("condition"), // excellent, good, fair, poor, failed
  height: text("height"), // Measured height
  width: text("width"), // Measured width at top
  material: text("material"), // Concrete, earth, steel, composite
  drainage: text("drainage"), // adequate, inadequate, blocked, none
  cracking: boolean("cracking"),
  settlement: boolean("settlement"),
  erosion: boolean("erosion"),
  vegetation: boolean("vegetation"),
  spillageEvidence: boolean("spillage_evidence"),
  capacity: text("capacity"), // Calculated or design capacity
  notes: text("notes"),
  createdAt: text("created_at"),
});

export const insertInspectionReportSchema = createInsertSchema(inspectionReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThicknessMeasurementSchema = createInsertSchema(thicknessMeasurements).omit({
  id: true,
  createdAt: true,
});

export const insertInspectionChecklistSchema = createInsertSchema(inspectionChecklists).omit({
  id: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertSettlementSurveySchema = createInsertSchema(settlementSurveys).omit({
  id: true,
  createdAt: true,
});

export const insertDykeInspectionSchema = createInsertSchema(dykeInspections).omit({
  id: true,
  createdAt: true,
});

export const insertAppurtenanceInspectionSchema = createInsertSchema(appurtenanceInspections).omit({
  id: true,
  createdAt: true,
});

export const insertReportAttachmentSchema = createInsertSchema(reportAttachments).omit({
  id: true,
  uploadedAt: true,
});

export const insertRepairRecommendationSchema = createInsertSchema(repairRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertVentingSystemInspectionSchema = createInsertSchema(ventingSystemInspections).omit({
  id: true,
  createdAt: true,
});

export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertThicknessMeasurement = z.infer<typeof insertThicknessMeasurementSchema>;
export type ThicknessMeasurement = typeof thicknessMeasurements.$inferSelect;
export type InsertInspectionChecklist = z.infer<typeof insertInspectionChecklistSchema>;
export type InspectionChecklist = typeof inspectionChecklists.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertSettlementSurvey = z.infer<typeof insertSettlementSurveySchema>;
export type SettlementSurvey = typeof settlementSurveys.$inferSelect;
export type InsertDykeInspection = z.infer<typeof insertDykeInspectionSchema>;
export type DykeInspection = typeof dykeInspections.$inferSelect;
export type InsertAppurtenanceInspection = z.infer<typeof insertAppurtenanceInspectionSchema>;
export type AppurtenanceInspection = typeof appurtenanceInspections.$inferSelect;
export type InsertReportAttachment = z.infer<typeof insertReportAttachmentSchema>;
export type ReportAttachment = typeof reportAttachments.$inferSelect;
export type InsertRepairRecommendation = z.infer<typeof insertRepairRecommendationSchema>;
export type RepairRecommendation = typeof repairRecommendations.$inferSelect;
export type InsertVentingSystemInspection = z.infer<typeof insertVentingSystemInspectionSchema>;
export type VentingSystemInspection = typeof ventingSystemInspections.$inferSelect;

// Inspection checklist templates
export const checklistTemplates = pgTable("checklist_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // external, internal, foundation, roof, etc.
  items: text("items").notNull(), // JSON array of checklist items
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;

// Users table for basic auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
