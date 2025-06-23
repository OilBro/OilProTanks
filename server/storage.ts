import { 
  users, 
  inspectionReports, 
  thicknessMeasurements, 
  inspectionChecklists, 
  reportTemplates,
  type User, 
  type InsertUser,
  type InspectionReport,
  type InsertInspectionReport,
  type ThicknessMeasurement,
  type InsertThicknessMeasurement,
  type InspectionChecklist,
  type InsertInspectionChecklist,
  type ReportTemplate,
  type InsertReportTemplate
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private inspectionReports: Map<number, InspectionReport>;
  private thicknessMeasurements: Map<number, ThicknessMeasurement>;
  private inspectionChecklists: Map<number, InspectionChecklist>;
  private reportTemplates: Map<number, ReportTemplate>;
  private currentUserId: number;
  private currentReportId: number;
  private currentMeasurementId: number;
  private currentChecklistId: number;
  private currentTemplateId: number;

  constructor() {
    this.users = new Map();
    this.inspectionReports = new Map();
    this.thicknessMeasurements = new Map();
    this.inspectionChecklists = new Map();
    this.reportTemplates = new Map();
    this.currentUserId = 1;
    this.currentReportId = 1;
    this.currentMeasurementId = 1;
    this.currentChecklistId = 1;
    this.currentTemplateId = 1;
    
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
      ...measurement, 
      id, 
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
    const newChecklist: InspectionChecklist = { ...checklist, id };
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
}

export const storage = new MemStorage();
