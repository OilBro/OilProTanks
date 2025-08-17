// Script to create AI assistant tables
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  try {
    // Create ai_conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        report_id INTEGER,
        user_id TEXT,
        session_id TEXT,
        context TEXT,
        messages JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✓ Created ai_conversations table');

    // Create ai_guidance_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS ai_guidance_templates (
        id SERIAL PRIMARY KEY,
        category TEXT,
        section TEXT,
        trigger_keywords JSONB,
        guidance_text TEXT,
        api653_references JSONB,
        related_calculations JSONB,
        warning_thresholds JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✓ Created ai_guidance_templates table');

    // Insert initial guidance templates
    await sql`
      INSERT INTO ai_guidance_templates (category, section, trigger_keywords, guidance_text, api653_references, related_calculations, warning_thresholds)
      VALUES 
        ('thickness', 'shell', '["shell", "thickness", "minimum", "tmin"]'::jsonb, 
         'Shell minimum thickness per API 653 Section 4.3.2', 
         '["4.3.2", "4.3.3", "Table 4.1"]'::jsonb,
         '["tmin", "corrosion_rate", "remaining_life"]'::jsonb,
         '{"criticalThickness": 0.100, "warningThickness": 0.150}'::jsonb),
        ('settlement', 'foundation', '["settlement", "cosine", "foundation", "tilt"]'::jsonb,
         'Settlement analysis per API 653 Annex B',
         '["B.2.2.4", "B.3.2.1", "B.3.4"]'::jsonb,
         '["cosine_fit", "out_of_plane", "edge_settlement"]'::jsonb,
         '{"maxSettlement": 6, "rSquaredMin": 0.90}'::jsonb),
        ('safety', 'general', '["safety", "confined", "space", "gas", "test"]'::jsonb,
         'Safety procedures for tank inspection',
         '["1.4", "12.2"]'::jsonb,
         '[]'::jsonb,
         '{}'::jsonb)
      ON CONFLICT DO NOTHING
    `;
    console.log('✓ Inserted initial guidance templates');

    console.log('\n✅ AI Assistant tables created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();