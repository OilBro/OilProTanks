import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import type { DykeInspection } from "@shared/schema";

interface DykeInspectionProps {
  inspections: DykeInspection[];
  onInspectionsChange: (inspections: DykeInspection[]) => void;
}

const DYKE_TYPES = [
  { value: "primary", label: "Primary Containment" },
  { value: "secondary", label: "Secondary Containment" },
  { value: "ring_wall", label: "Ring Wall" }
];

const CONDITIONS = [
  { value: "excellent", label: "Excellent", color: "bg-green-100 text-green-800" },
  { value: "good", label: "Good", color: "bg-blue-100 text-blue-800" },
  { value: "fair", label: "Fair", color: "bg-yellow-100 text-yellow-800" },
  { value: "poor", label: "Poor", color: "bg-orange-100 text-orange-800" },
  { value: "failed", label: "Failed", color: "bg-red-100 text-red-800" }
];

const DRAINAGE_OPTIONS = [
  { value: "adequate", label: "Adequate" },
  { value: "inadequate", label: "Inadequate" },
  { value: "blocked", label: "Blocked" },
  { value: "none", label: "None" }
];

const MATERIALS = [
  { value: "concrete", label: "Concrete" },
  { value: "earth", label: "Earth" },
  { value: "steel", label: "Steel" },
  { value: "composite", label: "Composite" }
];

export function DykeInspection({ inspections, onInspectionsChange }: DykeInspectionProps) {
  const [newInspection, setNewInspection] = useState<Partial<DykeInspection>>({
    dykeType: "primary",
    location: "",
    condition: "good",
    material: "concrete",
    drainage: "adequate",
    cracking: false,
    settlement: false,
    erosion: false,
    vegetation: false,
    spillageEvidence: false,
    notes: ""
  });

  const addInspection = () => {
    if (!newInspection.location) return;

    const inspection: DykeInspection = {
      id: Date.now(),
      reportId: 0,
      dykeType: newInspection.dykeType || "primary",
      location: newInspection.location,
      condition: newInspection.condition || "good",
      height: newInspection.height || "",
      width: newInspection.width || "",
      material: newInspection.material || "concrete",
      drainage: newInspection.drainage || "adequate",
      cracking: newInspection.cracking || false,
      settlement: newInspection.settlement || false,
      erosion: newInspection.erosion || false,
      vegetation: newInspection.vegetation || false,
      spillageEvidence: newInspection.spillageEvidence || false,
      capacity: newInspection.capacity || "",
      notes: newInspection.notes || "",
      createdAt: new Date().toISOString()
    };

    onInspectionsChange([...inspections, inspection]);
    
    // Reset form
    setNewInspection({
      dykeType: "primary",
      location: "",
      condition: "good",
      material: "concrete",
      drainage: "adequate",
      cracking: false,
      settlement: false,
      erosion: false,
      vegetation: false,
      spillageEvidence: false,
      notes: ""
    });
  };

  const removeInspection = (id: number) => {
    onInspectionsChange(inspections.filter(inspection => inspection.id !== id));
  };

  const getConditionColor = (condition: string) => {
    const conditionObj = CONDITIONS.find(c => c.value === condition);
    return conditionObj?.color || "bg-gray-100 text-gray-800";
  };

  const getIssueCount = (inspection: DykeInspection) => {
    const issues = [
      inspection.cracking,
      inspection.settlement,
      inspection.erosion,
      inspection.vegetation,
      inspection.spillageEvidence,
      inspection.drainage !== "adequate"
    ];
    return issues.filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Dyke & Secondary Containment Inspection</h3>
        <Badge variant="outline">{inspections.length} Inspection{inspections.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Add New Inspection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Dyke Inspection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dyke-type">Dyke Type</Label>
              <Select 
                value={newInspection.dykeType} 
                onValueChange={(value) => setNewInspection({...newInspection, dykeType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DYKE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newInspection.location}
                onChange={(e) => setNewInspection({...newInspection, location: e.target.value})}
                placeholder="e.g., North Side, Section A"
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={newInspection.condition} 
                onValueChange={(value) => setNewInspection({...newInspection, condition: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(condition => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="height">Height (ft)</Label>
              <Input
                id="height"
                value={newInspection.height}
                onChange={(e) => setNewInspection({...newInspection, height: e.target.value})}
                placeholder="e.g., 4.5"
              />
            </div>

            <div>
              <Label htmlFor="width">Width (ft)</Label>
              <Input
                id="width"
                value={newInspection.width}
                onChange={(e) => setNewInspection({...newInspection, width: e.target.value})}
                placeholder="e.g., 3.0"
              />
            </div>

            <div>
              <Label htmlFor="material">Material</Label>
              <Select 
                value={newInspection.material} 
                onValueChange={(value) => setNewInspection({...newInspection, material: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map(material => (
                    <SelectItem key={material.value} value={material.value}>
                      {material.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="drainage">Drainage</Label>
              <Select 
                value={newInspection.drainage} 
                onValueChange={(value) => setNewInspection({...newInspection, drainage: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAINAGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Issues Observed</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {[
                { key: 'cracking', label: 'Cracking' },
                { key: 'settlement', label: 'Settlement' },
                { key: 'erosion', label: 'Erosion' },
                { key: 'vegetation', label: 'Vegetation Growth' },
                { key: 'spillageEvidence', label: 'Spillage Evidence' }
              ].map(issue => (
                <div key={issue.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={issue.key}
                    checked={newInspection[issue.key as keyof typeof newInspection] as boolean}
                    onCheckedChange={(checked) => 
                      setNewInspection({...newInspection, [issue.key]: checked})
                    }
                  />
                  <Label htmlFor={issue.key} className="text-sm">{issue.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity (gallons)</Label>
              <Input
                id="capacity"
                value={newInspection.capacity}
                onChange={(e) => setNewInspection({...newInspection, capacity: e.target.value})}
                placeholder="e.g., 50000"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newInspection.notes}
                onChange={(e) => setNewInspection({...newInspection, notes: e.target.value})}
                placeholder="Additional observations..."
                rows={2}
              />
            </div>
          </div>

          <Button type="button" onClick={addInspection} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Dyke Inspection
          </Button>
        </CardContent>
      </Card>

      {/* Existing Inspections */}
      {inspections.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Recorded Inspections</h4>
          {inspections.map((inspection) => {
            const issueCount = getIssueCount(inspection);
            return (
              <Card key={inspection.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant="outline">{inspection.dykeType.replace('_', ' ')}</Badge>
                        <Badge className={getConditionColor(inspection.condition)}>
                          {inspection.condition}
                        </Badge>
                        {issueCount > 0 ? (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {issueCount} Issue{issueCount !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            No Issues
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Location:</span> {inspection.location}
                        </div>
                        <div>
                          <span className="font-medium">Material:</span> {inspection.material}
                        </div>
                        <div>
                          <span className="font-medium">Drainage:</span> {inspection.drainage}
                        </div>
                        <div>
                          <span className="font-medium">Dimensions:</span> {inspection.height && inspection.width ? `${inspection.height}' x ${inspection.width}'` : 'Not recorded'}
                        </div>
                      </div>

                      {inspection.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {inspection.notes}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInspection(inspection.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}