import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

let dbInstance: any;
let poolInstance: any;

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL not set – using mock database (MemStorage expected for tests)');
  dbInstance = {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([]),
        orderBy: () => Promise.resolve([])
      })
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([])
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([])
        })
      })
    }),
    delete: () => ({
      where: () => Promise.resolve({ rowCount: 0 })
    })
  };
} else {
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzle({ client: poolInstance, schema });
}

// Standard named exports
export const pool = poolInstance;
export const db = dbInstance;