import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

interface ImportResult {
  message: string;
  extractedData: any;
  thicknessMeasurements: any[];
  checklistItems: any[];
  totalRows: number;
  preview: any[];
}

export default function ImportReports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const formData = new FormData();
      formData.append('excelFile', file);
      
      const response = await fetch('/api/reports/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to import Excel file';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Import error:', errorData);
        } catch (e) {
          console.error('Failed to parse error response');
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      toast({
        title: "File Processed",
        description: `Successfully processed Excel file with ${result.totalRows} rows.`,
      });
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
      // First create the report
      const reportResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.reportData),
      });
      
      if (!reportResponse.ok) {
        const errorData = await reportResponse.json();
        console.error('Report creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create report');
      }
      
      const report = await reportResponse.json();
      
      // Then create thickness measurements if any
      if (data.thicknessMeasurements && data.thicknessMeasurements.length > 0) {
        for (const measurement of data.thicknessMeasurements) {
          const measurementData = {
            ...measurement,
            reportId: report.id
          };
          
          const measurementResponse = await fetch(`/api/reports/${report.id}/measurements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(measurementData),
          });
          
          if (!measurementResponse.ok) {
            throw new Error('Failed to create thickness measurement');
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create report from imported data.",
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select an Excel file (.xlsx or .xls).",
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

  const createReport = () => {
    if (importResult?.extractedData) {
      createReportMutation.mutate({
        reportData: importResult.extractedData,
        thicknessMeasurements: importResult.thicknessMeasurements || [],
        checklistItems: importResult.checklistItems || []
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Excel Reports</h2>
        <p className="text-gray-600">Upload existing Excel inspection reports to convert them to the digital format</p>
      </div>

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
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              <p className="text-xs text-gray-400">
                Supports .xlsx and .xls files up to 10MB
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Extracted Report Data */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Extracted Report Data</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Report Number:</strong> {importResult.extractedData.reportNumber || 'Not found'}</div>
                  <div><strong>Tank ID:</strong> {importResult.extractedData.tankId || 'Not found'}</div>
                  <div><strong>Service:</strong> {importResult.extractedData.service || 'Not found'}</div>
                  <div><strong>Inspector:</strong> {importResult.extractedData.inspector || 'Not found'}</div>
                  <div><strong>Date:</strong> {importResult.extractedData.inspectionDate || 'Not found'}</div>
                  <div><strong>Location:</strong> {importResult.extractedData.location || 'Not found'}</div>
                  <div><strong>Owner:</strong> {importResult.extractedData.owner || 'Not found'}</div>
                  <div><strong>Diameter:</strong> {importResult.extractedData.diameter || 'Not found'}</div>
                  <div><strong>Height:</strong> {importResult.extractedData.height || 'Not found'}</div>
                  <div><strong>Original Thickness:</strong> {importResult.extractedData.originalThickness || 'Not found'}</div>
                  <div><strong>Years Since Last Inspection:</strong> {importResult.extractedData.yearsSinceLastInspection || 'Not found'}</div>
                </div>
              </div>

              {/* File Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Import Summary</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Total Rows:</strong> {importResult.totalRows}</div>
                  <div><strong>Thickness Measurements:</strong> {importResult.thicknessMeasurements?.length || 0}</div>
                  <div><strong>Checklist Items:</strong> {importResult.checklistItems?.length || 0}</div>
                  <div><strong>Status:</strong> <span className="text-green-600">Ready to import</span></div>
                </div>
              </div>
            </div>

            {/* Thickness Measurements Preview */}
            {importResult.thicknessMeasurements && importResult.thicknessMeasurements.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Thickness Measurements Found ({importResult.thicknessMeasurements.length})</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {importResult.thicknessMeasurements.slice(0, 6).map((measurement, index) => (
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
            {importResult.checklistItems && importResult.checklistItems.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Checklist Items Found ({importResult.checklistItems.length})</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="space-y-2">
                    {importResult.checklistItems.slice(0, 5).map((item, index) => (
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
                  {importResult.checklistItems.length > 5 && (
                    <p className="text-sm text-gray-600 mt-2">
                      ... and {importResult.checklistItems.length - 5} more checklist items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Raw Data Preview */}
            {importResult.preview.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Raw Data Preview (First 3 rows)</h4>
                <div className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(importResult.preview.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Create Report Button */}
            <div className="mt-6 flex justify-end space-x-4">
              <Button variant="outline" onClick={() => setImportResult(null)}>
                Cancel
              </Button>
              <Button
                onClick={createReport}
                disabled={createReportMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createReportMutation.isPending ? "Creating..." : "Create Report"}
              </Button>
            </div>

            {/* Warning if data is incomplete */}
            {(!importResult.extractedData.tankId || !importResult.extractedData.reportNumber) && (
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