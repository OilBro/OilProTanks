import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { uploadImportFile, runOrphanCleanup } from "@/lib/api";
import { showAIAnalysisIndicators } from "@/lib/config";
import { useLocation } from "wouter";

interface ImportResult {
  success?: boolean;
  message: string;
  reportId?: number;
  reportNumber?: string;
  importedData: any;
  thicknessMeasurements: number | any[];
  checklistItems: number | any[];
  totalRows: number;
  preview?: any[];
  measurementsCreated?: number;
  checklistCreated?: number;
  warnings?: string[];
  aiInsights?: {
    confidence: number;
    detectedColumns: string[];
    mappingSuggestions: Record<string, string>;
  };
  aiAnalysis?: {
    confidence: number;
    detectedColumns: string[];
    mappingSuggestions: Record<string, string>;
  };
}

export default function ImportReports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<any | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  
  // Helper functions to handle number | array types
  const getCount = (field: number | any[] | undefined): number => {
    if (field === undefined) return 0;
    return typeof field === 'number' ? field : field.length;
  };
  
  const isArray = (field: number | any[] | undefined): field is any[] => {
    return field !== undefined && typeof field !== 'number';
  };

  const importMutation = useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      console.log('Uploading file via helper:', file.name);
      const data = await uploadImportFile(file);
      // Normalize minimal fields for legacy UI expectations
      return {
        success: data.success,
        reportId: data.reportId,
        reportNumber: data.reportNumber,
        measurementsCreated: data.measurementsCreated,
        checklistCreated: data.checklistCreated,
        warnings: data.warnings,
        importedData: data.importedData || {},
        message: data.success ? 'Import successful' : 'Import processed',
        thicknessMeasurements: data.thicknessMeasurements || 0,
        checklistItems: data.checklistItems || 0,
        totalRows: data.totalRows || 0,
        preview: data.preview || []
      } as ImportResult;
    },
    onSuccess: (result: ImportResult) => {
      console.log('=== EXCEL IMPORT SUCCESS ===');
      console.log('Full import result:', result);
      console.log('Result structure:', Object.keys(result));
      
      // The backend now persists atomically; always show summary first with quick view and then allow navigation
      setImportResult(result as any);
      if (result.success && result.reportId) {
        queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
        toast({
          title: 'Import Successful',
          description: `Imported report ${result.reportNumber}. Review summary below.`
        });
      } else {
        toast({
          title: 'File Processed',
          description: `Processed file with ${result.totalRows} rows.`
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process Excel file.",
        variant: "destructive",
      });
    }
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== CREATE REPORT MUTATION STARTED ===');
      console.log('Import result data:', data);
      console.log('Report data from import:', data.reportData);
      
      // First create the report with defaults for missing required fields
      // Map all possible field variations from AI extraction
      const reportData = {
        reportNumber: data.reportData.reportNumber || `IMP-${Date.now()}`,
        tankId: data.reportData.tankId || 
                data.reportData.tank_id || 
                data.reportData.equipment_id || 
                data.reportData.equipmentId || 
                data.reportData['Equipment ID'] || 
                data.reportData['EQUIP ID'] || 
                'Unknown Tank',
        service: data.reportData.service || 
                 data.reportData.serviceType || 
                 data.reportData.product || 
                 data.reportData.contents || 
                 'Crude Oil',
        inspector: data.reportData.inspector || 
                   data.reportData.inspectorName || 
                   data.reportData.examiner || 
                   data.reportData.surveyor || 
                   data.reportData.technician || 
                   'Unknown Inspector',
        inspectionDate: data.reportData.inspectionDate || 
                        data.reportData.inspection_date || 
                        new Date().toISOString().split('T')[0],
        diameter: data.reportData.diameter,
        height: data.reportData.height,
        originalThickness: data.reportData.originalThickness,
        yearsSinceLastInspection: data.reportData.yearsSinceLastInspection || 1,
        status: 'draft' as const,
        findings: data.reportData.findings || 
                  data.reportData.Findings || 
                  data.reportData.reportWriteUp || 
                  data.reportData['Report Write Up'] || 
                  null
      };
      
      console.log('=== SENDING REPORT DATA TO SERVER ===');
      console.log('Report data being sent:', reportData);
      
      const reportResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      
      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        console.error('Report creation failed:', errorData);
        console.error('Sent data:', data.reportData);
        throw new Error(errorData.message || errorData.error || 'Failed to create report');
      }
      
      const report = await reportResponse.json();
      
      // Then create thickness measurements if any
      if (data.thicknessMeasurements && data.thicknessMeasurements.length > 0) {
        for (const measurement of data.thicknessMeasurements) {
          // Ensure all required fields are present and convert to proper types
          const measurementData = {
            reportId: report.id,
            component: measurement.component || 'Shell',
            location: measurement.location || 'Unknown',
            measurementType: measurement.measurementType || 'shell',
            currentThickness: measurement.currentThickness || 0,
            originalThickness: measurement.originalThickness || null,
            elevation: measurement.elevation || null,
            corrosionRate: measurement.corrosionRate || null,
            remainingLife: measurement.remainingLife || null,
            status: measurement.status || 'acceptable',
            createdAt: new Date().toISOString()
          };
          
          console.log('Sending measurement:', measurementData);
          
          const measurementResponse = await fetch(`/api/reports/${report.id}/measurements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(measurementData),
          });
          
          if (!measurementResponse.ok) {
            const errorData = await measurementResponse.json();
            console.error('Measurement creation failed:', errorData);
            console.error('Sent measurement data:', measurementData);
            throw new Error(`Failed to create thickness measurement: ${errorData.message || 'Unknown error'}`);
          }
        }
      }
      
      // Create checklist items if any
      if (data.checklistItems && data.checklistItems.length > 0) {
        for (const item of data.checklistItems) {
          const checklistData = {
            ...item,
            reportId: report.id,
            category: 'external' // Default category
          };
          
          const checklistResponse = await fetch(`/api/reports/${report.id}/checklists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checklistData),
          });
          
          if (!checklistResponse.ok) {
            throw new Error('Failed to create checklist item');
          }
        }
      }
      
      return report;
    },
    onSuccess: () => {
      toast({
        title: "Report Created",
        description: "Successfully created report with imported data, measurements, and checklist items.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setLocation('/');
    },
    onError: (error: any) => {
      console.error('Create report error:', error);
      const errorMessage = error?.message || error?.toString() || "Failed to create report from imported data.";
      toast({
        title: "Error Creating Report",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
      'application/pdf' // .pdf
    ];
    
    // Also check file extensions as a fallback
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.pdf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast({
        title: "Invalid File Type",
        description: "Please select an Excel file (.xlsx, .xls, .xlsm) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const runCleanup = async (apply: boolean) => {
    try {
      setCleanupLoading(true);
      setCleanupResult(null);
      const data = await runOrphanCleanup(!apply);
      setCleanupResult(data);
      toast({
        title: apply ? 'Cleanup Applied' : 'Dry Run Complete',
        description: apply ? 'Orphaned rows removed.' : 'Dry run results displayed below.'
      });
    } catch (e: any) {
      toast({ title: 'Cleanup Failed', description: e.message, variant: 'destructive' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const createReport = () => {
    console.log('=== CREATE REPORT BUTTON CLICKED ===');
    console.log('Full importResult:', importResult);
    console.log('importResult.importedData:', importResult?.importedData);
    
    if (!importResult) {
      console.error('No import result available');
      toast({
        title: "No Import Data",
        description: "Please import a file first before creating a report.",
        variant: "destructive",
      });
      return;
    }
    
    if (!importResult.importedData) {
      console.error('No importedData in result');
      console.log('Available fields in importResult:', Object.keys(importResult));
      toast({
        title: "No Data Found",
        description: "The imported file doesn't contain valid report data.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Creating report with data:', {
      reportData: importResult.importedData,
      thicknessMeasurements: importResult.thicknessMeasurements || [],
      checklistItems: importResult.checklistItems || []
    });
    
    // Check if reportData has required fields
    const requiredFields = ['tankId', 'service', 'inspector', 'inspectionDate'];
    const missingFields = requiredFields.filter(field => !importResult.importedData[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      toast({
        title: "Missing Required Fields",
        description: `The following fields are missing: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    console.log('All required fields present, calling mutation...');
    createReportMutation.mutate({
      reportData: importResult.importedData,
      thicknessMeasurements: importResult.thicknessMeasurements || [],
      checklistItems: importResult.checklistItems || []
    });
  };

  const downloadTemplate = () => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = '/api/template/download';
    link.download = `API_653_Inspection_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: "The inspection template has been downloaded. Fill it out and import it back here.",
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Excel Reports</h2>
        <p className="text-gray-600">Upload existing Excel inspection reports to convert them to the digital format</p>
      </div>

      {/* Template Download Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Need a Template?</h3>
              <p className="text-gray-600">Download our standardized API 653 inspection template. Fill it out and import it back for consistent data entry.</p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="ml-4">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedFile ? selectedFile.name : "Upload Excel File"}
            </h3>
            <p className="text-gray-500 mb-4">
              Drag and drop your Excel file here, or click to browse
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.xlsm,.pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-xs text-gray-400">
                Supports .xlsx, .xls, .xlsm, and .pdf files up to 25MB
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={processFile}
                disabled={importMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importMutation.isPending ? "Processing..." : "Process File"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResult && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Import Results</h3>
            </div>

            {/* AI Analysis Status */}
            {showAIAnalysisIndicators && importResult.aiAnalysis && (
              <div className={`p-3 rounded-lg mb-4 ${importResult.aiAnalysis.confidence > 0.5 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {importResult.aiAnalysis.confidence > 0.5 ? (
                      <span className="text-green-600 font-medium">✓ OpenRouter AI Analysis Successful</span>
                    ) : (
                      <span className="text-orange-600 font-medium">⚠ OpenRouter AI Analysis Failed</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {Math.round(importResult.aiAnalysis.confidence * 100)}%
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {importResult.aiAnalysis.confidence > 0.5 
                    ? 'Your OpenRouter AI successfully analyzed the spreadsheet and extracted structured data'
                    : 'OpenRouter AI analysis failed - system used standard parsing as fallback'
                  }
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Extracted Report Data */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Extracted Report Data</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Report Number:</strong> {importResult.importedData?.reportNumber || 'Not found'}</div>
                  <div><strong>Tank ID:</strong> {importResult.importedData?.tankId || 'Not found'}</div>
                  <div><strong>Service:</strong> {importResult.importedData?.service || 'Not found'}</div>
                  <div><strong>Inspector:</strong> {importResult.importedData?.inspector || 'Not found'}</div>
                  <div><strong>Date:</strong> {importResult.importedData?.inspectionDate || 'Not found'}</div>
                  <div><strong>Location:</strong> {importResult.importedData?.location || 'Not found'}</div>
                  <div><strong>Owner:</strong> {importResult.importedData?.owner || 'Not found'}</div>
                  <div><strong>Diameter:</strong> {importResult.importedData?.diameter || 'Not found'}</div>
                  <div><strong>Height:</strong> {importResult.importedData?.height || 'Not found'}</div>
                  <div><strong>Original Thickness:</strong> {importResult.importedData?.originalThickness || 'Not found'}</div>
                  <div><strong>Findings:</strong> {importResult.importedData?.findings ? 'Found' : 'Not found'}</div>
                  <div><strong>Next Inspection:</strong> {importResult.importedData?.nextInspectionDate || 'Not found'}</div>
                  <div><strong>Years Since Last Inspection:</strong> {importResult.importedData?.yearsSinceLastInspection || 'Not found'}</div>
                </div>
              </div>

              {/* File Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Import Summary</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Total Rows:</strong> {importResult.totalRows}</div>
                  <div><strong>Thickness Measurements:</strong> {getCount(importResult.thicknessMeasurements)}</div>
                  <div><strong>Checklist Items:</strong> {getCount(importResult.checklistItems)}</div>
                  {typeof importResult.measurementsCreated === 'number' && (
                    <div><strong>Persisted Measurements:</strong> {importResult.measurementsCreated}</div>
                  )}
                  {typeof importResult.checklistCreated === 'number' && (
                    <div><strong>Persisted Checklist Items:</strong> {importResult.checklistCreated}</div>
                  )}
                  <div><strong>Status:</strong> <span className="text-green-600">Ready to import</span></div>
                </div>
              </div>
            </div>

            {/* Thickness Measurements Preview */}
            {isArray(importResult.thicknessMeasurements) && importResult.thicknessMeasurements.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Thickness Measurements Found ({importResult.thicknessMeasurements.length})</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {importResult.thicknessMeasurements.slice(0, 6).map((measurement: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border text-sm">
                        <div><strong>Location:</strong> {measurement.location}</div>
                        <div><strong>Elevation:</strong> {measurement.elevation}</div>
                        <div><strong>Thickness:</strong> {measurement.currentThickness} in</div>
                      </div>
                    ))}
                  </div>
                  {importResult.thicknessMeasurements.length > 6 && (
                    <p className="text-sm text-gray-600 mt-2">
                      ... and {importResult.thicknessMeasurements.length - 6} more measurements
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Checklist Items Preview */}
            {isArray(importResult.checklistItems) && importResult.checklistItems.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Checklist Items Found ({importResult.checklistItems.length})</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="space-y-2">
                    {importResult.checklistItems.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border text-sm flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{item.item}</div>
                          {item.notes && <div className="text-gray-600 text-xs mt-1">{item.notes}</div>}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          item.checked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.checked ? 'Pass' : 'Fail'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {getCount(importResult.checklistItems) > 5 && (
                    <p className="text-sm text-gray-600 mt-2">
                      ... and {getCount(importResult.checklistItems) - 5} more checklist items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Raw Data Preview */}
            {importResult.preview && importResult.preview.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Raw Data Preview (First 3 rows)</h4>
                <div className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(importResult.preview?.slice(0, 3) || [], null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Navigation / View Report */}
            {importResult.success && importResult.reportId && (
              <div className="mt-6 flex justify-end space-x-4">
                <Button variant="outline" onClick={() => setImportResult(null)}>Close</Button>
                <Button onClick={() => setLocation(`/report/${importResult.reportId}`)} className="bg-green-600 hover:bg-green-700">View Report</Button>
              </div>
            )}

            {/* Warnings Display */}
            {importResult.warnings && importResult.warnings.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <h4 className="font-medium text-yellow-800">Import Warnings</h4>
                </div>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {importResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Maintenance / Cleanup Section (Dev Only) */}
            {import.meta.env.MODE !== 'production' && (
            <div className="mt-10 border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Maintenance Utilities (Developers)</h4>
              <p className="text-sm text-gray-600 mb-4">Run orphan cleanup to detect and optionally remove measurements or checklist rows without a parent report.</p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" disabled={cleanupLoading} onClick={() => runCleanup(false)}>
                  {cleanupLoading ? 'Running Dry Run...' : 'Dry Run Cleanup'}
                </Button>
                <Button type="button" disabled={cleanupLoading} className="bg-red-600 hover:bg-red-700" onClick={() => runCleanup(true)}>
                  {cleanupLoading ? 'Applying...' : 'Apply Cleanup'}
                </Button>
              </div>
              {cleanupResult && (
                <div className="mt-4 bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(cleanupResult, null, 2)}</pre>
                </div>
              )}
            </div>
            )}

            {/* Warning if data is incomplete */}
            {(!importResult.importedData?.tankId || !importResult.importedData?.reportNumber) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Some required fields could not be extracted from the Excel file. 
                    You can edit the report after creation to add missing information.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}