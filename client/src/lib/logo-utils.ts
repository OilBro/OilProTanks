import { jsPDF } from 'jspdf';
import oilproLogo from '../assets/oilpro-logo.png';

// Cache for the logo data URL
let logoDataUrl: string | null = null;

// Convert image to data URL for embedding in PDF
async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        logoDataUrl = canvas.toDataURL('image/png');
        resolve(logoDataUrl);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = oilproLogo;
  });
}

// Add OilPro logo to PDF
export async function addOilProLogo(doc: jsPDF, x: number, y: number, width: number = 40, height: number = 20) {
  try {
    const dataUrl = await getLogoDataUrl();
    doc.addImage(dataUrl, 'PNG', x, y, width, height);
  } catch (error) {
    console.error('Error adding logo:', error);
    // Fallback to text logo if image fails
    addTextLogo(doc, x, y, width, height);
  }
}

// Fallback text-based logo
function addTextLogo(doc: jsPDF, x: number, y: number, width: number, height: number) {
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
export async function addCoverPageLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 10, 45, 25);
}

// Helper to add small logo to headers
export async function addHeaderLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 8, 30, 15);
}

// Synchronous versions for backwards compatibility
export function addCoverPageLogoSync(doc: jsPDF) {
  addTextLogo(doc, 15, 10, 45, 25);
}

export function addHeaderLogoSync(doc: jsPDF) {
  addTextLogo(doc, 15, 8, 30, 15);
}