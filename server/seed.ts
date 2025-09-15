import { db } from "./db";
import { reportTemplates } from "@shared/schema";

/**
 * Seed the database with initial report templates.
 * NOTE: This function is safe to call during application startup – it does NOT
 * terminate the Node.js process. Historically this module auto-ran and then
 * called process.exit(), which caused hosting platforms that execute the seed
 * on import (or bundlers that eagerly evaluate modules) to see the app exit
 * immediately after seeding. We now guard execution so the process only exits
 * when this file is executed directly (e.g. `node server/seed.ts`).
 */
/**
 * Safe timeout wrapper for database operations that properly clears timers
 * and prevents unhandled rejections during deployment
 */
function withSafeTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Database operation '${operation}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }),
    timeoutPromise
  ]);
}

/**
 * Seed database with proper status reporting
 * @returns Object with success status and error message if applicable
 */
async function seedDatabase(): Promise<{ success: boolean; error?: string }> {
  const SEED_TIMEOUT = 10000; // 10 second timeout for each operation
  
  try {
    console.log("[seed] Starting database seeding with timeout protection...");
    
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

    // Check if templates already exist with timeout protection
    console.log("[seed] Checking for existing templates...");
    const existingTemplates = await withSafeTimeout(
      db.select().from(reportTemplates).limit(1),
      SEED_TIMEOUT,
      'check existing templates'
    ) as any[];
    
    if (existingTemplates.length === 0) {
      console.log("[seed] No templates found, inserting templates...");
      await withSafeTimeout(
        db.insert(reportTemplates).values(templates),
        SEED_TIMEOUT,
        'insert templates'
      );
      console.log("[seed] Template data seeded successfully!");
    } else {
      console.log("[seed] Templates already exist, skipping seed.");
    }
    
    return { success: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[seed] Error during database seeding:", errorMsg);
    
    if (errorMsg.includes('timed out')) {
      console.error("[seed] Database operation timed out - this may indicate slow database connectivity");
    }
    
    return { success: false, error: errorMsg };
  }
}

// Execute only when run directly: `node server/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("Seed completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
}

export { seedDatabase };