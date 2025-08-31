import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Info,
  FileText,
  BarChart3
} from 'lucide-react';

interface CalculationSummaryProps {
  shellData?: {
    governingCourse?: number;
    minThickness?: number;
    requiredThickness?: number;
    corrosionRate?: number;
    remainingLife?: number;
    status?: 'acceptable' | 'monitor' | 'action_required';
  };
  bottomData?: {
    minThickness?: number;
    requiredThickness?: number;
    corrosionRate?: number;
    remainingLife?: number;
    criticalZone?: string;
  };
  roofData?: {
    condition?: 'good' | 'fair' | 'poor';
    thickness?: number;
    requiredThickness?: number;
    issues?: string[];
  };
  settlementData?: {
    maxSettlement?: number;
    allowableSettlement?: number;
    rSquared?: number;
    acceptance?: 'ACCEPTABLE' | 'MONITOR' | 'ACTION_REQUIRED';
  };
  cmlData?: {
    totalLocations?: number;
    criticalLocations?: number;
    minRemainingLife?: number;
    averageCorrosionRate?: number;
  };
}

export function CalculationSummary({
  shellData = {},
  bottomData = {},
  roofData = {},
  settlementData = {},
  cmlData = {}
}: CalculationSummaryProps) {
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'acceptable':
      case 'ACCEPTABLE':
      case 'good':
        return 'text-green-600';
      case 'monitor':
      case 'MONITOR':
      case 'fair':
        return 'text-yellow-600';
      case 'action_required':
      case 'ACTION_REQUIRED':
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'acceptable':
      case 'ACCEPTABLE':
      case 'good':
        return <Badge className="bg-green-500 text-white">Good</Badge>;
      case 'monitor':
      case 'MONITOR':
      case 'fair':
        return <Badge className="bg-yellow-500 text-white">Monitor</Badge>;
      case 'action_required':
      case 'ACTION_REQUIRED':
      case 'poor':
        return <Badge className="bg-red-500 text-white">Action Required</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  // Calculate overall health score
  const calculateHealthScore = () => {
    let score = 100;
    let factors = 0;

    // Shell condition factor
    if (shellData.status) {
      factors++;
      if (shellData.status === 'monitor') score -= 15;
      if (shellData.status === 'action_required') score -= 30;
    }

    // Bottom condition factor
    if (bottomData.remainingLife !== undefined) {
      factors++;
      if (bottomData.remainingLife < 5) score -= 30;
      else if (bottomData.remainingLife < 10) score -= 15;
    }

    // Roof condition factor
    if (roofData.condition) {
      factors++;
      if (roofData.condition === 'fair') score -= 10;
      if (roofData.condition === 'poor') score -= 20;
    }

    // Settlement factor
    if (settlementData.acceptance) {
      factors++;
      if (settlementData.acceptance === 'MONITOR') score -= 15;
      if (settlementData.acceptance === 'ACTION_REQUIRED') score -= 25;
    }

    // CML factor
    if (cmlData.minRemainingLife !== undefined) {
      factors++;
      if (cmlData.minRemainingLife < 5) score -= 25;
      else if (cmlData.minRemainingLife < 10) score -= 10;
    }

    return factors > 0 ? Math.max(0, score) : null;
  };

  const healthScore = calculateHealthScore();

  return (
    <div className="space-y-6">
      {/* Overall Tank Health */}
      {healthScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overall Tank Health Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Health Score</span>
                <span className={`text-2xl font-bold ${
                  healthScore >= 70 ? 'text-green-600' :
                  healthScore >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {healthScore}%
                </span>
              </div>
              <Progress 
                value={healthScore} 
                className={`h-3 ${
                  healthScore >= 70 ? 'bg-green-100' :
                  healthScore >= 50 ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}
              />
              <Alert className={
                healthScore >= 70 ? 'border-green-200 bg-green-50' :
                healthScore >= 50 ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }>
                <AlertDescription>
                  {healthScore >= 70 ? 
                    'Tank is in good condition with no immediate concerns.' :
                    healthScore >= 50 ?
                    'Tank requires monitoring and preventive maintenance planning.' :
                    'Tank requires immediate attention and repair planning.'}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shell Calculations Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Shell Calculations
              </span>
              {getStatusBadge(shellData.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Governing Course:</span>
                <p className="font-semibold">Course {shellData.governingCourse || '-'}</p>
              </div>
              <div>
                <span className="text-gray-600">Min Thickness:</span>
                <p className="font-semibold">{shellData.minThickness?.toFixed(3) || '-'}"</p>
              </div>
              <div>
                <span className="text-gray-600">Required t-min:</span>
                <p className="font-semibold">{shellData.requiredThickness?.toFixed(3) || '-'}"</p>
              </div>
              <div>
                <span className="text-gray-600">Corrosion Rate:</span>
                <p className="font-semibold">{shellData.corrosionRate?.toFixed(1) || '-'} mpy</p>
              </div>
            </div>
            {shellData.remainingLife !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining Life:</span>
                  <span className={`font-bold ${getStatusColor(
                    shellData.remainingLife < 5 ? 'action_required' :
                    shellData.remainingLife < 10 ? 'monitor' : 'acceptable'
                  )}`}>
                    {shellData.remainingLife.toFixed(1)} years
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Calculations Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Bottom Calculations
              </span>
              {getStatusBadge(
                bottomData.remainingLife && bottomData.remainingLife < 5 ? 'action_required' :
                bottomData.remainingLife && bottomData.remainingLife < 10 ? 'monitor' : 'acceptable'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Min Thickness:</span>
                <p className="font-semibold">{bottomData.minThickness?.toFixed(3) || '-'}"</p>
              </div>
              <div>
                <span className="text-gray-600">Required t-min:</span>
                <p className="font-semibold">{bottomData.requiredThickness?.toFixed(3) || '-'}"</p>
              </div>
              <div>
                <span className="text-gray-600">Critical Zone:</span>
                <p className="font-semibold">{bottomData.criticalZone || '-'}</p>
              </div>
              <div>
                <span className="text-gray-600">Corrosion Rate:</span>
                <p className="font-semibold">{bottomData.corrosionRate?.toFixed(1) || '-'} mpy</p>
              </div>
            </div>
            {bottomData.remainingLife !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining Life:</span>
                  <span className={`font-bold ${getStatusColor(
                    bottomData.remainingLife < 5 ? 'action_required' :
                    bottomData.remainingLife < 10 ? 'monitor' : 'acceptable'
                  )}`}>
                    {bottomData.remainingLife.toFixed(1)} years
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settlement Analysis Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Settlement Analysis
              </span>
              {getStatusBadge(settlementData.acceptance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Max Settlement:</span>
                <p className="font-semibold">{settlementData.maxSettlement?.toFixed(3) || '-'} ft</p>
              </div>
              <div>
                <span className="text-gray-600">Allowable:</span>
                <p className="font-semibold">{settlementData.allowableSettlement?.toFixed(3) || '-'} ft</p>
              </div>
              <div>
                <span className="text-gray-600">R² Value:</span>
                <p className={`font-semibold ${
                  settlementData.rSquared && settlementData.rSquared < 0.9 ? 'text-orange-600' : ''
                }`}>
                  {settlementData.rSquared?.toFixed(4) || '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">API 653 Ref:</span>
                <p className="font-semibold text-xs">Annex B.3.2.1</p>
              </div>
            </div>
            {settlementData.rSquared && settlementData.rSquared < 0.9 && (
              <Alert className="border-orange-200 bg-orange-50 py-1">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  R-squared {'<'} 0.90 - Cosine fit may not be appropriate
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* CML Analysis Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                CML Analysis
              </span>
              {getStatusBadge(
                cmlData.criticalLocations && cmlData.criticalLocations > 0 ? 'action_required' :
                cmlData.minRemainingLife && cmlData.minRemainingLife < 10 ? 'monitor' : 'acceptable'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Total Locations:</span>
                <p className="font-semibold">{cmlData.totalLocations || 0}</p>
              </div>
              <div>
                <span className="text-gray-600">Critical CMLs:</span>
                <p className={`font-semibold ${
                  cmlData.criticalLocations && cmlData.criticalLocations > 0 ? 'text-red-600' : ''
                }`}>
                  {cmlData.criticalLocations || 0}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Avg Corr Rate:</span>
                <p className="font-semibold">{cmlData.averageCorrosionRate?.toFixed(1) || '-'} mpy</p>
              </div>
              <div>
                <span className="text-gray-600">Min Rem Life:</span>
                <p className={`font-semibold ${getStatusColor(
                  cmlData.minRemainingLife && cmlData.minRemainingLife < 5 ? 'action_required' :
                  cmlData.minRemainingLife && cmlData.minRemainingLife < 10 ? 'monitor' : 'acceptable'
                )}`}>
                  {cmlData.minRemainingLife?.toFixed(1) || '-'} yrs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Key Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {shellData.status === 'action_required' && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Shell thickness below minimum - immediate repair planning required</span>
              </li>
            )}
            {bottomData.remainingLife !== undefined && bottomData.remainingLife < 5 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Bottom plate critical - plan for bottom replacement within {bottomData.remainingLife.toFixed(1)} years</span>
              </li>
            )}
            {settlementData.acceptance === 'ACTION_REQUIRED' && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Settlement exceeds API 653 limits - foundation assessment required</span>
              </li>
            )}
            {cmlData.criticalLocations && cmlData.criticalLocations > 0 && (
              <li className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>{cmlData.criticalLocations} CML location(s) require increased monitoring frequency</span>
              </li>
            )}
            {roofData.condition === 'poor' && (
              <li className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>Roof condition poor - schedule comprehensive roof inspection</span>
              </li>
            )}
            {(!shellData.status || healthScore === null || healthScore >= 70) && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Continue routine inspection schedule per API 653 intervals</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}