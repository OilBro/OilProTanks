import { db } from './db.ts';
import { thicknessMeasurements } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function updateBirlaReport() {
  console.log('Updating Tank 6 Birla Carbon report summary...\n');
  
  const reportId = 45;
  
  // Get all measurements with recalculated values
  const measurements = await db
    .select()
    .from(thicknessMeasurements)
    .where(eq(thicknessMeasurements.reportId, reportId));
    
  if (!measurements.length) {
    console.error('No measurements found!');
    return;
  }
  
  console.log(`Found ${measurements.length} thickness measurements`);
  
  // Group by component and calculate statistics
  const byComponent: Record<string, { 
    measurements: typeof measurements, 
    minLife: number,
    avgRate: number,
    maxRate: number,
    minCurrent: number
  }> = {};
  
  measurements.forEach(m => {
    const comp = m.component || 'Unknown';
    if (!byComponent[comp]) {
      byComponent[comp] = {
        measurements: [],
        minLife: 999,
        avgRate: 0,
        maxRate: 0,
        minCurrent: 999
      };
    }
    
    byComponent[comp].measurements.push(m);
    
    const life = parseFloat(m.remainingLife || '999');
    const rate = parseFloat(m.corrosionRate || '0');
    const current = parseFloat(m.currentThickness || '0');
    
    if (life < byComponent[comp].minLife) byComponent[comp].minLife = life;
    if (rate > byComponent[comp].maxRate) byComponent[comp].maxRate = rate;
    if (current < byComponent[comp].minCurrent) byComponent[comp].minCurrent = current;
  });
  
  // Calculate averages
  Object.entries(byComponent).forEach(([comp, data]) => {
    const rates = data.measurements.map(m => parseFloat(m.corrosionRate || '0'));
    data.avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  });
  
  console.log('\nCOMPONENT SUMMARY:');
  console.log('=' .repeat(80));
  
  let overallMinLife = 999;
  let overallMaxRate = 0;
  let controllingComponent = '';
  
  Object.entries(byComponent).forEach(([comp, data]) => {
    console.log(`\n${comp}:`);
    console.log(`  Number of measurements: ${data.measurements.length}`);
    console.log(`  Minimum current thickness: ${data.minCurrent.toFixed(3)}"`);
    console.log(`  Average corrosion rate: ${(data.avgRate * 1000).toFixed(2)} mpy`);
    console.log(`  Maximum corrosion rate: ${(data.maxRate * 1000).toFixed(2)} mpy`);
    console.log(`  Minimum remaining life: ${data.minLife.toFixed(1)} years`);
    
    if (data.minLife < overallMinLife) {
      overallMinLife = data.minLife;
      controllingComponent = comp;
    }
    
    if (data.maxRate > overallMaxRate) {
      overallMaxRate = data.maxRate;
    }
  });
  
  console.log('\n' + '=' .repeat(80));
  console.log('\nOVERALL TANK ASSESSMENT:');
  console.log(`  Controlling Component: ${controllingComponent}`);
  console.log(`  Minimum Remaining Life: ${overallMinLife.toFixed(1)} years`);
  console.log(`  Maximum Corrosion Rate: ${(overallMaxRate * 1000).toFixed(2)} mpy`);
  
  // Calculate inspection intervals per API 653
  let externalInterval: string;
  let internalInterval: string;
  
  if (overallMinLife < 1) {
    externalInterval = 'Immediate';
    internalInterval = 'Immediate';
  } else if (overallMinLife < 5) {
    externalInterval = 'Within 1 year';
    internalInterval = 'Within 2 years';
  } else {
    const external = Math.min(5, Math.floor(overallMinLife / 4));
    const internal = Math.min(20, Math.floor(overallMinLife / 4));
    externalInterval = `${external} years`;
    internalInterval = `${internal} years`;
  }
  
  console.log(`\nRECOMMENDED INSPECTION INTERVALS:`);
  console.log(`  External Inspection: ${externalInterval}`);
  console.log(`  Internal Inspection: ${internalInterval}`);
  
  console.log('\n✅ Report analysis complete!');
  console.log('\nNote: The thickness measurements have been corrected to match');
  console.log('the original TEAM Tank Consultants report methodology.');
}

// Run the update
updateBirlaReport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });