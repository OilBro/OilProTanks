# OpenRouter Excel Extractor for Replit

## Setup Instructions for Your Replit App

### 1. Install Required Dependencies

Add these to your `requirements.txt` file in Replit:

```
requests
openpyxl
pandas
flask
python-dotenv
```

### 2. Environment Variables Setup

In your Replit app, go to the "Secrets" tab and add:

```
OPENROUTER_API_KEY = your_actual_openrouter_api_key_here
```

### 3. Main Application Code

Create a file called `excel_extractor.py` and copy the OpenRouter extraction code.

### 4. Flask Integration

Add this to your main Flask app:

```python
from flask import Flask, request, jsonify, render_template
import os
from excel_extractor import extract_tank_data_from_excel

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('upload.html')

@app.route('/extract-excel', methods=['POST'])
def extract_excel():
    try:
        # Get uploaded file
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        
        # Get API key from environment
        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            return jsonify({"error": "OpenRouter API key not configured"}), 500
        
        # Extract data using AI
        result = extract_tank_data_from_excel(temp_path, api_key)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### 5. HTML Upload Form

Create `templates/upload.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>API 653 Excel Data Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .upload-area { border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px 0; }
        .result { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .error { background: #ffe6e6; color: #d00; }
        .success { background: #e6ffe6; color: #060; }
        button { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #005a87; }
    </style>
</head>
<body>
    <h1>API 653 Tank Inspection Excel Data Extractor</h1>
    
    <div class="upload-area">
        <h3>Upload Excel File</h3>
        <input type="file" id="fileInput" accept=".xlsx,.xls" />
        <br><br>
        <button onclick="extractData()">Extract Tank Data</button>
    </div>
    
    <div id="result" class="result" style="display: none;"></div>
    
    <script>
        async function extractData() {
            const fileInput = document.getElementById('fileInput');
            const resultDiv = document.getElementById('result');
            
            if (!fileInput.files[0]) {
                alert('Please select an Excel file first');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<p>Processing Excel file with AI...</p>';
            resultDiv.className = 'result';
            
            try {
                const response = await fetch('/extract-excel', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = `
                        <h3>✅ Data Extracted Successfully!</h3>
                        <h4>Tank Information:</h4>
                        <pre>${JSON.stringify(data.data.tank_info, null, 2)}</pre>
                        <h4>Inspection Information:</h4>
                        <pre>${JSON.stringify(data.data.inspection_info, null, 2)}</pre>
                        <h4>Thickness Data:</h4>
                        <pre>${JSON.stringify(data.data.thickness_data, null, 2)}</pre>
                        <h4>Nozzle Data:</h4>
                        <pre>${JSON.stringify(data.data.nozzle_data, null, 2)}</pre>
                    `;
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = `<h3>❌ Extraction Failed</h3><p>${data.error}</p>`;
                }
                
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = `<h3>❌ Error</h3><p>${error.message}</p>`;
            }
        }
    </script>
</body>
</html>
```

### 6. Advanced Usage - Database Integration

To save extracted data to your database:

```python
@app.route('/extract-and-save', methods=['POST'])
def extract_and_save():
    try:
        # Extract data (same as above)
        result = extract_tank_data_from_excel(temp_path, api_key)
        
        if result['success']:
            data = result['data']
            
            # Save to your database
            tank = Tank(
                tank_number=data['tank_info']['tank_number'],
                client_name=data['tank_info']['client_name'],
                location=data['tank_info']['location'],
                # ... other fields
            )
            db.session.add(tank)
            db.session.commit()
            
            # Create inspection record
            inspection = Inspection(
                tank_id=tank.id,
                inspection_date=data['inspection_info']['inspection_date'],
                # ... other fields
            )
            db.session.add(inspection)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Data extracted and saved to database",
                "tank_id": tank.id,
                "inspection_id": inspection.id
            })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### 7. Cost Optimization Tips

- Use cheaper models for simple extractions: `"openai/gpt-3.5-turbo"`
- Cache results to avoid re-processing the same files
- Implement file size limits to control costs
- Use temperature=0.1 for consistent results

### 8. Error Handling

The system includes comprehensive error handling for:
- Invalid Excel files
- API failures
- JSON parsing errors
- Missing data fields

### 9. Testing

Test with your existing Excel files to ensure the AI prompt captures all the data fields you need. You may need to adjust the prompt based on your specific Excel file formats.

## Ready to Use!

Once set up, your Replit app will be able to:
1. Accept Excel file uploads
2. Use AI to intelligently extract tank inspection data
3. Return structured JSON data
4. Optionally save to your database
5. Handle errors gracefully

The AI will adapt to different Excel formats and extract the relevant API 653 inspection data automatically!

