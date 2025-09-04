import { jsPDF } from 'jspdf';

export interface ShellCourse {
  courseNumber: string;
  height: number;
  nominalThickness: number;
  measurements?: {
    point: string;
    thickness: number | string | null;
    x?: number;
    y?: number;
  }[];
}

export interface TankDimensions {
  diameter: number;
  height: number;
  shellCourses: ShellCourse[];
}

// Generate professional shell layout diagram
export function generateShellLayoutDiagram(
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  tankData: TankDimensions
) {
  console.log('generateShellLayoutDiagram called with:', { x, y, width, height, tankData });
  
  // Test: Draw a simple rectangle first
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(x, y, width, height);
  
  // Test: Draw some text
  doc.setFontSize(10);
  doc.text('Tank Shell Diagram', x + width/2, y - 5, { align: 'center' });
  
  console.log('Basic shapes drawn successfully');
  
  // Calculate course heights proportionally
  const totalHeight = tankData.shellCourses.reduce((sum, course) => sum + course.height, 0);
  let currentY = y + height;
  
  // Draw shell courses from bottom to top
  tankData.shellCourses.forEach((course, index) => {
    const courseHeight = (course.height / totalHeight) * height;
    currentY -= courseHeight;
    
    // Draw course divider line
    if (index < tankData.shellCourses.length - 1) {
      doc.setLineWidth(0.3);
      doc.line(x, currentY, x + width, currentY);
    }
    
    // Add course label
    doc.setFontSize(8);
    doc.text(course.courseNumber, x - 15, currentY + courseHeight / 2);
    
    // Add nominal thickness
    doc.setFontSize(7);
    doc.text(`t=${course.nominalThickness}"`, x + width + 3, currentY + courseHeight / 2);
    
    // Add measurement points if available
    if (course.measurements && course.measurements.length > 0) {
      course.measurements.forEach(measurement => {
        const pointX = x + (measurement.x || 0.5) * width;
        const pointY = currentY + courseHeight / 2;
        
        // Draw measurement point
        doc.setFillColor(255, 0, 0);
        doc.circle(pointX, pointY, 1, 'F');
        
        // Add measurement value
        doc.setFontSize(6);
        const thicknessVal = typeof measurement.thickness === 'number' ? 
          measurement.thickness.toFixed(3) : 
          measurement.thickness || 'N/A';
        doc.text(`(${thicknessVal})`, pointX + 2, pointY - 2);
      });
    }
  });
  
  // Add stairway indicator
  const stairX = x + width * 0.85;
  const stairY = y + height * 0.3;
  drawStairway(doc, stairX, stairY, 15, height * 0.4);
  
  // Add North arrow
  drawNorthArrow(doc, x + width + 30, y + 20);
}

// Generate roof/bottom plate layout diagram
export function generatePlateLayoutDiagram(
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  plateType: 'roof' | 'bottom',
  measurements?: { angle: number; radius: number; value: number | string | null; condition?: string }[]
) {
  // Draw outer circle
  doc.setLineWidth(0.5);
  doc.circle(centerX, centerY, radius);
  
  // Draw plate divisions (simplified representation)
  const plateRows = plateType === 'roof' ? 5 : 3;
  for (let i = 1; i < plateRows; i++) {
    const ringRadius = (radius / plateRows) * i;
    doc.setLineWidth(0.3);
    doc.circle(centerX, centerY, ringRadius);
  }
  
  // Draw radial divisions
  const divisions = 8;
  for (let i = 0; i < divisions; i++) {
    const angle = (i * 360 / divisions) * Math.PI / 180;
    const x2 = centerX + radius * Math.cos(angle);
    const y2 = centerY + radius * Math.sin(angle);
    doc.setLineWidth(0.2);
    doc.line(centerX, centerY, x2, y2);
  }
  
  // Add measurement points if provided
  if (measurements) {
    measurements.forEach(point => {
      const pointX = centerX + point.radius * radius * Math.cos(point.angle);
      const pointY = centerY + point.radius * radius * Math.sin(point.angle);
      
      // Color based on condition
      if (point.condition === 'corrosion') {
        doc.setFillColor(255, 0, 0);
      } else if (point.condition === 'pitting') {
        doc.setFillColor(255, 128, 0);
      } else {
        doc.setFillColor(0, 128, 0);
      }
      
      doc.circle(pointX, pointY, 2, 'F');
      
      // Add measurement value
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      const valStr = typeof point.value === 'number' ? 
        point.value.toFixed(3) : 
        point.value || 'N/A';
      doc.text(valStr, pointX + 3, pointY);
    });
  }
  
  // Add center sump if bottom plate
  if (plateType === 'bottom') {
    doc.setLineWidth(0.5);
    doc.circle(centerX, centerY, 5);
    doc.setFontSize(7);
    doc.text('SUMP', centerX - 7, centerY + 15);
  }
  
  // Add title
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`Tank ${plateType === 'roof' ? 'Roof' : 'Bottom'} Layout`, centerX, centerY - radius - 10, { align: 'center' });
  doc.setFont(undefined, 'normal');
}

