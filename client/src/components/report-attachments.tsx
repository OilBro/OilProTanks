import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, FileText, Camera, Image, File } from "lucide-react";
import type { ReportAttachment } from "@shared/schema";

interface ReportAttachmentsProps {
  attachments: ReportAttachment[];
  onAttachmentsChange: (attachments: ReportAttachment[]) => void;
}

const FILE_TYPES = [
  { value: "photo", label: "Photo", icon: Camera, accept: "image/*" },
  { value: "document", label: "Document", icon: FileText, accept: ".pdf,.doc,.docx" },
  { value: "drawing", label: "Drawing", icon: Image, accept: "image/*,.pdf" },
  { value: "ndt_report", label: "NDT Report", icon: File, accept: ".pdf,.doc,.docx" }
];

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "defect", label: "Defect Documentation" },
  { value: "repair", label: "Repair Work" },
  { value: "nde", label: "NDE/Testing" },
  { value: "historical", label: "Historical Records" }
];

export function ReportAttachments({ attachments, onAttachmentsChange }: ReportAttachmentsProps) {
  const [selectedFileType, setSelectedFileType] = useState("photo");
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileType = selectedFileType;
    const category = selectedCategory;

    // Simulate file upload (in real implementation, this would upload to server)
    const attachment: ReportAttachment = {
      id: Date.now(),
      reportId: 0,
      filename: file.name,
      fileType: fileType,
      description: description || null,
      category: category,
      uploadedAt: new Date().toISOString()
    };

    onAttachmentsChange([...attachments, attachment]);
    
    // Reset form
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: number) => {
    onAttachmentsChange(attachments.filter(att => att.id !== id));
  };

  const getFileIcon = (fileType: string) => {
    const type = FILE_TYPES.find(t => t.value === fileType);
    return type?.icon || File;
  };

  const getFileTypeAccept = (fileType: string) => {
    const type = FILE_TYPES.find(t => t.value === fileType);
    return type?.accept || "*/*";
  };

  const groupedAttachments = attachments.reduce((acc, attachment) => {
    const category = attachment.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(attachment);
    return acc;
  }, {} as Record<string, ReportAttachment[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            <span>Supporting Documents & Photos</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {attachments.length} files
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Upload photos, drawings, NDT reports, and other supporting documentation
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Upload Files</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="fileType">File Type</Label>
              <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select File Type" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              placeholder="Brief description of the file contents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={getFileTypeAccept(selectedFileType)}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Select File
            </Button>
            <span className="text-xs text-gray-500">
              Accepts: {getFileTypeAccept(selectedFileType)}
            </span>
          </div>
        </div>

        {/* Attachments Display */}
        {Object.keys(groupedAttachments).length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedAttachments).map(([category, categoryAttachments]) => {
              const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || category;
              
              return (
                <div key={category}>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    {categoryLabel}
                    <Badge variant="outline" className="text-xs">
                      {categoryAttachments.length}
                    </Badge>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAttachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.fileType);
                      const fileTypeLabel = FILE_TYPES.find(t => t.value === attachment.fileType)?.label;
                      
                      return (
                        <div key={attachment.id} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileIcon className="w-4 h-4 text-blue-600" />
                              <Badge variant="outline" className="text-xs">
                                {fileTypeLabel}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(attachment.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm font-medium truncate" title={attachment.filename}>
                              {attachment.filename}
                            </p>
                            {attachment.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {attachment.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {attachments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload photos, documents, and drawings to support your inspection report</p>
          </div>
        )}

        {/* Documentation Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-800 mb-2">Documentation Guidelines</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Photos: Include overview shots, close-ups of defects, and repair areas</p>
            <p>• Drawings: Tank layouts, nozzle arrangements, and inspection locations</p>
            <p>• NDT Reports: Ultrasonic thickness readings, magnetic particle test results</p>
            <p>• Documents: Previous inspection reports, repair procedures, certifications</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}