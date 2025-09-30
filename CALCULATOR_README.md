# API 653 Tank Calculator - Standalone App

A professional tank inspection and corrosion assessment calculator based on API 653 standards.

## 🚀 Quick Setup for Replit

1. **Create a New Repl**: 
   - Go to [Replit](https://replit.com)
   - Create a new HTML/CSS/JS repl

2. **Upload the Calculator**:
   - Upload the `api653-calculator.html` file to your repl
   - Rename it to `index.html` (optional, for easier access)

3. **Run Your App**:
   - Click the "Run" button in Replit
   - Your calculator will be available at your repl's URL

## ✨ Features

### Core Calculations
- **Minimum Required Thickness (t-min)** per API 653 Section 4.3.3
- **Corrosion Rate Calculation** based on thickness measurements
- **Remaining Life Estimation** with and without safety factors
- **Component Status Assessment** (Acceptable/Monitor/Action Required)

### Input Parameters
- Tank Diameter (feet)
- Tank Height (feet)
- Specific Gravity of stored product
- Joint Efficiency factor
- Allowable Stress (psi)
- Original Thickness (inches)
- Current Thickness (inches)
- Years Since Last Inspection

### Export Options
- **PDF Export**: Print-friendly report with all calculations
- **CSV Export**: Structured data for spreadsheet analysis
- **Print**: Direct printing of results

### Professional Features
- Real-time calculations as you type
- Input validation and error handling
- Professional engineering interface
- Responsive design for mobile and desktop
- Color-coded status indicators
- Warning alerts for critical conditions

## 📊 Understanding the Results

### Status Classifications
- **ACCEPTABLE**: Remaining life > 10 years, thickness above minimum
- **MONITOR**: Remaining life 5-10 years, increased inspection recommended
- **ACTION REQUIRED**: Remaining life < 5 years or thickness at/below minimum

### Key Calculations
- **t-min**: Calculated using API 653 one-foot method formula
- **Corrosion Rate**: Metal loss divided by inspection interval
- **Remaining Life**: Available corrosion allowance divided by corrosion rate
- **Safety Factor**: Conservative estimate using 2x corrosion rate

## 🔧 Technical Details

### API 653 Compliance
- Based on API 653 Standard for Tank Inspection, Repair, Alteration, and Reconstruction
- Implements Section 4.3.3 (Shell Evaluation) calculations
- Follows Section 6.4.2 (Remaining Life Assessment) methodology

### Calculation Formula
```
t-min = 2.6 × D × (H - 1) × G / (S × E)
```
Where:
- D = Tank diameter (feet)
- H = Tank height (feet)  
- G = Specific gravity
- S = Allowable stress (psi)
- E = Joint efficiency

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- No external dependencies required
- Pure HTML/CSS/JavaScript implementation

## 📝 Usage Examples

### Example 1: New Tank Assessment
- Diameter: 120 ft
- Height: 40 ft
- Specific Gravity: 0.85
- Original Thickness: 0.375 inches
- Current Thickness: 0.350 inches
- Years Since Inspection: 5

**Expected Result**: Acceptable status with good remaining life

### Example 2: Critical Assessment
- Diameter: 80 ft
- Height: 32 ft
- Current Thickness: 0.180 inches (below t-min)
- **Expected Result**: Action Required status with warnings

## ⚠️ Important Notes

1. **Professional Use**: Results should be validated by qualified inspection personnel
2. **Simplified Model**: Uses 50% of original thickness as simplified minimum
3. **Component-Specific**: For precise evaluations, consider component-specific factors
4. **Standards Compliance**: Always refer to current API 653 standard for official requirements

## 🛠️ Customization

The calculator can be easily customized by modifying the HTML file:

- **Styling**: Update CSS sections for different themes
- **Default Values**: Change default input values in the HTML
- **Calculations**: Modify JavaScript functions for different calculation methods
- **Export Options**: Add additional export formats or integrate with APIs

## 📞 Support

This calculator is based on the open-source OilPro Tanks inspection management system. For questions or improvements, refer to the main project repository.

---

**Disclaimer**: This tool is for engineering assessment purposes. Always consult with qualified professionals and current API 653 standards for critical decisions.