import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle, Info, TrendingDown, Clock, Activity } from 'lucide-react';

interface CriticalAlert {
  type: 'shell_thickness' | 'settlement' | 'cml' | 'corrosion' | 'inspection_due';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: string;
  value?: number;
  limit?: number;
}

interface CriticalAlertsDashboardProps {
  reportId?: number;
  shellThicknessIssues?: number;
  settlementLimitExceeded?: boolean;
  cmlLocationsBelowFiveYears?: number;
  minRemainingLife?: number;
  nextInspectionDate?: string;
  overallStatus?: 'GO' | 'NO-GO' | 'CONDITIONAL';
  onAlertClick?: (alert: CriticalAlert) => void;
}

export function CriticalAlertsDashboard({
  reportId,
  shellThicknessIssues = 0,
  settlementLimitExceeded = false,
  cmlLocationsBelowFiveYears = 0,
  minRemainingLife = 999,
  nextInspectionDate,
  overallStatus = 'GO',
  onAlertClick
}: CriticalAlertsDashboardProps) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate alerts based on conditions
  useEffect(() => {
    const newAlerts: CriticalAlert[] = [];

    // Shell thickness alerts
    if (shellThicknessIssues > 0) {
      newAlerts.push({
        type: 'shell_thickness',
        severity: shellThicknessIssues > 2 ? 'critical' : 'warning',
        message: `${shellThicknessIssues} shell course(s) below minimum thickness`,
        details: 'Immediate inspection and repair planning required',
        value: shellThicknessIssues
      });
    }

    // Settlement alerts
    if (settlementLimitExceeded) {
      newAlerts.push({
        type: 'settlement',
        severity: 'critical',
        message: 'Settlement limit exceeded per API 653',
        details: 'Foundation assessment required',
        value: 1
      });
    }

    // CML alerts
    if (cmlLocationsBelowFiveYears > 0) {
      newAlerts.push({
        type: 'cml',
        severity: cmlLocationsBelowFiveYears > 5 ? 'critical' : 'warning',
        message: `${cmlLocationsBelowFiveYears} CML location(s) < 5 years remaining life`,
        details: 'Accelerated inspection schedule recommended',
        value: cmlLocationsBelowFiveYears
      });
    }

    // Corrosion rate alerts
    if (minRemainingLife < 5) {
      newAlerts.push({
        type: 'corrosion',
        severity: minRemainingLife < 2 ? 'critical' : 'warning',
        message: `Minimum remaining life: ${minRemainingLife.toFixed(1)} years`,
        details: 'Corrosion mitigation measures required',
        value: minRemainingLife,
        limit: 5
      });
    }

    // Inspection due alerts
    if (nextInspectionDate) {
      const daysUntilInspection = Math.floor(
        (new Date(nextInspectionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilInspection < 90) {
        newAlerts.push({
          type: 'inspection_due',
          severity: daysUntilInspection < 30 ? 'critical' : 'warning',
          message: `Next inspection due in ${daysUntilInspection} days`,
          details: nextInspectionDate,
          value: daysUntilInspection
        });
      }
    }

    setAlerts(newAlerts);
  }, [shellThicknessIssues, settlementLimitExceeded, cmlLocationsBelowFiveYears, minRemainingLife, nextInspectionDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GO':
        return 'bg-green-500';
      case 'NO-GO':
        return 'bg-red-500';
      case 'CONDITIONAL':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'GO':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'NO-GO':
        return <XCircle className="h-5 w-5" />;
      case 'CONDITIONAL':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Critical Alerts Dashboard
          </CardTitle>
          <Badge 
            className={`${getStatusColor(overallStatus)} text-white px-3 py-1`}
          >
            <span className="flex items-center gap-1">
              {getStatusIcon(overallStatus)}
              {overallStatus}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {shellThicknessIssues}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Shell Thickness Issues
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {settlementLimitExceeded ? 'YES' : 'NO'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Settlement Limit Exceeded
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {cmlLocationsBelowFiveYears}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              CML Locations {'<'} 5 Years
            </div>
          </div>
        </div>

        {/* Alert Summary Bar */}
        {alerts.length > 0 && (
          <div className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">{criticalCount} Critical</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{warningCount} Warning</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:underline"
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        )}

        {/* Detailed Alerts List */}
        {isExpanded && alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert 
                key={index}
                className={`cursor-pointer transition-colors ${
                  alert.severity === 'critical' 
                    ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                    : alert.severity === 'warning'
                    ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                    : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                }`}
                onClick={() => onAlertClick?.(alert)}
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(alert.severity)}
                  <AlertDescription className="flex-1">
                    <div className="font-medium">{alert.message}</div>
                    {alert.details && (
                      <div className="text-sm mt-1 opacity-75">{alert.details}</div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* No Alerts State */}
        {alerts.length === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              No critical alerts detected. All systems within acceptable parameters.
            </AlertDescription>
          </Alert>
        )}

        {/* Remaining Life Indicator */}
        {minRemainingLife < 999 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Minimum Remaining Life</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      minRemainingLife < 2 ? 'bg-red-500' :
                      minRemainingLife < 5 ? 'bg-orange-500' :
                      minRemainingLife < 10 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (minRemainingLife / 20) * 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${
                  minRemainingLife < 5 ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {minRemainingLife.toFixed(1)} years
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}