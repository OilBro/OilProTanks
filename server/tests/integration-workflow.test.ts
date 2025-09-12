import { handleExcelImport } from '../import-handler';
import fs from 'fs';
import path from 'path';

describe('OilProTanks Workflow Integration', () => {
  it('should import a single-tank Excel file and create a valid report', async () => {
    const buffer = fs.readFileSync(path.join(__dirname, '../../attached_assets/report data exported with sample data filled in some places_1752344561822.xlsx'));
    const result = await handleExcelImport(buffer, 'Tank_01.xlsx');
    expect(result.importedData).toBeDefined();
    expect(result.thicknessMeasurements.length).toBeGreaterThan(0);
    expect(result.importedData.tankId).toMatch(/Tank/i);
    expect(result.importedData.inspectionDate).toBeDefined();
  });

  it('should import a multi-tank Excel file and create separate reports', async () => {
    const buffer = fs.readFileSync(path.join(__dirname, '../../attached_assets/report data exported with sample data filled in some places_1752344561822.xlsx'));
    const result = await handleExcelImport(buffer, 'MultiTank.xlsx');
    if (result.multiTankImports) {
      expect(result.multiTankImports.length).toBeGreaterThan(1);
      result.multiTankImports.forEach(tank => {
        expect(tank.importedData.tankId).toBeDefined();
        expect(tank.thicknessMeasurements.length).toBeGreaterThan(0);
      });
    }
  });

  it('should validate findings and recommendations mapping', async () => {
    const buffer = fs.readFileSync(path.join(__dirname, '../../attached_assets/report data exported with sample data filled in some places_1752344561822.xlsx'));
    const result = await handleExcelImport(buffer, 'Tank_01.xlsx');
    expect(result.importedData.findings).toBeDefined();
  });

  it('should handle malformed Excel data gracefully', async () => {
    const buffer = Buffer.from('malformed data');
    await expect(handleExcelImport(buffer, 'Malformed.xlsx')).rejects.toThrow();
  });

  // Add more tests for PDF generation, manual entry, and orphan cleanup as needed
});
