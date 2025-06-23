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
  location: text("location").notNull(),
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

export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertThicknessMeasurement = z.infer<typeof insertThicknessMeasurementSchema>;
export type ThicknessMeasurement = typeof thicknessMeasurements.$inferSelect;
export type InsertInspectionChecklist = z.infer<typeof insertInspectionChecklistSchema>;
export type InspectionChecklist = typeof inspectionChecklists.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;

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
