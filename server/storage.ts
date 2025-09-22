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
} from "../shared/schema.ts";
// Lazy db import to avoid requiring DATABASE_URL for MemStorage test runs
let db: any = null;
async function ensureDb() {
  if (!db) {
    const mod = await import('./db.ts');
    db = mod.db;
  }
  return db;
}
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Inspection Reports
  getInspectionReports(originFilter?: string, options?: { limit?: number; offset?: number }): Promise<InspectionReport[]>;
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
  deleteInspectionChecklist(id: number): Promise<boolean>;
  
  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  
  // Appurtenance Inspections
  getAppurtenanceInspections(reportId: number): Promise<AppurtenanceInspection[]>;
  createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection>;
  updateAppurtenanceInspection(id: number, inspection: Partial<InsertAppurtenanceInspection>): Promise<AppurtenanceInspection>;
  deleteAppurtenanceInspection(id: number): Promise<boolean>;
  
  // Report Attachments
  getReportAttachments(reportId: number): Promise<ReportAttachment[]>;
  getReportAttachment(id: number): Promise<ReportAttachment | undefined>;
  createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment>;
  
  // Repair Recommendations
  getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]>;
  createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation>;
  updateRepairRecommendation(id: number, recommendation: Partial<InsertRepairRecommendation>): Promise<RepairRecommendation>;
  deleteRepairRecommendation(id: number): Promise<boolean>;
  
  // Venting System Inspections
  getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]>;
  createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection>;
  updateVentingSystemInspection(id: number, inspection: Partial<InsertVentingSystemInspection>): Promise<VentingSystemInspection>;
  deleteVentingSystemInspection(id: number): Promise<boolean>;
  
  // Advanced Settlement Surveys
  getAdvancedSettlementSurveys(reportId: number): Promise<AdvancedSettlementSurvey[]>;
  getAdvancedSettlementSurvey(id: number): Promise<AdvancedSettlementSurvey | undefined>;
  createAdvancedSettlementSurvey(survey: InsertAdvancedSettlementSurvey): Promise<AdvancedSettlementSurvey>;
  updateAdvancedSettlementSurvey(id: number, survey: Partial<InsertAdvancedSettlementSurvey>): Promise<AdvancedSettlementSurvey>;
  deleteAdvancedSettlementSurvey(id: number): Promise<boolean>;
  
  // Advanced Settlement Measurements
  getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]>;
  createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement>;
  createBulkAdvancedSettlementMeasurements(measurements: InsertAdvancedSettlementMeasurement[]): Promise<AdvancedSettlementMeasurement[]>;
  updateAdvancedSettlementMeasurement(id: number, data: Partial<InsertAdvancedSettlementMeasurement>): Promise<AdvancedSettlementMeasurement>;
  deleteAdvancedSettlementMeasurements(surveyId: number): Promise<void>;
  
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

  // --- AI Assistant stubs ---
  async getAiGuidanceTemplates(_filters: { section?: string; category?: string }) {
    return [];
  }
  async getAiConversation(_reportId: number, _sessionId: string) {
    return undefined;
  }
  async saveAiConversation(conv: InsertAiConversation) {
    return { id: 0, reportId: conv.reportId || null, sessionId: conv.sessionId, messages: conv.messages || '[]', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any;
  }
  async processAiChat(params: { message: string; reportId?: number; sessionId: string; context?: any; conversationHistory?: any[] }) {
    return { content: `AI feature unavailable. Echo: ${params.message}` };
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
  async getInspectionReports(originFilter?: string, options?: { limit?: number; offset?: number }): Promise<InspectionReport[]> {
    let all = Array.from(this.inspectionReports.values());
    // Origin filter removed - column doesn't exist in schema
    const limit = options?.limit && options.limit > 0 ? options.limit : all.length;
    const offset = options?.offset && options.offset >= 0 ? options.offset : 0;
    return all.slice(offset, offset + limit);
  }

  async getInspectionReport(id: number): Promise<InspectionReport | undefined> {
    return this.inspectionReports.get(id);
  }

  async createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport> {
    const id = this.currentReportId++;
    const now = new Date().toISOString();
    // Enumerate every column defined in inspectionReports to satisfy the InspectionReport type.
    const newReport: InspectionReport = {
      id,
      reportNumber: (report as any).reportNumber ?? null,
      tankId: (report as any).tankId ?? null,
      service: report.service ?? null,
      diameter: report.diameter ?? null,
      height: report.height ?? null,
      inspector: (report as any).inspector ?? null,
      inspectionDate: (report as any).inspectionDate ?? null,
      originalThickness: report.originalThickness ?? null,
      yearsSinceLastInspection: report.yearsSinceLastInspection ?? null,
      status: report.status ?? null,
      createdAt: now,
      updatedAt: now,
      customer: (report as any).customer ?? null,
      location: (report as any).location ?? null,
      inspectionScope: (report as any).inspectionScope ?? null,
      reviewer: (report as any).reviewer ?? null,
      specificGravity: (report as any).specificGravity ?? null,
      yearBuilt: (report as any).yearBuilt ?? null,
      manufacturer: (report as any).manufacturer ?? null,
      constructionStandard: (report as any).constructionStandard ?? null,
      shellMaterial: (report as any).shellMaterial ?? null,
      foundationType: (report as any).foundationType ?? null,
      roofType: (report as any).roofType ?? null,
      capacity: (report as any).capacity ?? null,
      capacityUnit: (report as any).capacityUnit ?? null,
      product: (report as any).product ?? null,
      facilityName: (report as any).facilityName ?? null,
      tankAge: (report as any).tankAge ?? null,
      designCode: (report as any).designCode ?? null,
      lastInternalInspection: (report as any).lastInternalInspection ?? null,
      nextInternalInspection: (report as any).nextInternalInspection ?? null,
      nextExternalInspection: (report as any).nextExternalInspection ?? null,
      diameterUnit: (report as any).diameterUnit ?? null,
      heightUnit: (report as any).heightUnit ?? null,
      coatingCondition: (report as any).coatingCondition ?? null,
      foundationSettlement: (report as any).foundationSettlement ?? null,
      foundationCracking: (report as any).foundationCracking ?? null,
      foundationSealing: (report as any).foundationSealing ?? null,
      maxSettlement: (report as any).maxSettlement ?? null,
      settlementLocation: (report as any).settlementLocation ?? null,
      settlementCompliance: (report as any).settlementCompliance ?? null,
      surveyMethod: (report as any).surveyMethod ?? null,
      inspectorCertification: (report as any).inspectorCertification ?? null,
      inspectorExperience: (report as any).inspectorExperience ?? null,
      findings: (report as any).findings ?? null,
      recommendations: (report as any).recommendations ?? null,
      origin: (report as any).origin ?? null,
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
    const newMeasurement = {
      id,
      reportId: measurement.reportId ?? null,
      component: measurement.component ?? null,
      measurementType: measurement.measurementType || 'shell',
      location: measurement.location ?? null,
      elevation: measurement.elevation ?? null,
      gridReference: measurement.gridReference ?? null,
      plateNumber: measurement.plateNumber ?? null,
      annularRingPosition: measurement.annularRingPosition ?? null,
      criticalZoneType: measurement.criticalZoneType ?? null,
      repadNumber: measurement.repadNumber ?? null,
      repadType: measurement.repadType ?? null,
      repadThickness: measurement.repadThickness ?? null,
      nozzleId: measurement.nozzleId ?? null,
      nozzleSize: measurement.nozzleSize ?? null,
      flangeClass: measurement.flangeClass ?? null,
      flangeType: measurement.flangeType ?? null,
      originalThickness: measurement.originalThickness ?? null,
      currentThickness: measurement.currentThickness ?? null,
      corrosionRate: measurement.corrosionRate ?? null,
      remainingLife: measurement.remainingLife ?? null,
      status: measurement.status || 'acceptable',
      createdAt: now
    } as ThicknessMeasurement;
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
    const newChecklist = {
      ...checklist,
      checked: checklist.checked || false,
      notes: checklist.notes || null,
      id
    } as InspectionChecklist;
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

  async deleteInspectionChecklist(id: number): Promise<boolean> {
    return this.inspectionChecklists.delete(id);
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
    const newTemplate = {
      ...template,
      id,
      createdAt: now
    } as ReportTemplate;
    this.reportTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async getAppurtenanceInspections(reportId: number): Promise<AppurtenanceInspection[]> {
    return Array.from(this.appurtenanceInspections.values())
      .filter(inspection => inspection.reportId === reportId);
  }

  async createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection> {
    const id = this.currentAppurtenanceId++;
    const newInspection = {
      ...inspection,
      id,
      createdAt: new Date().toISOString()
    } as AppurtenanceInspection;
    this.appurtenanceInspections.set(id, newInspection);
    return newInspection;
  }

  async updateAppurtenanceInspection(id: number, inspection: Partial<InsertAppurtenanceInspection>): Promise<AppurtenanceInspection> {
    const existing = this.appurtenanceInspections.get(id);
    if (!existing) {
      throw new Error(`Appurtenance inspection with id ${id} not found`);
    }
    const updated: AppurtenanceInspection = { ...existing, ...inspection };
    this.appurtenanceInspections.set(id, updated);
    return updated;
  }

  async deleteAppurtenanceInspection(id: number): Promise<boolean> {
    return this.appurtenanceInspections.delete(id);
  }

  async getReportAttachments(reportId: number): Promise<ReportAttachment[]> {
    return Array.from(this.reportAttachments.values())
      .filter(attachment => attachment.reportId === reportId);
  }

  async getReportAttachment(id: number): Promise<ReportAttachment | undefined> {
    return this.reportAttachments.get(id);
  }

  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const id = this.currentAttachmentId++;
    const newAttachment = {
      ...attachment,
      id,
      uploadedAt: new Date().toISOString()
    } as ReportAttachment;
    this.reportAttachments.set(id, newAttachment);
    return newAttachment;
  }

  async getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]> {
    return Array.from(this.repairRecommendations.values())
      .filter(recommendation => recommendation.reportId === reportId);
  }

  async createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation> {
    const id = this.currentRecommendationId++;
    const newRecommendation = {
      ...recommendation,
      id,
      createdAt: new Date().toISOString()
    } as RepairRecommendation;
    this.repairRecommendations.set(id, newRecommendation);
    return newRecommendation;
  }

  async updateRepairRecommendation(id: number, recommendation: Partial<InsertRepairRecommendation>): Promise<RepairRecommendation> {
    const existing = this.repairRecommendations.get(id);
    if (!existing) {
      throw new Error(`Repair recommendation with id ${id} not found`);
    }
    const updated: RepairRecommendation = { ...existing, ...recommendation };
    this.repairRecommendations.set(id, updated);
    return updated;
  }

  async deleteRepairRecommendation(id: number): Promise<boolean> {
    return this.repairRecommendations.delete(id);
  }

  async getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]> {
    return Array.from(this.ventingSystemInspections.values())
      .filter(inspection => inspection.reportId === reportId);
  }

  async createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection> {
    const id = this.currentVentingId++;
    const newInspection = {
      ...inspection,
      id,
      createdAt: new Date().toISOString()
    } as VentingSystemInspection;
    this.ventingSystemInspections.set(id, newInspection);
    return newInspection;
  }

  async updateVentingSystemInspection(id: number, inspection: Partial<InsertVentingSystemInspection>): Promise<VentingSystemInspection> {
    const existing = this.ventingSystemInspections.get(id);
    if (!existing) {
      throw new Error(`Venting system inspection with id ${id} not found`);
    }
    const updated: VentingSystemInspection = { ...existing, ...inspection };
    this.ventingSystemInspections.set(id, updated);
    return updated;
  }

  async deleteVentingSystemInspection(id: number): Promise<boolean> {
    return this.ventingSystemInspections.delete(id);
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
    const newSurvey = {
      ...survey,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as AdvancedSettlementSurvey;
    this.advancedSettlementSurveys.set(id, newSurvey);
    return newSurvey;
  }

  async updateAdvancedSettlementSurvey(id: number, survey: Partial<InsertAdvancedSettlementSurvey>): Promise<AdvancedSettlementSurvey> {
    const existing = this.advancedSettlementSurveys.get(id);
    if (!existing) throw new Error('Survey not found');
    
    const updated = {
      ...existing,
      ...survey,
      id,
      updatedAt: new Date().toISOString()
    } as AdvancedSettlementSurvey;
    this.advancedSettlementSurveys.set(id, updated);
    return updated;
  }

  async deleteAdvancedSettlementSurvey(id: number): Promise<boolean> {
    return this.advancedSettlementSurveys.delete(id);
  }

  async getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]> {
    return Array.from(this.advancedSettlementMeasurements.values())
      .filter(measurement => measurement.surveyId === surveyId);
  }

  async createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement> {
    const id = this.currentSettlementMeasurementId++;
    const newMeasurement = {
      ...measurement,
      id,
      createdAt: new Date().toISOString()
    } as AdvancedSettlementMeasurement;
    this.advancedSettlementMeasurements.set(id, newMeasurement);
    return newMeasurement;
  }

  async createBulkAdvancedSettlementMeasurements(measurements: InsertAdvancedSettlementMeasurement[]): Promise<AdvancedSettlementMeasurement[]> {
    return Promise.all(measurements.map(m => this.createAdvancedSettlementMeasurement(m)));
  }

  async updateAdvancedSettlementMeasurement(id: number, data: Partial<InsertAdvancedSettlementMeasurement>): Promise<AdvancedSettlementMeasurement> {
    const existing = this.advancedSettlementMeasurements.get(id);
    if (!existing) {
      throw new Error(`Measurement with id ${id} not found`);
    }
    const updated = { ...existing, ...data };
    this.advancedSettlementMeasurements.set(id, updated);
    return updated;
  }

  async deleteAdvancedSettlementMeasurements(surveyId: number): Promise<void> {
    const keysToDelete = Array.from(this.advancedSettlementMeasurements.keys())
      .filter(key => this.advancedSettlementMeasurements.get(key)?.surveyId === surveyId);
    keysToDelete.forEach(key => this.advancedSettlementMeasurements.delete(key));
  }

  async getEdgeSettlements(surveyId: number): Promise<EdgeSettlement[]> {
    return Array.from(this.edgeSettlements.values())
      .filter(settlement => settlement.surveyId === surveyId);
  }

  async createEdgeSettlement(settlement: InsertEdgeSettlement): Promise<EdgeSettlement> {
    const id = this.currentEdgeSettlementId++;
    const newSettlement = {
      ...settlement,
      id,
      createdAt: new Date().toISOString()
    } as EdgeSettlement;
    this.edgeSettlements.set(id, newSettlement);
    return newSettlement;
  }

  private initializeAiGuidance() {
    // Initialize AI guidance templates
    const templates: Omit<AiGuidanceTemplate, "id" | "createdAt">[] = [
      {
        category: "thickness",
        section: "shell",
        triggerKeywords: ["shell", "thickness", "minimum", "tmin"],
        guidanceText: "Shell minimum thickness per API 653 Section 4.3.2",
        api653References: ["4.3.2", "4.3.3", "Table 4.1"],
        relatedCalculations: ["tmin", "corrosion_rate", "remaining_life"],
        warningThresholds: { criticalThickness: 0.1, warningThickness: 0.15 },
        isActive: true,
      },
      {
        category: "settlement",
        section: "foundation",
        triggerKeywords: ["settlement", "cosine", "foundation", "tilt"],
        guidanceText: "Settlement analysis per API 653 Annex B",
        api653References: ["B.2.2.4", "B.3.2.1", "B.3.4"],
        relatedCalculations: ["cosine_fit", "out_of_plane", "edge_settlement"],
        warningThresholds: { maxSettlement: 6, rSquaredMin: 0.9 },
        isActive: true,
      },
      {
        category: "safety",
        section: "general",
        triggerKeywords: ["safety", "confined", "space", "gas", "test"],
        guidanceText: "Safety procedures for tank inspection",
        api653References: ["1.4", "12.2"],
        relatedCalculations: [],
        warningThresholds: {},
        isActive: true,
      },
    ];

    // Store templates in memory for MemStorage
    templates.forEach((template, index) => {
      this.aiGuidanceTemplates.set(index + 1, {
        ...template,
        id: index + 1,
        createdAt: new Date(),
      } as AiGuidanceTemplate);
    });
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const dbi = await ensureDb();
    const [user] = await dbi.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const dbi = await ensureDb();
    const [user] = await dbi.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const dbi = await ensureDb();
    const [user] = await dbi
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getInspectionReports(originFilter?: string, options?: { limit?: number; offset?: number }): Promise<InspectionReport[]> {
    const dbi = await ensureDb();
    const limit = options?.limit && options.limit > 0 ? options.limit : undefined;
    const offset = options?.offset && options.offset >= 0 ? options.offset : undefined;
    let query = dbi.select().from(inspectionReports);
    // Origin filter removed - column doesn't exist in schema
    query = query.orderBy(inspectionReports.updatedAt) as any;
    if (typeof limit === 'number') query = query.limit(limit) as any;
    if (typeof offset === 'number') query = query.offset(offset) as any;
    return await query;
  }

  async getInspectionReport(id: number): Promise<InspectionReport | undefined> {
    const dbi = await ensureDb();
    const [report] = await dbi.select().from(inspectionReports).where(eq(inspectionReports.id, id));
    return report || undefined;
  }

  async createInspectionReport(report: InsertInspectionReport): Promise<InspectionReport> {
    const now = new Date().toISOString();
    const dbi = await ensureDb();
    const [newReport] = await dbi
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
    const dbi = await ensureDb();
    const [updated] = await dbi
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
    const dbi = await ensureDb();
    const result = await dbi.delete(inspectionReports).where(eq(inspectionReports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getThicknessMeasurements(reportId: number): Promise<ThicknessMeasurement[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(thicknessMeasurements).where(eq(thicknessMeasurements.reportId, reportId));
  }

  async createThicknessMeasurement(measurement: InsertThicknessMeasurement): Promise<ThicknessMeasurement> {
    const now = new Date().toISOString();
    const dbi = await ensureDb();
    const [newMeasurement] = await dbi
      .insert(thicknessMeasurements)
      .values({
        ...measurement,
        createdAt: now
      })
      .returning();
    return newMeasurement;
  }

  async updateThicknessMeasurement(id: number, measurement: Partial<InsertThicknessMeasurement>): Promise<ThicknessMeasurement> {
    const dbi = await ensureDb();
    const [updated] = await dbi
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
    const dbi = await ensureDb();
    const result = await dbi.delete(thicknessMeasurements).where(eq(thicknessMeasurements.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getInspectionChecklists(reportId: number): Promise<InspectionChecklist[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(inspectionChecklists).where(eq(inspectionChecklists.reportId, reportId));
  }

  async createInspectionChecklist(checklist: InsertInspectionChecklist): Promise<InspectionChecklist> {
    const dbi = await ensureDb();
    const [newChecklist] = await dbi
      .insert(inspectionChecklists)
      .values(checklist)
      .returning();
    return newChecklist;
  }

  async updateInspectionChecklist(id: number, checklist: Partial<InsertInspectionChecklist>): Promise<InspectionChecklist> {
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(inspectionChecklists)
      .set(checklist)
      .where(eq(inspectionChecklists.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Checklist item with id ${id} not found`);
    }
    return updated;
  }

  async deleteInspectionChecklist(id: number): Promise<boolean> {
    const dbi = await ensureDb();
    const result = await dbi.delete(inspectionChecklists).where(eq(inspectionChecklists.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(reportTemplates);
  }

  async getReportTemplate(id: number): Promise<ReportTemplate | undefined> {
    const dbi = await ensureDb();
    const [template] = await dbi.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return template || undefined;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const now = new Date().toISOString();
    const dbi = await ensureDb();
    const [newTemplate] = await dbi
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
    const dbi = await ensureDb();
    return await dbi.select().from(appurtenanceInspections).where(eq(appurtenanceInspections.reportId, reportId));
  }

  async createAppurtenanceInspection(inspection: InsertAppurtenanceInspection): Promise<AppurtenanceInspection> {
    const dbi = await ensureDb();
    const [newInspection] = await dbi
      .insert(appurtenanceInspections)
      .values(inspection)
      .returning();
    return newInspection;
  }

  async updateAppurtenanceInspection(id: number, inspection: Partial<InsertAppurtenanceInspection>): Promise<AppurtenanceInspection> {
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(appurtenanceInspections)
      .set(inspection)
      .where(eq(appurtenanceInspections.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Appurtenance inspection with id ${id} not found`);
    }
    return updated;
  }

  async deleteAppurtenanceInspection(id: number): Promise<boolean> {
    const dbi = await ensureDb();
    const result = await dbi.delete(appurtenanceInspections).where(eq(appurtenanceInspections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Report Attachments
  async getReportAttachments(reportId: number): Promise<ReportAttachment[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(reportAttachments).where(eq(reportAttachments.reportId, reportId));
  }

  async getReportAttachment(id: number): Promise<ReportAttachment | undefined> {
    const dbi = await ensureDb();
    const [att] = await dbi.select().from(reportAttachments).where(eq(reportAttachments.id, id));
    return att || undefined;
  }

  async createReportAttachment(attachment: InsertReportAttachment): Promise<ReportAttachment> {
    const dbi = await ensureDb();
    const [newAttachment] = await dbi
      .insert(reportAttachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  // Repair Recommendations
  async getRepairRecommendations(reportId: number): Promise<RepairRecommendation[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(repairRecommendations).where(eq(repairRecommendations.reportId, reportId));
  }

  async createRepairRecommendation(recommendation: InsertRepairRecommendation): Promise<RepairRecommendation> {
    const dbi = await ensureDb();
    const [newRecommendation] = await dbi
      .insert(repairRecommendations)
      .values(recommendation)
      .returning();
    return newRecommendation;
  }

  async updateRepairRecommendation(id: number, recommendation: Partial<InsertRepairRecommendation>): Promise<RepairRecommendation> {
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(repairRecommendations)
      .set(recommendation)
      .where(eq(repairRecommendations.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Repair recommendation with id ${id} not found`);
    }
    return updated;
  }

  async deleteRepairRecommendation(id: number): Promise<boolean> {
    const dbi = await ensureDb();
    const result = await dbi.delete(repairRecommendations).where(eq(repairRecommendations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Venting System Inspections
  async getVentingSystemInspections(reportId: number): Promise<VentingSystemInspection[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(ventingSystemInspections).where(eq(ventingSystemInspections.reportId, reportId));
  }

  async createVentingSystemInspection(inspection: InsertVentingSystemInspection): Promise<VentingSystemInspection> {
    const dbi = await ensureDb();
    const [newInspection] = await dbi
      .insert(ventingSystemInspections)
      .values({
        ...inspection,
        createdAt: new Date().toISOString()
      })
      .returning();
    return newInspection;
  }

  async updateVentingSystemInspection(id: number, inspection: Partial<InsertVentingSystemInspection>): Promise<VentingSystemInspection> {
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(ventingSystemInspections)
      .set(inspection)
      .where(eq(ventingSystemInspections.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Venting system inspection with id ${id} not found`);
    }
    return updated;
  }

  async deleteVentingSystemInspection(id: number): Promise<boolean> {
    const dbi = await ensureDb();
    const result = await dbi.delete(ventingSystemInspections).where(eq(ventingSystemInspections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Advanced Settlement Surveys
  async getAdvancedSettlementSurveys(reportId: number): Promise<AdvancedSettlementSurvey[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(advancedSettlementSurveys).where(eq(advancedSettlementSurveys.reportId, reportId));
  }

  async getAdvancedSettlementSurvey(id: number): Promise<AdvancedSettlementSurvey | undefined> {
    const dbi = await ensureDb();
    const [survey] = await dbi.select().from(advancedSettlementSurveys).where(eq(advancedSettlementSurveys.id, id));
    return survey || undefined;
  }

  async createAdvancedSettlementSurvey(survey: InsertAdvancedSettlementSurvey): Promise<AdvancedSettlementSurvey> {
    const now = new Date().toISOString();
    const dbi = await ensureDb();
    const [newSurvey] = await dbi
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
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(advancedSettlementSurveys)
      .set({
        ...survey,
        updatedAt: new Date().toISOString()
      })
      .where(eq(advancedSettlementSurveys.id, id))
      .returning();
    return updated;
  }

  async deleteAdvancedSettlementSurvey(id: number): Promise<boolean> {
    const dbi = await ensureDb();
    const result = await dbi.delete(advancedSettlementSurveys).where(eq(advancedSettlementSurveys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Advanced Settlement Measurements
  async getAdvancedSettlementMeasurements(surveyId: number): Promise<AdvancedSettlementMeasurement[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(advancedSettlementMeasurements).where(eq(advancedSettlementMeasurements.surveyId, surveyId));
  }

  async createAdvancedSettlementMeasurement(measurement: InsertAdvancedSettlementMeasurement): Promise<AdvancedSettlementMeasurement> {
    const dbi = await ensureDb();
    const [newMeasurement] = await dbi
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
    const dbi = await ensureDb();
    const newMeasurements = await dbi
      .insert(advancedSettlementMeasurements)
      .values(measurementsWithTimestamp)
      .returning();
    return newMeasurements;
  }

  async updateAdvancedSettlementMeasurement(id: number, data: Partial<InsertAdvancedSettlementMeasurement>): Promise<AdvancedSettlementMeasurement> {
    const dbi = await ensureDb();
    const [updated] = await dbi
      .update(advancedSettlementMeasurements)
      .set(data)
      .where(eq(advancedSettlementMeasurements.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Measurement with id ${id} not found`);
    }
    return updated;
  }

  async deleteAdvancedSettlementMeasurements(surveyId: number): Promise<void> {
    const dbi = await ensureDb();
    await dbi.delete(advancedSettlementMeasurements).where(eq(advancedSettlementMeasurements.surveyId, surveyId));
  }

  // Edge Settlements
  async getEdgeSettlements(surveyId: number): Promise<EdgeSettlement[]> {
    const dbi = await ensureDb();
    return await dbi.select().from(edgeSettlements).where(eq(edgeSettlements.surveyId, surveyId));
  }

  async createEdgeSettlement(settlement: InsertEdgeSettlement): Promise<EdgeSettlement> {
    const dbi = await ensureDb();
    const [newSettlement] = await dbi
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
    const dbi = await ensureDb();
    let query = dbi.select().from(aiGuidanceTemplates);
    
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
    const dbi = await ensureDb();
    const [conversation] = await dbi
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.reportId, reportId),
          eq(aiConversations.sessionId, sessionId),
        ),
      );
    return conversation || undefined;
  }

  async saveAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const dbi = await ensureDb();
    const [saved] = await dbi
      .insert(aiConversations)
      .values(conversation as any)
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
}

export const storage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();
