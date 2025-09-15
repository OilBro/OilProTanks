import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileDown, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Eye,
  Settings,
  Send
} from 'lucide-react';
import { generateProfessionalReport } from '@/lib/pdf-report-generator';
import { useToast } from '@/hooks/use-toast';
import type { InspectionReport } from '@shared/schema';

// Narrow, usage-focused interfaces to stabilize typing inside this component
interface MeasurementLike {
  id?: number;
  component?: string | null;
  measurementType?: string | null;
  location?: string | null;
  measuredThickness?: number;
  nominalThickness?: number;
  previousThickness?: number;
  minRequiredThickness?: number;
  corrosionRate?: number;
  remainingLife?: number;
  nextInspectionDate?: string;
}

interface ChecklistLike { severity?: string; description?: string; }
interface SettlementSurveyLike { id?: number; cosineAmplitude?: string; cosinePhase?: string; rSquared?: string; maxOutOfPlane?: string; allowableSettlement?: string; settlementAcceptance?: string; }

interface ReportExportProps {
  reportId: number;
}

export function ReportExport({ reportId }: ReportExportProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Fetch report data
  const { data: report, isLoading: reportLoading } = useQuery<InspectionReport | null>({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId
  });
  
  // Fetch measurements
  const { data: measurements = [] } = useQuery<MeasurementLike[]>({
    queryKey: [`/api/reports/${reportId}/measurements`],
    enabled: !!reportId
  });
  
  // Fetch settlement data
  const { data: settlementSurveys = [] } = useQuery<SettlementSurveyLike[]>({
    queryKey: [`/api/reports/${reportId}/settlement-surveys`],
    enabled: !!reportId
  });
  
  // Fetch checklists
  const { data: checklists = [] } = useQuery<ChecklistLike[]>({
    queryKey: [`/api/reports/${reportId}/checklists`],
    enabled: !!reportId
  });
  
  // Check data completeness
  const dataCompleteness = {
    basicInfo: !!report?.tankId && !!report?.inspectionDate,
    shellData: measurements.filter((m: any) => m.component === 'Shell').length > 0,
    bottomData: measurements.filter((m: any) => m.component === 'Bottom').length > 0,
    settlementData: settlementSurveys.length > 0,
    cmlData: measurements.filter((m: any) => m.component === 'CML').length > 0,
    findings: !!report?.findings || checklists.length > 0
  };
  
  const completenessPercentage = Object.values(dataCompleteness).filter(Boolean).length / Object.keys(dataCompleteness).length * 100;
  
  const handleGeneratePDF = async () => {
    if (!report) {
      toast({
        title: 'Error',
        description: 'Report data not available',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Transform data for PDF generator
      const shellMeasurements = measurements.filter((m: any) => m.component === 'Shell');
      const bottomMeasurements = measurements.filter((m: any) => m.component === 'Bottom');
      const cmlMeasurements = measurements.filter((m: any) => m.measurementType === 'cml');
      
      // Calculate shell courses data
      const shellCourses = [];
      for (let i = 1; i <= 6; i++) {
        const courseMeasurements = shellMeasurements.filter((m: any) => 
          m.location?.includes(`Course ${i}`) || m.location?.includes(`Crs ${i}`)
        );
        
        if (courseMeasurements.length > 0) {
          const minThickness = Math.min(...courseMeasurements.map((m: any) => m.measuredThickness || 999));
          const nominalThickness = courseMeasurements[0]?.nominalThickness || 0.25;
          const age = report.tankAge || 20;
          const corrosionRate = ((nominalThickness - minThickness) / age) * 1000;
          const requiredThickness = 0.1; // Simplified - should use API 653 calculation
          const remainingLife = corrosionRate > 0 ? ((minThickness - requiredThickness) / corrosionRate) * 1000 : 999;
          
          shellCourses.push({
            courseNumber: i,
            height: 8, // Default 8ft courses
            nominalThickness: nominalThickness || 0.25,
            measuredThickness: minThickness || 0.25,
            requiredThickness: requiredThickness || 0.1,
            corrosionRate: isNaN(corrosionRate) ? 0 : corrosionRate,
            remainingLife: isNaN(remainingLife) || remainingLife > 999 ? 999 : remainingLife,
            status: remainingLife < 5 ? 'ACTION REQ' : remainingLife < 10 ? 'MONITOR' : 'ACCEPTABLE'
          });
        }
      }
      
      // Determine governing course
      const governingCourse = shellCourses.length > 0 ? 
        shellCourses.reduce((min, course) => 
          course.remainingLife < min.remainingLife ? course : min
        ).courseNumber : 1;
      
      // Calculate bottom data
      const bottomMinThickness = bottomMeasurements.length > 0 ?
        Math.min(...bottomMeasurements.map((m: any) => m.measuredThickness || 999)) : 0.25;
      const bottomNominal = bottomMeasurements[0]?.nominalThickness || 0.25;
      const bottomCorrosionRate = ((bottomNominal - bottomMinThickness) / (report.tankAge || 20)) * 1000;
      const bottomRemainingLife = bottomCorrosionRate > 0 ? 
        ((bottomMinThickness - 0.1) / bottomCorrosionRate) * 1000 : 999;
      
      // Process settlement data
      const latestSettlement = settlementSurveys[0];
      let settlementData = undefined;
      if (latestSettlement && latestSettlement.id) {
        // Fetch settlement measurements for the latest survey
        try {
          const measurementResponse = await fetch(`/api/settlement-surveys/${latestSettlement.id}/measurements`);
          const settlementMeasurements = await measurementResponse.json();
          
          settlementData = {
            measurements: settlementMeasurements.map((m: any) => ({
              angle: parseFloat(m.angle ?? '0') || 0,
              measured: parseFloat(m.measuredElevation ?? '0') || 0,
              normalized: parseFloat(m.normalizedElevation ?? '0') || 0,
              cosineFit: parseFloat(m.cosineFitElevation ?? '0') || 0,
              outOfPlane: parseFloat(m.outOfPlane ?? '0') || 0
            })),
            amplitude: parseFloat(latestSettlement.cosineAmplitude ?? '0') || 0,
            phase: parseFloat(latestSettlement.cosinePhase ?? '0') || 0,
            rSquared: parseFloat(latestSettlement.rSquared ?? '0') || 0,
            maxSettlement: parseFloat(latestSettlement.maxOutOfPlane ?? '0') || 0,
            allowableSettlement: parseFloat(latestSettlement.allowableSettlement ?? '0.5') || 0.5,
            acceptance: latestSettlement.settlementAcceptance || 'PENDING'
          };
        } catch (error) {
          console.error('Failed to fetch settlement measurements:', error);
          settlementData = {
            measurements: [],
            amplitude: parseFloat(latestSettlement.cosineAmplitude ?? '0') || 0,
            phase: parseFloat(latestSettlement.cosinePhase ?? '0') || 0,
            rSquared: parseFloat(latestSettlement.rSquared ?? '0') || 0,
            maxSettlement: parseFloat(latestSettlement.maxOutOfPlane ?? '0') || 0,
            allowableSettlement: parseFloat(latestSettlement.allowableSettlement ?? '0.5') || 0.5,
            acceptance: latestSettlement.settlementAcceptance || 'PENDING'
          };
        }
      }
      
      // Process CML data
      const cmlData = cmlMeasurements.map((m: any) => ({
        cmlId: `CML-${m.id}`,
        component: m.component,
        location: m.location,
        currentReading: m.measuredThickness || 0,
        previousReading: m.previousThickness,
        tMin: m.minRequiredThickness || 0.1,
        corrosionRate: m.corrosionRate || 0,
        remainingLife: m.remainingLife || 999,
        nextInspDate: m.nextInspectionDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: m.remainingLife < 5 ? 'critical' : m.remainingLife < 10 ? 'action_required' : 'acceptable'
      }));
      
      // Prepare findings
      const criticalFindings = checklists
        .filter((c: any) => c.severity === 'critical')
        .map((c: any) => c.description);
      
      const majorFindings = checklists
        .filter((c: any) => c.severity === 'major')
        .map((c: any) => c.description);
      
      const minorFindings = checklists
        .filter((c: any) => c.severity === 'minor')
        .map((c: any) => c.description);
      
      const reportData = {
        reportNumber: report.reportNumber || 'UNKNOWN',
        tankId: report.tankId || 'N/A',
        facilityName: report.facilityName || 'Oil Storage Facility',
        location: report.location || 'Terminal',
  inspectionDate: report.inspectionDate || 'N/A',
        inspector: report.inspector || 'API 653 Inspector',
        reviewedBy: (report as any).reviewedBy || (report as any).reviewer,
        
        tankDetails: {
          diameter: parseFloat(report.diameter ?? '100') || 100,
          height: parseFloat(report.height ?? '40') || 40,
          capacity: parseFloat(report.capacity ?? '50000') || 50000,
          product: report.product || 'Crude Oil',
          yearBuilt: typeof report.yearBuilt === 'number' ? report.yearBuilt : parseInt((report.yearBuilt as any) || '2000', 10),
          lastInspection: report.lastInternalInspection || undefined,
          designCode: report.designCode || 'API 650',
          material: report.shellMaterial || 'A36'
        },
        
        shellData: {
          courses: shellCourses,
          governingCourse,
          overallStatus: shellCourses.some(c => c.status === 'ACTION REQ') ? 'ACTION REQUIRED' :
                        shellCourses.some(c => c.status === 'MONITOR') ? 'MONITOR' : 'ACCEPTABLE'
        },
        
        bottomData: {
          nominalThickness: bottomNominal,
          minMeasured: bottomMinThickness,
          requiredThickness: 0.1,
          corrosionRate: bottomCorrosionRate,
          remainingLife: bottomRemainingLife,
          mriDate: report.nextInternalInspection || undefined
        },
        
        settlementData,
        cmlData: cmlData.length > 0 ? cmlData : undefined,
        
        findings: {
          executive: report.findings || 'Tank inspection completed per API 653 standards.',
          critical: criticalFindings,
          major: majorFindings,
          minor: minorFindings,
          recommendations: [
            shellCourses.some(c => c.remainingLife < 10) ? 
              'Schedule shell repairs for courses with remaining life less than 10 years' : null,
            bottomRemainingLife < 10 ? 
              'Plan for bottom replacement or repair within next inspection interval' : null,
            settlementData?.acceptance === 'ACTION_REQUIRED' ? 
              'Perform detailed foundation assessment due to settlement concerns' : null,
            'Continue routine thickness monitoring per API 653 intervals',
            'Maintain coating system to minimize external corrosion'
          ].filter(Boolean) as string[],
          nextInspectionDate: report.nextExternalInspection || 
            new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      };
      
      // Generate PDF
      await generateProfessionalReport(reportData);
      
      toast({
        title: 'Success',
        description: 'Professional report generated successfully'
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (reportLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Data Completeness Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Report Data Completeness
          </CardTitle>
          <CardDescription>
            Ensure all required data is complete before generating the report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Completeness</span>
              <span className="text-sm font-bold">{completenessPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  completenessPercentage >= 80 ? 'bg-green-500' :
                  completenessPercentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${completenessPercentage}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              {Object.entries(dataCompleteness).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {value ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Report
          </CardTitle>
          <CardDescription>
            Generate professional inspection report in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={exportFormat} onValueChange={setExportFormat}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pdf">PDF Report</TabsTrigger>
              <TabsTrigger value="excel">Excel Export</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pdf" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Professional PDF Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a comprehensive API 653 inspection report with all calculations, 
                  findings, and recommendations in professional format.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={handleGeneratePDF}
                    disabled={isGenerating || completenessPercentage < 60}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate PDF Report
                      </>
                    )}
                  </Button>
                  {completenessPercentage < 60 && (
                    <Alert className="flex-1">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Report requires at least 60% data completeness
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-2">Report Contents</h5>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Cover Page with Tank Information</li>
                  <li>• Executive Summary</li>
                  <li>• Shell Thickness Calculations & Analysis</li>
                  <li>• Bottom Assessment</li>
                  <li>• Settlement Analysis (if available)</li>
                  <li>• CML Data Summary</li>
                  <li>• Findings & Recommendations</li>
                  <li>• Appendices</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="excel" className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Excel Data Export</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export all inspection data to Excel format for further analysis or record keeping.
                </p>
                <Button variant="outline" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel (Coming Soon)
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Report Preview</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Preview the report before generating the final PDF.
                </p>
                <Button variant="outline" disabled>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Report (Coming Soon)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Additional Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            <Send className="h-4 w-4 mr-2" />
            Email Report to Client
            <Badge className="ml-auto" variant="secondary">Coming Soon</Badge>
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Generate Executive Summary Only
            <Badge className="ml-auto" variant="secondary">Coming Soon</Badge>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}