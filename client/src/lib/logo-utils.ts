import { jsPDF } from 'jspdf';

// OilPro logo as a placeholder - in production, this would be the actual base64 encoded logo
// For now, we'll add a styled text logo
export function addOilProLogo(doc: jsPDF, x: number, y: number, width: number = 40, height: number = 20) {
  // Draw a professional text-based logo placeholder
  // Background box with company colors
  doc.setFillColor(0, 48, 135); // Navy blue
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Add "OilPro" text in stylized format
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  
  // Center the text in the box
  const centerX = x + width / 2;
  const centerY = y + height / 2 + 2;
  
  doc.text('OilPro', centerX, centerY, { align: 'center' });
  
  // Add a small tagline
  doc.setFontSize(6);
  doc.setFont(undefined, 'normal');
  doc.text('TANK INSPECTION', centerX, centerY + 5, { align: 'center' });
}

// Helper to add logo to cover pages
export function addCoverPageLogo(doc: jsPDF) {
  addOilProLogo(doc, 15, 10, 45, 25);
}

// Helper to add small logo to headers
export function addHeaderLogo(doc: jsPDF) {
  addOilProLogo(doc, 15, 8, 30, 15);
}