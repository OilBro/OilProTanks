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
  // Professional report fields
  customer: text("customer"),
  location: text("location"),
  inspectionScope: text("inspection_scope"),
  reviewer: text("reviewer"),
  specificGravity: text("specific_gravity"),
  yearBuilt: text("year_built"),
  manufacturer: text("manufacturer"),
  constructionStandard: text("construction_standard"),
  shellMaterial: text("shell_material"),
  foundationType: text("foundation_type"),
  roofType: text("roof_type"),
  capacity: text("capacity"),
  capacityUnit: text("capacity_unit"),
  product: text("product"),
  facilityName: text("facility_name"),
  tankAge: integer("tank_age"),
  designCode: text("design_code"),
  lastInternalInspection: text("last_internal_inspection"),
  nextInternalInspection: text("next_internal_inspection"),
  nextExternalInspection: text("next_external_inspection"),
  diameterUnit: text("diameter_unit"),
  heightUnit: text("height_unit"),
  coatingCondition: text("coating_condition"),
  foundationSettlement: text("foundation_settlement"),
  foundationCracking: text("foundation_cracking"),
  foundationSealing: text("foundation_sealing"),
  maxSettlement: text("max_settlement"),
  settlementLocation: text("settlement_location"),
  settlementCompliance: text("settlement_compliance"),
  surveyMethod: text("survey_method"),
  inspectorCertification: text("inspector_certification"),
  inspectorExperience: text("inspector_experience"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  origin: text("origin"), // manual, import, template, api
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
// AI Assistant conversation history
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  userId: text("user_id"),
  sessionId: text("session_id"),
  context: text("context"), // current inspection step/section
  messages: jsonb("messages").$type<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
      section?: string;
      component?: string;
      measurement?: any;
      api653Reference?: string;
    };
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const aiGuidanceTemplates = pgTable("ai_guidance_templates", {
  id: serial("id").primaryKey(),
  category: text("category"), // thickness, settlement, checklist, safety, api653
  section: text("section"),
  triggerKeywords: jsonb("trigger_keywords").$type<string[]>(),
  guidanceText: text("guidance_text"),
  api653References: jsonb("api653_references").$type<string[]>(),
  relatedCalculations: jsonb("related_calculations").$type<string[]>(),
  warningThresholds: jsonb("warning_thresholds").$type<any>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

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

// AI Assistant types
export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAiGuidanceTemplateSchema = createInsertSchema(aiGuidanceTemplates).omit({
  id: true,
  createdAt: true
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiGuidanceTemplate = typeof aiGuidanceTemplates.$inferSelect;
export type InsertAiGuidanceTemplate = z.infer<typeof insertAiGuidanceTemplateSchema>;

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

// Advanced Settlement Survey tables for API 653 Annex B calculations
export const advancedSettlementSurveys = pgTable("advanced_settlement_surveys", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  surveyType: text("survey_type"), // internal, external_ringwall
  surveyDate: text("survey_date"),
  numberOfPoints: integer("number_of_points"),
  // Tank parameters for calculations
  tankDiameter: decimal("tank_diameter", { precision: 10, scale: 2 }), // feet
  tankHeight: decimal("tank_height", { precision: 10, scale: 2 }), // feet
  shellYieldStrength: decimal("shell_yield_strength", { precision: 10, scale: 0 }), // psi
  elasticModulus: decimal("elastic_modulus", { precision: 12, scale: 0 }), // psi
  // Cosine fit results
  cosineAmplitude: decimal("cosine_amplitude", { precision: 10, scale: 4 }), // A value
  cosinePhase: decimal("cosine_phase", { precision: 10, scale: 4 }), // B value (radians)
  rSquared: decimal("r_squared", { precision: 10, scale: 4 }), // R² value
  maxOutOfPlane: decimal("max_out_of_plane", { precision: 10, scale: 4 }), // inches
  allowableSettlement: decimal("allowable_settlement", { precision: 10, scale: 4 }), // inches
  settlementAcceptance: text("settlement_acceptance"), // ACCEPTABLE, MONITOR, ACTION_REQUIRED
  // Annex B references
  calculationMethod: text("calculation_method"), // cosine_fit, rigid_body_tilt, etc.
  annexReference: text("annex_reference"), // B.2.2.4, B.3.2.1, etc.
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Individual settlement measurement points for advanced surveys
export const advancedSettlementMeasurements = pgTable("advanced_settlement_measurements", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id"),
  pointNumber: integer("point_number"),
  angle: decimal("angle", { precision: 10, scale: 2 }), // degrees from reference
  measuredElevation: decimal("measured_elevation", { precision: 10, scale: 4 }), // inches
  normalizedElevation: decimal("normalized_elevation", { precision: 10, scale: 4 }), // Ui (inches)
  cosineFitElevation: decimal("cosine_fit_elevation", { precision: 10, scale: 4 }), // predicted
  outOfPlane: decimal("out_of_plane", { precision: 10, scale: 4 }), // Si (inches)
  tieShot: boolean("tie_shot"), // is this a tie shot point
  tieOffset: decimal("tie_offset", { precision: 10, scale: 4 }), // offset for multi-setup surveys
  createdAt: text("created_at"),
});

// Edge settlement measurements for chime/breakover analysis
export const edgeSettlements = pgTable("edge_settlements", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id"),
  measurementType: text("measurement_type"), // edge_settlement, breakover
  edgeWidth: decimal("edge_width", { precision: 10, scale: 2 }), // B value (inches)
  radiusToEdge: decimal("radius_to_edge", { precision: 10, scale: 2 }), // R value (inches)
  measuredSettlement: decimal("measured_settlement", { precision: 10, scale: 4 }), // Bew (inches)
  allowableSettlement: decimal("allowable_settlement", { precision: 10, scale: 4 }), // Be (inches)
  settlementRatio: decimal("settlement_ratio", { precision: 10, scale: 4 }), // Bew/Be
  acceptanceCriteria: text("acceptance_criteria"), // per B.3.4
  createdAt: text("created_at"),
});

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

// Insert schemas for advanced settlement tables
export const insertAdvancedSettlementSurveySchema = createInsertSchema(advancedSettlementSurveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdvancedSettlementMeasurementSchema = createInsertSchema(advancedSettlementMeasurements).omit({
  id: true,
  createdAt: true,
});

export const insertEdgeSettlementSchema = createInsertSchema(edgeSettlements).omit({
  id: true,
  createdAt: true,
});

// Export inferred types for advanced settlement domain
export type AdvancedSettlementSurvey = typeof advancedSettlementSurveys.$inferSelect;
export type InsertAdvancedSettlementSurvey = z.infer<typeof insertAdvancedSettlementSurveySchema>;
export type AdvancedSettlementMeasurement = typeof advancedSettlementMeasurements.$inferSelect;
export type InsertAdvancedSettlementMeasurement = z.infer<typeof insertAdvancedSettlementMeasurementSchema>;
export type EdgeSettlement = typeof edgeSettlements.$inferSelect;
export type InsertEdgeSettlement = z.infer<typeof insertEdgeSettlementSchema>;

// Report Components (shell courses, plates, structural elements at higher abstraction than individual measurements)
export const reportComponents = pgTable("report_components", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  componentId: text("component_id"), // e.g., SHL-CRS-1, ROOF, FLOOR
  description: text("description"),
  componentType: text("component_type"), // shell_course, roof, floor, nozzle_group, foundation
  nominalThickness: decimal("nominal_thickness", { precision: 10, scale: 3 }),
  actualThickness: decimal("actual_thickness", { precision: 10, scale: 3 }),
  previousThickness: decimal("previous_thickness", { precision: 10, scale: 3 }),
  corrosionRate: decimal("corrosion_rate", { precision: 10, scale: 4 }),
  remainingLife: decimal("remaining_life", { precision: 10, scale: 2 }),
  governing: boolean("governing"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// Report Nozzles (metadata separate from individual thickness points)
export const reportNozzles = pgTable("report_nozzles", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  nozzleTag: text("nozzle_tag"), // N1, N2, MW24 etc
  size: text("size"), // numeric size in inches as string
  service: text("service"),
  elevation: text("elevation"),
  orientation: text("orientation"), // N, S, E, W or degrees
  nominalThickness: decimal("nominal_thickness", { precision: 10, scale: 3 }),
  actualThickness: decimal("actual_thickness", { precision: 10, scale: 3 }),
  previousThickness: decimal("previous_thickness", { precision: 10, scale: 3 }),
  corrosionRate: decimal("corrosion_rate", { precision: 10, scale: 4 }),
  remainingLife: decimal("remaining_life", { precision: 10, scale: 2 }),
  tminPractical: decimal("tmin_practical", { precision: 10, scale: 3 }),
  tminUser: decimal("tmin_user", { precision: 10, scale: 3 }),
  status: text("status"), // acceptable, monitor, action_required
  notes: text("notes"),
  createdAt: text("created_at"),
});

// Consolidated thickness points per CML entity (component or nozzle)
export const cmlPoints = pgTable("cml_points", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  parentType: text("parent_type"), // component, nozzle
  parentId: integer("parent_id"),
  cmlNumber: integer("cml_number"),
  point1: decimal("point_1", { precision: 10, scale: 3 }),
  point2: decimal("point_2", { precision: 10, scale: 3 }),
  point3: decimal("point_3", { precision: 10, scale: 3 }),
  point4: decimal("point_4", { precision: 10, scale: 3 }),
  point5: decimal("point_5", { precision: 10, scale: 3 }),
  point6: decimal("point_6", { precision: 10, scale: 3 }),
  governingPoint: decimal("governing_point", { precision: 10, scale: 3 }),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// Shell Course calculation rows (structured for hoop stress & remaining life calcs)
export const reportShellCourses = pgTable("report_shell_courses", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  courseNumber: integer("course_number"),
  courseHeight: decimal("course_height", { precision: 10, scale: 3 }), // feet
  nominalThickness: decimal("nominal_thickness", { precision: 10, scale: 3 }),
  actualThickness: decimal("actual_thickness", { precision: 10, scale: 3 }),
  previousThickness: decimal("previous_thickness", { precision: 10, scale: 3 }),
  corrosionRate: decimal("corrosion_rate", { precision: 10, scale: 4 }),
  remainingLife: decimal("remaining_life", { precision: 10, scale: 2 }),
  jointEfficiency: decimal("joint_efficiency", { precision: 5, scale: 3 }),
  stress: decimal("stress", { precision: 10, scale: 0 }), // psi
  altStress: decimal("alt_stress", { precision: 10, scale: 0 }),
  tminCalc: decimal("tmin_calc", { precision: 10, scale: 3 }),
  tminAlt: decimal("tmin_alt", { precision: 10, scale: 3 }),
  fillHeight: decimal("fill_height", { precision: 10, scale: 3 }),
  governing: boolean("governing"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// Appendices (A-H) storage with default + user modified text
export const reportAppendices = pgTable("report_appendices", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  appendixCode: text("appendix_code"), // A, B, C ... H
  subject: text("subject"),
  defaultText: text("default_text"),
  userText: text("user_text"),
  applicable: boolean("applicable"),
  orderIndex: integer("order_index"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Write-up & executive summary consolidated record
export const reportWriteup = pgTable("report_writeup", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  executiveSummary: text("executive_summary"),
  utResultsSummary: text("ut_results_summary"),
  recommendationsSummary: text("recommendations_summary"),
  nextInternalYears: integer("next_internal_years"),
  nextExternalYears: integer("next_external_years"),
  governingComponent: text("governing_component"),
  frozenNarrative: boolean("frozen_narrative"), // flag once first manual save
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Practical tmin overrides per nozzle / component
export const reportPracticalTminOverrides = pgTable("report_practical_tmin_overrides", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id"),
  referenceType: text("reference_type"), // nozzle, pipe_nozzle, component
  referenceId: text("reference_id"), // N6, MW24, SHL-CRS-1
  defaultTmin: decimal("default_tmin", { precision: 10, scale: 3 }),
  overrideTmin: decimal("override_tmin", { precision: 10, scale: 3 }),
  reason: text("reason"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Insert schemas & types
export const insertReportComponentSchema = createInsertSchema(reportComponents).omit({ id: true, createdAt: true });
export const insertReportNozzleSchema = createInsertSchema(reportNozzles).omit({ id: true, createdAt: true });
export const insertCmlPointSchema = createInsertSchema(cmlPoints).omit({ id: true, createdAt: true });
export const insertReportShellCourseSchema = createInsertSchema(reportShellCourses).omit({ id: true, createdAt: true });
export const insertReportAppendixSchema = createInsertSchema(reportAppendices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportWriteupSchema = createInsertSchema(reportWriteup).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportPracticalTminOverrideSchema = createInsertSchema(reportPracticalTminOverrides).omit({ id: true, createdAt: true, updatedAt: true });

export type ReportComponent = typeof reportComponents.$inferSelect;
export type InsertReportComponent = z.infer<typeof insertReportComponentSchema>;
export type ReportNozzle = typeof reportNozzles.$inferSelect;
export type InsertReportNozzle = z.infer<typeof insertReportNozzleSchema>;
export type CmlPoint = typeof cmlPoints.$inferSelect;
export type InsertCmlPoint = z.infer<typeof insertCmlPointSchema>;
export type ReportShellCourse = typeof reportShellCourses.$inferSelect;
export type InsertReportShellCourse = z.infer<typeof insertReportShellCourseSchema>;
export type ReportAppendix = typeof reportAppendices.$inferSelect;
export type InsertReportAppendix = z.infer<typeof insertReportAppendixSchema>;
export type ReportWriteup = typeof reportWriteup.$inferSelect;
export type InsertReportWriteup = z.infer<typeof insertReportWriteupSchema>;
export type ReportPracticalTminOverride = typeof reportPracticalTminOverrides.$inferSelect;
export type InsertReportPracticalTminOverride = z.infer<typeof insertReportPracticalTminOverrideSchema>;
