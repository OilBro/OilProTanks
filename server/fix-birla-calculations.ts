import { db } from './db';
import { thicknessMeasurements, inspectionReports } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import {
  calculateCorrosionRate,
  calculateMinimumRequiredThickness,
  calculateRemainingLife,
  determineInspectionStatus,
  analyzeShellCourse
} from './api653-calculations';

async function fixBirlaCalculations() {
  console.log('Applying correct API 653 calculations to Tank 6 Birla Carbon...\n');
  
  const reportId = 45;
  
  // Get report details
  const [report] = await db
    .select()
    .from(inspectionReports)
    .where(eq(inspectionReports.id, reportId));
    
  if (!report) {
    console.error('Report not found!');
    return;
  }
  
  // Tank specifications from the original report
  const tankData = {
    diameter: 60, // feet
    totalHeight: 30, // feet
    specificGravity: 0.89,
    maxFillHeight: 28.5, // 95% of height
    jointEfficiency: 0.85,
    ageInYears: 67.61 // Built in 1954, inspected in 2021
  };
  
  // Shell course specifications
  const courseSpecs = [
    { number: 1, height: 7.5, originalThickness: 0.281 }, // FIXED from 0.312
    { number: 2, height: 7.5, originalThickness: 0.281 },
    { number: 3, height: 7.5, originalThickness: 0.281 },
    { number: 4, height: 7.5, originalThickness: 0.312 }  // FIXED from 0.281
  ];
  
  // Get all measurements
  const measurements = await db
    .select()
    .from(thicknessMeasurements)
    .where(eq(thicknessMeasurements.reportId, reportId));
    
  console.log(`Processing ${measurements.length} thickness measurements...\n`);
  
  // Group by shell ring
  const measurementsByRing: Record<string, typeof measurements> = {};
  measurements.forEach(m => {
    const ring = m.component || 'Unknown';
    if (!measurementsByRing[ring]) measurementsByRing[ring] = [];
    measurementsByRing[ring].push(m);
  });
  
  // Process each shell ring
  console.log('API 653 CALCULATION RESULTS:');
  console.log('=' * 80);
  
  for (let courseNum = 1; courseNum <= 4; courseNum++) {
    const ringName = `Shell Ring ${courseNum}`;
    const ringMeasurements = measurementsByRing[ringName] || [];
    
    if (ringMeasurements.length === 0) continue;
    
    const courseSpec = courseSpecs[courseNum - 1];
    
    // Calculate fill height from bottom of this course
    let fillHeightFromBottom = tankData.maxFillHeight;
    for (let i = 1; i < courseNum; i++) {
      fillHeightFromBottom -= courseSpecs[i - 1].height;
    }
    
    // Calculate minimum required thickness per API 653
    const minRequired = calculateMinimumRequiredThickness(
      courseNum,
      tankData.diameter,
      tankData.specificGravity,
      fillHeightFromBottom,
      tankData.jointEfficiency
    );
    
    console.log(`\n${ringName}:`);
    console.log(`  Original Thickness: ${courseSpec.originalThickness}"`);
    console.log(`  Minimum Required: ${minRequired.toFixed(3)}"`);
    console.log(`  Fill Height from Bottom: ${fillHeightFromBottom.toFixed(1)} ft`);
    
    // Find minimum current thickness
    const currentThicknesses = ringMeasurements.map(m => parseFloat(m.currentThickness || '0'));
    const minCurrent = Math.min(...currentThicknesses);
    const avgCurrent = currentThicknesses.reduce((a, b) => a + b, 0) / currentThicknesses.length;
    
    console.log(`  Current Thickness: Min=${minCurrent.toFixed(3)}", Avg=${avgCurrent.toFixed(3)}"`);
    
    // Calculate corrosion rate using minimum thickness (worst case)
    const { rateInchesPerYear, rateMPY } = calculateCorrosionRate(
      courseSpec.originalThickness,
      minCurrent,
      tankData.ageInYears
    );
    
    console.log(`  Thickness Loss: ${(courseSpec.originalThickness - minCurrent).toFixed(3)}"`);
    console.log(`  Corrosion Rate: ${rateInchesPerYear.toFixed(5)} in/yr (${rateMPY.toFixed(2)} mpy)`);
    
    // Calculate remaining life
    const remainingLife = calculateRemainingLife(
      minCurrent,
      minRequired,
      rateInchesPerYear
    );
    
    console.log(`  Remaining Life: ${remainingLife.toFixed(1)} years`);
    
    // Update all measurements for this ring
    for (const measurement of ringMeasurements) {
      const current = parseFloat(measurement.currentThickness || '0');
      const loss = courseSpec.originalThickness - current;
      
      const { rateInchesPerYear: localRate, rateMPY: localMPY } = calculateCorrosionRate(
        courseSpec.originalThickness,
        current,
        tankData.ageInYears
      );
      
      const localRemainingLife = calculateRemainingLife(
        current,
        minRequired,
        localRate
      );
      
      const status = determineInspectionStatus(
        localRemainingLife,
        current,
        minRequired
      );
      
      await db
        .update(thicknessMeasurements)
        .set({
          thicknessLoss: loss.toFixed(3),
          corrosionRate: localRate.toFixed(5),
          remainingLife: localRemainingLife.toFixed(1),
          status
        })
        .where(eq(thicknessMeasurements.id, measurement.id));
    }
  }
  
  console.log('\n' + '=' * 80);
  console.log('\nINSPECTION INTERVAL CALCULATION:');
  
  // Find the controlling (worst) shell ring
  let worstRemainingLife = 999;
  let controllingRing = '';
  
  for (const [ring, measurements] of Object.entries(measurementsByRing)) {
    if (!ring.startsWith('Shell Ring')) continue;
    
    for (const m of measurements) {
      const life = parseFloat(m.remainingLife || '999');
      if (life < worstRemainingLife) {
        worstRemainingLife = life;
        controllingRing = ring;
      }
    }
  }
  
  console.log(`Controlling Component: ${controllingRing}`);
  console.log(`Minimum Remaining Life: ${worstRemainingLife.toFixed(1)} years`);
  
  // Update report with correct calculations
  await db
    .update(inspectionReports)
    .set({
      controllingComponent: controllingRing,
      minimumRemainingLife: worstRemainingLife.toFixed(1),
      nextExternalInspection: worstRemainingLife < 5 ? 'Immediate' : `${Math.min(5, Math.floor(worstRemainingLife / 4))} years`,
      nextInternalInspection: worstRemainingLife < 5 ? 'Immediate' : `${Math.min(20, Math.floor(worstRemainingLife / 4))} years`
    })
    .where(eq(inspectionReports.id, reportId));
  
  console.log(`\nRecommended Inspection Intervals:`);
  console.log(`  External: ${worstRemainingLife < 5 ? 'Immediate' : Math.min(5, Math.floor(worstRemainingLife / 4)) + ' years'}`);
  console.log(`  Internal: ${worstRemainingLife < 5 ? 'Immediate' : Math.min(20, Math.floor(worstRemainingLife / 4)) + ' years'}`);
  
  console.log('\n✅ API 653 calculations applied successfully!');
  console.log('\nNote: These calculations now match the methodology from the original TEAM report.');
}

// Run the calculation fix
fixBirlaCalculations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });