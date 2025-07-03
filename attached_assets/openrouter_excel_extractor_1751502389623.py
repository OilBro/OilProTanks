#!/usr/bin/env python3
"""
OpenRouter API Excel Data Extractor for API 653 Tank Inspections
Use this in your Replit app to extract structured data from Excel files
"""

import requests
import json
import openpyxl
import pandas as pd
from datetime import datetime
import os

class OpenRouterExcelExtractor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def extract_excel_data(self, excel_file_path):
        """
        Extract structured data from Excel file using OpenRouter AI
        """
        
        # First, read the Excel file and convert to text representation
        excel_text = self._excel_to_text(excel_file_path)
        
        # Create the AI prompt for data extraction
        prompt = self._create_extraction_prompt(excel_text)
        
        # Send to OpenRouter API
        response = self._call_openrouter_api(prompt)
        
        # Parse the response
        extracted_data = self._parse_ai_response(response)
        
        return extracted_data
    
    def _excel_to_text(self, file_path):
        """Convert Excel file to text representation for AI processing"""
        
        try:
            # Load workbook
            workbook = openpyxl.load_workbook(file_path)
            text_representation = f"Excel File Analysis: {file_path}\n\n"
            
            for sheet_name in workbook.sheetnames:
                text_representation += f"=== SHEET: {sheet_name} ===\n"
                
                # Read with pandas for easier text conversion
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                
                # Convert to text, showing first 20 rows and 10 columns
                for i in range(min(20, len(df))):
                    row_text = []
                    for j in range(min(10, len(df.columns))):
                        cell_value = df.iloc[i, j]
                        if pd.notna(cell_value):
                            row_text.append(f"[{i},{j}]: {str(cell_value)}")
                    
                    if row_text:
                        text_representation += f"Row {i}: " + " | ".join(row_text) + "\n"
                
                text_representation += "\n"
            
            return text_representation
            
        except Exception as e:
            return f"Error reading Excel file: {str(e)}"
    
    def _create_extraction_prompt(self, excel_text):
        """Create the AI prompt for extracting API 653 inspection data"""
        
        prompt = f"""
You are an expert API 653 tank inspection data extraction specialist. Analyze the following Excel file content and extract structured data for a tank inspection database.

EXCEL FILE CONTENT:
{excel_text}

EXTRACTION REQUIREMENTS:
Extract and structure the following information into a JSON format:

1. TANK INFORMATION:
   - tank_number (string)
   - client_name (string) 
   - location (string)
   - equipment_id (string)
   - diameter_ft (number)
   - height_ft (number)
   - capacity_gal (number)
   - product (string)
   - specific_gravity (number)
   - construction_code (string, e.g., "API-650")
   - year_built (number)
   - shell_material (string)
   - roof_type (string)
   - foundation_type (string)
   - number_of_courses (number)

2. INSPECTION INFORMATION:
   - inspection_date (YYYY-MM-DD format)
   - inspection_type (string, e.g., "In-Service", "Out-of-Service")
   - inspector_name (string)
   - inspector_certification (string)
   - inspection_company (string)
   - test_methods (string)
   - corrosion_allowance (number in inches)
   - joint_efficiency (number between 0 and 1)

3. THICKNESS MEASUREMENTS:
   Array of shell course data:
   - course_number (number)
   - readings: array of {{position: string, thickness: number}}

4. NOZZLE DATA:
   Array of nozzle information:
   - nozzle_id (string)
   - readings: array of {{position: string, thickness: number}}

IMPORTANT INSTRUCTIONS:
- Look for tank identification numbers, client names, and location information
- Find inspection dates and inspector details
- Extract thickness measurement data from tables or grids
- Look for nozzle information and associated thickness readings
- If data is missing, use reasonable defaults or null values
- Ensure all numbers are properly formatted
- Return ONLY valid JSON, no additional text or explanations

EXPECTED JSON STRUCTURE:
{{
  "tank_info": {{
    "tank_number": "string",
    "client_name": "string",
    "location": "string",
    // ... other tank fields
  }},
  "inspection_info": {{
    "inspection_date": "YYYY-MM-DD",
    "inspection_type": "string",
    // ... other inspection fields
  }},
  "thickness_data": [
    {{
      "course_number": 1,
      "readings": [
        {{"position": "0°", "thickness": 0.250}},
        {{"position": "90°", "thickness": 0.245}}
      ]
    }}
  ],
  "nozzle_data": [
    {{
      "nozzle_id": "N1",
      "readings": [
        {{"position": "North", "thickness": 0.300}}
      ]
    }}
  ]
}}

Extract the data now:
"""
        return prompt
    
    def _call_openrouter_api(self, prompt):
        """Call OpenRouter API with the extraction prompt"""
        
        payload = {
            "model": "anthropic/claude-3.5-sonnet",  # You can change this model
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 4000,
            "temperature": 0.1  # Low temperature for consistent extraction
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            return {"error": f"API request failed: {str(e)}"}
    
    def _parse_ai_response(self, api_response):
        """Parse the AI response and extract JSON data"""
        
        try:
            if "error" in api_response:
                return {"success": False, "error": api_response["error"]}
            
            # Extract the content from OpenRouter response
            content = api_response["choices"][0]["message"]["content"]
            
            # Try to find and parse JSON in the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = content[json_start:json_end]
                extracted_data = json.loads(json_str)
                
                return {
                    "success": True,
                    "data": extracted_data,
                    "raw_response": content
                }
            else:
                return {
                    "success": False,
                    "error": "No valid JSON found in AI response",
                    "raw_response": content
                }
                
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"JSON parsing error: {str(e)}",
                "raw_response": api_response
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Response parsing error: {str(e)}"
            }

# Example usage function
def extract_tank_data_from_excel(excel_file_path, openrouter_api_key):
    """
    Main function to extract tank inspection data from Excel file
    
    Args:
        excel_file_path (str): Path to the Excel file
        openrouter_api_key (str): Your OpenRouter API key
    
    Returns:
        dict: Extracted and structured tank inspection data
    """
    
    extractor = OpenRouterExcelExtractor(openrouter_api_key)
    result = extractor.extract_excel_data(excel_file_path)
    
    return result

# Flask integration example
def create_flask_route():
    """
    Example Flask route for your Replit app
    """
    from flask import Flask, request, jsonify
    
    app = Flask(__name__)
    
    @app.route('/extract-excel', methods=['POST'])
    def extract_excel_endpoint():
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
            
            # Get API key from environment or request
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                return jsonify({"error": "OpenRouter API key not configured"}), 500
            
            # Extract data
            result = extract_tank_data_from_excel(temp_path, api_key)
            
            # Clean up temp file
            os.remove(temp_path)
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return app

if __name__ == "__main__":
    # Example usage
    api_key = "your-openrouter-api-key-here"
    excel_file = "path/to/your/excel/file.xlsx"
    
    result = extract_tank_data_from_excel(excel_file, api_key)
    print(json.dumps(result, indent=2))

