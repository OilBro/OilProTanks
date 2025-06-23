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
      const formData = new FormData();
      formData.append('excelFile', file);
      
      const response = await fetch('/api/reports/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import Excel file');
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
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Created",
        description: "Successfully created report from imported data.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setLocation('/dashboard');
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
      createReportMutation.mutate(importResult.extractedData);
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
              <Label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extracted Data */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Extracted Report Data</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Report Number:</strong> {importResult.extractedData.reportNumber || 'Not found'}</div>
                  <div><strong>Tank ID:</strong> {importResult.extractedData.tankId || 'Not found'}</div>
                  <div><strong>Service:</strong> {importResult.extractedData.service || 'Not found'}</div>
                  <div><strong>Inspector:</strong> {importResult.extractedData.inspector || 'Not found'}</div>
                  <div><strong>Date:</strong> {importResult.extractedData.inspectionDate || 'Not found'}</div>
                  <div><strong>Diameter:</strong> {importResult.extractedData.diameter || 'Not found'}</div>
                  <div><strong>Height:</strong> {importResult.extractedData.height || 'Not found'}</div>
                  <div><strong>Original Thickness:</strong> {importResult.extractedData.originalThickness || 'Not found'}</div>
                </div>
              </div>

              {/* File Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">File Information</h4>
                <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                  <div><strong>Total Rows:</strong> {importResult.totalRows}</div>
                  <div><strong>Status:</strong> Ready to import</div>
                </div>

                {/* Data Preview */}
                {importResult.preview.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Data Preview (First 5 rows)</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(importResult.preview, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

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