import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, FileText, Database, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  items: string; // JSON string
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistItem {
  category: string;
  item: string;
  status?: string;
  notes?: string;
}

export default function ChecklistTemplates() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    items: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing templates
  const { data: templates = [], isLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates']
  });

  // Upload checklist template
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('checklistFile', file);
      
      const response = await fetch('/api/checklist-templates/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Upload Successful",
        description: `${result.message} - ${result.itemsCount} items extracted`,
      });
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Create manual template
  const createMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await fetch('/api/checklist-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Checklist template created successfully",
      });
      setNewTemplate({ name: '', description: '', category: '', items: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Create standard template
  const createStandardMutation = useMutation({
    mutationFn: async (templateType: string) => {
      const response = await fetch(`/api/checklist-templates/standard/${templateType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}'
      });
      if (!response.ok) {
        throw new Error('Failed to create standard template');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Standard Template Created",
        description: "Standard API 653 template added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Template may already exist",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.category) {
      toast({
        title: "Invalid Input",
        description: "Please provide template name and category",
        variant: "destructive",
      });
      return;
    }

    // Parse items from textarea (one per line)
    const items = newTemplate.items.split('\n')
      .filter(item => item.trim())
      .map(item => ({
        category: newTemplate.category,
        item: item.trim(),
        status: 'not_applicable'
      }));

    createMutation.mutate({
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      items: JSON.stringify(items),
      createdBy: 'Manual'
    });
  };

  const parseTemplateItems = (itemsJson: string): ChecklistItem[] => {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
  };

  const downloadTemplate = async (template: ChecklistTemplate) => {
    console.log('Downloading template as Excel:', template);
    try {
      const response = await fetch(`/api/checklist-templates/${template.id}/download/excel`);
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_')}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: `${template.name} has been downloaded as Excel`,
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const downloadExcelTemplate = async () => {
    console.log('Downloading Excel template...');
    try {
      const response = await fetch('/api/templates/download/excel');
      if (!response.ok) {
        throw new Error('Failed to download Excel template');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'API653_Inspection_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Excel Template Downloaded",
        description: "The inspection template has been downloaded as Excel",
      });
    } catch (error) {
      console.error('Error downloading Excel template:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download Excel template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Checklist Templates</h1>
          <p className="text-muted-foreground">
            Upload and manage custom inspection checklist templates
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Template
            </CardTitle>
            <CardDescription>
              Upload Excel or PDF files containing inspection checklists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="checklistFile">Select File</Label>
              <Input
                id="checklistFile"
                type="file"
                accept=".xlsx,.xls,.xlsm,.pdf"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
            </div>
            
            {uploadFile && (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{uploadFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!uploadFile || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Template"}
            </Button>
          </CardContent>
        </Card>

        {/* Create Manual Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Template
            </CardTitle>
            <CardDescription>
              Create a new checklist template manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Custom Tank Inspection"
              />
            </div>

            <div>
              <Label htmlFor="templateCategory">Category</Label>
              <Select 
                value={newTemplate.category} 
                onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External Inspection</SelectItem>
                  <SelectItem value="internal">Internal Inspection</SelectItem>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="roof">Roof</SelectItem>
                  <SelectItem value="appurtenances">Appurtenances</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="templateDescription">Description</Label>
              <Input
                id="templateDescription"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Optional description"
              />
            </div>

            <div>
              <Label htmlFor="templateItems">Checklist Items (one per line)</Label>
              <Textarea
                id="templateItems"
                value={newTemplate.items}
                onChange={(e) => setNewTemplate({...newTemplate, items: e.target.value})}
                placeholder="Tank shell condition - general corrosion&#10;Tank shell condition - localized corrosion&#10;Foundation condition - settlement"
                rows={6}
              />
            </div>

            <Button 
              onClick={handleCreateTemplate} 
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Download Excel Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Excel Template
          </CardTitle>
          <CardDescription>
            Download the Excel inspection template with all forms (Shell, Bottom, Roof, Nozzles, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={downloadExcelTemplate}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel Inspection Template
          </Button>
        </CardContent>
      </Card>

      {/* Standard Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Standard Templates
          </CardTitle>
          <CardDescription>
            Add standard API 653 inspection templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              variant="outline"
              onClick={() => createStandardMutation.mutate('api653_external')}
              disabled={createStandardMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              API 653 External Template
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => createStandardMutation.mutate('api653_internal')}
              disabled={createStandardMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              API 653 Internal Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Templates</CardTitle>
          <CardDescription>
            Manage your uploaded and created templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Upload or create your first template above.
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template: ChecklistTemplate) => (
                <div key={template.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{template.category}</Badge>
                        <Badge variant="outline">{template.createdBy}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {parseTemplateItems(template.items).length} items
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate(template)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      {template.isActive && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}