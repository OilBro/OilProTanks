import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calculator, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VelocityResults {
  erosionalVelocity: number;
  sonicVelocity: number;
  actualVelocity: number;
  erosionalFactor: number;
  velocityRatio: number;
  recommendation: string;
  safetyStatus: 'safe' | 'warning' | 'critical';
}

export function VelocityAnalysisCalculator() {
  const [inputs, setInputs] = useState({
    flowRate: '',
    pipeDiameter: '',
    fluidDensity: '',
    gasGravity: '',
    temperature: '',
    pressure: '',
    fluidType: 'liquid'
  });

  const [results, setResults] = useState<VelocityResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const flowRate = parseFloat(inputs.flowRate);
    const diameter = parseFloat(inputs.pipeDiameter);
    const density = parseFloat(inputs.fluidDensity);
    const gasGrav = parseFloat(inputs.gasGravity);
    const temp = parseFloat(inputs.temperature);
    const pressure = parseFloat(inputs.pressure);

    // API RP 14E Calculations
    const area = Math.PI * Math.pow(diameter / 12, 2) / 4; // Convert inches to feet
    const actualVelocity = flowRate / (area * 60); // ft/s

    // Erosional Velocity Calculation (API RP 14E)
    const erosionalFactor = inputs.fluidType === 'gas' ? 100 : 125;
    const erosionalVelocity = erosionalFactor / Math.sqrt(density);

    // Sonic Velocity for Gas
    const k = 1.3; // Heat capacity ratio for natural gas
    const R = 1545; // Universal gas constant
    const M = gasGrav * 28.97; // Molecular weight
    const sonicVelocity = Math.sqrt(k * R * (temp + 459.67) / M);

    const velocityRatio = actualVelocity / erosionalVelocity;

    let recommendation = '';
    let safetyStatus: 'safe' | 'warning' | 'critical' = 'safe';

    if (velocityRatio < 0.5) {
      recommendation = 'Velocity is well within safe limits. Operation recommended.';
      safetyStatus = 'safe';
    } else if (velocityRatio < 0.8) {
      recommendation = 'Velocity is approaching limits. Monitor for erosion.';
      safetyStatus = 'warning';
    } else {
      recommendation = 'Velocity exceeds recommended limits. Reduce flow rate or increase pipe size.';
      safetyStatus = 'critical';
    }

    setResults({
      erosionalVelocity,
      sonicVelocity,
      actualVelocity,
      erosionalFactor,
      velocityRatio,
      recommendation,
      safetyStatus
    });

    setIsCalculating(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Input Parameters</span>
          </CardTitle>
          <CardDescription>
            Enter system parameters for velocity analysis according to API RP 14E standards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fluidType">Fluid Type</Label>
              <Select 
                value={inputs.fluidType} 
                onValueChange={(value) => handleInputChange('fluidType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fluid type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liquid">Liquid</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flowRate">Flow Rate (bbl/day or MMSCFD)</Label>
              <Input
                id="flowRate"
                type="number"
                value={inputs.flowRate}
                onChange={(e) => handleInputChange('flowRate', e.target.value)}
                placeholder="Enter flow rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeDiameter">Pipe Internal Diameter (inches)</Label>
              <Input
                id="pipeDiameter"
                type="number"
                value={inputs.pipeDiameter}
                onChange={(e) => handleInputChange('pipeDiameter', e.target.value)}
                placeholder="Enter pipe diameter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fluidDensity">Fluid Density (lb/ft³)</Label>
              <Input
                id="fluidDensity"
                type="number"
                value={inputs.fluidDensity}
                onChange={(e) => handleInputChange('fluidDensity', e.target.value)}
                placeholder="Enter fluid density"
              />
            </div>

            {inputs.fluidType === 'gas' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gasGravity">Gas Specific Gravity</Label>
                  <Input
                    id="gasGravity"
                    type="number"
                    value={inputs.gasGravity}
                    onChange={(e) => handleInputChange('gasGravity', e.target.value)}
                    placeholder="Enter gas gravity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°F)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={inputs.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    placeholder="Enter temperature"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          <Button 
            onClick={handleCalculate} 
            disabled={isCalculating || !inputs.flowRate || !inputs.pipeDiameter || !inputs.fluidDensity}
            className="w-full"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Velocity Analysis'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">Actual Velocity</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {results.actualVelocity.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-700">ft/s</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-orange-600 font-medium">Erosional Velocity</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {results.erosionalVelocity.toFixed(2)}
                    </p>
                    <p className="text-xs text-orange-700">ft/s</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-purple-600 font-medium">Velocity Ratio</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {results.velocityRatio.toFixed(3)}
                    </p>
                    <Badge 
                      variant={results.safetyStatus === 'safe' ? 'default' : 
                               results.safetyStatus === 'warning' ? 'secondary' : 'destructive'}
                      className="mt-1"
                    >
                      {results.safetyStatus.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {inputs.fluidType === 'gas' && (
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-green-600 font-medium">Sonic Velocity</p>
                    <p className="text-2xl font-bold text-green-900">
                      {results.sonicVelocity.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-700">ft/s</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert className={
              results.safetyStatus === 'safe' ? 'border-green-200 bg-green-50' :
              results.safetyStatus === 'warning' ? 'border-orange-200 bg-orange-50' :
              'border-red-200 bg-red-50'
            }>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {results.recommendation}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">API RP 14E Guidelines</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Erosional Factor: C = {results.erosionalFactor} (API RP 14E standard)</li>
                <li>• Velocity Ratio &lt; 0.5: Safe operation</li>
                <li>• Velocity Ratio 0.5-0.8: Caution, monitor erosion</li>
                <li>• Velocity Ratio &gt; 0.8: Exceeds recommended limits</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}