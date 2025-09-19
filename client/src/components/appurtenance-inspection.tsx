import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Camera } from "lucide-react";
import type { AppurtenanceInspection } from "@shared/schema";

interface AppurtenanceInspectionProps {
  inspections: AppurtenanceInspection[];
  onInspectionsChange: (inspections: AppurtenanceInspection[]) => void;
}

const APPURTENANCE_TYPES = [
  { value: "nozzle", label: "Nozzle" },
  { value: "manway", label: "Manway" },
  { value: "vent", label: "Vent" },
  { value: "ladder", label: "Ladder" },
  { value: "platform", label: "Platform" },
  { value: "gauge", label: "Gauge" },
  { value: "valve", label: "Valve" }
];

const CONDITIONS = [
  { value: "good", label: "Good", color: "green" },
  { value: "fair", label: "Fair", color: "yellow" },
  { value: "poor", label: "Poor", color: "orange" },
  { value: "defective", label: "Defective", color: "red" }
];

const PRIORITIES = [
  { value: "routine", label: "Routine" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

export function AppurtenanceInspection({ inspections, onInspectionsChange }: AppurtenanceInspectionProps) {
  const [newInspection, setNewInspection] = useState({
    appurtenanceType: "",
    appurtenanceId: "",
    location: "",
    condition: "",
    findings: "",
    recommendations: "",
    priority: "routine"
  });

  const addInspection = () => {
    if (!newInspection.appurtenanceType || !newInspection.appurtenanceId || !newInspection.location) return;

    const inspection: AppurtenanceInspection = {
      id: Date.now(),
      reportId: 0,
      appurtenanceType: newInspection.appurtenanceType,
      appurtenanceId: newInspection.appurtenanceId,
      location: newInspection.location,
      condition: newInspection.condition,
      findings: newInspection.findings || null,
      recommendations: newInspection.recommendations || null,
      priority: newInspection.priority,
      photosAttached: false,
      createdAt: new Date().toISOString()
    };

    onInspectionsChange([...inspections, inspection]);
    setNewInspection({
      appurtenanceType: "",
      appurtenanceId: "",
      location: "",
      condition: "",
      findings: "",
      recommendations: "",
      priority: "routine"
    });
  };

  const removeInspection = (id: number) => {
    onInspectionsChange(inspections.filter(inspection => inspection.id !== id));
  };

  const getConditionColor = (condition: string | null) => {
    const conditionObj = CONDITIONS.find(c => c.value === condition);
    return conditionObj?.color || "gray";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appurtenance Inspection</CardTitle>
        <p className="text-sm text-gray-600">
          Detailed inspection of individual tank appurtenances and accessories
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Inspection */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add Appurtenance Inspection</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="appurtenanceType">Type</Label>
              <Select value={newInspection.appurtenanceType} onValueChange={(value) => 
                setNewInspection(prev => ({ ...prev, appurtenanceType: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {APPURTENANCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="appurtenanceId">ID/Tag</Label>
              <Input
                placeholder="N-1, MW-2, etc."
                value={newInspection.appurtenanceId}
                onChange={(e) => setNewInspection(prev => ({ ...prev, appurtenanceId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                placeholder="Shell side, roof center"
                value={newInspection.location}
                onChange={(e) => setNewInspection(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={newInspection.condition} onValueChange={(value) => 
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
              <Label htmlFor="priority">Priority</Label>
              <Select value={newInspection.priority} onValueChange={(value) => 
                setNewInspection(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                placeholder="Detailed observations..."
                value={newInspection.findings}
                onChange={(e) => setNewInspection(prev => ({ ...prev, findings: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                placeholder="Repair or maintenance recommendations..."
                value={newInspection.recommendations}
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
            {inspections.map((inspection) => (
              <div key={inspection.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {APPURTENANCE_TYPES.find(t => t.value === inspection.appurtenanceType)?.label}
                    </Badge>
                    <span className="font-medium">{inspection.appurtenanceId}</span>
                    <span className="text-gray-600">• {inspection.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getConditionColor(inspection.condition) === "green" ? "default" : "destructive"}
                      className={`bg-${getConditionColor(inspection.condition)}-100 text-${getConditionColor(inspection.condition)}-800`}
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

                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <Badge variant="outline" className="text-xs">
                    Priority: {inspection.priority}
                  </Badge>
                  <Button type="button" variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-2" />
                    Attach Photos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}