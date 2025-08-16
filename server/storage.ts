import { 
  users, 
  inspectionReports, 
  thicknessMeasurements, 
  inspectionChecklists, 
  reportTemplates,
  appurtenanceInspections,
  reportAttachments,
  repairRecommendations,
  ventingSystemInspections,
  advancedSettlementSurveys,
  advancedSettlementMeasurements,
  edgeSettlements,
  type User, 
  type InsertUser,
  type InspectionReport,
  type InsertInspectionReport,
  type ThicknessMeasurement,
  type InsertThicknessMeasurement,
  type InspectionChecklist,
  type InsertInspectionChecklist,
  type ReportTemplate,
  type InsertReportTemplate,
  type AppurtenanceInspection,
  type InsertAppurtenanceInspection,
  type ReportAttachment,
  type InsertReportAttachment,
  type RepairRecommendation,
  type InsertRepairRecommendation,
  type VentingSystemInspection,
  type InsertVentingSystemInspection,
  type AdvancedSettlementSurvey,
  type InsertAdvancedSettlementSurvey,
  type AdvancedSettlementMeasurement,
  type InsertAdvancedSettlementMeasurement,
  type EdgeSettlement,
  type InsertEdgeSettlement
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Inspection Reports
  getInspectionReports(): Promise<InspectionReport[]>;
  getInspectionReport(id: number): Promise<InspectionReport | undefined>;
  createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport>;
  updateInspectionReport(id: number, report: Partial<InsertInspectionReport>): Promise<InspectionReport>;
  deleteInspectionReport(id: number): Promise<boolean>;
  
  // Thickness Measurements
  getThicknessMeasurements(reportId: number): Promise<ThicknessMeasurement[]>;
  createThicknessMeasurement(measurement: InsertThicknessMeasurement): Promise<ThicknessMeasurement>;
  updateThicknessMeasurement(id: number, measurement: Partial<InsertThicknessMeasurement>): Promise<ThicknessMeasurement>;
  deleteThicknessMeasurement(id: number): Promise<boolean>;
  
  // Inspection Checklists
  getInspectionChecklists(reportId: number): Promise<InspectionChecklist[]>;
  createInspectionChecklist(checklist: InsertInspectionChecklist): Promise<InspectionChecklist>;
  updateInspectionChecklist(id: number, checklist: Partial<InsertInspectionChecklist>): Promise<InspectionChecklist>;
  
  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  
  // Appurtenance Inspections
  getAppurtenanceInspections(reportId: number): Promise<AppurtenanceInspection[]>;
  createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection>;
  
  // Report Attachments
  getReportAttachments(reportId: number): Promise<ReportAttachment[]>;
  createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment>;
  
  // Repair Recommendations
  getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]>;
  createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation>;
  
  // Venting System Inspections
  getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]>;
  createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection>;
  
  // Advanced Settlement Surveys
  getAdvancedSettlementSurveys(reportId: number): Promise<AdvancedSettlementSurvey[]>;
  getAdvancedSettlementSurvey(id: number): Promise<AdvancedSettlementSurvey | undefined>;
  createAdvancedSettlementSurvey(survey: InsertAdvancedSettlementSurvey): Promise<AdvancedSettlementSurvey>;
  updateAdvancedSettlementSurvey(id: number, survey: Partial<InsertAdvancedSettlementSurvey>): Promise<AdvancedSettlementSurvey>;
  
  // Advanced Settlement Measurements
  getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]>;
  createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement>;
  createBulkAdvancedSettlementMeasurements(measurements: InsertAdvancedSettlementMeasurement[]): Promise<AdvancedSettlementMeasurement[]>;
  
  // Edge Settlements
  getEdgeSettlements(surveyId: number): Promise<EdgeSettlement[]>;
  createEdgeSettlement(settlement: InsertEdgeSettlement): Promise<EdgeSettlement>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private inspectionReports: Map<number, InspectionReport>;
  private thicknessMeasurements: Map<number, ThicknessMeasurement>;
  private inspectionChecklists: Map<number, InspectionChecklist>;
  private reportTemplates: Map<number, ReportTemplate>;
  private appurtenanceInspections: Map<number, AppurtenanceInspection>;
  private reportAttachments: Map<number, ReportAttachment>;
  private repairRecommendations: Map<number, RepairRecommendation>;
  private ventingSystemInspections: Map<number, VentingSystemInspection>;
  private advancedSettlementSurveys: Map<number, AdvancedSettlementSurvey>;
  private advancedSettlementMeasurements: Map<number, AdvancedSettlementMeasurement>;
  private edgeSettlements: Map<number, EdgeSettlement>;
  private currentUserId: number;
  private currentReportId: number;
  private currentMeasurementId: number;
  private currentChecklistId: number;
  private currentTemplateId: number;
  private currentAppurtenanceId: number;
  private currentAttachmentId: number;
  private currentRecommendationId: number;
  private currentVentingId: number;
  private currentSettlementSurveyId: number;
  private currentSettlementMeasurementId: number;
  private currentEdgeSettlementId: number;

  constructor() {
    this.users = new Map();
    this.inspectionReports = new Map();
    this.thicknessMeasurements = new Map();
    this.inspectionChecklists = new Map();
    this.reportTemplates = new Map();
    this.appurtenanceInspections = new Map();
    this.reportAttachments = new Map();
    this.repairRecommendations = new Map();
    this.ventingSystemInspections = new Map();
    this.advancedSettlementSurveys = new Map();
    this.advancedSettlementMeasurements = new Map();
    this.edgeSettlements = new Map();
    this.currentUserId = 1;
    this.currentReportId = 1;
    this.currentMeasurementId = 1;
    this.currentChecklistId = 1;
    this.currentTemplateId = 1;
    this.currentAppurtenanceId = 1;
    this.currentAttachmentId = 1;
    this.currentRecommendationId = 1;
    this.currentVentingId = 1;
    this.currentSettlementSurveyId = 1;
    this.currentSettlementMeasurementId = 1;
    this.currentEdgeSettlementId = 1;
    
    this.initializeTemplates();
  }

  private initializeTemplates() {
    const now = new Date().toISOString();
    
    const templates = [
      {
        name: "Crude Oil Tank",
        service: "crude",
        description: "Pre-configured template for crude oil storage tanks with standard measurement locations and checklist items.",
        defaultComponents: [
          "Shell Course 1",
          "Shell Course 2", 
          "Shell Course 3",
          "Bottom Plate",
          "Roof"
        ],
        defaultChecklist: [
          { category: "external", item: "Foundation condition assessed" },
          { category: "external", item: "Shell external condition checked" },
          { category: "external", item: "Coating condition evaluated" },
          { category: "external", item: "Appurtenances inspected" },
          { category: "internal", item: "Bottom plate condition assessed" },
          { category: "internal", item: "Shell internal condition checked" },
          { category: "internal", item: "Roof structure inspected" },
          { category: "internal", item: "Internal appurtenances checked" }
        ],
        createdAt: now
      },
      {
        name: "Diesel Tank", 
        service: "diesel",
        description: "Template optimized for diesel fuel storage tanks with specific corrosion considerations.",
        defaultComponents: [
          "Shell Course 1",
          "Shell Course 2",
          "Bottom Plate",
          "Roof"
        ],
        defaultChecklist: [
          { category: "external", item: "Foundation condition assessed" },
          { category: "external", item: "Shell external condition checked" },
          { category: "external", item: "Coating condition evaluated" },
          { category: "external", item: "Appurtenances inspected" },
          { category: "internal", item: "Bottom plate condition assessed" },
          { category: "internal", item: "Shell internal condition checked" },
          { category: "internal", item: "Roof structure inspected" },
          { category: "internal", item: "Internal appurtenances checked" }
        ],
        createdAt: now
      },
      {
        name: "Gasoline Tank",
        service: "gasoline", 
        description: "Specialized template for gasoline storage with enhanced safety checklist items.",
        defaultComponents: [
          "Shell Course 1",
          "Shell Course 2",
          "Bottom Plate",
          "Roof"
        ],
        defaultChecklist: [
          { category: "external", item: "Foundation condition assessed" },
          { category: "external", item: "Shell external condition checked" },
          { category: "external", item: "Coating condition evaluated" },
          { category: "external", item: "Appurtenances inspected" },
          { category: "external", item: "Vapor recovery system checked" },
          { category: "internal", item: "Bottom plate condition assessed" },
          { category: "internal", item: "Shell internal condition checked" },
          { category: "internal", item: "Roof structure inspected" },
          { category: "internal", item: "Internal appurtenances checked" },
          { category: "internal", item: "Fire suppression system verified" }
        ],
        createdAt: now
      }
    ];

    templates.forEach(template => {
      const id = this.currentTemplateId++;
      this.reportTemplates.set(id, { id, ...template });
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Inspection Reports
  async getInspectionReports(): Promise<InspectionReport[]> {
    return Array.from(this.inspectionReports.values());
  }

  async getInspectionReport(id: number): Promise<InspectionReport | undefined> {
    return this.inspectionReports.get(id);
  }

  async createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport> {
    const id = this.currentReportId++;
    const now = new Date().toISOString();
    const newReport: InspectionReport = { 
      ...report,
      diameter: report.diameter || null,
      height: report.height || null,
      originalThickness: report.originalThickness || null,
      yearsSinceLastInspection: report.yearsSinceLastInspection || null,
      status: report.status || null,
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.inspectionReports.set(id, newReport);
    return newReport;
  }

  async updateInspectionReport(id: number, report: Partial<InsertInspectionReport>): Promise<InspectionReport> {
    const existing = this.inspectionReports.get(id);
    if (!existing) {
      throw new Error(`Report with id ${id} not found`);
    }
    const updated: InspectionReport = { 
      ...existing, 
      ...report, 
      updatedAt: new Date().toISOString() 
    };
    this.inspectionReports.set(id, updated);
    return updated;
  }

  async deleteInspectionReport(id: number): Promise<boolean> {
    return this.inspectionReports.delete(id);
  }

  // Thickness Measurements
  async getThicknessMeasurements(reportId: number): Promise<ThicknessMeasurement[]> {
    return Array.from(this.thicknessMeasurements.values()).filter(
      measurement => measurement.reportId === reportId
    );
  }

  async createThicknessMeasurement(measurement: InsertThicknessMeasurement): Promise<ThicknessMeasurement> {
    const id = this.currentMeasurementId++;
    const now = new Date().toISOString();
    const newMeasurement: ThicknessMeasurement = { 
      id,
      reportId: measurement.reportId,
      component: measurement.component,
      measurementType: measurement.measurementType || 'shell',
      location: measurement.location,
      elevation: measurement.elevation || null,
      gridReference: measurement.gridReference || null,
      plateNumber: measurement.plateNumber || null,
      annularRingPosition: measurement.annularRingPosition || null,
      criticalZoneType: measurement.criticalZoneType || null,
      repadNumber: measurement.repadNumber || null,
      repadType: measurement.repadType || null,
      repadThickness: measurement.repadThickness || null,
      nozzleId: measurement.nozzleId || null,
      nozzleSize: measurement.nozzleSize || null,
      flangeClass: measurement.flangeClass || null,
      flangeType: measurement.flangeType || null,
      originalThickness: measurement.originalThickness || null,
      currentThickness: measurement.currentThickness || null,
      corrosionRate: measurement.corrosionRate || null,
      remainingLife: measurement.remainingLife || null,
      status: measurement.status || 'acceptable',
      createdAt: now 
    };
    this.thicknessMeasurements.set(id, newMeasurement);
    return newMeasurement;
  }

  async updateThicknessMeasurement(id: number, measurement: Partial<InsertThicknessMeasurement>): Promise<ThicknessMeasurement> {
    const existing = this.thicknessMeasurements.get(id);
    if (!existing) {
      throw new Error(`Measurement with id ${id} not found`);
    }
    const updated: ThicknessMeasurement = { ...existing, ...measurement };
    this.thicknessMeasurements.set(id, updated);
    return updated;
  }

  async deleteThicknessMeasurement(id: number): Promise<boolean> {
    return this.thicknessMeasurements.delete(id);
  }

  // Inspection Checklists
  async getInspectionChecklists(reportId: number): Promise<InspectionChecklist[]> {
    return Array.from(this.inspectionChecklists.values()).filter(
      checklist => checklist.reportId === reportId
    );
  }

  async createInspectionChecklist(checklist: InsertInspectionChecklist): Promise<InspectionChecklist> {
    const id = this.currentChecklistId++;
    const newChecklist: InspectionChecklist = { 
      ...checklist, 
      checked: checklist.checked || false,
      notes: checklist.notes || null,
      id 
    };
    this.inspectionChecklists.set(id, newChecklist);
    return newChecklist;
  }

  async updateInspectionChecklist(id: number, checklist: Partial<InsertInspectionChecklist>): Promise<InspectionChecklist> {
    const existing = this.inspectionChecklists.get(id);
    if (!existing) {
      throw new Error(`Checklist item with id ${id} not found`);
    }
    const updated: InspectionChecklist = { ...existing, ...checklist };
    this.inspectionChecklists.set(id, updated);
    return updated;
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.reportTemplates.values());
  }

  async getReportTemplate(id: number): Promise<ReportTemplate | undefined> {
    return this.reportTemplates.get(id);
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const id = this.currentTemplateId++;
    const now = new Date().toISOString();
    const newTemplate: ReportTemplate = { 
      ...template, 
      id, 
      createdAt: now 
    };
    this.reportTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async getAppurtenanceInspections(reportId: number): Promise<AppurtenanceInspection[]> {
    return Array.from(this.appurtenanceInspections.values())
      .filter(inspection => inspection.reportId === reportId);
  }

  async createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection> {
    const id = this.currentAppurtenanceId++;
    const newInspection: AppurtenanceInspection = { 
      ...inspection, 
      id,
      createdAt: new Date().toISOString()
    };
    this.appurtenanceInspections.set(id, newInspection);
    return newInspection;
  }

  async getReportAttachments(reportId: number): Promise<ReportAttachment[]> {
    return Array.from(this.reportAttachments.values())
      .filter(attachment => attachment.reportId === reportId);
  }

  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const id = this.currentAttachmentId++;
    const newAttachment: ReportAttachment = { 
      ...attachment, 
      id,
      uploadedAt: new Date().toISOString()
    };
    this.reportAttachments.set(id, newAttachment);
    return newAttachment;
  }

  async getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]> {
    return Array.from(this.repairRecommendations.values())
      .filter(recommendation => recommendation.reportId === reportId);
  }

  async createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation> {
    const id = this.currentRecommendationId++;
    const newRecommendation: RepairRecommendation = { 
      ...recommendation, 
      id,
      createdAt: new Date().toISOString()
    };
    this.repairRecommendations.set(id, newRecommendation);
    return newRecommendation;
  }

  async getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]> {
    return Array.from(this.ventingSystemInspections.values())
      .filter(inspection => inspection.reportId === reportId);
  }

  async createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection> {
    const id = this.currentVentingId++;
    const newInspection: VentingSystemInspection = { 
      ...inspection, 
      id,
      createdAt: new Date().toISOString()
    };
    this.ventingSystemInspections.set(id, newInspection);
    return newInspection;
  }

  // Advanced Settlement Survey implementations
  async getAdvancedSettlementSurveys(reportId: number): Promise<AdvancedSettlementSurvey[]> {
    return Array.from(this.advancedSettlementSurveys.values())
      .filter(survey => survey.reportId === reportId);
  }

  async getAdvancedSettlementSurvey(id: number): Promise<AdvancedSettlementSurvey | undefined> {
    return this.advancedSettlementSurveys.get(id);
  }

  async createAdvancedSettlementSurvey(survey: InsertAdvancedSettlementSurvey): Promise<AdvancedSettlementSurvey> {
    const id = this.currentSettlementSurveyId++;
    const newSurvey: AdvancedSettlementSurvey = { 
      ...survey, 
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.advancedSettlementSurveys.set(id, newSurvey);
    return newSurvey;
  }

  async updateAdvancedSettlementSurvey(id: number, survey: Partial<InsertAdvancedSettlementSurvey>): Promise<AdvancedSettlementSurvey> {
    const existing = this.advancedSettlementSurveys.get(id);
    if (!existing) throw new Error('Survey not found');
    
    const updated: AdvancedSettlementSurvey = {
      ...existing,
      ...survey,
      id,
      updatedAt: new Date().toISOString()
    };
    this.advancedSettlementSurveys.set(id, updated);
    return updated;
  }

  async getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]> {
    return Array.from(this.advancedSettlementMeasurements.values())
      .filter(measurement => measurement.surveyId === surveyId);
  }

  async createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement> {
    const id = this.currentSettlementMeasurementId++;
    const newMeasurement: AdvancedSettlementMeasurement = { 
      ...measurement, 
      id,
      createdAt: new Date().toISOString()
    };
    this.advancedSettlementMeasurements.set(id, newMeasurement);
    return newMeasurement;
  }

  async createBulkAdvancedSettlementMeasurements(measurements: InsertAdvancedSettlementMeasurement[]): Promise<AdvancedSettlementMeasurement[]> {
    return Promise.all(measurements.map(m => this.createAdvancedSettlementMeasurement(m)));
  }

  async getEdgeSettlements(surveyId: number): Promise<EdgeSettlement[]> {
    return Array.from(this.edgeSettlements.values())
      .filter(settlement => settlement.surveyId === surveyId);
  }

  async createEdgeSettlement(settlement: InsertEdgeSettlement): Promise<EdgeSettlement> {
    const id = this.currentEdgeSettlementId++;
    const newSettlement: EdgeSettlement = { 
      ...settlement, 
      id,
      createdAt: new Date().toISOString()
    };
    this.edgeSettlements.set(id, newSettlement);
    return newSettlement;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getInspectionReports(): Promise<InspectionReport[]> {
    return await db.select().from(inspectionReports).orderBy(inspectionReports.updatedAt);
  }

  async getInspectionReport(id: number): Promise<InspectionReport | undefined> {
    const [report] = await db.select().from(inspectionReports).where(eq(inspectionReports.id, id));
    return report || undefined;
  }

  async createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport> {
    const now = new Date().toISOString();
    const [newReport] = await db
      .insert(inspectionReports)
      .values({
        ...report,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newReport;
  }

  async updateInspectionReport(id: number, report: Partial<InsertInspectionReport>): Promise<InspectionReport> {
    const [updated] = await db
      .update(inspectionReports)
      .set({
        ...report,
        updatedAt: new Date().toISOString()
      })
      .where(eq(inspectionReports.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Report with id ${id} not found`);
    }
    return updated;
  }

  async deleteInspectionReport(id: number): Promise<boolean> {
    const result = await db.delete(inspectionReports).where(eq(inspectionReports.id, id));
    return result.rowCount > 0;
  }

  async getThicknessMeasurements(reportId: number): Promise<ThicknessMeasurement[]> {
    return await db.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.reportId, reportId));
  }

  async createThicknessMeasurement(measurement: InsertThicknessMeasurement): Promise<ThicknessMeasurement> {
    const now = new Date().toISOString();
    const [newMeasurement] = await db
      .insert(thicknessMeasurements)
      .values({
        ...measurement,
        createdAt: now
      })
      .returning();
    return newMeasurement;
  }

  async updateThicknessMeasurement(id: number, measurement: Partial<InsertThicknessMeasurement>): Promise<ThicknessMeasurement> {
    const [updated] = await db
      .update(thicknessMeasurements)
      .set(measurement)
      .where(eq(thicknessMeasurements.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Measurement with id ${id} not found`);
    }
    return updated;
  }

  async deleteThicknessMeasurement(id: number): Promise<boolean> {
    const result = await db.delete(thicknessMeasurements).where(eq(thicknessMeasurements.id, id));
    return result.rowCount > 0;
  }

  async getInspectionChecklists(reportId: number): Promise<InspectionChecklist[]> {
    return await db.select().from(inspectionChecklists).where(eq(inspectionChecklists.reportId, reportId));
  }

  async createInspectionChecklist(checklist: InsertInspectionChecklist): Promise<InspectionChecklist> {
    const [newChecklist] = await db
      .insert(inspectionChecklists)
      .values(checklist)
      .returning();
    return newChecklist;
  }

  async updateInspectionChecklist(id: number, checklist: Partial<InsertInspectionChecklist>): Promise<InspectionChecklist> {
    const [updated] = await db
      .update(inspectionChecklists)
      .set(checklist)
      .where(eq(inspectionChecklists.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Checklist item with id ${id} not found`);
    }
    return updated;
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates);
  }

  async getReportTemplate(id: number): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return template || undefined;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const now = new Date().toISOString();
    const [newTemplate] = await db
      .insert(reportTemplates)
      .values({
        ...template,
        createdAt: now
      })
      .returning();
    return newTemplate;
  }

  // Appurtenance Inspections
  async getAppurtenanceInspections(reportId: number): Promise<AppurtenanceInspection[]> {
    return await db.select().from(appurtenanceInspections).where(eq(appurtenanceInspections.reportId, reportId));
  }

  async createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection> {
    const [newInspection] = await db
      .insert(appurtenanceInspections)
      .values(inspection)
      .returning();
    return newInspection;
  }

  // Report Attachments
  async getReportAttachments(reportId: number): Promise<ReportAttachment[]> {
    return await db.select().from(reportAttachments).where(eq(reportAttachments.reportId, reportId));
  }

  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const [newAttachment] = await db
      .insert(reportAttachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  // Repair Recommendations
  async getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]> {
    return await db.select().from(repairRecommendations).where(eq(repairRecommendations.reportId, reportId));
  }

  async createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation> {
    const [newRecommendation] = await db
      .insert(repairRecommendations)
      .values(recommendation)
      .returning();
    return newRecommendation;
  }

  // Venting System Inspections
  async getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]> {
    return await db.select().from(ventingSystemInspections).where(eq(ventingSystemInspections.reportId, reportId));
  }

  async createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection> {
    const [newInspection] = await db
      .insert(ventingSystemInspections)
      .values(inspection)
      .returning();
    return newInspection;
  }

  // Advanced Settlement Surveys
  async getAdvancedSettlementSurveys(reportId: number): Promise<AdvancedSettlementSurvey[]> {
    return await db.select().from(advancedSettlementSurveys).where(eq(advancedSettlementSurveys.reportId, reportId));
  }

  async getAdvancedSettlementSurvey(id: number): Promise<AdvancedSettlementSurvey | undefined> {
    const [survey] = await db.select().from(advancedSettlementSurveys).where(eq(advancedSettlementSurveys.id, id));
    return survey || undefined;
  }

  async createAdvancedSettlementSurvey(survey: InsertAdvancedSettlementSurvey): Promise<AdvancedSettlementSurvey> {
    const now = new Date().toISOString();
    const [newSurvey] = await db
      .insert(advancedSettlementSurveys)
      .values({
        ...survey,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newSurvey;
  }

  async updateAdvancedSettlementSurvey(id: number, survey: Partial<InsertAdvancedSettlementSurvey>): Promise<AdvancedSettlementSurvey> {
    const [updated] = await db
      .update(advancedSettlementSurveys)
      .set({
        ...survey,
        updatedAt: new Date().toISOString()
      })
      .where(eq(advancedSettlementSurveys.id, id))
      .returning();
    return updated;
  }

  // Advanced Settlement Measurements
  async getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]> {
    return await db.select().from(advancedSettlementMeasurements).where(eq(advancedSettlementMeasurements.surveyId, surveyId));
  }

  async createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement> {
    const [newMeasurement] = await db
      .insert(advancedSettlementMeasurements)
      .values({
        ...measurement,
        createdAt: new Date().toISOString()
      })
      .returning();
    return newMeasurement;
  }

  async createBulkAdvancedSettlementMeasurements(measurements: InsertAdvancedSettlementMeasurement[]): Promise<AdvancedSettlementMeasurement[]> {
    const measurementsWithTimestamp = measurements.map(m => ({
      ...m,
      createdAt: new Date().toISOString()
    }));
    const newMeasurements = await db
      .insert(advancedSettlementMeasurements)
      .values(measurementsWithTimestamp)
      .returning();
    return newMeasurements;
  }

  // Edge Settlements
  async getEdgeSettlements(surveyId: number): Promise<EdgeSettlement[]> {
    return await db.select().from(edgeSettlements).where(eq(edgeSettlements.surveyId, surveyId));
  }

  async createEdgeSettlement(settlement: InsertEdgeSettlement): Promise<EdgeSettlement> {
    const [newSettlement] = await db
      .insert(edgeSettlements)
      .values({
        ...settlement,
        createdAt: new Date().toISOString()
      })
      .returning();
    return newSettlement;
  }
}

export const storage = new DatabaseStorage();
