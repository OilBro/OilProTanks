import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Container, Calculator, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TankCapacityResults {
  totalVolume: number;
  workingVolume: number;
  deadVolume: number;
  capacityTable: Array<{
    height: number;
    volume: number;
    percentage: number;
  }>;
  surfaceArea: number;
  configuration: string;
}

export function TankCapacityCalculator() {
  const [inputs, setInputs] = useState({
    tankType: 'vertical-cylindrical',
    diameter: '',
    height: '',
    bottomType: 'flat',
    roofType: 'cone',
    shellThickness: '',
    bottomSlope: '0',
    deadHeight: '1'
  });

  const [results, setResults] = useState<TankCapacityResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    const diameter = parseFloat(inputs.diameter);
    const height = parseFloat(inputs.height);
    const deadHeight = parseFloat(inputs.deadHeight);
    
    // Calculate basic tank geometry
    const radius = diameter / 2;
    const area = Math.PI * Math.pow(radius, 2);
    
    // Total volume calculation
    let totalVolume = area * height;
    
    // Adjust for bottom type
    if (inputs.bottomType === 'dished') {
      const dishVolume = (Math.PI * Math.pow(radius, 2) * radius) / 3;
      totalVolume += dishVolume;
    }
    
    // Adjust for roof type
    if (inputs.roofType === 'cone') {
      const coneHeight = radius * 0.1; // Typical cone ratio
      const coneVolume = (Math.PI * Math.pow(radius, 2) * coneHeight) / 3;
      totalVolume -= coneVolume;
    }
    
    // Convert to barrels (42 gallons per barrel, 7.48 gallons per cubic foot)
    const totalVolumeBarrels = (totalVolume * 7.48) / 42;
    const deadVolumeBarrels = (area * deadHeight * 7.48) / 42;
    const workingVolumeBarrels = totalVolumeBarrels - deadVolumeBarrels;
    
    // Generate capacity table
    const capacityTable = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const currentHeight = (height * i) / steps;
      let currentVolume = area * currentHeight;
      
      if (inputs.bottomType === 'dished' && currentHeight > 0) {
        const dishContribution = Math.min(currentHeight, radius) * area * 0.1;
        currentVolume += dishContribution;
      }
      
      const volumeBarrels = (currentVolume * 7.48) / 42;
      const percentage = (volumeBarrels / totalVolumeBarrels) * 100;
      
      capacityTable.push({
        height: currentHeight,
        volume: volumeBarrels,
        percentage
      });
    }

    setResults({
      totalVolume: totalVolumeBarrels,
      workingVolume: workingVolumeBarrels,
      deadVolume: deadVolumeBarrels,
      capacityTable,
      surfaceArea: area,
      configuration: `${diameter}' × ${height}' ${inputs.tankType.replace('-', ' ')}`
    });

    setIsCalculating(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const exportCapacityTable = () => {
    if (!results) return;
    
    const csvContent = [
      ['Height (ft)', 'Volume (bbl)', 'Percentage (%)'],
      ...results.capacityTable.map(row => [
        row.height.toFixed(2),
        row.volume.toFixed(0),
        row.percentage.toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `tank-capacity-table-${inputs.diameter}x${inputs.height}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Container className="h-5 w-5" />
            <span>Tank Configuration</span>
          </CardTitle>
          <CardDescription>
            Enter tank dimensions and configuration for capacity calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tankType">Tank Type</Label>
              <Select 
                value={inputs.tankType} 
                onValueChange={(value) => handleInputChange('tankType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tank type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical-cylindrical">Vertical Cylindrical</SelectItem>
                  <SelectItem value="horizontal-cylindrical">Horizontal Cylindrical</SelectItem>
                  <SelectItem value="spherical">Spherical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diameter">Diameter (feet)</Label>
              <Input
                id="diameter"
                type="number"
                value={inputs.diameter}
                onChange={(e) => handleInputChange('diameter', e.target.value)}
                placeholder="Enter tank diameter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (feet)</Label>
              <Input
                id="height"
                type="number"
                value={inputs.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="Enter tank height"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bottomType">Bottom Type</Label>
              <Select 
                value={inputs.bottomType} 
                onValueChange={(value) => handleInputChange('bottomType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bottom type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Bottom</SelectItem>
                  <SelectItem value="dished">Dished Bottom</SelectItem>
                  <SelectItem value="sloped">Sloped Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roofType">Roof Type</Label>
              <Select 
                value={inputs.roofType} 
                onValueChange={(value) => handleInputChange('roofType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roof type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cone">Cone Roof</SelectItem>
                  <SelectItem value="dome">Dome Roof</SelectItem>
                  <SelectItem value="floating">Floating Roof</SelectItem>
                  <SelectItem value="fixed">Fixed Roof</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadHeight">Dead Volume Height (feet)</Label>
              <Input
                id="deadHeight"
                type="number"
                value={inputs.deadHeight}
                onChange={(e) => handleInputChange('deadHeight', e.target.value)}
                placeholder="Enter dead volume height"
              />
            </div>
          </div>

          <Separator />

          <Button 
            onClick={handleCalculate} 
            disabled={isCalculating || !inputs.diameter || !inputs.height}
            className="w-full"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Tank Capacity'}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {/* Summary Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Capacity Summary</span>
                </span>
                <Badge variant="outline">{results.configuration}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 font-medium">Total Volume</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {results.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-blue-700">barrels</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-green-600 font-medium">Working Volume</p>
                      <p className="text-2xl font-bold text-green-900">
                        {results.workingVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-green-700">barrels</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-orange-600 font-medium">Dead Volume</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {results.deadVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-orange-700">barrels</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Surface Area:</span> {results.surfaceArea.toFixed(0)} ft²
                  </div>
                  <div>
                    <span className="font-medium">Efficiency:</span> {((results.workingVolume / results.totalVolume) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tank Capacity Table</span>
                <Button onClick={exportCapacityTable} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardTitle>
              <CardDescription>
                Volume calculations at various liquid levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Height (ft)</TableHead>
                      <TableHead>Volume (bbl)</TableHead>
                      <TableHead>Percentage (%)</TableHead>
                      <TableHead>Gallons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.capacityTable.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{row.height.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">{row.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="font-mono">{row.percentage.toFixed(1)}%</TableCell>
                        <TableCell className="font-mono">{(row.volume * 42).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}