import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { RepairRecommendation } from "@shared/schema";

interface RepairRecommendationsProps {
  recommendations: RepairRecommendation[];
  onRecommendationsChange: (recommendations: RepairRecommendation[]) => void;
}

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "red", icon: AlertTriangle },
  { value: "high", label: "High", color: "orange", icon: Clock },
  { value: "medium", label: "Medium", color: "yellow", icon: Clock },
  { value: "routine", label: "Routine", color: "green", icon: CheckCircle }
];

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "deferred", label: "Deferred" }
];

export function RepairRecommendations({ recommendations, onRecommendationsChange }: RepairRecommendationsProps) {
  const [newRecommendation, setNewRecommendation] = useState({
    component: "",
    defectDescription: "",
    recommendation: "",
    priority: "routine",
    estimatedCost: "",
    dueDate: "",
    apiReference: ""
  });

  const addRecommendation = () => {
    if (!newRecommendation.component || !newRecommendation.defectDescription || !newRecommendation.recommendation) return;

    const recommendation: RepairRecommendation = {
      id: Date.now(),
      reportId: 0,
      component: newRecommendation.component,
      defectDescription: newRecommendation.defectDescription,
      recommendation: newRecommendation.recommendation,
      priority: newRecommendation.priority,
      estimatedCost: newRecommendation.estimatedCost ? parseFloat(newRecommendation.estimatedCost) : null,
      dueDate: newRecommendation.dueDate || null,
      status: "open",
      apiReference: newRecommendation.apiReference || null,
      completedDate: null,
      completionNotes: null,
      createdAt: new Date().toISOString()
    };

    onRecommendationsChange([...recommendations, recommendation]);
    setNewRecommendation({
      component: "",
      defectDescription: "",
      recommendation: "",
      priority: "routine",
      estimatedCost: "",
      dueDate: "",
      apiReference: ""
    });
  };

  const removeRecommendation = (id: number) => {
    onRecommendationsChange(recommendations.filter(rec => rec.id !== id));
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[3];
  };

  const getUrgentCount = () => recommendations.filter(r => r.priority === "urgent").length;
  const getHighCount = () => recommendations.filter(r => r.priority === "high").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Repair Recommendations</span>
          <div className="flex gap-2">
            {getUrgentCount() > 0 && (
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                {getUrgentCount()} Urgent
              </Badge>
            )}
            {getHighCount() > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {getHighCount()} High Priority
              </Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Document repair recommendations with API 653 compliance references
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Recommendation */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add Repair Recommendation</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="component">Component</Label>
              <Input
                placeholder="Shell Course 1, Bottom Plate, Nozzle N-1"
                value={newRecommendation.component}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, component: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={newRecommendation.priority} onValueChange={(value) => 
                setNewRecommendation(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <priority.icon className="w-4 h-4" />
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="defectDescription">Defect Description</Label>
            <Textarea
              placeholder="Detailed description of the defect or issue found..."
              value={newRecommendation.defectDescription}
              onChange={(e) => setNewRecommendation(prev => ({ ...prev, defectDescription: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="recommendation">Recommendation</Label>
            <Textarea
              placeholder="Specific repair or maintenance action recommended..."
              value={newRecommendation.recommendation}
              onChange={(e) => setNewRecommendation(prev => ({ ...prev, recommendation: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={newRecommendation.estimatedCost}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, estimatedCost: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="date"
                value={newRecommendation.dueDate}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="apiReference">API 653 Reference</Label>
              <Input
                placeholder="Section 6.3.2"
                value={newRecommendation.apiReference}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, apiReference: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={addRecommendation} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Recommendation
          </Button>
        </div>

        {/* Existing Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Recorded Recommendations ({recommendations.length})</h4>
            {recommendations
              .sort((a, b) => {
                const priorityOrder = { urgent: 0, high: 1, medium: 2, routine: 3 };
                return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
              })
              .map((rec) => {
                const priorityInfo = getPriorityInfo(rec.priority);
                const PriorityIcon = priorityInfo.icon;
                
                return (
                  <div key={rec.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {rec.component}
                        </Badge>
                        <Badge 
                          variant={priorityInfo.color === "red" ? "destructive" : "secondary"}
                          className={`bg-${priorityInfo.color}-100 text-${priorityInfo.color}-800 flex items-center gap-1`}
                        >
                          <PriorityIcon className="w-3 h-3" />
                          {priorityInfo.label}
                        </Badge>
                        {rec.apiReference && (
                          <Badge variant="outline" className="text-xs">
                            API 653: {rec.apiReference}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {STATUSES.find(s => s.value === rec.status)?.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecommendation(rec.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Defect:</span>
                        <p className="text-gray-600 mt-1">{rec.defectDescription}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Recommendation:</span>
                        <p className="text-gray-600 mt-1">{rec.recommendation}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t">
                      <div className="flex gap-4 text-xs text-gray-500">
                        {rec.estimatedCost && (
                          <span>Est. Cost: ${rec.estimatedCost.toLocaleString()}</span>
                        )}
                        {rec.dueDate && (
                          <span>Due: {new Date(rec.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Added: {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}