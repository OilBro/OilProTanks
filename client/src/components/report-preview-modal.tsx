import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { generatePDF, type ReportData } from "@/lib/pdf-generator";
import type { InspectionReport, ThicknessMeasurement, InspectionChecklist } from "@shared/schema";

interface ReportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  report: InspectionReport | null;
  measurements: ThicknessMeasurement[];
  checklists: InspectionChecklist[];
}

export function ReportPreviewModal({ 
  open, 
  onClose, 
  report, 
  measurements, 
  checklists 
}: ReportPreviewModalProps) {
  if (!report) return null;

  const acceptableCount = measurements.filter(m => m.status === 'acceptable').length;
  const monitorCount = measurements.filter(m => m.status === 'monitor').length;
  const actionCount = measurements.filter(m => m.status === 'action_required').length;

  const handleDownloadPDF = () => {
    const reportData: ReportData = { report, measurements, checklists };
    generatePDF(reportData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-gray-900">Report Preview</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="bg-white p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">API 653 INSPECTION REPORT</h1>
              <div className="mt-4 text-sm text-gray-600">
                <p>Report No: <span className="font-mono">{report.reportNumber}</span></p>
                <p>Date: <span>{report.inspectionDate}</span></p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tank Information</h3>
                <div className="text-sm space-y-1">
                  <p>Tank ID: <span>{report.tankId}</span></p>
                  <p>Service: <span className="capitalize">{report.service}</span></p>
                  <p>Diameter: <span>{report.diameter} ft</span></p>
                  <p>Height: <span>{report.height} ft</span></p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Inspection Details</h3>
                <div className="text-sm space-y-1">
                  <p>Inspector: <span>{report.inspector}</span></p>
                  <p>Original Thickness: <span>{report.originalThickness} in</span></p>
                  <p>Years Since Last: <span>{report.yearsSinceLastInspection} years</span></p>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 p-4 rounded">
                  <div className="text-2xl font-bold text-green-600">{acceptableCount}</div>
                  <div className="text-sm text-gray-600">Acceptable</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{monitorCount}</div>
                  <div className="text-sm text-gray-600">Monitor</div>
                </div>
                <div className="bg-red-100 p-4 rounded">
                  <div className="text-2xl font-bold text-red-600">{actionCount}</div>
                  <div className="text-sm text-gray-600">Action Required</div>
                </div>
              </div>
            </div>

            {measurements.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-2">Thickness Measurements</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Component</th>
                        <th className="text-left py-2">Location</th>
                        <th className="text-left py-2">Thickness</th>
                        <th className="text-left py-2">Corr. Rate</th>
                        <th className="text-left py-2">Remaining Life</th>
                        <th className="text-left py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((measurement, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-1">{measurement.component}</td>
                          <td className="py-1">{measurement.location}</td>
                          <td className="py-1">{measurement.currentThickness} in</td>
                          <td className="py-1">{measurement.corrosionRate} in/yr</td>
                          <td className="py-1">{measurement.remainingLife} yrs</td>
                          <td className="py-1 capitalize">{measurement.status?.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-slate-600 hover:bg-slate-700">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
