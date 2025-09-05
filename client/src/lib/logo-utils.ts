import { jsPDF } from 'jspdf';
import oilproConsultingLogo from '../assets/oilpro-consulting-logo.jpg';

// Cache for the logo data URL
let logoDataUrl: string | null = null;

// Convert image to data URL for embedding in PDF
async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Maintain aspect ratio for the logo
      const aspectRatio = img.width / img.height;
      canvas.width = 300; // Higher resolution for better quality
      canvas.height = canvas.width / aspectRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw white background for JPEG
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw the logo
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        logoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(logoDataUrl);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = oilproConsultingLogo;
  });
}

// Add OilPro Consulting logo to PDF
export async function addOilProLogo(doc: jsPDF, x: number, y: number, width: number = 50, height?: number) {
  try {
    const dataUrl = await getLogoDataUrl();
    // Calculate height to maintain aspect ratio if not provided
    const finalHeight = height || (width / 2.5); // Approximate aspect ratio
    doc.addImage(dataUrl, 'JPEG', x, y, width, finalHeight);
  } catch (error) {
    console.error('Error adding logo:', error);
    // Fallback to text logo if image fails
    addTextLogo(doc, x, y, width, height || 20);
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
  doc.text('CONSULTING', centerX, centerY + 5, { align: 'center' });
}

// Helper to add logo to cover pages - larger size
export async function addCoverPageLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 10, 60, 24);
}

// Helper to add small logo to headers
export async function addHeaderLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 8, 40, 16);
}

// Synchronous versions for backwards compatibility
export function addCoverPageLogoSync(doc: jsPDF) {
  // Try to use cached logo if available
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', 15, 10, 60, 24);
  } else {
    // Use text fallback
    addTextLogo(doc, 15, 10, 60, 24);
    // Trigger async load for next time
    getLogoDataUrl().catch(console.error);
  }
}

export function addHeaderLogoSync(doc: jsPDF) {
  // Try to use cached logo if available
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', 15, 8, 40, 16);
  } else {
    // Use text fallback
    addTextLogo(doc, 15, 8, 40, 16);
    // Trigger async load for next time
    getLogoDataUrl().catch(console.error);
  }
}