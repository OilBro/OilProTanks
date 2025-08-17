import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Gauge,
  Shield,
  TrendingDown,
  XCircle,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KPIMetrics {
  percentTMLsComplete: number;
  minRemainingLife: number;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  overallStatus: 'GO' | 'NO-GO' | 'CONDITIONAL';
  nextInspectionDue: string;
  containmentMargin?: number;
  tankCount: number;
  reportsInProgress: number;
  reportsCompleted: number;
  avgCorrosionRate?: number;
  complianceScore?: number;
}

interface KPIDashboardProps {
  reportId?: number;
  showFullDashboard?: boolean;
}

export function KPIDashboard({ reportId, showFullDashboard = false }: KPIDashboardProps) {
  // Fetch KPI metrics
  const { data: metrics, isLoading } = useQuery<KPIMetrics>({
    queryKey: reportId ? [`/api/reports/${reportId}/kpi`] : ['/api/kpi/overall'],
    enabled: true
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GO': return 'text-green-600 bg-green-50 border-green-200';
      case 'NO-GO': return 'text-red-600 bg-red-50 border-red-200';
      case 'CONDITIONAL': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (value: number, thresholds: { danger: number; warning: number }) => {
    if (value < thresholds.danger) return 'bg-red-500';
    if (value < thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Alert */}
      <Alert className={`border-2 ${getStatusColor(metrics.overallStatus)}`}>
        <div className="flex items-start gap-4">
          {metrics.overallStatus === 'GO' ? (
            <CheckCircle2 className="h-6 w-6 mt-1" />
          ) : metrics.overallStatus === 'NO-GO' ? (
            <XCircle className="h-6 w-6 mt-1" />
          ) : (
            <AlertTriangle className="h-6 w-6 mt-1" />
          )}
          <div className="flex-1">
            <AlertTitle className="text-lg mb-2">
              Overall Status: {metrics.overallStatus}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              {metrics.overallStatus === 'GO' && (
                <p>All systems within acceptable parameters. Tank(s) cleared for continued operation.</p>
              )}
              {metrics.overallStatus === 'NO-GO' && (
                <p className="font-semibold">
                  CRITICAL: {metrics.criticalFindings} critical finding(s) require immediate action. 
                  Tank must not return to service until resolved.
                </p>
              )}
              {metrics.overallStatus === 'CONDITIONAL' && (
                <p>
                  {metrics.majorFindings} major finding(s) require action before next inspection cycle. 
                  Conditional return to service permitted with monitoring.
                </p>
              )}
              <div className="flex gap-4 mt-3">
                <span className="text-sm">
                  Next Inspection Due: <strong>{new Date(metrics.nextInspectionDue).toLocaleDateString()}</strong>
                </span>
                <span className="text-sm">
                  Min Remaining Life: <strong>{metrics.minRemainingLife.toFixed(1)} years</strong>
                </span>
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TML Completeness */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              TML Completeness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.percentTMLsComplete.toFixed(0)}%</div>
            <Progress 
              value={metrics.percentTMLsComplete} 
              className="mt-2"
              indicatorClassName={getProgressColor(metrics.percentTMLsComplete, { danger: 80, warning: 90 })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.percentTMLsComplete < 90 && 'Minimum 90% required'}
            </p>
          </CardContent>
        </Card>

        {/* Remaining Life */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Min Remaining Life
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.minRemainingLife.toFixed(1)} 
              <span className="text-sm font-normal text-muted-foreground ml-1">years</span>
            </div>
            <div className="mt-2">
              <Badge variant={metrics.minRemainingLife < 2 ? 'destructive' : 
                            metrics.minRemainingLife < 5 ? 'secondary' : 'default'}>
                {metrics.minRemainingLife < 2 ? 'Critical' : 
                 metrics.minRemainingLife < 5 ? 'Monitor' : 'Acceptable'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Findings Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Findings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm">Critical</span>
                <Badge variant="destructive">{metrics.criticalFindings}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Major</span>
                <Badge variant="secondary">{metrics.majorFindings}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Minor</span>
                <Badge variant="outline">{metrics.minorFindings}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Containment Margin */}
        {metrics.containmentMargin !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Containment Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.containmentMargin > 0 ? '+' : ''}{metrics.containmentMargin.toFixed(0)}%
              </div>
              <Badge variant={metrics.containmentMargin >= 10 ? 'default' : 'destructive'}>
                {metrics.containmentMargin >= 10 ? 'SPCC Compliant' : 'Non-Compliant'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                40 CFR 112 Secondary Containment
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Extended Dashboard Metrics */}
      {showFullDashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Inspection Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Inspection Progress
                </CardTitle>
                <CardDescription>Overall fleet status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Tanks</span>
                    <span className="font-medium">{metrics.tankCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">In Progress</span>
                    <span className="font-medium">{metrics.reportsInProgress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Completed</span>
                    <span className="font-medium">{metrics.reportsCompleted}</span>
                  </div>
                  <Progress 
                    value={(metrics.reportsCompleted / metrics.tankCount) * 100} 
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Corrosion Trends */}
            {metrics.avgCorrosionRate !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Corrosion Analysis
                  </CardTitle>
                  <CardDescription>Fleet average rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold">
                        {(metrics.avgCorrosionRate * 1000).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">mpy</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Average corrosion rate</p>
                    </div>
                    <Badge variant={metrics.avgCorrosionRate > 0.005 ? 'destructive' : 'default'}>
                      {metrics.avgCorrosionRate > 0.005 ? 'High Corrosion' : 'Normal'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compliance Score */}
            {metrics.complianceScore !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Compliance Score
                  </CardTitle>
                  <CardDescription>API 653 adherence</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-2xl font-bold">{metrics.complianceScore}%</div>
                    <Progress value={metrics.complianceScore} />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>API 653 Compliant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>40 CFR 112 SPCC</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Executive Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Next Inspection
            </Button>
          </div>
        </>
      )}
    </div>
  );
}