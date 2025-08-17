import * as XLSX from 'xlsx';
import archiver from 'archiver';
import { PassThrough } from 'stream';

// CSV Template Definitions for API 653 Data Ingestion
export interface BasePageNominal {
  component: string;
  nominalThickness: number;
  corrosionAllowance: number;
  jointEfficiency?: number;
  notes?: string;
}

export interface ShellTML {
  course: number;
  location: string;
  q1_thickness?: number;
  q2_thickness?: number;
  q3_thickness?: number;
  q4_thickness?: number;
  avg_thickness?: number;
  date_previous?: string;
  date_current?: string;
  inspector?: string;
}

export interface NozzleTML {
  nozzleId: string;
  size: string;
  service: string;
  q1_thickness?: number;
  q2_thickness?: number;
  q3_thickness?: number;
  q4_thickness?: number;
  thickness_previous?: number;
  date_current?: string;
  condition?: string;
}

export interface ExceptionRegister {
  exceptionId: string;
  component: string;
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Monitor';
  actionRequired: string;
  dueDate?: string;
  status: 'Open' | 'In Progress' | 'Closed';
}

export interface SettlementSurveyPoint {
  station: number;
  angle: number;
  elevation: number;
  date: string;
  notes?: string;
}

// Generate CSV template for BasePage Nominals
export function generateBasePageNominalsTemplate(): string {
  const headers = ['Component', 'Nominal Thickness (in)', 'Corrosion Allowance (in)', 'Joint Efficiency', 'Notes'];
  const rows = [
    ['Shell Course 1', '', '0.0625', '0.85', ''],
    ['Shell Course 2', '', '0.0625', '0.85', ''],
    ['Shell Course 3', '', '0.0625', '0.85', ''],
    ['Shell Course 4', '', '0.0625', '0.85', ''],
    ['Shell Course 5', '', '0.0625', '0.85', ''],
    ['Shell Course 6', '', '0.0625', '0.85', ''],
    ['Shell Course 7', '', '0.0625', '0.85', ''],
    ['Shell Course 8', '', '0.0625', '0.85', ''],
    ['Roof/End 1', '', '0.0625', '0.85', ''],
    ['Floor/End 2', '', '0.0625', '0.85', '']
  ];
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate CSV template for Shell TMLs
export function generateShellTMLsTemplate(): string {
  const headers = ['Course', 'Location', 'Q1 (in)', 'Q2 (in)', 'Q3 (in)', 'Q4 (in)', 'Avg (in)', 'Date Previous', 'Date Current', 'Inspector'];
  const rows = [];
  
  for (let course = 1; course <= 8; course++) {
    rows.push([course.toString(), 'North', '', '', '', '', '', '', '', '']);
    rows.push([course.toString(), 'East', '', '', '', '', '', '', '', '']);
    rows.push([course.toString(), 'South', '', '', '', '', '', '', '', '']);
    rows.push([course.toString(), 'West', '', '', '', '', '', '', '', '']);
  }
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate CSV template for Nozzle TMLs
export function generateNozzleTMLsTemplate(): string {
  const headers = ['Nozzle ID', 'Size', 'Service', 'Q1 (in)', 'Q2 (in)', 'Q3 (in)', 'Q4 (in)', 'Previous (in)', 'Date Current', 'Condition'];
  const rows = [
    ['N1', '2"', 'Outlet', '', '', '', '', '', '', 'Good'],
    ['N2', '1"', 'Sight Glass NB', '', '', '', '', '', '', 'Good'],
    ['N3', '1"', 'Sight Glass NC', '', '', '', '', '', '', 'Good'],
    ['N9', '18"', 'Manway', '', '', '', '', '', '', 'Good'],
    ['N4', '', '', '', '', '', '', '', '', ''],
    ['N5', '', '', '', '', '', '', '', '', ''],
    ['N6', '', '', '', '', '', '', '', '', ''],
    ['N7', '', '', '', '', '', '', '', '', ''],
    ['N8', '', '', '', '', '', '', '', '', '']
  ];
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate CSV template for Exception Register
export function generateExceptionRegisterTemplate(): string {
  const headers = ['Exception ID', 'Component', 'Description', 'Severity', 'Action Required', 'Due Date', 'Status'];
  const rows = [
    ['EX001', 'Shell Course 1', 'Example: Corrosion near weld', 'Minor', 'Monitor next inspection', '', 'Open'],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '']
  ];
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate CSV template for Settlement Survey
export function generateSettlementSurveyTemplate(): string {
  const headers = ['Station', 'Angle (degrees)', 'Elevation (inches)', 'Date', 'Notes'];
  const rows = [];
  
  // Generate 8 stations at 45-degree intervals
  for (let i = 0; i < 8; i++) {
    rows.push([(i + 1).toString(), (i * 45).toString(), '', '', '']);
  }
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate README for the data ingestion kit
export function generateReadme(): string {
  return `API 653 Tank Inspection Data Ingestion Kit
==========================================

This package contains CSV templates for capturing tank inspection data per API 653 standards.

INCLUDED TEMPLATES:
------------------
1. BasePage_Nominals.csv - Component nominal thicknesses and corrosion allowances
2. Shell_TMLs.csv - Shell thickness measurement locations (quarter-point methodology)
3. Nozzle_TMLs.csv - Nozzle and appurtenance thickness measurements
4. Exception_Register.csv - Identified exceptions and action items
5. Settlement_Survey.csv - Settlement measurement points

DATA ENTRY INSTRUCTIONS:
------------------------
1. BasePage Nominals:
   - Enter nominal (original) thickness for each component
   - Verify corrosion allowance (default 0.0625")
   - Adjust joint efficiency if known (default 0.85)

2. Shell TMLs:
   - Record thickness at Q1-Q4 quarter points
   - System will auto-calculate averages if not provided
   - Include previous and current inspection dates

3. Nozzle TMLs:
   - Measure at least 4 points around each nozzle
   - Note service type and condition
   - Include previous thickness if available

4. Exception Register:
   - Document all findings requiring action
   - Classify severity: Critical/Major/Minor/Monitor
   - Set due dates for critical items

5. Settlement Survey:
   - Record elevation at each station
   - Use consistent datum reference
   - Note any visible distortion

MINIMUM REQUIRED DATA:
----------------------
- BasePage nominals for all components
- Current thickness measurements (Shell TMLs)
- Previous inspection date
- Specific gravity of product
- Tank diameter and height

CALCULATION OUTPUTS:
-------------------
Upon data ingestion, the system will calculate:
- Minimum required thickness (t-min) per API 653
- Corrosion rates (short-term and long-term)
- Remaining life for each component
- Settlement analysis per Annex B
- Go/No-Go return to service recommendation

STANDARDS COMPLIANCE:
--------------------
Calculations align with:
- API 653: Tank Inspection, Repair, Alteration, and Reconstruction
- API 650: Welded Tanks for Oil Storage
- API 2000: Venting Atmospheric and Low-pressure Storage Tanks
- NFPA 30: Flammable and Combustible Liquids Code
- 40 CFR 112: SPCC Secondary Containment
- SSPC-PA 2: Coating Thickness Measurement

For support, contact: support@oilprotanks.com
`;
}

// Generate the complete data ingestion ZIP package
export async function generateDataIngestionPackage(): Promise<{ filename: string; stream: PassThrough }> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  
  archive.pipe(stream);
  
  // Add CSV templates
  archive.append(generateBasePageNominalsTemplate(), { name: 'BasePage_Nominals.csv' });
  archive.append(generateShellTMLsTemplate(), { name: 'Shell_TMLs.csv' });
  archive.append(generateNozzleTMLsTemplate(), { name: 'Nozzle_TMLs.csv' });
  archive.append(generateExceptionRegisterTemplate(), { name: 'Exception_Register.csv' });
  archive.append(generateSettlementSurveyTemplate(), { name: 'Settlement_Survey.csv' });
  
  // Add README
  archive.append(generateReadme(), { name: 'README.txt' });
  
  // Add quick guide PDF placeholder (would be generated separately)
  const quickGuide = `API 653 Data Ingestion Quick Guide
=====================================

Step 1: Gather Inspection Data
- Collect all UT thickness readings
- Document visual findings
- Record settlement measurements

Step 2: Fill Templates
- Open each CSV in Excel
- Enter data per instructions
- Save as CSV (not XLSX)

Step 3: Upload to System
- Use bulk import feature
- Verify data mapping
- Run calculations

Step 4: Review Results
- Check t-min calculations
- Verify remaining life
- Generate final report

For detailed instructions, see README.txt
`;
  
  archive.append(quickGuide, { name: 'Quick_Guide.txt' });
  
  await archive.finalize();
  
  return {
    filename: `API653_Data_Ingestion_Kit_${new Date().toISOString().split('T')[0]}.zip`,
    stream
  };
}

// Parse uploaded CSV data
export function parseBasePageNominals(csvContent: string): BasePageNominal[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const data: BasePageNominal[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values[0]) {
      data.push({
        component: values[0],
        nominalThickness: parseFloat(values[1]) || 0,
        corrosionAllowance: parseFloat(values[2]) || 0.0625,
        jointEfficiency: parseFloat(values[3]) || 0.85,
        notes: values[4] || ''
      });
    }
  }
  
  return data;
}

export function parseShellTMLs(csvContent: string): ShellTML[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const data: ShellTML[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values[0]) {
      const tml: ShellTML = {
        course: parseInt(values[0]),
        location: values[1],
        date_current: values[8]
      };
      
      if (values[2]) tml.q1_thickness = parseFloat(values[2]);
      if (values[3]) tml.q2_thickness = parseFloat(values[3]);
      if (values[4]) tml.q3_thickness = parseFloat(values[4]);
      if (values[5]) tml.q4_thickness = parseFloat(values[5]);
      if (values[6]) tml.avg_thickness = parseFloat(values[6]);
      if (values[7]) tml.date_previous = values[7];
      if (values[9]) tml.inspector = values[9];
      
      data.push(tml);
    }
  }
  
  return data;
}

export function parseNozzleTMLs(csvContent: string): NozzleTML[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const data: NozzleTML[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values[0]) {
      const tml: NozzleTML = {
        nozzleId: values[0],
        size: values[1],
        service: values[2],
        date_current: values[8],
        condition: values[9] || 'Good'
      };
      
      if (values[3]) tml.q1_thickness = parseFloat(values[3]);
      if (values[4]) tml.q2_thickness = parseFloat(values[4]);
      if (values[5]) tml.q3_thickness = parseFloat(values[5]);
      if (values[6]) tml.q4_thickness = parseFloat(values[6]);
      if (values[7]) tml.thickness_previous = parseFloat(values[7]);
      
      data.push(tml);
    }
  }
  
  return data;
}