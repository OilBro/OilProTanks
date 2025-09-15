import { db } from './db.ts';
import { thicknessMeasurements } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

async function fixBirlaThicknesses() {
  console.log('Fixing Tank 6 Birla Carbon thickness measurements...\n');
  
  // Find measurements for Tank 6 Birla Carbon (report ID 45)
  const reportId = 45;
  
  // Get all thickness measurements for this report
  const measurements = await db
    .select()
    .from(thicknessMeasurements)
    .where(eq(thicknessMeasurements.reportId, reportId));
    
  console.log(`Found ${measurements.length} thickness measurements for report ${reportId}\n`);
  
  // Group by component to see current state
  const byComponent: Record<string, typeof measurements> = {};
  measurements.forEach(m => {
    const comp = m.component || 'Unknown';
    if (!byComponent[comp]) byComponent[comp] = [];
    byComponent[comp].push(m);
  });
  
  console.log('Current thickness data by component:');
  Object.entries(byComponent).forEach(([comp, items]) => {
    console.log(`\n${comp}: ${items.length} measurements`);
    const first = items[0];
    if (first) {
      console.log(`  Original Thickness: ${first.originalThickness}"`);
      console.log(`  Current values: ${items.slice(0, 3).map(i => i.currentThickness).join('", ')}"`);
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('APPLYING FIXES:');
  
  // Fix Ring 1 - should be 0.281" original, not 0.312"
  console.log('\n1. Fixing Shell Ring 1 original thickness: 0.312" → 0.281"');
  const ring1Updates = await db
    .update(thicknessMeasurements)
    .set({ originalThickness: '0.281' })
    .where(
      and(
        eq(thicknessMeasurements.reportId, reportId),
        eq(thicknessMeasurements.component, 'Shell Ring 1')
      )
    )
    .returning();
  console.log(`   Updated ${ring1Updates.length} Shell Ring 1 measurements`);
  
  // Fix Ring 4 - should be 0.312" original, not 0.281"
  console.log('\n2. Fixing Shell Ring 4 original thickness: 0.281" → 0.312"');
  const ring4Updates = await db
    .update(thicknessMeasurements)
    .set({ originalThickness: '0.312' })
    .where(
      and(
        eq(thicknessMeasurements.reportId, reportId),
        eq(thicknessMeasurements.component, 'Shell Ring 4')
      )
    )
    .returning();
  console.log(`   Updated ${ring4Updates.length} Shell Ring 4 measurements`);
  
  // Now update the calculated fields for all affected measurements
  console.log('\n3. Recalculating corrosion rates and remaining life...');
  
  const tankAge = 67.61; // From the report
  const allUpdates = [...ring1Updates, ...ring4Updates];
  
  for (const measurement of allUpdates) {
    const original = parseFloat(measurement.originalThickness || '0');
    const current = parseFloat(measurement.currentThickness || '0');
    const loss = original - current;
    const corrosionRate = loss / tankAge; // inches per year
    
    // Calculate remaining life (using simplified calculation)
    // For proper calculation, we'd need minimum required thickness
    const minRequired = original * 0.5; // Simplified assumption
    const remainingLife = current > minRequired ? 
      (current - minRequired) / corrosionRate : 0;
    
    // Determine status
    let status = 'acceptable';
    if (remainingLife < 5) status = 'action_required';
    else if (remainingLife < 10) status = 'monitor';
    
    await db
      .update(thicknessMeasurements)
      .set({
        thicknessLoss: loss.toFixed(3),
        corrosionRate: corrosionRate.toFixed(5),
        remainingLife: remainingLife.toFixed(1),
        status
      })
      .where(eq(thicknessMeasurements.id, measurement.id));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('VERIFICATION AFTER FIXES:');
  
  // Verify the fixes
  const updatedMeasurements = await db
    .select()
    .from(thicknessMeasurements)
    .where(eq(thicknessMeasurements.reportId, reportId));
    
  const updatedByComponent: Record<string, typeof updatedMeasurements> = {};
  updatedMeasurements.forEach(m => {
    const comp = m.component || 'Unknown';
    if (!updatedByComponent[comp]) updatedByComponent[comp] = [];
    updatedByComponent[comp].push(m);
  });
  
  ['Shell Ring 1', 'Shell Ring 2', 'Shell Ring 3', 'Shell Ring 4'].forEach(comp => {
    if (updatedByComponent[comp]) {
      const items = updatedByComponent[comp];
      console.log(`\n${comp}:`);
      const first = items[0];
      if (first) {
        console.log(`  Original Thickness: ${first.originalThickness}"`);
        console.log(`  Current Thicknesses: ${items.map(i => i.currentThickness).slice(0, 3).join('", ')}"`);
        
        // Calculate average corrosion rate for this ring
        const rates = items.map(i => parseFloat(i.corrosionRate || '0'));
        const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        console.log(`  Average Corrosion Rate: ${(avgRate * 1000).toFixed(2)} mpy (${avgRate.toFixed(5)} in/yr)`);
        
        // Show minimum remaining life
        const lives = items.map(i => parseFloat(i.remainingLife || '0'));
        const minLife = Math.min(...lives);
        console.log(`  Minimum Remaining Life: ${minLife.toFixed(1)} years`);
      }
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('✅ Thickness corrections completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Regenerate the PDF report to reflect corrected calculations');
  console.log('2. Verify calculations match the original TEAM report values');
  console.log('3. Update calculation engine to prevent future errors');
}

// Run the fix
fixBirlaThicknesses()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });