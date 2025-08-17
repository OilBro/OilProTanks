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
  aiConversations,
  aiGuidanceTemplates,
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
  type InsertEdgeSettlement,
  type AiConversation,
  type InsertAiConversation,
  type AiGuidanceTemplate,
  type InsertAiGuidanceTemplate
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
  
  // AI Assistant
  getAiGuidanceTemplates(filters: { section?: string; category?: string }): Promise<AiGuidanceTemplate[]>;
  getAiConversation(reportId: number, sessionId: string): Promise<AiConversation | undefined>;
  saveAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  processAiChat(params: {
    message: string;
    reportId?: number;
    sessionId: string;
    context?: any;
    conversationHistory?: any[];
  }): Promise<{ content: string; metadata?: any }>;
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
  private aiConversations: Map<number, AiConversation>;
  private aiGuidanceTemplates: Map<number, AiGuidanceTemplate>;
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
  private currentAiConversationId: number;
  private currentAiTemplateId: number;

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
    this.aiConversations = new Map();
    this.aiGuidanceTemplates = new Map();
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
    this.currentAiConversationId = 1;
    this.currentAiTemplateId = 1;
    
    this.initializeTemplates();
    this.initializeAiGuidance();
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

  // AI Assistant Methods
  async getAiGuidanceTemplates(filters: { section?: string; category?: string }): Promise<AiGuidanceTemplate[]> {
    let query = db.select().from(aiGuidanceTemplates);
    
    // Apply filters if provided
    if (filters.section) {
      query = query.where(eq(aiGuidanceTemplates.section, filters.section)) as any;
    }
    if (filters.category) {
      query = query.where(eq(aiGuidanceTemplates.category, filters.category)) as any;
    }
    
    return await query;
  }

  async getAiConversation(reportId: number, sessionId: string): Promise<AiConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.reportId, reportId))
      .where(eq(aiConversations.sessionId, sessionId));
    return conversation || undefined;
  }

  async saveAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [saved] = await db
      .insert(aiConversations)
      .values(conversation)
      .returning();
    return saved;
  }

  async processAiChat(params: {
    message: string;
    reportId?: number;
    sessionId: string;
    context?: any;
    conversationHistory?: any[];
  }): Promise<{ content: string; metadata?: any }> {
    // This is a simplified implementation. In production, you would integrate with an AI service
    // like OpenAI API or Claude API using the API keys from environment variables
    
    const message = params.message.toLowerCase();
    let response = { content: '', metadata: {} as any };
    
    // API 653 guidance responses based on keywords
    if (message.includes('thickness') || message.includes('minimum')) {
      response.content = `According to API 653 Section 4.3, the minimum acceptable thickness depends on several factors:

1. **Shell Minimum Thickness (tmin)**: Calculated using the formula from API 653 Section 4.3.2
   - tmin = 2.6(H-1)DG/SE for tanks up to 200 ft diameter
   - Where: H = height to inspection point, D = diameter, G = specific gravity, S = allowable stress, E = joint efficiency

2. **Bottom Plate Minimum**: 
   - 0.100" for bottom plates without means for leak detection
   - 0.050" for bottom plates with leak detection and containment

3. **Critical Zone**: The area within 12 inches of the shell-to-bottom weld requires special attention

Always verify calculations with current tank parameters and consult API 653 Table 4.1 for specific requirements.`;
      response.metadata = { 
        api653Reference: 'Section 4.3.2', 
        warningLevel: 'info',
        calculationType: 'Minimum Thickness'
      };
    } else if (message.includes('corrosion') || message.includes('rate')) {
      response.content = `Corrosion rate calculations per API 653:

**Short-term corrosion rate (ST)**: 
- ST = (tprevious - tcurrent) / time interval
- Used when only two inspections available

**Long-term corrosion rate (LT)**:
- LT = (tinitial - tcurrent) / total time
- Preferred when multiple inspections available

**Critical rates**:
- > 0.005 in/yr: Aggressive, requires monitoring
- > 0.010 in/yr: Severe, action required
- > 0.025 in/yr: Critical, immediate action

**Remaining Life**: RL = (tcurrent - tmin) / corrosion rate

The greater of ST or LT should be used for remaining life calculations per API 653 Section 4.4.`;
      response.metadata = { 
        api653Reference: 'Section 4.4', 
        warningLevel: 'warning',
        calculationType: 'Corrosion Rate'
      };
    } else if (message.includes('settlement')) {
      response.content = `API 653 Annex B Settlement Criteria:

**Cosine Fit Analysis** (per B.2.2.4):
1. Measure elevations at minimum 8 points around circumference
2. Apply cosine curve fitting: U = A*cos(θ - B) + C
3. Calculate R² - must be ≥ 0.90 for valid fit
4. Determine out-of-plane settlement: Si = Ui - cosine fit

**Acceptance Criteria**:
- Uniform settlement: Generally acceptable if < 6 inches
- Out-of-plane: Use Annex B.3.2.1 formulas
- Edge settlement: Bew < 0.37% of tank radius

**Action Required if**:
- R² < 0.90 (poor fit, remeasure)
- Si > allowable per B.3.2.1
- Visible shell distortion or floor buckling

Always document tie shots for multi-setup surveys.`;
      response.metadata = { 
        api653Reference: 'Annex B.2.2.4', 
        warningLevel: 'info',
        calculationType: 'Settlement Analysis'
      };
    } else if (message.includes('inspection') || message.includes('method')) {
      response.content = `Recommended inspection methods per API 653:

**Visual Inspection** (Always required):
- External: Shell, roof, foundation, appurtenances
- Internal: When tank is out of service

**Thickness Measurements**:
- UT (Ultrasonic Testing): Primary method for shells and roofs
- MFL (Magnetic Flux Leakage): Bottom plate scanning
- RT (Radiography): For specific areas of concern

**Inspection Intervals** (Section 6.3):
- External: Every 5 years maximum or RCA/4N
- UT Thickness: RCA/2N years (N=15 or 20 per Table 6.1)
- Internal: Based on corrosion rate, max 20 years

**Critical Areas**:
- Shell-to-bottom weld zone
- Wind girder attachments
- Nozzle connections
- Roof support columns

Document all findings per API 653 Section 12.`;
      response.metadata = { 
        api653Reference: 'Section 6.3', 
        warningLevel: 'info'
      };
    } else if (message.includes('safety')) {
      response.content = `Safety considerations for tank inspection:

**Pre-Inspection Requirements**:
- Confined space entry permit (if internal)
- Gas testing: O2, H2S, LEL
- Lock-out/tag-out procedures
- Fall protection for work >6 feet

**PPE Requirements**:
- Hard hat, safety glasses, steel-toe boots (minimum)
- H2S monitor for sour service tanks
- FR clothing for hydrocarbon service
- Respiratory protection if required by gas test

**Hazards to Consider**:
- Pyrophoric iron sulfide (auto-ignition risk)
- Benzene exposure in crude/gasoline tanks
- Slip/trip hazards on floating roofs
- Weather conditions (lightning, wind)

**Emergency Procedures**:
- Rescue plan for confined space
- Fire watch for hot work
- Communication system established

Always follow site-specific safety procedures and JSA requirements.`;
      response.metadata = { 
        warningLevel: 'critical'
      };
    } else {
      response.content = `I can help you with API 653 tank inspection guidance. Here are some areas I can assist with:

• **Thickness Calculations**: Minimum thickness requirements, corrosion rates, remaining life
• **Settlement Analysis**: Cosine fit procedures, acceptance criteria, measurement techniques
• **Inspection Methods**: UT, MFL, visual inspection requirements and intervals
• **Safety Procedures**: Confined space, gas testing, PPE requirements
• **API 653 Standards**: Code interpretations, calculation methods, acceptance criteria

What specific aspect of your inspection would you like help with?`;
    }
    
    return response;
  }

  private initializeAiGuidance() {
    // Initialize AI guidance templates
    const templates: Omit<AiGuidanceTemplate, 'id' | 'createdAt'>[] = [
      {
        category: 'thickness',
        section: 'shell',
        triggerKeywords: ['shell', 'thickness', 'minimum', 'tmin'],
        guidanceText: 'Shell minimum thickness per API 653 Section 4.3.2',
        api653References: ['4.3.2', '4.3.3', 'Table 4.1'],
        relatedCalculations: ['tmin', 'corrosion_rate', 'remaining_life'],
        warningThresholds: { criticalThickness: 0.100, warningThickness: 0.150 },
        isActive: true
      },
      {
        category: 'settlement',
        section: 'foundation',
        triggerKeywords: ['settlement', 'cosine', 'foundation', 'tilt'],
        guidanceText: 'Settlement analysis per API 653 Annex B',
        api653References: ['B.2.2.4', 'B.3.2.1', 'B.3.4'],
        relatedCalculations: ['cosine_fit', 'out_of_plane', 'edge_settlement'],
        warningThresholds: { maxSettlement: 6, rSquaredMin: 0.90 },
        isActive: true
      },
      {
        category: 'safety',
        section: 'general',
        triggerKeywords: ['safety', 'confined', 'space', 'gas', 'test'],
        guidanceText: 'Safety procedures for tank inspection',
        api653References: ['1.4', '12.2'],
        relatedCalculations: [],
        warningThresholds: {},
        isActive: true
      }
    ];
    
    // Store templates in memory for MemStorage
    templates.forEach((template, index) => {
      this.aiGuidanceTemplates.set(index + 1, {
        ...template,
        id: index + 1,
        createdAt: new Date()
      } as AiGuidanceTemplate);
    });
  }
}

export const storage = new DatabaseStorage();
