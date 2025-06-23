import { db } from "./db";
import { reportTemplates } from "@shared/schema";

async function seedDatabase() {
  try {
    console.log("Seeding database with template data...");
    
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

    // Check if templates already exist
    const existingTemplates = await db.select().from(reportTemplates);
    
    if (existingTemplates.length === 0) {
      await db.insert(reportTemplates).values(templates);
      console.log("Template data seeded successfully!");
    } else {
      console.log("Templates already exist, skipping seed.");
    }
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run seed if called directly
seedDatabase().then(() => {
  console.log("Seed completed");
  process.exit(0);
}).catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

export { seedDatabase };