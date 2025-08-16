import * as XLSX from "xlsx";

export function generateInspectionTemplate() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // 1. Basic Information Sheet
  const basicInfoData = [
    ["API 653 Tank Inspection Report Template"],
    ["Instructions: Fill in the white cells. Mark N/A for sections not applicable."],
    [],
    ["Basic Tank Information"],
    ["Tank ID:", "", "Example: T-101"],
    ["Service/Product:", "", "Example: Crude Oil"],
    ["Location/Facility:", "", "Example: Houston Terminal"],
    ["Owner/Client:", "", "Example: ABC Oil Company"],
    [],
    ["Tank Specifications"],
    ["Diameter (ft):", "", "Leave blank if unknown"],
    ["Height (ft):", "", "Leave blank if unknown"],
    ["Capacity (bbls):", "", "Leave blank if unknown"],
    ["Year Built:", "", "Example: 1995"],
    ["Construction Code:", "", "Example: API-650"],
    [],
    ["Inspection Details"],
    ["Inspector Name:", "", "Required"],
    ["Inspection Date:", "", "Format: YYYY-MM-DD"],
    ["Report Number:", "", "Example: 2025-001"],
    ["API Certification #:", "", "Example: 12345"],
    ["Years Since Last Inspection:", "", "Number only"],
    [],
    ["Material Information"],
    ["Shell Material:", "", "Example: A36"],
    ["Original Shell Thickness:", "", "In inches"],
    ["Roof Type:", "", "Example: Cone, Dome, Floating"],
    ["Foundation Type:", "", "Example: Concrete Ring"],
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(basicInfoData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 30 }, // Label column
    { wch: 20 }, // Value column
    { wch: 40 }  // Instructions column
  ];
  
  // Add styling hints (Excel will interpret these)
  ws1['A1'].s = { font: { bold: true, sz: 16 } };
  ws1['A4'].s = { font: { bold: true, sz: 14 } };
  ws1['A10'].s = { font: { bold: true, sz: 14 } };
  ws1['A17'].s = { font: { bold: true, sz: 14 } };
  ws1['A24'].s = { font: { bold: true, sz: 14 } };
  
  XLSX.utils.book_append_sheet(wb, ws1, "Basic Information");
  
  // 2. Shell Thickness Sheet
  const shellThicknessData = [
    ["Shell Thickness Measurements"],
    ["Mark N/A in Course column if section not applicable"],
    [],
    ["Course", "North", "South", "East", "West", "NE", "NW", "SE", "SW", "Original", "Min Required"],
    ["1", "", "", "", "", "", "", "", "", "0.375", "0.250"],
    ["2", "", "", "", "", "", "", "", "", "0.375", "0.250"],
    ["3", "", "", "", "", "", "", "", "", "0.312", "0.200"],
    ["4", "", "", "", "", "", "", "", "", "0.312", "0.200"],
    ["5", "", "", "", "", "", "", "", "", "0.250", "0.187"],
    ["6", "", "", "", "", "", "", "", "", "0.250", "0.187"],
    ["7", "", "", "", "", "", "", "", "", "0.250", "0.187"],
    ["8", "", "", "", "", "", "", "", "", "0.250", "0.187"],
    ["9", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A"],
    ["10", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A"],
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(shellThicknessData);
  ws2['!cols'] = [
    { wch: 10 }, // Course
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // Directions
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // More directions
    { wch: 12 }, { wch: 12 } // Original & Min
  ];
  
  XLSX.utils.book_append_sheet(wb, ws2, "Shell Thickness");
  
  // 3. Bottom Thickness Sheet
  const bottomThicknessData = [
    ["Bottom Plate Thickness Measurements"],
    ["Enter thickness values or N/A for plates not measured"],
    [],
    ["Grid Reference", "Thickness", "Grid Reference", "Thickness", "Grid Reference", "Thickness"],
    ["A1", "", "B1", "", "C1", ""],
    ["A2", "", "B2", "", "C2", ""],
    ["A3", "", "B3", "", "C3", ""],
    ["A4", "", "B4", "", "C4", ""],
    ["A5", "", "B5", "", "C5", ""],
    [],
    ["Annular Ring Measurements"],
    ["Position", "North", "South", "East", "West"],
    ["Inner", "", "", "", ""],
    ["Center", "", "", "", ""],
    ["Outer", "", "", "", ""],
    [],
    ["Mark entire section N/A if bottom inspection not performed:", "N/A"],
  ];
  
  const ws3 = XLSX.utils.aoa_to_sheet(bottomThicknessData);
  ws3['!cols'] = [
    { wch: 15 }, { wch: 12 },
    { wch: 15 }, { wch: 12 },
    { wch: 15 }, { wch: 12 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws3, "Bottom Thickness");
  
  // 4. Roof & Nozzles Sheet
  const roofNozzleData = [
    ["Roof Thickness Measurements"],
    ["Location", "Thickness", "Notes"],
    ["Center", "", ""],
    ["Edge - North", "", ""],
    ["Edge - South", "", ""],
    ["Edge - East", "", ""],
    ["Edge - West", "", ""],
    ["Nozzle Area 1", "", ""],
    ["Nozzle Area 2", "", ""],
    ["Mark N/A if not measured:", "N/A", ""],
    [],
    ["Nozzle Thickness Measurements"],
    ["Nozzle ID", "Size", "Service", "Thickness", "Flange Type", "Condition"],
    ["N1", "", "", "", "", ""],
    ["N2", "", "", "", "", ""],
    ["N3", "", "", "", "", ""],
    ["N4", "", "", "", "", ""],
    ["N5", "", "", "", "", ""],
    ["Mark N/A for unused rows:", "N/A", "", "", "", ""],
  ];
  
  const ws4 = XLSX.utils.aoa_to_sheet(roofNozzleData);
  ws4['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 30 },
    { wch: 12 }, { wch: 15 }, { wch: 15 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws4, "Roof and Nozzles");
  
  // 5. Inspection Checklist Sheet
  const checklistData = [
    ["Inspection Checklist"],
    ["Mark: S=Satisfactory, U=Unsatisfactory, N/A=Not Applicable"],
    [],
    ["External Components", "Condition", "Notes"],
    ["Shell General Condition", "", ""],
    ["Shell Insulation", "", ""],
    ["Foundation", "", ""],
    ["Anchor Bolts", "", ""],
    ["Grounding System", "", ""],
    ["Stairs/Ladders", "", ""],
    ["Platforms/Walkways", "", ""],
    ["Wind Girder", "", ""],
    ["Roof Structure", "", ""],
    ["Vents (PV/EV)", "", ""],
    ["Manways", "", ""],
    ["Water Draw-off", "", ""],
    ["Gauging Equipment", "", ""],
    ["Dyke/Secondary Containment", "", ""],
    [],
    ["Internal Components", "Condition", "Notes"],
    ["Internal Coating", "", ""],
    ["Sump", "", ""],
    ["Heating Coils", "", ""],
    ["Mixers", "", ""],
    ["Floating Roof (if applicable)", "", ""],
    ["Support Legs", "", ""],
    ["Mark N/A if internal inspection not performed:", "N/A", ""],
  ];
  
  const ws5 = XLSX.utils.aoa_to_sheet(checklistData);
  ws5['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 40 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws5, "Inspection Checklist");
  
  // 6. Instructions Sheet
  const instructionsData = [
    ["INSTRUCTIONS FOR USE"],
    [],
    ["1. GENERAL GUIDELINES:"],
    ["   - Fill in all white cells with appropriate data"],
    ["   - Leave cells blank if data is unknown or not available"],
    ["   - Use 'N/A' to indicate sections that are not applicable"],
    ["   - All thickness measurements should be in inches"],
    ["   - Dates should be in YYYY-MM-DD format"],
    [],
    ["2. N/A USAGE:"],
    ["   - Mark entire sections N/A if they don't apply to your inspection"],
    ["   - For Shell Thickness: Mark N/A in Course column for courses that don't exist"],
    ["   - For Bottom/Roof: Mark N/A in designated cells if not inspected"],
    ["   - For Nozzles: Mark N/A for unused nozzle rows"],
    ["   - For Checklist: Use N/A for components not present or not inspected"],
    [],
    ["3. THICKNESS MEASUREMENTS:"],
    ["   - Enter values in decimal inches (e.g., 0.375, 0.250)"],
    ["   - Ensure measurements are from calibrated instruments"],
    ["   - Include all CML (Condition Monitoring Location) readings"],
    [],
    ["4. IMPORTING BACK:"],
    ["   - Save this file as .xlsx format"],
    ["   - Do not modify sheet names or structure"],
    ["   - Upload through the Import Excel Reports feature"],
    ["   - System will automatically process N/A sections"],
    [],
    ["5. QUALITY CHECKS:"],
    ["   - Verify Tank ID and Report Number are unique"],
    ["   - Ensure Inspector Name and Date are filled"],
    ["   - Double-check thickness readings for accuracy"],
    ["   - Review N/A markings before import"],
  ];
  
  const ws6 = XLSX.utils.aoa_to_sheet(instructionsData);
  ws6['!cols'] = [{ wch: 80 }];
  
  XLSX.utils.book_append_sheet(wb, ws6, "Instructions");
  
  // Generate binary string
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  
  // Convert to buffer
  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }
  
  return s2ab(wbout);
}

// Helper function to identify N/A sections during import
export function isMarkedAsNA(value: any): boolean {
  if (!value) return false;
  const strValue = String(value).trim().toUpperCase();
  return strValue === 'N/A' || strValue === 'NA';
}

// Generate Excel file for a single checklist template
export function generateChecklistTemplateExcel(template: any) {
  const wb = XLSX.utils.book_new();
  
  // Parse the template items
  let items = [];
  try {
    items = JSON.parse(template.items);
  } catch {
    items = [];
  }
  
  // Create checklist sheet
  const checklistData = [
    [`${template.name} - Inspection Checklist`],
    [`Category: ${template.category}`],
    [`Description: ${template.description || 'N/A'}`],
    [`Created By: ${template.createdBy}`],
    [`Created: ${new Date(template.createdAt).toLocaleDateString()}`],
    [],
    ['Item', 'Status', 'Notes'],
    ['---', '---', '---']
  ];
  
  // Add each checklist item
  items.forEach((item: any) => {
    checklistData.push([
      item.item || item.description || item,
      'Not Inspected',
      ''
    ]);
  });
  
  // Add additional empty rows for manual entries
  for (let i = 0; i < 10; i++) {
    checklistData.push(['', '', '']);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(checklistData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 50 }, // Item column
    { wch: 20 }, // Status column
    { wch: 40 }  // Notes column
  ];
  
  // Add the sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
  
  // Add instructions sheet
  const instructionsData = [
    ['INSTRUCTIONS'],
    [],
    ['1. Use this checklist during your inspection'],
    ['2. For each item, mark the Status as:'],
    ['   - Acceptable: Item meets standards'],
    ['   - Monitor: Item requires monitoring'],
    ['   - Action Required: Item needs immediate attention'],
    ['   - Not Applicable: Item doesn\'t apply'],
    ['   - Not Inspected: Item was not checked'],
    [],
    ['3. Add any relevant notes in the Notes column'],
    ['4. Additional items can be added in the empty rows'],
    [],
    ['5. This template can be re-imported back into the system']
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);
  ws2['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  
  // Generate binary string
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  
  // Convert to buffer
  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }
  
  return s2ab(wbout);
}