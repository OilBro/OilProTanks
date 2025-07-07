import * as XLSX from "xlsx";

interface ChecklistItem {
  category: string;
  item: string;
  status?: string;
  notes?: string;
}

interface ChecklistTemplate {
  name: string;
  description?: string;
  category: string;
  items: ChecklistItem[];
}

export async function handleChecklistUpload(buffer: Buffer, fileName: string): Promise<ChecklistTemplate> {
  console.log('=== Checklist Import Request ===');
  console.log('Processing checklist file:', fileName);
  console.log('File size:', buffer.length, 'bytes');
  
  let checklistData: ChecklistTemplate;
  
  if (fileName.toLowerCase().endsWith('.pdf')) {
    checklistData = await extractChecklistFromPDF(buffer, fileName);
  } else {
    checklistData = await extractChecklistFromExcel(buffer, fileName);
  }
  
  return checklistData;
}

async function extractChecklistFromExcel(buffer: Buffer, fileName: string): Promise<ChecklistTemplate> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const items: ChecklistItem[] = [];
  
  // Look for checklist data in all sheets
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log(`Processing checklist sheet: ${sheetName} with ${data.length} rows`);
    
    // Find header row and extract checklist items
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Look for checklist patterns
      const firstCell = String(row[0] || '').toLowerCase();
      const secondCell = String(row[1] || '').toLowerCase();
      
      // Skip header rows
      if (firstCell.includes('item') || firstCell.includes('category') || 
          firstCell.includes('description') || firstCell.includes('checklist')) {
        continue;
      }
      
      // Extract checklist items
      if (row.length >= 2 && firstCell && secondCell) {
        // Determine category based on keywords
        let category = 'general';
        if (firstCell.includes('external') || secondCell.includes('external')) category = 'external';
        else if (firstCell.includes('internal') || secondCell.includes('internal')) category = 'internal';
        else if (firstCell.includes('foundation') || secondCell.includes('foundation')) category = 'foundation';
        else if (firstCell.includes('roof') || secondCell.includes('roof')) category = 'roof';
        else if (firstCell.includes('appurtenance') || secondCell.includes('appurtenance')) category = 'appurtenances';
        
        items.push({
          category,
          item: secondCell || firstCell,
          status: row[2] ? String(row[2]) : undefined,
          notes: row[3] ? String(row[3]) : undefined
        });
      }
    }
  }
  
  // Extract template name from filename
  const templateName = fileName.replace(/\.(xlsx|xls|xlsm)$/i, '').replace(/[_-]/g, ' ');
  
  return {
    name: templateName,
    description: `Imported from ${fileName}`,
    category: 'general',
    items
  };
}

async function extractChecklistFromPDF(buffer: Buffer, fileName: string): Promise<ChecklistTemplate> {
  try {
    // Dynamic import to avoid initialization issues
    const pdfParse = await import('pdf-parse');
    const pdfData = await (pdfParse.default || pdfParse)(buffer);
    const text = pdfData.text;
    
    console.log('PDF text extracted for checklist analysis');
    
    // Extract checklist items from PDF text using patterns
    const items: ChecklistItem[] = [];
    const lines = text.split('\n');
    
    let currentCategory = 'general';
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;
      
      // Detect category changes
      if (cleanLine.toLowerCase().includes('external')) currentCategory = 'external';
      else if (cleanLine.toLowerCase().includes('internal')) currentCategory = 'internal';
      else if (cleanLine.toLowerCase().includes('foundation')) currentCategory = 'foundation';
      else if (cleanLine.toLowerCase().includes('roof')) currentCategory = 'roof';
      else if (cleanLine.toLowerCase().includes('appurtenance')) currentCategory = 'appurtenances';
      
      // Look for checklist items (lines that start with numbers, bullets, or checkboxes)
      if (cleanLine.match(/^[\d\.\-\*\u2022\u2713\u2717\u25A1\u25A0]/)) {
        // Remove common prefixes
        const itemText = cleanLine.replace(/^[\d\.\-\*\u2022\u2713\u2717\u25A1\u25A0\s]+/, '').trim();
        
        if (itemText.length > 5) { // Only include meaningful items
          items.push({
            category: currentCategory,
            item: itemText,
            status: 'not_applicable'
          });
        }
      }
    }
    
    const templateName = fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
    
    return {
      name: templateName,
      description: `Imported from PDF: ${fileName}`,
      category: 'general',
      items
    };
    
  } catch (error) {
    console.error('PDF checklist extraction failed:', error);
    
    // Fallback: create empty template
    return {
      name: fileName.replace(/\.pdf$/i, ''),
      description: 'PDF import failed - manual entry required',
      category: 'general',
      items: []
    };
  }
}

// Predefined standard checklist templates
export const standardChecklists = {
  api653_external: {
    name: "API 653 External Inspection",
    description: "Standard external inspection checklist per API 653",
    category: "external",
    items: [
      { category: "external", item: "Tank shell condition - general corrosion", status: "satisfactory" },
      { category: "external", item: "Tank shell condition - localized corrosion", status: "satisfactory" },
      { category: "external", item: "Tank shell condition - mechanical damage", status: "satisfactory" },
      { category: "external", item: "Roof condition - general assessment", status: "satisfactory" },
      { category: "external", item: "Foundation condition - settlement", status: "satisfactory" },
      { category: "external", item: "Foundation condition - cracking", status: "satisfactory" },
      { category: "external", item: "Nozzle condition - external assessment", status: "satisfactory" },
      { category: "external", item: "Manway condition - external assessment", status: "satisfactory" },
      { category: "external", item: "Gauge hatch condition", status: "satisfactory" },
      { category: "external", item: "Vent condition", status: "satisfactory" },
      { category: "external", item: "External coating condition", status: "satisfactory" },
      { category: "external", item: "Cathodic protection system", status: "satisfactory" },
      { category: "external", item: "Secondary containment", status: "satisfactory" }
    ]
  },
  
  api653_internal: {
    name: "API 653 Internal Inspection",
    description: "Standard internal inspection checklist per API 653",
    category: "internal",
    items: [
      { category: "internal", item: "Shell internal condition - general corrosion", status: "satisfactory" },
      { category: "internal", item: "Shell internal condition - pitting", status: "satisfactory" },
      { category: "internal", item: "Bottom plate condition - general", status: "satisfactory" },
      { category: "internal", item: "Bottom plate condition - edge strips", status: "satisfactory" },
      { category: "internal", item: "Roof internal condition", status: "satisfactory" },
      { category: "internal", item: "Internal coating condition", status: "satisfactory" },
      { category: "internal", item: "Nozzle internal condition", status: "satisfactory" },
      { category: "internal", item: "Manway internal condition", status: "satisfactory" },
      { category: "internal", item: "Internal appurtenances", status: "satisfactory" },
      { category: "internal", item: "Product contamination assessment", status: "satisfactory" },
      { category: "internal", item: "Water contamination assessment", status: "satisfactory" }
    ]
  }
};