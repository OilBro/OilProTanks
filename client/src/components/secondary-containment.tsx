import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Plus } from "lucide-react";

interface ContainmentComponent {
  id: number;
  componentType: 'dyke' | 'liner' | 'drain' | 'sump' | 'valve' | 'piping' | 'foundation';
  location: string;
  material: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  findings: string;
  dimensions?: string;
  capacity?: number;
  lastMaintenance?: string;
  repairRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ContainmentSystem {
  systemType: 'earthen_dyke' | 'concrete_dyke' | 'synthetic_liner' | 'clay_liner' | 'composite';
  capacity: number; // gallons or tank volume %
  drainageSystem: boolean;
  monitoring: boolean;
  components: ContainmentComponent[];
  overallCondition: 'satisfactory' | 'marginal' | 'unsatisfactory';
  complianceStatus: 'compliant' | 'non_compliant' | 'conditional';
  notes: string;
}

interface SecondaryContainmentProps {
  data: ContainmentSystem;
  onDataChange: (data: ContainmentSystem) => void;
}

const COMPONENT_TYPES = [
  { value: 'dyke', label: 'Dyke/Berm', description: 'Earthen or concrete containment wall' },
  { value: 'liner', label: 'Liner System', description: 'Synthetic or clay liner material' },
  { value: 'drain', label: 'Drainage System', description: 'Collection and removal system' },
  { value: 'sump', label: 'Sump/Collection Point', description: 'Low point collection area' },
  { value: 'valve', label: 'Isolation Valve', description: 'Drainage control valve' },
  { value: 'piping', label: 'Collection Piping', description: 'Drain pipes and fittings' },
  { value: 'foundation', label: 'Foundation/Base', description: 'Tank foundation and pad' }
];

export function SecondaryContainment({ data, onDataChange }: SecondaryContainmentProps) {
  const [newComponent, setNewComponent] = useState({
    componentType: '',
    location: '',
    material: '',
    condition: '',
    findings: '',
    dimensions: '',
    capacity: '',
    lastMaintenance: ''
  });

  const addComponent = () => {
    if (!newComponent.componentType || !newComponent.location || !newComponent.condition) return;

    const component: ContainmentComponent = {
      id: Date.now(),
      componentType: newComponent.componentType as any,
      location: newComponent.location,
      material: newComponent.material,
      condition: newComponent.condition as any,
      findings: newComponent.findings,
      dimensions: newComponent.dimensions,
      capacity: parseFloat(newComponent.capacity) || undefined,
      lastMaintenance: newComponent.lastMaintenance,
      repairRequired: newComponent.condition === 'poor' || newComponent.condition === 'failed',
      priority: newComponent.condition === 'failed' ? 'urgent' : 
                newComponent.condition === 'poor' ? 'high' :
                newComponent.condition === 'fair' ? 'medium' : 'low'
    };

    const updatedComponents = [...data.components, component];
    const overallCondition = determineOverallCondition(updatedComponents);
    const complianceStatus = determineComplianceStatus(updatedComponents, data);

    onDataChange({
      ...data,
      components: updatedComponents,
      overallCondition,
      complianceStatus
    });

    setNewComponent({
      componentType: '',
      location: '',
      material: '',
      condition: '',
      findings: '',
      dimensions: '',
      capacity: '',
      lastMaintenance: ''
    });
  };

  const determineOverallCondition = (components: ContainmentComponent[]) => {
    if (components.some(c => c.condition === 'failed')) return 'unsatisfactory';
    if (components.some(c => c.condition === 'poor')) return 'marginal';
    if (components.every(c => c.condition === 'excellent' || c.condition === 'good')) return 'satisfactory';
    return 'marginal';
  };

  const determineComplianceStatus = (components: ContainmentComponent[], system: ContainmentSystem) => {
    const criticalFailures = components.filter(c => 
      (c.componentType === 'dyke' || c.componentType === 'liner') && 
      (c.condition === 'failed' || c.condition === 'poor')
    );
    
    if (criticalFailures.length > 0) return 'non_compliant';
    if (!system.drainageSystem || system.capacity < 110) return 'conditional';
    return 'compliant';
  };

  const removeComponent = (id: number) => {
    const updatedComponents = data.components.filter(c => c.id !== id);
    const overallCondition = determineOverallCondition(updatedComponents);
    const complianceStatus = determineComplianceStatus(updatedComponents, data);

    onDataChange({
      ...data,
      components: updatedComponents,
      overallCondition,
      complianceStatus
    });
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'conditional': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const repairComponents = data.components.filter(c => c.repairRequired);
  const urgentRepairs = repairComponents.filter(c => c.priority === 'urgent');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Secondary Containment Inspection
        </CardTitle>
        <p className="text-sm text-gray-600">
          Environmental containment system inspection per EPA and API requirements
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="systemType">Containment System Type</Label>
            <Select 
              value={data.systemType} 
              onValueChange={(value: any) => onDataChange({ ...data, systemType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earthen_dyke">Earthen Dyke</SelectItem>
                <SelectItem value="concrete_dyke">Concrete Dyke</SelectItem>
                <SelectItem value="synthetic_liner">Synthetic Liner</SelectItem>
                <SelectItem value="clay_liner">Clay Liner</SelectItem>
                <SelectItem value="composite">Composite System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="capacity">Capacity (% tank volume)</Label>
            <Input
              type="number"
              value={data.capacity}
              onChange={(e) => onDataChange({ ...data, capacity: parseFloat(e.target.value) || 0 })}
              placeholder="110% minimum required"
            />
          </div>
        </div>

        {/* System Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="drainageSystem"
              checked={data.drainageSystem}
              onChange={(e) => onDataChange({ ...data, drainageSystem: e.target.checked })}
            />
            <Label htmlFor="drainageSystem">Drainage System Present</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="monitoring"
              checked={data.monitoring}
              onChange={(e) => onDataChange({ ...data, monitoring: e.target.checked })}
            />
            <Label htmlFor="monitoring">Monitoring System Installed</Label>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {data.overallCondition === 'satisfactory' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-medium">Overall Condition</span>
            </div>
            <div className={`text-lg font-bold capitalize ${getConditionColor(data.overallCondition)}`}>
              {data.overallCondition}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Compliance Status</span>
            </div>
            <div className={`text-lg font-bold capitalize ${getComplianceColor(data.complianceStatus)}`}>
              {data.complianceStatus.replace('_', ' ')}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium mb-2">Capacity</div>
            <div className={`text-lg font-bold ${data.capacity >= 110 ? 'text-green-600' : 'text-red-600'}`}>
              {data.capacity}%
            </div>
            <div className="text-xs text-gray-500">
              {data.capacity >= 110 ? 'Meets minimum' : 'Below minimum (110%)'}
            </div>
          </div>
        </div>

        {/* Add New Component */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add Containment Component</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="componentType">Component Type</Label>
              <Select 
                value={newComponent.componentType} 
                onValueChange={(value) => setNewComponent(prev => ({ ...prev, componentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                placeholder="North side, SW corner, etc."
                value={newComponent.location}
                onChange={(e) => setNewComponent(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={newComponent.condition} 
                onValueChange={(value) => setNewComponent(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assess condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="material">Material</Label>
              <Input
                placeholder="Concrete, HDPE, clay, etc."
                value={newComponent.material}
                onChange={(e) => setNewComponent(prev => ({ ...prev, material: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dimensions">Dimensions/Capacity</Label>
              <Input
                placeholder="6ft H x 400ft L, 5000 gal, etc."
                value={newComponent.dimensions}
                onChange={(e) => setNewComponent(prev => ({ ...prev, dimensions: e.target.value }))}
              />
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="findings">Inspection Findings</Label>
            <textarea
              id="findings"
              className="w-full p-2 border rounded mt-1"
              rows={2}
              placeholder="Describe condition, defects, repairs needed, etc."
              value={newComponent.findings}
              onChange={(e) => setNewComponent(prev => ({ ...prev, findings: e.target.value }))}
            />
          </div>

          <Button type="button" onClick={addComponent}>
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
        </div>

        {/* Components List */}
        {data.components.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Containment Components ({data.components.length})</h4>
            
            {data.components.map((component) => (
              <div key={component.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Type:</span>
                      <div className="font-medium capitalize">
                        {component.componentType.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Location:</span>
                      <div>{component.location}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Material:</span>
                      <div>{component.material}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Condition:</span>
                      <div className={`font-medium capitalize ${getConditionColor(component.condition)}`}>
                        {component.condition}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeComponent(component.id)}
                  >
                    ×
                  </Button>
                </div>

                {component.dimensions && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Dimensions:</span>
                    <span className="ml-2">{component.dimensions}</span>
                  </div>
                )}

                {component.findings && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Findings:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{component.findings}</div>
                  </div>
                )}

                {component.repairRequired && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <Badge variant="destructive" className="mb-1">
                      {component.priority.toUpperCase()} PRIORITY REPAIR REQUIRED
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Repair Summary */}
        {repairComponents.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-medium text-yellow-800 mb-2">
              Components Requiring Repair ({repairComponents.length})
            </h5>
            <div className="space-y-1 text-sm text-yellow-700">
              {repairComponents.map(comp => (
                <div key={comp.id}>
                  <strong>{comp.componentType.replace('_', ' ')}</strong> at {comp.location} 
                  <Badge variant="outline" className="ml-2 text-xs">
                    {comp.priority} priority
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Issues */}
        {data.complianceStatus !== 'compliant' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-medium text-red-800 mb-2">Compliance Issues</h5>
            <div className="text-sm text-red-700 space-y-1">
              {data.capacity < 110 && (
                <p>• Containment capacity below required 110% of tank volume</p>
              )}
              {!data.drainageSystem && (
                <p>• No drainage system installed for water removal</p>
              )}
              {urgentRepairs.length > 0 && (
                <p>• {urgentRepairs.length} failed component(s) requiring immediate repair</p>
              )}
            </div>
          </div>
        )}

        {/* Regulatory Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">Secondary Containment Requirements</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Capacity must be greater than or equal to 110% of largest tank volume</p>
            <p>• Must be impervious to stored material for expected contact duration</p>
            <p>• Drainage system required to remove accumulated precipitation</p>
            <p>• Regular inspection and maintenance required per EPA regulations</p>
            <p>• Documentation must be maintained for regulatory compliance</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            className="w-full p-2 border rounded mt-1"
            rows={3}
            placeholder="Additional observations, maintenance history, regulatory compliance notes..."
            value={data.notes}
            onChange={(e) => onDataChange({ ...data, notes: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}