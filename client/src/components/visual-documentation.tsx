import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Image, FileText, Trash2, Eye } from 'lucide-react';

interface VisualDocument {
  id: number;
  type: 'photo' | 'sketch' | 'drawing' | 'diagram';
  category: 'general' | 'defect' | 'repair' | 'nde' | 'measurement' | 'overview';
  title: string;
  description: string;
  location?: string;
  component?: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  tags: string[];
  gridReference?: string;
}

interface VisualDocumentationProps {
  documents: VisualDocument[];
  onDocumentsChange: (documents: VisualDocument[]) => void;
}

const DOCUMENT_TYPES = [
  { value: 'photo', label: 'Photograph', description: 'Digital photos of tank conditions' },
  { value: 'sketch', label: 'Field Sketch', description: 'Hand-drawn sketches and annotations' },
  { value: 'drawing', label: 'Technical Drawing', description: 'CAD drawings and technical diagrams' },
  { value: 'diagram', label: 'Inspection Diagram', description: 'NDE location diagrams and layouts' }
];

const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'General Inspection', color: 'bg-blue-100 text-blue-800' },
  { value: 'defect', label: 'Defect Documentation', color: 'bg-red-100 text-red-800' },
  { value: 'repair', label: 'Repair Documentation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'nde', label: 'NDE Test Locations', color: 'bg-purple-100 text-purple-800' },
  { value: 'measurement', label: 'Thickness Measurements', color: 'bg-green-100 text-green-800' },
  { value: 'overview', label: 'Tank Overview', color: 'bg-gray-100 text-gray-800' }
];

const COMPONENTS = [
  'Shell Course', 'Bottom Plate', 'Roof Plate', 'Nozzle', 'Manway', 
  'Ladder', 'Platform', 'Walkway', 'Stairway', 'Foundation',
  'Appurtenance', 'Piping', 'Valve', 'Gauge', 'Vent'
];

export function VisualDocumentation({ documents, onDocumentsChange }: VisualDocumentationProps) {
  const [newDocument, setNewDocument] = useState({
    type: 'photo',
    category: 'general',
    title: '',
    description: '',
    location: '',
    component: '',
    tags: '',
    gridReference: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, SVG) or PDF document.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    const document: VisualDocument = {
      id: Date.now(),
      type: newDocument.type as any,
      category: newDocument.category as any,
      title: newDocument.title || file.name,
      description: newDocument.description,
      location: newDocument.location,
      component: newDocument.component,
      fileName: file.name,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      tags: newDocument.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      gridReference: newDocument.gridReference
    };

    onDocumentsChange([...documents, document]);

    // Reset form
    setNewDocument({
      type: 'photo',
      category: 'general',
      title: '',
      description: '',
      location: '',
      component: '',
      tags: '',
      gridReference: ''
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeDocument = (id: number) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const categoryConfig = DOCUMENT_CATEGORIES.find(c => c.value === category);
    return categoryConfig?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Visual Documentation & Sketches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Section */}
        <div className="border rounded-lg p-4 mb-6 bg-slate-50">
          <h4 className="font-medium mb-4">Upload Visual Documentation</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="docType">Document Type</Label>
              <Select 
                value={newDocument.type} 
                onValueChange={(value) => setNewDocument(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="docCategory">Category</Label>
              <Select 
                value={newDocument.category} 
                onValueChange={(value) => setNewDocument(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="docTitle">Title/Name</Label>
              <Input
                id="docTitle"
                placeholder="Brief descriptive title"
                value={newDocument.title}
                onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="docLocation">Location</Label>
              <Input
                id="docLocation"
                placeholder="Tank location, elevation, etc."
                value={newDocument.location}
                onChange={(e) => setNewDocument(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="docComponent">Component</Label>
              <Select 
                value={newDocument.component} 
                onValueChange={(value) => setNewDocument(prev => ({ ...prev, component: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENTS.map(component => (
                    <SelectItem key={component} value={component}>
                      {component}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="docGridRef">Grid Reference</Label>
              <Input
                id="docGridRef"
                placeholder="A1, B3, etc."
                value={newDocument.gridReference}
                onChange={(e) => setNewDocument(prev => ({ ...prev, gridReference: e.target.value }))}
              />
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="docDescription">Description</Label>
            <textarea
              id="docDescription"
              className="w-full p-3 border rounded mt-1"
              rows={2}
              placeholder="Detailed description of what this document shows..."
              value={newDocument.description}
              onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="docTags">Tags (comma-separated)</Label>
            <Input
              id="docTags"
              placeholder="defect, crack, weld, repair, before, after"
              value={newDocument.tags}
              onChange={(e) => setNewDocument(prev => ({ ...prev, tags: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.svg,.pdf"
              className="hidden"
            />
            <Button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Select File
            </Button>
            <div className="text-sm text-gray-500">
              Supports: JPEG, PNG, GIF, SVG, PDF (max 10MB)
            </div>
          </div>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Uploaded Documents ({documents.length})</h4>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{doc.title}</h5>
                        <Badge className={getCategoryColor(doc.category)}>
                          {DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label}
                        </Badge>
                        <Badge variant="outline">
                          {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {doc.description}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                        <div>File: {doc.fileName}</div>
                        <div>Size: {formatFileSize(doc.fileSize)}</div>
                        <div>Location: {doc.location || 'Not specified'}</div>
                        <div>Component: {doc.component || 'General'}</div>
                      </div>
                      
                      {doc.tags.length > 0 && (
                        <div className="mt-2">
                          {doc.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="mr-1 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No visual documentation uploaded yet</p>
            <p className="text-sm">Upload photos, sketches, and drawings to support your inspection report</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}