"""
Excel Import Fix for OilPro Tanks Application
Addresses the critical issue where Excel imports create dashboard entries but no actual reports
"""

import logging
from datetime import datetime
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_and_clean_excel_data(raw_data):
    """
    Validate and clean extracted Excel data before creating inspection objects
    """
    cleaned_data = {}
    
    # Handle Tank ID - prevent filenames from being used as Tank IDs
    tank_id = raw_data.get('tank_id', raw_data.get('Tank ID', ''))
    if tank_id.endswith(('.xlsx', '.xls', '.csv')):
        # If Tank ID looks like a filename, try to extract from other fields
        tank_id = raw_data.get('tank_number', raw_data.get('unit_id', 'UNKNOWN'))
    cleaned_data['tank_id'] = str(tank_id).strip()
    
    # Handle Report Number
    report_num = raw_data.get('report_number', raw_data.get('Report Number', ''))
    if not report_num:
        # Generate report number if missing
        timestamp = int(datetime.now().timestamp() * 1000)
        report_num = f"IMP-{timestamp}"
    cleaned_data['report_number'] = str(report_num).strip()
    
    # Standardize Service Type
    service = raw_data.get('service', raw_data.get('Service', raw_data.get('product', '')))
    service_mapping = {
        'crude_oil': 'Crude Oil',
        'crude oil': 'Crude Oil', 
        'diesel': 'Diesel',
        'gasoline': 'Gasoline',
        'alcohol': 'Alcohol',
        'fish oil and sludge oil': 'Fish Oil and Sludge Oil',
        'other': 'Other'
    }
    cleaned_data['service'] = service_mapping.get(service.lower(), service)
    
    # Handle Inspector
    inspector = raw_data.get('inspector', raw_data.get('Inspector', 'Unknown Inspector'))
    cleaned_data['inspector'] = str(inspector).strip()
    
    # Handle Inspection Date
    inspection_date = raw_data.get('inspection_date', raw_data.get('Inspection Date', ''))
    if inspection_date:
        try:
            # Try to parse date
            if isinstance(inspection_date, str):
                cleaned_data['inspection_date'] = datetime.strptime(inspection_date, '%Y-%m-%d').date()
            else:
                cleaned_data['inspection_date'] = inspection_date
        except:
            cleaned_data['inspection_date'] = datetime.now().date()
    else:
        cleaned_data['inspection_date'] = datetime.now().date()
    
    # Handle numeric fields safely
    numeric_fields = ['diameter', 'height', 'capacity', 'year_built']
    for field in numeric_fields:
        value = raw_data.get(field, raw_data.get(field.replace('_', ' ').title(), 0))
        try:
            cleaned_data[field] = float(value) if value else 0
        except:
            cleaned_data[field] = 0
    
    # Handle text fields
    text_fields = ['shell_material', 'roof_type', 'foundation_type']
    for field in text_fields:
        value = raw_data.get(field, raw_data.get(field.replace('_', ' ').title(), ''))
        cleaned_data[field] = str(value).strip()
    
    return cleaned_data

def create_inspection_from_excel_data(excel_data):
    """
    Create inspection object with proper field handling
    CRITICAL FIX: Handle 'findings' field separately to avoid constructor error
    """
    try:
        # Clean and validate data first
        cleaned_data = validate_and_clean_excel_data(excel_data)
        
        # Define valid fields for Inspection constructor
        # CRITICAL: Remove 'findings' from constructor arguments
        valid_constructor_fields = {
            'tank_id': cleaned_data.get('tank_id', ''),
            'report_number': cleaned_data.get('report_number', ''),
            'service': cleaned_data.get('service', ''),
            'inspector': cleaned_data.get('inspector', ''),
            'inspection_date': cleaned_data.get('inspection_date'),
            'diameter': cleaned_data.get('diameter', 0),
            'height': cleaned_data.get('height', 0),
            'capacity': cleaned_data.get('capacity', 0),
            'year_built': cleaned_data.get('year_built', 0),
            'shell_material': cleaned_data.get('shell_material', ''),
            'roof_type': cleaned_data.get('roof_type', ''),
            'foundation_type': cleaned_data.get('foundation_type', ''),
            'status': 'Draft'  # Set default status
        }
        
        # Remove any None values
        valid_constructor_fields = {k: v for k, v in valid_constructor_fields.items() if v is not None}
        
        # Create inspection object with valid fields only
        inspection = Inspection(**valid_constructor_fields)
        
        # CRITICAL FIX: Handle 'findings' and other special fields AFTER object creation
        special_fields = ['findings', 'recommendations', 'notes']
        for field in special_fields:
            if field in excel_data:
                setattr(inspection, field, excel_data[field])
        
        # Save to database - CRITICAL: Ensure this actually saves
        inspection.save()
        
        # Verify the save worked by trying to retrieve
        saved_inspection = Inspection.objects.get(report_number=inspection.report_number)
        if not saved_inspection:
            raise Exception("Inspection was not properly saved to database")
        
        logger.info(f"Successfully created and saved inspection: {inspection.report_number}")
        return inspection
        
    except Exception as e:
        logger.error(f"Failed to create inspection from Excel data: {str(e)}")
        logger.error(f"Excel data: {excel_data}")
        raise e

