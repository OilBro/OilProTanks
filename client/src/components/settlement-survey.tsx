import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, TrendingUp } from 'lucide-react';

interface SettlementPoint {
  id: number;
  location: string; // e.g., "0°", "45°", "90°", etc.
  elevation: number; // Current elevation in inches
  originalElevation?: number; // Original elevation if known
  distance?: number; // Distance from reference point
  notes?: string;
}

interface SettlementSurveyData {
  referenceElevation: number;
  measurementDate: string;
  instrument: string;
  points: SettlementPoint[];
  maxDifferentialSettlement?: number;
  averageSettlement?: number;
  analysisNotes?: string;
}

interface SettlementSurveyProps {
  data: SettlementSurveyData;
  onDataChange: (data: SettlementSurveyData) => void;
}

export function SettlementSurvey({ data, onDataChange }: SettlementSurveyProps) {
  const [newPoint, setNewPoint] = useState<Partial<SettlementPoint>>({
    location: '',
    elevation: 0,
    originalElevation: 0,
    distance: 0,
    notes: ''
  });

  const addPoint = () => {
    if (!newPoint.location || newPoint.elevation === undefined) return;

    const point: SettlementPoint = {
      id: Date.now(),
      location: newPoint.location,
      elevation: newPoint.elevation,
      originalElevation: newPoint.originalElevation,
      distance: newPoint.distance,
      notes: newPoint.notes || ''
    };

    onDataChange({
      ...data,
      points: [...data.points, point]
    });

    setNewPoint({
      location: '',
      elevation: 0,
      originalElevation: 0
    });
  };

  const removePoint = (id: number) => {
    onDataChange({
      ...data,
      points: data.points.filter(p => p.id !== id)
    });
  };

  const calculateSettlementAnalysis = () => {
    if (data.points.length < 3) return;

    const settlements = data.points
      .filter(p => p.originalElevation !== undefined)
      .map(p => p.elevation - (p.originalElevation || 0));

    if (settlements.length === 0) return;

    const maxSettlement = Math.max(...settlements.map(Math.abs));
    const avgSettlement = settlements.reduce((sum, s) => sum + s, 0) / settlements.length;
    
    // Calculate differential settlement (max difference between adjacent points)
    const sortedPoints = [...data.points].sort((a, b) => {
      const getAngle = (loc: string) => {
        const match = loc.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getAngle(a.location) - getAngle(b.location);
    });

    let maxDifferential = 0;
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const current = sortedPoints[i];
      const next = sortedPoints[i + 1];
      if (current.originalElevation && next.originalElevation) {
        const currentSettlement = current.elevation - current.originalElevation;
        const nextSettlement = next.elevation - next.originalElevation;
        const differential = Math.abs(currentSettlement - nextSettlement);
        maxDifferential = Math.max(maxDifferential, differential);
      }
    }

    onDataChange({
      ...data,
      maxDifferentialSettlement: maxDifferential,
      averageSettlement: avgSettlement
    });
  };

  const getSettlementStatus = () => {
    if (!data.maxDifferentialSettlement) return 'unknown';
    
    // API 653 typical limits (these may vary based on tank design)
    if (data.maxDifferentialSettlement <= 0.5) return 'acceptable';
    if (data.maxDifferentialSettlement <= 1.0) return 'monitor';
    return 'action_required';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'acceptable': return 'bg-green-100 text-green-800';
      case 'monitor': return 'bg-yellow-100 text-yellow-800';
      case 'action_required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Settlement Survey Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Survey Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="referenceElevation">Reference Elevation (ft)</Label>
            <Input
              id="referenceElevation"
              type="number"
              step="0.001"
              value={data.referenceElevation}
              onChange={(e) => onDataChange({
                ...data,
                referenceElevation: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div>
            <Label htmlFor="measurementDate">Measurement Date</Label>
            <Input
              id="measurementDate"
              type="date"
              value={data.measurementDate}
              onChange={(e) => onDataChange({
                ...data,
                measurementDate: e.target.value
              })}
            />
          </div>
          <div>
            <Label htmlFor="instrument">Survey Instrument</Label>
            <Input
              id="instrument"
              placeholder="e.g., Leica DNA03"
              value={data.instrument}
              onChange={(e) => onDataChange({
                ...data,
                instrument: e.target.value
              })}
            />
          </div>
        </div>

        {/* Add New Settlement Point */}
        <div className="border rounded-lg p-4 mb-6 bg-slate-50">
          <h4 className="font-medium mb-3">Add Settlement Point</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <Label htmlFor="location">Location/Angle</Label>
              <Input
                id="location"
                placeholder="0°, N, E, etc."
                value={newPoint.location}
                onChange={(e) => setNewPoint(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="elevation">Current Elevation (ft)</Label>
              <Input
                id="elevation"
                type="number"
                step="0.001"
                value={newPoint.elevation}
                onChange={(e) => setNewPoint(prev => ({ ...prev, elevation: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="originalElevation">Original Elevation (ft)</Label>
              <Input
                id="originalElevation"
                type="number"
                step="0.001"
                value={newPoint.originalElevation}
                onChange={(e) => setNewPoint(prev => ({ ...prev, originalElevation: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="distance">Distance (ft)</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={newPoint.distance}
                onChange={(e) => setNewPoint(prev => ({ ...prev, distance: parseFloat(e.target.value) || undefined }))}
              />
            </div>
          </div>
          <div className="mb-3">
            <Label htmlFor="pointNotes">Notes</Label>
            <Input
              id="pointNotes"
              placeholder="Additional observations"
              value={newPoint.notes}
              onChange={(e) => setNewPoint(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <Button type="button" onClick={addPoint} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Point
          </Button>
        </div>

        {/* Settlement Points Table */}
        {data.points.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Settlement Points</h4>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={calculateSettlementAnalysis}
                className="flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calculate Analysis
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Current (ft)</th>
                    <th className="p-3 text-left">Original (ft)</th>
                    <th className="p-3 text-left">Settlement (in)</th>
                    <th className="p-3 text-left">Distance (ft)</th>
                    <th className="p-3 text-left">Notes</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((point) => {
                    const settlement = point.originalElevation 
                      ? (point.elevation - point.originalElevation) * 12 
                      : null;
                    
                    return (
                      <tr key={point.id} className="border-t">
                        <td className="p-3 font-mono">{point.location}</td>
                        <td className="p-3">{point.elevation.toFixed(3)}</td>
                        <td className="p-3">{point.originalElevation?.toFixed(3) || '-'}</td>
                        <td className="p-3">
                          {settlement !== null ? (
                            <span className={settlement > 0 ? 'text-red-600' : 'text-green-600'}>
                              {settlement > 0 ? '+' : ''}{settlement.toFixed(2)}"
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3">{point.distance || '-'}</td>
                        <td className="p-3">{point.notes || '-'}</td>
                        <td className="p-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePoint(point.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settlement Analysis Results */}
        {data.maxDifferentialSettlement !== undefined && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3">Settlement Analysis Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Maximum Differential Settlement</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono">
                    {(data.maxDifferentialSettlement * 12).toFixed(2)}"
                  </span>
                  <Badge className={getStatusColor(getSettlementStatus())}>
                    {getSettlementStatus().replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Average Settlement</Label>
                <div className="text-lg font-mono mt-1">
                  {data.averageSettlement ? (data.averageSettlement * 12).toFixed(2) : '0.00'}"
                </div>
              </div>
              <div>
                <Label>Total Points Measured</Label>
                <div className="text-lg font-mono mt-1">
                  {data.points.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Notes */}
        <div className="mt-4">
          <Label htmlFor="analysisNotes">Analysis Notes & Recommendations</Label>
          <textarea
            id="analysisNotes"
            className="w-full p-3 border rounded mt-1"
            rows={3}
            placeholder="Document analysis findings, API 653 compliance, and recommendations..."
            value={data.analysisNotes}
            onChange={(e) => onDataChange({
              ...data,
              analysisNotes: e.target.value
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}