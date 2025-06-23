import { pgTable, text, serial, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inspectionReports = pgTable("inspection_reports", {
  id: serial("id").primaryKey(),
  reportNumber: text("report_number").notNull().unique(),
  tankId: text("tank_id").notNull(),
  service: text("service").notNull(),
  diameter: decimal("diameter", { precision: 10, scale: 2 }),
  height: decimal("height", { precision: 10, scale: 2 }),
  inspector: text("inspector").notNull(),
  inspectionDate: text("inspection_date").notNull(),
  originalThickness: decimal("original_thickness", { precision: 10, scale: 3 }),
  yearsSinceLastInspection: integer("years_since_last_inspection"),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed, action_required
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const thicknessMeasurements = pgTable("thickness_measurements", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  component: text("component").notNull(),
  measurementType: text("measurement_type").notNull().default("shell"), // shell, bottom_plate, internal_annular, critical_zone, roof, internal_component, external_repad, nozzle, flange, chime
  location: text("location").notNull(),
  elevation: text("elevation"),
  gridReference: text("grid_reference"), // For bottom plate grids (A1, B2, etc.)
  plateNumber: text("plate_number"), // Bottom plate identification
  annularRingPosition: text("annular_ring_position"), // Inner, outer, center for annular readings
  criticalZoneType: text("critical_zone_type"), // Settlement, corrosion, repair area
  repadNumber: text("repad_number"), // External repad identification
  repadType: text("repad_type"), // Full face, partial, reinforcement
  repadThickness: text("repad_thickness"), // Thickness of repad material
  nozzleId: text("nozzle_id"), // Nozzle identification (N1, N2, etc.)
  nozzleSize: text("nozzle_size"), // Nozzle diameter
  flangeClass: text("flange_class"), // ANSI flange class
  flangeType: text("flange_type"), // Weld neck, slip-on, blind, etc.
  originalThickness: text("original_thickness"),
  currentThickness: decimal("current_thickness", { precision: 10, scale: 3 }),
  corrosionRate: decimal("corrosion_rate", { precision: 10, scale: 4 }),
  remainingLife: decimal("remaining_life", { precision: 10, scale: 1 }),
  status: text("status").notNull().default("acceptable"), // acceptable, monitor, action_required
  createdAt: text("created_at").notNull(),
});

export const inspectionChecklists = pgTable("inspection_checklists", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  category: text("category").notNull(), // external, internal
  item: text("item").notNull(),
  checked: boolean("checked").notNull().default(false),
  notes: text("notes"),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  service: text("service").notNull(),
  description: text("description"),
  defaultComponents: jsonb("default_components"), // JSON array of components
  defaultChecklist: jsonb("default_checklist"), // JSON array of checklist items
  createdAt: text("created_at").notNull(),
});

export const settlementSurveys = pgTable("settlement_surveys", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  surveyType: text("survey_type", { enum: ["internal", "external"] }).notNull(),
  measurementDate: text("measurement_date").notNull(),
  referencePoint: text("reference_point").notNull(),
  elevation: text("elevation").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const dykeInspections = pgTable("dyke_inspections", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  dykeType: text("dyke_type").notNull(), // primary, secondary, ring_wall
  location: text("location").notNull(),
  condition: text("condition").notNull(), // excellent, good, fair, poor, failed
  height: text("height"), // Measured height
  width: text("width"), // Measured width at top
  material: text("material"), // Concrete, earth, steel, composite
  drainage: text("drainage").notNull().default("adequate"), // adequate, inadequate, blocked, none
  cracking: boolean("cracking").notNull().default(false),
  settlement: boolean("settlement").notNull().default(false),
  erosion: boolean("erosion").notNull().default(false),
  vegetation: boolean("vegetation").notNull().default(false),
  spillageEvidence: boolean("spillage_evidence").notNull().default(false),
  capacity: text("capacity"), // Calculated or design capacity
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
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