def process_excel_import(file_path):
    """
    Complete Excel import process with proper error handling
    """
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Convert to dictionary (assuming single row for now)
        excel_data = df.iloc[0].to_dict()
        
        # Create inspection with proper error handling
        inspection = create_inspection_from_excel_data(excel_data)
        
        # Return success response
        return {
            'success': True,
            'inspection_id': inspection.id,
            'report_number': inspection.report_number,
            'message': f"Successfully imported inspection {inspection.report_number}"
        }
        
    except Exception as e:
        logger.error(f"Excel import failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': "Excel import failed. Please check the file format and try again."
        }

def cleanup_orphaned_dashboard_entries():
    """
    Utility function to clean up orphaned dashboard entries
    """
    try:
        # Find all dashboard entries
        dashboard_entries = DashboardEntry.objects.all()
        orphaned_count = 0
        
        for entry in dashboard_entries:
            try:
                # Try to find corresponding inspection
                inspection = Inspection.objects.get(report_number=entry.report_number)
            except Inspection.DoesNotExist:
                # This is an orphaned entry
                logger.warning(f"Found orphaned dashboard entry: {entry.report_number}")
                entry.delete()
                orphaned_count += 1
        
        logger.info(f"Cleaned up {orphaned_count} orphaned dashboard entries")
        return orphaned_count
        
    except Exception as e:
        logger.error(f"Failed to cleanup orphaned entries: {str(e)}")
        return 0

# Enhanced AI prompt for better data extraction
IMPROVED_EXTRACTION_PROMPT = """
Extract tank inspection data from this Excel file. Look for the following information using these possible column names:

Tank ID/Number: 'tank number', 'tank ID', 'equipment ID', 'asset ID', 'unit number', 'tank #', 'tank No.', 'Tank No', 'Tank #', 'Tank ID', 'Unit ID', 'Asset ID', 'Equipment No.'

Client/Company: 'customer', 'company', 'owner', 'facility', 'site name', 'client', 'Client', 'Customer Name', 'Company Name', 'Owner Name', 'Facility Name', 'Site'

Location: 'area', 'site location', 'plant location', 'address', 'Location', 'Site', 'Plant', 'Facility Address'

Inspection Date: 'date of inspection', 'inspection date (MM/DD/YYYY)', 'date inspected', 'last inspection', 'Inspection Date', 'Date of Inspection', 'Date Inspected', 'Last Inspection Date', 'Inspection Dt'

Service/Product: 'product', 'contents', 'Product Stored', 'Contents', 'Material', 'service', 'Service'

Inspector: 'inspector', 'inspector name', 'API inspector', 'certified inspector', 'Inspector Name'

Tank Dimensions: 'height', 'diameter', 'Height (ft)', 'Diameter (ft)', 'Tank Height', 'Tank Diameter', 'H', 'D'

Capacity: 'capacity', 'gallon', 'barrels', 'Capacity (Gallons)', 'Capacity (Barrels)', 'Volume', 'Tank Volume', 'Nominal Capacity'

IMPORTANT: 
- Do NOT use the Excel filename as the Tank ID
- Look for actual tank identification numbers in the data
- If multiple tanks are mentioned, extract the primary tank ID
- Standardize service types (crude oil, diesel, gasoline, etc.)
- Return data in a clean, structured format
"""

if __name__ == "__main__":
    # Test the fix with sample data
    sample_data = {
        'tank_id': 'TANK-TEST-001',
        'report_number': 'TEST-IMPORT-001',
        'service': 'crude_oil',
        'inspector': 'Jerry Hartfield',
        'findings': 'Test findings data',  # This field was causing the error
        'recommendations': 'Test recommendations'
    }
    
    try:
        result = create_inspection_from_excel_data(sample_data)
        print(f"Test successful: {result}")
    except Exception as e:
        print(f"Test failed: {e}")

