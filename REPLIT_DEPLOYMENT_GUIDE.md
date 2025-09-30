# 🚀 API 653 Calculator - Replit Deployment Guide

## Quick Start (5 minutes)

### Step 1: Create Your Repl
1. Go to [replit.com](https://replit.com) and log in
2. Click "Create Repl"
3. Choose "HTML, CSS, JS" template
4. Name your repl (e.g., "api653-calculator")

### Step 2: Upload Calculator
1. Delete the default `index.html` file
2. Upload the `api653-calculator.html` file from this repository
3. Rename it to `index.html`

### Step 3: Run Your Calculator
1. Click the "Run" button
2. Your calculator is now live and accessible via your repl URL!

## 📱 What You Get

A professional API 653 tank calculator with:

- **Real-time calculations** as you type
- **Professional interface** with responsive design
- **Export capabilities** (PDF, CSV, Print)
- **Input validation** and error handling
- **Status assessments** (Acceptable/Monitor/Action Required)
- **API 653 compliance** with official formulas

## 🔧 Customization Options

### Change Default Values
Edit the HTML file and modify the `value` attributes:
```html
<input type="number" id="diameter" value="120" step="0.1" min="0">
```

### Modify Styling
Update the CSS section to match your branding:
```css
.header {
    background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%);
}
```

### Add Custom Calculations
Extend the JavaScript functions to include additional calculations or modify existing ones.

## 📊 Using the Calculator

### Input Parameters
- **Tank Diameter**: In feet
- **Tank Height**: In feet  
- **Specific Gravity**: Of stored product (typically 0.8-1.0)
- **Joint Efficiency**: Weld quality factor (typically 1.0)
- **Allowable Stress**: Material strength in psi (typically 23,000 for A36 steel)
- **Original Thickness**: New plate thickness in inches
- **Current Thickness**: Measured thickness in inches
- **Years Since Inspection**: Time period for corrosion rate calculation

### Understanding Results
- **t-min**: Minimum required thickness per API 653
- **Metal Loss**: Total thickness reduction
- **Corrosion Rate**: Annual metal loss rate
- **Remaining Life**: Years until minimum thickness reached
- **Status**: Assessment of component condition

## ⚠️ Important Notes

1. **Professional Use**: Results should be validated by qualified personnel
2. **Simplified Model**: Uses 50% rule for minimum thickness
3. **Standards Compliance**: Based on API 653 but simplified for general use
4. **Regular Updates**: Keep calculations current with latest API 653 revisions

## 🌐 Sharing Your Calculator

Once deployed on Replit, you can:
- Share the URL with colleagues
- Embed in websites or documentation
- Use for training and education
- Integrate into larger applications

## 📞 Support

This calculator is extracted from the open-source OilPro Tanks project. For advanced features like database integration, report generation, and multi-tank management, consider the full system.

---

**Ready to deploy? Just follow the 3 steps above and you'll have a professional API 653 calculator running in minutes!**