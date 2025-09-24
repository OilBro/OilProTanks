import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Wind, AlertTriangle } from "lucide-react";
import type { VentingSystemInspection } from "@shared/schema";

interface VentingSystemInspectionProps {
  inspections: VentingSystemInspection[];
  onInspectionsChange: (inspections: VentingSystemInspection[]) => void;
}

const VENT_TYPES = [
  { value: "pressure_relief", label: "Pressure Relief Valve", icon: "🔧" },
  { value: "vacuum_relief", label: "Vacuum Relief Valve", icon: "🔄" },
  { value: "conservation", label: "Conservation Vent", icon: "💨" },
  { value: "emergency", label: "Emergency Vent", icon: "🚨" }
];

const CONDITIONS = [
  { value: "good", label: "Good", color: "green" },
  { value: "fair", label: "Fair", color: "yellow" },
  { value: "poor", label: "Poor", color: "orange" },
  { value: "failed", label: "Failed", color: "red" }
];

export function VentingSystemInspection({ inspections, onInspectionsChange }: VentingSystemInspectionProps) {
  const [newInspection, setNewInspection] = useState({
    ventType: "",
    ventId: "",
    setpoint: "",
    condition: "",
    testResults: "",
    findings: "",
    recommendations: ""
  });

  const addInspection = () => {
    if (!newInspection.ventType || !newInspection.ventId || !newInspection.condition) return;

    const inspection: VentingSystemInspection = {
      id: Date.now(),
      reportId: 0,
      ventType: newInspection.ventType,
      ventId: newInspection.ventId,
      setpoint: newInspection.setpoint || null,
      condition: newInspection.condition,
      testResults: newInspection.testResults || null,
      findings: newInspection.findings || null,
      recommendations: newInspection.recommendations || null,
      createdAt: new Date().toISOString()
    };

    onInspectionsChange([...inspections, inspection]);
    setNewInspection({
      ventType: "",
      ventId: "",
      setpoint: "",
      condition: "",
      testResults: "",
      findings: "",
      recommendations: ""
    });
  };

  const removeInspection = (id: number) => {
    onInspectionsChange(inspections.filter(inspection => inspection.id !== id));
  };

  const getConditionColor = (condition?: string | null) => {
    const conditionObj = CONDITIONS.find(c => c.value === condition);
    return conditionObj?.color || "gray";
  };

  const getFailedCount = () => inspections.filter(i => i.condition === "failed" || i.condition === "poor").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5" />
            <span>Venting System Inspection</span>
          </div>
          {getFailedCount() > 0 && (
            <Badge variant="destructive" className="bg-red-100 text-red-800 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {getFailedCount()} Issues Found
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Critical safety system inspection for pressure and vacuum relief devices
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Inspection */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add Venting System Inspection</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ventType">Vent Type</Label>
              <Select value={newInspection.ventType || ''} onValueChange={(value) =>
                setNewInspection(prev => ({ ...prev, ventType: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vent Type" />
                </SelectTrigger>
                <SelectContent>
                  {VENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ventId">Vent ID</Label>
              <Input
                placeholder="PRV-1, VRV-2, CV-1"
                value={newInspection.ventId || ''}
                onChange={(e) => setNewInspection(prev => ({ ...prev, ventId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="setpoint">Set Point</Label>
              <Input
                placeholder="2.5 psig, -1.0 psig"
                value={newInspection.setpoint || ''}
                onChange={(e) => setNewInspection(prev => ({ ...prev, setpoint: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="condition">Overall Condition</Label>
              <Select value={newInspection.condition || ''} onValueChange={(value) =>
                setNewInspection(prev => ({ ...prev, condition: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(condition => (
                    <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="testResults">Test Results</Label>
              <Input
                placeholder="Passed, Failed, Not Tested"
                value={newInspection.testResults || ''}
                onChange={(e) => setNewInspection(prev => ({ ...prev, testResults: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="findings">Inspection Findings</Label>
              <Textarea
                placeholder="Detailed observations and test results..."
                value={newInspection.findings || ''}
                onChange={(e) => setNewInspection(prev => ({ ...prev, findings: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                placeholder="Repair, replacement, or maintenance recommendations..."
                value={newInspection.recommendations || ''}
                onChange={(e) => setNewInspection(prev => ({ ...prev, recommendations: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <Button type="button" onClick={addInspection} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Inspection
          </Button>
        </div>

        {/* Existing Inspections */}
        {inspections.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Recorded Inspections ({inspections.length})</h4>
            {inspections.map((inspection) => {
              const ventType = VENT_TYPES.find(t => t.value === inspection.ventType);
              const conditionColor = getConditionColor(inspection.condition);
              
              return (
                <div key={inspection.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ventType?.icon}</span>
                      <Badge variant="outline" className="font-medium">
                        {inspection.ventId}
                      </Badge>
                      <span className="text-sm text-gray-600">{ventType?.label}</span>
                      {inspection.setpoint && (
                        <Badge variant="outline" className="text-xs">
                          {inspection.setpoint}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={conditionColor === "green" ? "default" : "destructive"}
                        className={`bg-${conditionColor}-100 text-${conditionColor}-800`}
                      >
                        {CONDITIONS.find(c => c.value === inspection.condition)?.label}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInspection(inspection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {inspection.testResults && (
                    <div className="mb-3">
                      <Badge 
                        variant={inspection.testResults.toLowerCase().includes("passed") ? "default" : "destructive"}
                        className="text-xs"
                      >
                        Test: {inspection.testResults}
                      </Badge>
                    </div>
                  )}

                  {(inspection.findings || inspection.recommendations) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {inspection.findings && (
                        <div>
                          <span className="font-medium text-gray-700">Findings:</span>
                          <p className="text-gray-600 mt-1">{inspection.findings}</p>
                        </div>
                      )}
                      {inspection.recommendations && (
                        <div>
                          <span className="font-medium text-gray-700">Recommendations:</span>
                          <p className="text-gray-600 mt-1">{inspection.recommendations}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-400">
                      Inspected: {inspection.createdAt ? new Date(inspection.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Safety Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-amber-800">Safety Critical System</h5>
              <p className="text-sm text-amber-700 mt-1">
                Venting systems are critical for tank safety. Any failed or poor condition vents must be 
                addressed immediately before returning the tank to service. Refer to API 650/653 
                requirements for proper sizing and testing procedures.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}