// Generate inspection symbol legend
export function generateInspectionLegend(doc: jsPDF, x: number, y: number) {
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Inspection Legend', x, y);
  doc.setFont(undefined, 'normal');
  
  let currentY = y + 10;
  const symbols = [
    { symbol: '●', color: [255, 0, 0], text: 'Area of Coating Failure' },
    { symbol: '○', color: [0, 0, 255], text: 'Mechanical Hole' },
    { symbol: '◐', color: [255, 128, 0], text: 'Corrosion/Pitting' },
    { symbol: '□', color: [0, 128, 0], text: 'UT Measurement Point' },
    { symbol: '△', color: [128, 0, 255], text: 'Repair Area' },
    { symbol: '◇', color: [0, 0, 0], text: 'Patch Plate' }
  ];
  
  doc.setFontSize(8);
  symbols.forEach(item => {
    // Draw symbol
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.symbol, x, currentY);
    
    // Draw description
    doc.setTextColor(0, 0, 0);
    doc.text(item.text, x + 10, currentY);
    
    currentY += 6;
  });
}

// Helper function to draw stairway
function drawStairway(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setLineWidth(0.3);
  
  // Draw stairway outline
  doc.line(x, y, x + width, y);
  doc.line(x, y + height, x + width, y + height);
  
  // Draw steps (diagonal lines)
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const stepY = y + (height / steps) * i;
    const stepX = x + (width / steps) * i * 0.7;
    doc.line(stepX, stepY, stepX + 3, stepY);
  }
  
  // Add label
  doc.setFontSize(6);
  doc.text('STAIR', x + width / 2 - 5, y - 2);
}

// Helper function to draw North arrow
function drawNorthArrow(doc: jsPDF, x: number, y: number) {
  // Draw arrow
  doc.setLineWidth(0.5);
  doc.line(x, y + 10, x, y - 10);
  doc.line(x, y - 10, x - 3, y - 5);
  doc.line(x, y - 10, x + 3, y - 5);
  
  // Add N label
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('N', x - 2, y - 15);
  doc.setFont(undefined, 'normal');
}

// Generate professional settlement graph matching API-653 style
export function generateSettlementGraph(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  settlementData: { point: number; elevation: number; cosineValue?: number }[]
) {
  // Draw graph border
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  
  // Draw grid lines
  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  
  // Vertical grid lines
  for (let i = 1; i < 10; i++) {
    const gridX = x + (width / 10) * i;
    doc.line(gridX, y, gridX, y + height);
  }
  
  // Horizontal grid lines
  for (let i = 1; i < 5; i++) {
    const gridY = y + (height / 5) * i;
    doc.line(x, gridY, x + width, gridY);
  }
  
  doc.setDrawColor(0, 0, 0);
  
  // Find min/max for scaling
  const elevations = settlementData.map(d => d.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const range = maxElev - minElev;
  
  // Plot elevation data (blue line)
  doc.setDrawColor(0, 0, 255);
  doc.setLineWidth(0.8);
  
  for (let i = 0; i < settlementData.length - 1; i++) {
    const x1 = x + (settlementData[i].point / settlementData.length) * width;
    const y1 = y + height - ((settlementData[i].elevation - minElev) / range) * height;
    const x2 = x + (settlementData[i + 1].point / settlementData.length) * width;
    const y2 = y + height - ((settlementData[i + 1].elevation - minElev) / range) * height;
    
    doc.line(x1, y1, x2, y2);
    
    // Add data points
    doc.setFillColor(0, 0, 255);
    doc.circle(x1, y1, 1, 'F');
  }
  
  // Plot cosine curve if available (red line)
  if (settlementData[0].cosineValue !== undefined) {
    doc.setDrawColor(255, 0, 0);
    doc.setLineWidth(0.8);
    
    const cosineValues = settlementData.map(d => d.cosineValue || 0);
    const minCosine = Math.min(...cosineValues);
    const maxCosine = Math.max(...cosineValues);
    const cosineRange = maxCosine - minCosine;
    
    for (let i = 0; i < settlementData.length - 1; i++) {
      if (settlementData[i].cosineValue !== undefined && settlementData[i + 1].cosineValue !== undefined) {
        const x1 = x + (settlementData[i].point / settlementData.length) * width;
        const y1 = y + height - ((settlementData[i].cosineValue! - minCosine) / cosineRange) * height;
        const x2 = x + (settlementData[i + 1].point / settlementData.length) * width;
        const y2 = y + height - ((settlementData[i + 1].cosineValue! - minCosine) / cosineRange) * height;
        
        doc.line(x1, y1, x2, y2);
      }
    }
  }
  
  doc.setDrawColor(0, 0, 0);
  
  // Add axis labels
  doc.setFontSize(8);
  doc.text('Settlement Points', x + width / 2, y + height + 10, { align: 'center' });
  
  // Add Y-axis label (rotated)
  doc.text('Elevation (ft)', x - 15, y + height / 2);
  
  // Add title
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('API-653 Shell Settlement Survey', x + width / 2, y - 5, { align: 'center' });
  doc.setFont(undefined, 'normal');
  
  // Add legend
  doc.setFontSize(7);
  doc.setFillColor(0, 0, 255);
  doc.rect(x + width - 40, y + 5, 3, 3, 'F');
  doc.text('Elevation', x + width - 35, y + 7);
  
  if (settlementData[0].cosineValue !== undefined) {
    doc.setFillColor(255, 0, 0);
    doc.rect(x + width - 40, y + 10, 3, 3, 'F');
    doc.text('PE', x + width - 35, y + 12);
  }
}