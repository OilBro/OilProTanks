import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, Calculator, AlertTriangle } from "lucide-react";

interface SettlementPoint {
  point: number;
  angle: number; // degrees
  elevation: number; // inches
  distance: number; // feet from reference
}

interface SettlementData {
  referenceElevation: number;
  points: SettlementPoint[];
  maxDifferentialSettlement: number;
  analysisMethod: 'circumferential' | 'differential';
  notes: string;
}

interface SettlementDataEntryProps {
  data: SettlementData;
  onDataChange: (data: SettlementData) => void;
}

export function SettlementDataEntry({ data, onDataChange }: SettlementDataEntryProps) {
  const [newPoint, setNewPoint] = useState({ angle: '', elevation: '', distance: '' });

  const addSettlementPoint = () => {
    if (!newPoint.angle || !newPoint.elevation) return;

    const point: SettlementPoint = {
      point: data.points.length + 1,
      angle: parseFloat(newPoint.angle),
      elevation: parseFloat(newPoint.elevation),
      distance: parseFloat(newPoint.distance) || 0
    };

    const updatedPoints = [...data.points, point];
    const maxDiff = calculateMaxDifferentialSettlement(updatedPoints);
    
    onDataChange({
      ...data,
      points: updatedPoints,
      maxDifferentialSettlement: maxDiff
    });

    setNewPoint({ angle: '', elevation: '', distance: '' });
  };

  const calculateMaxDifferentialSettlement = (points: SettlementPoint[]) => {
    if (points.length < 2) return 0;
    const elevations = points.map(p => p.elevation);
    return Math.max(...elevations) - Math.min(...elevations);
  };

  const removePoint = (index: number) => {
    const updatedPoints = data.points.filter((_, i) => i !== index);
    const maxDiff = calculateMaxDifferentialSettlement(updatedPoints);
    
    onDataChange({
      ...data,
      points: updatedPoints,
      maxDifferentialSettlement: maxDiff
    });
  };

  // Ensure we have data that wraps around (0° = 360°)
  let chartData = data.points.map(point => ({
    angle: point.angle,
    elevation: point.elevation,
    point: point.point
  }));
  
  // Add 360° point if we have a 0° point
  const zeroPoint = chartData.find(p => p.angle === 0);
  const has360Point = chartData.some(p => p.angle === 360);
  if (zeroPoint && !has360Point) {
    chartData.push({
      angle: 360,
      elevation: zeroPoint.elevation,
      point: zeroPoint.point
    });
  }
  
  // Sort by angle for proper line drawing
  chartData.sort((a, b) => a.angle - b.angle);

  const isExcessiveSettlement = data.maxDifferentialSettlement > 12; // API 653 typical limit

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Tank Settlement Survey
        </CardTitle>
        <p className="text-sm text-gray-600">
          Record settlement measurements around tank circumference per API 653 requirements
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reference Elevation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="referenceElevation">Reference Elevation (in)</Label>
            <Input
              type="number"
              step="0.001"
              value={data.referenceElevation}
              onChange={(e) => onDataChange({ ...data, referenceElevation: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="analysisMethod">Analysis Method</Label>
            <select 
              className="w-full p-2 border rounded"
              value={data.analysisMethod}
              onChange={(e) => onDataChange({ ...data, analysisMethod: e.target.value as any })}
            >
              <option value="circumferential">Circumferential Survey</option>
              <option value="differential">Differential Settlement</option>
            </select>
          </div>
        </div>

        {/* Add New Settlement Point */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">Add Settlement Point</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="angle">Angle (degrees)</Label>
              <Input
                type="number"
                placeholder="0-360"
                value={newPoint.angle}
                onChange={(e) => setNewPoint(prev => ({ ...prev, angle: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="elevation">Elevation (in)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="Measured elevation"
                value={newPoint.elevation}
                onChange={(e) => setNewPoint(prev => ({ ...prev, elevation: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="distance">Distance from Center (ft)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Optional"
                value={newPoint.distance}
                onChange={(e) => setNewPoint(prev => ({ ...prev, distance: e.target.value }))}
              />
            </div>
          </div>
          <Button type="button" onClick={addSettlementPoint} className="mt-4">
            Add Point
          </Button>
        </div>

        {/* Settlement Points Table */}
        {data.points.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Settlement Points ({data.points.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left border-b">Point</th>
                    <th className="p-2 text-left border-b">Angle (°)</th>
                    <th className="p-2 text-left border-b">Elevation (in)</th>
                    <th className="p-2 text-left border-b">Diff from Ref (in)</th>
                    <th className="p-2 text-left border-b">Distance (ft)</th>
                    <th className="p-2 text-left border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((point, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{point.point}</td>
                      <td className="p-2">{point.angle}°</td>
                      <td className="p-2">{point.elevation.toFixed(3)}"</td>
                      <td className="p-2">
                        {(point.elevation - data.referenceElevation).toFixed(3)}"
                      </td>
                      <td className="p-2">{point.distance || '-'}</td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePoint(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settlement Analysis */}
        {data.points.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded p-4">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Settlement Analysis
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Differential Settlement:</span>
                  <span className={`font-bold ${isExcessiveSettlement ? 'text-red-600' : 'text-green-600'}`}>
                    {data.maxDifferentialSettlement.toFixed(3)}"
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Number of Points:</span>
                  <span>{data.points.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Angular Coverage:</span>
                  <span>{Math.max(...data.points.map(p => p.angle)) - Math.min(...data.points.map(p => p.angle))}°</span>
                </div>
              </div>
            </div>

            {isExcessiveSettlement && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-red-800">Excessive Settlement Detected</h5>
                    <p className="text-sm text-red-700 mt-1">
                      Differential settlement exceeds typical API 653 limits. 
                      Consider detailed structural analysis and potential remediation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settlement Chart */}
        {chartData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Settlement Profile</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="angle" 
                    label={{ value: 'Angle (degrees)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Elevation (in)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) + '"' : value, 
                      'Elevation'
                    ]}
                    labelFormatter={(label) => `Angle: ${label}°`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">API 653 Settlement Guidelines</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Take measurements at minimum 8 points around circumference</p>
            <p>• Document differential settlement greater than 12 inches as requiring evaluation</p>
            <p>• Consider tank diameter and operating conditions in assessment</p>
            <p>• Reference API 653 Appendix B for detailed settlement evaluation criteria</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Settlement Survey Notes</Label>
          <textarea
            id="notes"
            className="w-full p-2 border rounded mt-1"
            rows={3}
            placeholder="Enter notes about settlement conditions, measurement methods, or observations..."
            value={data.notes}
            onChange={(e) => onDataChange({ ...data, notes: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}