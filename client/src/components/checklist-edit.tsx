import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { InspectionChecklist } from "@shared/schema";

interface ChecklistEditProps {
  reportId: number;
}

const CHECKLIST_CATEGORIES = [
  "External Inspection",
  "Internal Inspection", 
  "Foundation",
  "Shell",
  "Roof",
  "Bottom/Floor",
  "Nozzles",
  "Appurtenances",
  "Containment",
  "Safety Equipment",
  "Custom"
];

const STATUS_OPTIONS = [
  { value: "satisfactory", label: "Satisfactory (S)", color: "text-green-600" },
  { value: "unsatisfactory", label: "Unsatisfactory (U)", color: "text-red-600" },
  { value: "not_applicable", label: "Not Applicable (N/A)", color: "text-gray-600" }
] as const;

type ChecklistStatus = typeof STATUS_OPTIONS[number]['value'];

type ChecklistItemWithStatus = InspectionChecklist & { status: ChecklistStatus };

const mapCheckedToStatus = (checked: boolean | null | undefined): ChecklistStatus => {
  if (checked === true) return "satisfactory";
  if (checked === false) return "unsatisfactory";
  return "not_applicable";
};

const mapStatusToChecked = (status: ChecklistStatus): boolean | null => {
  switch (status) {
    case "satisfactory":
      return true;
    case "unsatisfactory":
      return false;
    default:
      return null;
  }
};

export function ChecklistEdit({ reportId }: ChecklistEditProps) {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newItemCategory, setNewItemCategory] = useState("");
  
  // Fetch existing checklist items
  const { data: checklistItems = [], isLoading } = useQuery<InspectionChecklist[]>({
    queryKey: [`/api/reports/${reportId}/checklist`],
  });

  const checklistItemsWithStatus: ChecklistItemWithStatus[] = checklistItems.map(item => ({
    ...item,
    status: mapCheckedToStatus(item.checked ?? null),
  }));

  // Group items by category
  const groupedItems = checklistItemsWithStatus.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItemWithStatus[]>);

  // Update checklist item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (item: InspectionChecklist) => {
      const response = await fetch(`/api/checklist/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Failed to update checklist item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/checklist`] });
      toast({ title: "Success", description: "Checklist item updated" });
    }
  });

  // Delete checklist item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/checklist/${itemId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete checklist item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/checklist`] });
      toast({ title: "Success", description: "Checklist item deleted" });
    }
  });

  // Add new checklist item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: Partial<InspectionChecklist>) => {
      const response = await fetch(`/api/reports/${reportId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          reportId,
          createdAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to add checklist item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}/checklist`] });
      toast({ title: "Success", description: "Checklist item added" });
    }
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddItem = (category: string) => {
    addItemMutation.mutate({
      category,
      item: `New ${category} Item`,
      checked: mapStatusToChecked('satisfactory'),
      notes: ''
    });
  };

  const handleUpdateItem = (item: ChecklistItemWithStatus, field: 'item' | 'status' | 'notes', value: any) => {
    const { status: _status, ...rest } = item;

    if (field === 'status') {
      updateItemMutation.mutate({ ...rest, checked: mapStatusToChecked(value as ChecklistStatus) });
    } else {
      updateItemMutation.mutate({ ...rest, [field]: value });
    }
  };

  const getStatusColor = (status: ChecklistStatus) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'text-gray-600';
  };

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded"></div>;
  }

  // Ensure all categories have at least an empty array
  const allCategories = [...new Set([...CHECKLIST_CATEGORIES, ...Object.keys(groupedItems)])];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Inspection Checklist ({checklistItemsWithStatus.length} items)</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={newItemCategory} onValueChange={setNewItemCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => newItemCategory && handleAddItem(newItemCategory)} 
            size="sm"
            disabled={!newItemCategory}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allCategories.map(category => {
            const items = groupedItems[category] || [];
            const isExpanded = expandedCategories.has(category);
            
            return (
              <div key={category} className="border rounded-lg">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <h4 className="font-medium">{category}</h4>
                    <span className="text-sm text-gray-500">({items.length} items)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddItem(category);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {isExpanded && (
                  <div className="border-t">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No items in this category. Click + to add one.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {items.map(item => (
                          <div key={item.id} className="p-3 flex items-center gap-3">
                            <Input
                              value={item.item || ''}
                              onChange={(e) => handleUpdateItem(item, 'item', e.target.value)}
                              className="flex-1"
                              placeholder="Checklist item description"
                            />
                            <Select
                              value={item.status || 'satisfactory'}
                              onValueChange={(value) => handleUpdateItem(item, 'status', value as ChecklistStatus)}
                            >
                              <SelectTrigger className={`w-36 ${getStatusColor(item.status || 'satisfactory')}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className={opt.color}>{opt.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Textarea
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateItem(item, 'notes', e.target.value)}
                              className="w-64 h-10"
                              placeholder="Notes..."
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItemMutation.mutate(item.id!)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {checklistItemsWithStatus.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No checklist items found. This may be because:</p>
            <ul className="mt-2 text-sm">
              <li>• Items weren't imported from the Excel file</li>
              <li>• The Excel format wasn't recognized</li>
              <li>• You can add items manually using the category selector above</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}