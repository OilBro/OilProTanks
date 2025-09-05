import { jsPDF } from 'jspdf';
import oilproConsultingLogo from '../assets/oilpro-consulting-logo.jpg';

// Preload and cache the logo as base64
let logoDataUrl: string | null = null;
let logoLoading = false;
let logoLoadPromise: Promise<string> | null = null;

// Preload logo on module load
function preloadLogo() {
  if (logoLoading || logoDataUrl) return;
  
  logoLoading = true;
  logoLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Use original dimensions for quality
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw the image
          ctx.drawImage(img, 0, 0);
          // Convert to base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          logoDataUrl = dataUrl;
          logoLoading = false;
          resolve(dataUrl);
        } else {
          throw new Error('Could not get canvas context');
        }
      } catch (error) {
        console.error('Error processing logo:', error);
        logoLoading = false;
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Failed to load logo:', error);
      logoLoading = false;
      reject(new Error('Failed to load logo'));
    };
    
    // Set source to load the image
    img.src = oilproConsultingLogo;
  });
}

// Start preloading immediately
if (typeof window !== 'undefined') {
  preloadLogo();
}

// Get logo data URL (async)
async function getLogoDataUrl(): Promise<string> {
  if (logoDataUrl) return logoDataUrl;
  if (logoLoadPromise) return logoLoadPromise;
  
  preloadLogo();
  if (logoLoadPromise) return logoLoadPromise;
  
  throw new Error('Logo not available');
}

// Add OilPro Consulting logo to PDF (synchronous with fallback)
export function addOilProLogoSync(doc: jsPDF, x: number, y: number, width: number = 50, height?: number) {
  // Calculate aspect ratio (approximately 2.5:1 for the OilPro logo)
  const finalHeight = height || (width / 2.5);
  
  if (logoDataUrl) {
    try {
      // Logo is loaded, add it to PDF
      doc.addImage(logoDataUrl, 'JPEG', x, y, width, finalHeight);
      return;
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }
  
  // Fallback: Draw placeholder
  // Don't draw the blue box - just leave space for logo
  // The logo will be added in next generation after it loads
  if (!logoDataUrl && logoLoadPromise) {
    // Logo is loading, try to wait briefly
    logoLoadPromise.then(() => {
      console.log('Logo loaded for next PDF generation');
    }).catch(console.error);
  }
}

// Async version that ensures logo is loaded
export async function addOilProLogo(doc: jsPDF, x: number, y: number, width: number = 50, height?: number) {
  try {
    const dataUrl = await getLogoDataUrl();
    const finalHeight = height || (width / 2.5);
    doc.addImage(dataUrl, 'JPEG', x, y, width, finalHeight);
  } catch (error) {
    console.error('Error adding logo:', error);
    // Don't add fallback text logo
  }
}

// Helper to add logo to cover pages
export function addCoverPageLogoSync(doc: jsPDF) {
  addOilProLogoSync(doc, 15, 10, 60, 24);
}

// Helper to add small logo to headers
export function addHeaderLogoSync(doc: jsPDF) {
  addOilProLogoSync(doc, 15, 8, 40, 16);
}

// Async helpers
export async function addCoverPageLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 10, 60, 24);
}

export async function addHeaderLogo(doc: jsPDF) {
  await addOilProLogo(doc, 15, 8, 40, 16);
}