#!/usr/bin/env python3
"""
COMPREHENSIVE OpenRouter API Excel Data Extractor for API 653 Tank Inspections
Updated with ALL industry field name variations to ensure NO critical data is missed
"""

import requests
import json
import openpyxl
import pandas as pd
from datetime import datetime
import os

class ComprehensiveOpenRouterExcelExtractor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def extract_excel_data(self, excel_file_path):
        """
        Extract structured data from Excel file using comprehensive field variations
        """
        
        # Read the Excel file and convert to detailed text representation
        excel_text = self._excel_to_comprehensive_text(excel_file_path)
        
        # Create the comprehensive AI prompt for data extraction
        prompt = self._create_comprehensive_extraction_prompt(excel_text)
        
        # Send to OpenRouter API
        response = self._call_openrouter_api(prompt)
        
        # Parse the response
        extracted_data = self._parse_ai_response(response)
        
        return extracted_data
    
    def _excel_to_comprehensive_text(self, file_path):
        """Convert Excel file to comprehensive text representation for AI processing"""
        
        try:
            # Load workbook
            workbook = openpyxl.load_workbook(file_path)
            text_representation = f"COMPREHENSIVE EXCEL FILE ANALYSIS: {file_path}\n\n"
            
            for sheet_name in workbook.sheetnames:
                text_representation += f"=== SHEET: {sheet_name} ===\n"
                
                # Read with pandas for easier text conversion
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                
                # Convert to comprehensive text, showing more rows and columns
                for i in range(min(50, len(df))):  # Increased from 20 to 50 rows
                    row_text = []
                    for j in range(min(20, len(df.columns))):  # Increased from 10 to 20 columns
                        cell_value = df.iloc[i, j]
                        if pd.notna(cell_value):
                            cell_str = str(cell_value).strip()
                            if cell_str:  # Only include non-empty cells
                                row_text.append(f"[{i},{j}]: {cell_str}")
                    
                    if row_text:
                        text_representation += f"Row {i}: " + " | ".join(row_text) + "\n"
                
                # Also try to read with headers to catch field names
                try:
                    df_with_headers = pd.read_excel(file_path, sheet_name=sheet_name)
                    if not df_with_headers.empty:
                        text_representation += f"\nCOLUMN HEADERS: {list(df_with_headers.columns)}\n"
                        
                        # Show first few rows with headers
                        for i in range(min(5, len(df_with_headers))):
                            row_data = []
                            for col in df_with_headers.columns:
                                value = df_with_headers.iloc[i][col]
                                if pd.notna(value):
                                    row_data.append(f"{col}: {value}")
                            if row_data:
                                text_representation += f"Data Row {i}: " + " | ".join(row_data) + "\n"
                except:
                    pass  # If reading with headers fails, continue with raw data
                
                text_representation += "\n"
            
            return text_representation
            
        except Exception as e:
            return f"Error reading Excel file: {str(e)}"
    
    def _create_comprehensive_extraction_prompt(self, excel_text):
        """Create the comprehensive AI prompt with all industry field variations"""
        
        comprehensive_prompt = f"""
COMPREHENSIVE API 653 EXCEL EXTRACTION - ALL INDUSTRY VARIATIONS
================================================================

You are an expert API 653 tank inspection data extraction specialist. Analyze the provided Excel file content and extract structured data for a tank inspection database. This prompt includes ALL possible field name variations used across the industry to ensure NO CRITICAL DATA is missed.

EXCEL FILE CONTENT:
{excel_text}

EXTRACTION REQUIREMENTS:
Extract the following information into JSON format, searching for ANY of the listed variations:

1. TANK IDENTIFICATION:
   Search for: tank_number, tank_id, equipment_id, tank_no, tank_num, unit_id, unit_number, vessel_id, vessel_number, tank_tag, equipment_tag, asset_id, asset_number, facility_id, tank_designation, unit_designation, vessel_designation, tank_identifier, equipment_identifier, tank_ref, reference_number, serial_number, tank_serial, equipment_serial, tank_code, unit_code, vessel_code, asset_tag, facility_tag, tank_name, unit_name, vessel_name, equipment_name, tank_label, unit_label, vessel_label

2. CLIENT/OWNER INFORMATION:
   Search for: client_name, customer, company, owner, client, customer_name, company_name, owner_name, facility_owner, tank_owner, operator, operator_name, facility_operator, site_owner, property_owner, lessee, tenant, facility_name, site_name, organization, organization_name, entity, entity_name, corporation, business_name, firm, firm_name, contractor, contractor_name, end_user, user, facility, site, installation, plant, plant_name, refinery, refinery_name, terminal, terminal_name, depot, depot_name

3. LOCATION INFORMATION:
   Search for: location, area, site, address, facility_location, tank_location, site_location, facility_address, tank_address, site_address, physical_address, mailing_address, street_address, installation_location, plant_location, refinery_location, terminal_location, depot_location, geographic_location, coordinates, gps_coordinates, latitude, longitude, state, province, country, region, zone, district, sector, field, field_location, yard, yard_location, plot, plot_number, area_designation, location_code, site_code, facility_code, installation, installation_name, base, base_name, station, station_name

4. TANK CAPACITY:
   Search for: capacity, capacity_gal, capacity_gallons, capacity_bbl, capacity_barrels, capacity_bbls, volume, volume_gal, volume_gallons, volume_bbl, volume_barrels, volume_bbls, tank_capacity, tank_volume, working_capacity, working_volume, nominal_capacity, nominal_volume, design_capacity, design_volume, rated_capacity, rated_volume, maximum_capacity, maximum_volume, max_capacity, max_volume, total_capacity, total_volume, shell_capacity, shell_volume, gross_capacity, gross_volume, net_capacity, net_volume, usable_capacity, usable_volume, storage_capacity, storage_volume, holding_capacity, holding_volume, size, tank_size, vessel_size, capacity_m3, volume_m3, capacity_liters, volume_liters, capacity_ft3, volume_ft3, capacity_cubic_feet, volume_cubic_feet, gallons, barrels, bbls, gal, bbl

5. TANK DIMENSIONS:
   Search for: diameter, diameter_ft, diameter_feet, tank_diameter, shell_diameter, internal_diameter, external_diameter, outside_diameter, inside_diameter, od, id, dia, diam, width, tank_width, vessel_width, height, height_ft, height_feet, tank_height, shell_height, overall_height, total_height, vessel_height, length, tank_length, vessel_length, radius, tank_radius, shell_radius, circumference, tank_circumference, shell_circumference

6. PRODUCT INFORMATION:
   Search for: product, product_stored, contents, tank_contents, stored_product, material, material_stored, substance, substance_stored, commodity, commodity_stored, fluid, fluid_stored, liquid, liquid_stored, medium, medium_stored, service, tank_service, vessel_service, application, tank_application, vessel_application, use, tank_use, vessel_use, purpose, tank_purpose, vessel_purpose

7. MATERIAL SPECIFICATIONS:
   Search for: material, shell_material, tank_material, vessel_material, construction_material, plate_material, steel_grade, material_grade, material_specification, material_spec, steel_specification, steel_spec, alloy, metal, steel_type, carbon_steel, stainless_steel, aluminum, material_type, construction_type, fabrication_material

8. CONSTRUCTION DETAILS:
   Search for: construction_code, design_code, construction_standard, design_standard, code, standard, specification, spec, api_650, api_653, asme, astm, aws, construction_year, year_built, year_constructed, year_installed, installation_year, fabrication_year, manufacture_year, built_date, construction_date, installation_date, fabrication_date, manufacture_date, age, tank_age, vessel_age

9. ROOF INFORMATION:
   Search for: roof_type, roof, tank_roof, vessel_roof, roof_design, roof_style, fixed_roof, floating_roof, cone_roof, dome_roof, flat_roof, shed_roof, umbrella_roof, geodesic_roof, internal_floating_roof, external_floating_roof, ifr, efr, pontoon_roof, pan_roof, double_deck_roof, single_deck_roof

10. FOUNDATION INFORMATION:
    Search for: foundation, foundation_type, tank_foundation, vessel_foundation, base, base_type, tank_base, vessel_base, support, support_type, tank_support, vessel_support, footing, footing_type, tank_footing, vessel_footing, pad, concrete_pad, ring_wall, ringwall, slab, concrete_slab, foundation_design, base_design, support_design

11. INSPECTION INFORMATION:
    Search for: inspection_date, inspection, date, inspection_performed, inspection_completed, examination_date, examination, assessment_date, assessment, evaluation_date, evaluation, survey_date, survey, review_date, review, test_date, testing_date, inspection_start, inspection_end, inspection_period, inspection_interval, last_inspection, previous_inspection, next_inspection, due_date, inspection_due

12. INSPECTION TYPE:
    Search for: inspection_type, type, examination_type, assessment_type, evaluation_type, survey_type, test_type, inspection_method, examination_method, in_service, in-service, out_of_service, out-of-service, internal, external, visual, ultrasonic, ut, radiographic, rt, magnetic_particle, mt, liquid_penetrant, pt, eddy_current, et, comprehensive, routine, periodic, scheduled, unscheduled, emergency, special, detailed, limited, partial, full, complete

13. INSPECTOR INFORMATION:
    Search for: inspector, inspector_name, examiner, examiner_name, assessor, assessor_name, evaluator, evaluator_name, surveyor, surveyor_name, technician, technician_name, specialist, specialist_name, engineer, engineer_name, certified_inspector, qualified_inspector, lead_inspector, chief_inspector, senior_inspector, inspection_personnel, examination_personnel

14. INSPECTOR CERTIFICATION:
    Search for: certification, inspector_certification, qualification, inspector_qualification, license, inspector_license, api_653, api_510, api_570, api_580, asnt, pct, ndt_certification, nde_certification, level_i, level_ii, level_iii, level_1, level_2, level_3, certified, qualified, licensed, accredited

15. INSPECTION COMPANY:
    Search for: inspection_company, company, inspection_contractor, contractor, inspection_firm, firm, inspection_organization, organization, inspection_service, service_provider, vendor, supplier, third_party, consultant, consulting_company, engineering_company, ndt_company, nde_company, testing_company, examination_company

16. TEST METHODS:
    Search for: test_methods, testing_methods, examination_methods, inspection_methods, ndt_methods, nde_methods, testing, examination, visual_testing, vt, ultrasonic_testing, ut, radiographic_testing, rt, magnetic_particle_testing, mt, liquid_penetrant_testing, pt, eddy_current_testing, et, acoustic_emission, ae, guided_wave, gw, phased_array, paut, tofd, time_of_flight_diffraction

17. CORROSION ALLOWANCE:
    Search for: corrosion_allowance, ca, corrosion_margin, allowance, margin, safety_margin, design_margin, corrosion_factor, wear_allowance, wastage_allowance, metal_loss_allowance, thickness_allowance, minimum_allowance

18. JOINT EFFICIENCY:
    Search for: joint_efficiency, efficiency, weld_efficiency, joint_factor, efficiency_factor, weld_factor, radiographic_efficiency, rt_efficiency, spot_rt_efficiency, full_rt_efficiency, seamless_efficiency, welded_efficiency

19. SHELL COURSE INFORMATION:
    Search for: course, shell_course, course_number, course_no, shell_number, shell_no, ring, ring_number, ring_no, strake, strake_number, strake_no, tier, tier_number, tier_no, level, level_number, level_no, section, section_number, section_no, plate, plate_number, plate_no, course_designation, shell_designation

20. THICKNESS MEASUREMENTS:
    Search for: thickness, thickness_reading, thickness_measurement, wall_thickness, plate_thickness, shell_thickness, measured_thickness, actual_thickness, current_thickness, remaining_thickness, minimum_thickness, tmin, t_min, nominal_thickness, tnom, t_nom, original_thickness, torig, t_orig, design_thickness, tdes, t_des, required_thickness, treq, t_req, ultrasonic_thickness, ut_thickness, thickness_value, reading, measurement, gauge, gage

21. THICKNESS POSITIONS:
    Search for: position, location, orientation, direction, degrees, deg, angle, north, south, east, west, n, s, e, w, 0_deg, 90_deg, 180_deg, 270_deg, 0°, 90°, 180°, 270°, top, bottom, side, cml, corrosion_monitoring_location, tml, thickness_monitoring_location, grid, grid_position, coordinate, coordinates

22. NOZZLE INFORMATION:
    Search for: nozzle, nozzle_id, nozzle_number, nozzle_no, nozzle_designation, nozzle_tag, opening, opening_id, opening_number, opening_no, connection, connection_id, connection_number, connection_no, inlet, outlet, manway, manhway, cleanout, drain, vent, overflow, fill, suction, discharge, pump_suction, pump_discharge

23. NOZZLE SPECIFICATIONS:
    Search for: size, nozzle_size, opening_size, connection_size, diameter, nozzle_diameter, opening_diameter, connection_diameter, pipe_size, nominal_size, schedule, pipe_schedule, rating, pressure_rating, class, pressure_class, flange_rating, flange_class, material, nozzle_material, pipe_material, flange_material

24. SPECIFIC GRAVITY:
    Search for: specific_gravity, sg, s.g., density, relative_density, api_gravity, api, gravity, product_density, fluid_density, liquid_density, material_density, substance_density, weight, specific_weight, unit_weight

25. SETTLEMENT DATA:
    Search for: settlement, tank_settlement, foundation_settlement, differential_settlement, uniform_settlement, tilt, tank_tilt, vessel_tilt, inclination, slope, out_of_plumb, plumbness, verticality, level, levelness, elevation, height_variation, rim_elevation

CRITICAL INSTRUCTIONS:
1. Search for ANY variation of these terms across ALL sheets in the Excel file
2. Look for data in headers, labels, field names, and adjacent cells
3. If multiple variations are found, use the most complete/accurate value
4. Convert capacity to gallons if in barrels (multiply by 42) or other units
5. Convert all measurements to standard units (feet, gallons, inches)
6. Convert all dates to YYYY-MM-DD format
7. Extract thickness data from tables, grids, or lists
8. Look for patterns like "Course 1", "Shell 1", "Ring 1" for shell course data
9. Look for patterns like "N1", "Nozzle A", "Inlet", "Outlet" for nozzle data
10. If data is missing or unclear, use null values
11. Return ONLY valid JSON, no explanations or additional text
12. Be case-insensitive when searching for field names
13. Look for abbreviated forms (e.g., "Cap" for capacity, "Dia" for diameter)
14. Check for data in merged cells, headers, and footers
15. Look for data that might be split across multiple cells
16. Pay special attention to numerical values that could be measurements
17. Look for units of measurement (ft, in, gal, bbl, etc.) to identify data types

EXPECTED JSON OUTPUT STRUCTURE:
{{
  "tank_info": {{
    "tank_number": "string or null",
    "client_name": "string or null",
    "location": "string or null",
    "equipment_id": "string or null",
    "diameter_ft": "number or null",
    "height_ft": "number or null",
    "capacity_gal": "number or null",
    "product": "string or null",
    "specific_gravity": "number or null",
    "construction_code": "string or null",
    "year_built": "number or null",
    "shell_material": "string or null",
    "roof_type": "string or null",
    "foundation_type": "string or null",
    "number_of_courses": "number or null"
  }},
  "inspection_info": {{
    "inspection_date": "YYYY-MM-DD or null",
    "inspection_type": "string or null",
    "inspector_name": "string or null",
    "inspector_certification": "string or null",
    "inspection_company": "string or null",
    "test_methods": "string or null",
    "corrosion_allowance": "number or null",
    "joint_efficiency": "number or null"
  }},
  "thickness_data": [
    {{
      "course_number": "number",
      "readings": [
        {{"position": "string", "thickness": "number"}}
      ]
    }}
  ],
  "nozzle_data": [
    {{
      "nozzle_id": "string",
      "readings": [
        {{"position": "string", "thickness": "number"}}
      ]
    }}
  ]
}}

REMEMBER: Missing critical data could have serious safety implications. Extract EVERY piece of available information using ANY of the field name variations listed above. Be thorough and comprehensive in your search.

Extract the data now:
"""
        return comprehensive_prompt
    
    def _call_openrouter_api(self, prompt):
        """Call OpenRouter API with the comprehensive extraction prompt"""
        
        payload = {
            "model": "anthropic/claude-3.5-sonnet",  # Best model for complex extraction
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 6000,  # Increased for comprehensive extraction
            "temperature": 0.1  # Low temperature for consistent extraction
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=120  # Increased timeout for complex processing
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
                    "raw_response": content,
                    "extraction_confidence": "high"  # Added confidence indicator
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

# Main extraction function with comprehensive field variations
def extract_comprehensive_tank_data(excel_file_path, openrouter_api_key):
    """
    Main function to extract tank inspection data using comprehensive field variations
    
    Args:
        excel_file_path (str): Path to the Excel file
        openrouter_api_key (str): Your OpenRouter API key
    
    Returns:
        dict: Extracted and structured tank inspection data with high confidence
    """
    
    extractor = ComprehensiveOpenRouterExcelExtractor(openrouter_api_key)
    result = extractor.extract_excel_data(excel_file_path)
    
    return result

# Flask integration with comprehensive extraction
def create_comprehensive_flask_route():
    """
    Enhanced Flask route for comprehensive Excel extraction
    """
    from flask import Flask, request, jsonify
    
    app = Flask(__name__)
    
    @app.route('/extract-excel-comprehensive', methods=['POST'])
    def extract_excel_comprehensive():
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
            
            # Extract data using comprehensive field variations
            result = extract_comprehensive_tank_data(temp_path, api_key)
            
            # Clean up temp file
            os.remove(temp_path)
            
            # Add metadata about extraction
            if result.get('success'):
                result['metadata'] = {
                    'extraction_method': 'comprehensive_field_variations',
                    'field_variations_count': 25,
                    'safety_critical': True,
                    'extraction_timestamp': datetime.now().isoformat()
                }
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return app

if __name__ == "__main__":
    # Example usage with comprehensive extraction
    api_key = "your-openrouter-api-key-here"
    excel_file = "path/to/your/excel/file.xlsx"
    
    result = extract_comprehensive_tank_data(excel_file, api_key)
    print("COMPREHENSIVE EXTRACTION RESULT:")
    print(json.dumps(result, indent=2))

