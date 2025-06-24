import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, AlertCircle, TrendingUp, Plus } from "lucide-react";

interface SurveyPoint {
  point: number;
  circumferentialDistance: number; // feet
  elevation: number; // feet
  predictedElevation?: number;
  settlement?: number;
}

interface SettlementSurveyData {
  tankDiameter: number; // feet
  numberOfPoints: number;
  roofType: 'O' | 'F'; // Open or Fixed
  modulus: number; // MOE (default 29,000,000)
  elevationSet: 'single' | 'double';
  points: SurveyPoint[];
  rSquared?: number;
  settlementArcLength?: number;
  maxSettlement?: number;
  calculationMethod: 'cosine' | 'manual';
  notes: string;
}

interface SettlementSurveyProps {
  data: SettlementSurveyData;
  onDataChange: (data: SettlementSurveyData) => void;
}

export function SettlementSurvey({ data, onDataChange }: SettlementSurveyProps) {
  const [showGraph, setShowGraph] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);

  // Calculate survey points based on tank diameter
  const calculateSurveyPoints = (diameter: number, numPoints: number) => {
    const circumference = diameter * Math.PI;
    const spacing = circumference / numPoints;
    
    const points: SurveyPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      points.push({
        point: i + 1,
        circumferentialDistance: i * spacing,
        elevation: 0
      });
    }
    return points;
  };

  // Cosine curve fitting for settlement analysis
  const performCosineAnalysis = () => {
    if (data.points.length < 4 || data.points.some(p => p.elevation === 0)) return;

    const points = data.points;
    const n = points.length;
    
    // Calculate average elevation
    const avgElevation = points.reduce((sum, p) => sum + p.elevation, 0) / n;
    
    // Fit cosine curve: y = A*cos(B*x + C) + D
    // Simplified approximation for demonstration
    const amplitude = Math.max(...points.map(p => p.elevation)) - Math.min(...points.map(p => p.elevation));
    const frequency = (2 * Math.PI) / (data.tankDiameter * Math.PI);
    
    // Calculate predicted elevations and R²
    let sumSquaredResiduals = 0;
    let sumSquaredTotal = 0;
    
    const updatedPoints = points.map(point => {
      const predicted = avgElevation + (amplitude / 2) * Math.cos(frequency * point.circumferentialDistance);
      const residual = point.elevation - predicted;
      const totalVariation = point.elevation - avgElevation;
      
      sumSquaredResiduals += residual * residual;
      sumSquaredTotal += totalVariation * totalVariation;
      
      return {
        ...point,
        predictedElevation: predicted,
        settlement: point.elevation - predicted
      };
    });
    
    const rSquared = 1 - (sumSquaredResiduals / sumSquaredTotal);
    
    // Calculate settlement characteristics
    const settlements = updatedPoints.map(p => Math.abs(p.settlement || 0));
    const maxSettlement = Math.max(...settlements);
    
    onDataChange({
      ...data,
      points: updatedPoints,
      rSquared,
      maxSettlement,
      calculationMethod: rSquared >= 0.9 ? 'cosine' : 'manual'
    });
  };

  // Manual settlement analysis per API 653 B.2.2.5
  const performManualAnalysis = () => {
    if (selectedPoints.length < 2) return;
    
    // Calculate arc length between selected points
    const selectedElevations = selectedPoints.map(i => data.points[i - 1].elevation);
    const maxElev = Math.max(...selectedElevations);
    const minElev = Math.min(...selectedElevations);
    
    const arcLength = selectedPoints.length * (data.tankDiameter * Math.PI / data.numberOfPoints);
    
    onDataChange({
      ...data,
      settlementArcLength: arcLength,
      maxSettlement: maxElev - minElev,
      calculationMethod: 'manual'
    });
  };

  const updatePoint = (index: number, elevation: number) => {
    const newPoints = [...data.points];
    newPoints[index] = { ...newPoints[index], elevation };
    onDataChange({ ...data, points: newPoints });
  };

  const addSurveyPoint = () => {
    const circumference = data.tankDiameter * Math.PI;
    const spacing = circumference / (data.numberOfPoints + 1);
    
    const newPoint: SurveyPoint = {
      point: data.numberOfPoints + 1,
      circumferentialDistance: data.numberOfPoints * spacing,
      elevation: 0
    };
    
    onDataChange({
      ...data,
      numberOfPoints: data.numberOfPoints + 1,
      points: [...data.points, newPoint]
    });
  };

  const resetPoints = () => {
    const newPoints = calculateSurveyPoints(data.tankDiameter, data.numberOfPoints);
    onDataChange({ ...data, points: newPoints });
  };

  useEffect(() => {
    // Recalculate points when tank diameter or number of points changes
    if (data.points.length !== data.numberOfPoints) {
      const newPoints = calculateSurveyPoints(data.tankDiameter, data.numberOfPoints);
      onDataChange({ ...data, points: newPoints });
    }
  }, [data.tankDiameter, data.numberOfPoints]);

  const chartData = data.points.map(point => ({
    point: point.point,
    distance: point.circumferentialDistance.toFixed(1),
    actual: point.elevation,
    predicted: point.predictedElevation || point.elevation,
    settlement: Math.abs(point.settlement || 0)
  }));

  const isCalculationValid = data.rSquared && data.rSquared >= 0.9;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Shell Settlement Survey Calculations
        </CardTitle>
        <p className="text-sm text-gray-600">
          Settlement analysis per API 653 Appendix B requirements
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Survey Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="tankDiameter">Tank Diameter (ft)</Label>
            <Input
              type="number"
              value={data.tankDiameter}
              onChange={(e) => {
                const diameter = parseFloat(e.target.value) || 0;
                const recommendedPoints = Math.ceil(diameter / 10);
                onDataChange({ 
                  ...data, 
                  tankDiameter: diameter,
                  numberOfPoints: recommendedPoints > data.numberOfPoints ? recommendedPoints : data.numberOfPoints
                });
              }}
            />
          </div>
          <div>
            <Label htmlFor="numberOfPoints">Number of Points</Label>
            <Input
              type="number"
              value={data.numberOfPoints}
              onChange={(e) => onDataChange({ ...data, numberOfPoints: parseInt(e.target.value) || 10 })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: {Math.ceil(data.tankDiameter / 10)} (max spacing 31.42 ft)
            </p>
          </div>
          <div>
            <Label htmlFor="roofType">Roof Type</Label>
            <Select value={data.roofType} onValueChange={(value: 'O' | 'F') => onDataChange({ ...data, roofType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="O">O - Open Top Tank</SelectItem>
                <SelectItem value="F">F - Fixed Roof Tank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="modulus">MOE (psi)</Label>
            <Input
              type="number"
              value={data.modulus}
              onChange={(e) => onDataChange({ ...data, modulus: parseFloat(e.target.value) || 29000000 })}
            />
          </div>
        </div>

        {/* Survey Points Data Entry */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Elevation Data Entry</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addSurveyPoint}>
                <Plus className="w-4 h-4 mr-2" />
                Add Point
              </Button>
              <Button variant="outline" size="sm" onClick={resetPoints}>
                Reset Points
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.points.map((point, index) => (
              <div key={point.point} className="space-y-2">
                <Label htmlFor={`point-${point.point}`}>
                  Point {point.point}
                  <br />
                  <span className="text-xs text-gray-500">
                    @ {point.circumferentialDistance.toFixed(1)} ft
                  </span>
                </Label>
                <Input
                  id={`point-${point.point}`}
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={point.elevation || ''}
                  onChange={(e) => updatePoint(index, parseFloat(e.target.value) || 0)}
                />
                {data.calculationMethod === 'manual' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPoints.includes(point.point)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPoints([...selectedPoints, point.point]);
                        } else {
                          setSelectedPoints(selectedPoints.filter(p => p !== point.point));
                        }
                      }}
                      className="mr-1"
                    />
                    <span className="text-xs">Select for manual analysis</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Elevation Set Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="elevationSet">Elevation Set</Label>
            <Select value={data.elevationSet} onValueChange={(value: 'single' | 'double') => onDataChange({ ...data, elevationSet: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Set</SelectItem>
                <SelectItem value="double">Double Set (for refinement)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calculation Controls */}
        <div className="flex gap-4">
          <Button onClick={performCosineAnalysis}>
            Calculate Cosine Fit
          </Button>
          <Button variant="outline" onClick={performManualAnalysis}>
            Manual Analysis (B.2.2.5)
          </Button>
          <Button variant="outline" onClick={() => setShowGraph(!showGraph)}>
            {showGraph ? 'Hide' : 'Display'} Graph
          </Button>
        </div>

        {/* Results Display */}
        {data.rSquared !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">R² Correlation:</span>
              <div className={`text-lg font-bold ${isCalculationValid ? 'text-green-600' : 'text-red-600'}`}>
                {data.rSquared.toFixed(3)}
              </div>
              {!isCalculationValid && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Below 0.90 minimum</span>
                </div>
              )}
            </div>
            <div>
              <span className="font-medium">Max Settlement:</span>
              <div className="text-lg font-bold">
                {data.maxSettlement ? data.maxSettlement.toFixed(3) : '-'}"
              </div>
            </div>
            <div>
              <span className="font-medium">Calculation Method:</span>
              <div className="text-lg font-bold capitalize">
                {data.calculationMethod}
              </div>
            </div>
          </div>
        )}

        {/* Settlement Analysis Warning */}
        {data.rSquared && data.rSquared < 0.9 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-yellow-800">Manual Analysis Required</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  R² ratio is below 0.90 minimum. Use manual analysis per API 653 B.2.2.5:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
                  <li>Select points indicating significant change in settlement direction</li>
                  <li>Calculate arc length between high points</li>
                  <li>Determine maximum settlement magnitude</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Settlement Chart */}
        {showGraph && chartData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Settlement Survey Chart</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="point" 
                    label={{ value: 'Survey Point', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Elevation (ft)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : value, 
                      name === 'actual' ? 'Actual Elevation' : 
                      name === 'predicted' ? 'Predicted Elevation' : 'Settlement'
                    ]}
                    labelFormatter={(label) => `Point ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    name="actual"
                    dot={{ fill: '#2563eb', r: 4 }}
                  />
                  {data.rSquared && (
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="predicted"
                      dot={{ fill: '#dc2626', r: 3 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">Survey Guidelines</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Find center of highest point around tank and make it Point #1 for best fit</p>
            <p>• Use even number of points (recommended: diameter ÷ 10)</p>
            <p>• Maximum distance between survey points: 31.42 ft</p>
            <p>• Take additional points if needed for refinement (use Double Set)</p>
            <p>• Elevation measurements must be in feet (convert from inches if needed)</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Survey Notes</Label>
          <Input
            id="notes"
            placeholder="Enter any additional notes about the settlement survey..."
            value={data.notes}
            onChange={(e) => onDataChange({ ...data, notes: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}