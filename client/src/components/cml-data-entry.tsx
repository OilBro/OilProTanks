import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Upload, Download, Edit, Copy } from "lucide-react";

interface CMLReading {
  point: number;
  reading: number;
  notes?: string;
}

interface CMLRecord {
  id: number;
  cmlNumber: string;
  component: string;
  location: string;
  tNominal: number;
  tPrevious?: number;
  age: number;
  readings: CMLReading[];
  tActual: number; // Lowest reading for calculations
  corrosionRate?: number;
  remainingLife?: number;
  status: 'acceptable' | 'monitor' | 'action_required';
}

interface CMLDataEntryProps {
  records: CMLRecord[];
  onRecordsChange: (records: CMLRecord[]) => void;
  componentType: 'shell' | 'nozzle' | 'floor';
}

export function CMLDataEntry({ records, onRecordsChange, componentType }: CMLDataEntryProps) {
  const [newRecord, setNewRecord] = useState({
    component: "",
    location: "",
    tNominal: "",
    age: "",
  });
  
  const [editingCML, setEditingCML] = useState<number | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);

  const maxReadings = componentType === 'nozzle' ? 4 : 6;

  const addRecord = () => {
    if (!newRecord.component || !newRecord.location || !newRecord.tNominal) return;

    const record: CMLRecord = {
      id: Date.now(),
      cmlNumber: `CML-${String(records.length + 1).padStart(3, '0')}`,
      component: newRecord.component,
      location: newRecord.location,
      tNominal: parseFloat(newRecord.tNominal),
      age: parseInt(newRecord.age) || 10,
      readings: [],
      tActual: 0,
      status: 'acceptable'
    };

    onRecordsChange([...records, record]);
    setNewRecord({ component: "", location: "", tNominal: "", age: "" });
  };

  const duplicateRecord = () => {
    if (selectedRecords.length === 0) return;

    const recordsToDuplicate = records.filter(r => selectedRecords.includes(r.id));
    const duplicatedRecords = recordsToDuplicate.map(record => ({
      ...record,
      id: Date.now() + Math.random(),
      cmlNumber: `CML-${String(records.length + recordsToDuplicate.indexOf(record) + 1).padStart(3, '0')}`,
      readings: [] // Clear readings for new duplicate
    }));

    onRecordsChange([...records, ...duplicatedRecords]);
    setSelectedRecords([]);
  };

  const updateCMLReadings = (cmlId: number, readings: CMLReading[]) => {
    const updatedRecords = records.map(record => {
      if (record.id === cmlId) {
        const tActual = readings.length > 0 ? Math.min(...readings.map(r => r.reading)) : 0;
        const corrosionRate = record.age > 0 ? (record.tNominal - tActual) / record.age : 0;
        const remainingLife = corrosionRate > 0 ? (tActual - 0.1) / corrosionRate : 999; // Assuming 0.1" minimum
        
        return {
          ...record,
          readings,
          tActual,
          corrosionRate,
          remainingLife,
          status: remainingLife < 5 ? 'action_required' : remainingLife < 10 ? 'monitor' : 'acceptable'
        };
      }
      return record;
    });
    onRecordsChange(updatedRecords);
  };

  const exportCMLData = () => {
    const csvData = records.map(record => ({
      CML: record.cmlNumber,
      Component: record.component,
      Location: record.location,
      'T Nominal': record.tNominal,
      Age: record.age,
      'T Actual': record.tActual,
      'Corrosion Rate': record.corrosionRate?.toFixed(4) || '',
      'Remaining Life': record.remainingLife?.toFixed(1) || '',
      Status: record.status,
      Readings: record.readings.map(r => r.reading).join(';')
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentType}_CML_data.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'action_required': return 'destructive';
      case 'monitor': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>CML Data Entry - {componentType.charAt(0).toUpperCase() + componentType.slice(1)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCMLData}>
              <Download className="w-4 h-4 mr-2" />
              Export CML's
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import CML's
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Corrosion Monitoring Location records with thickness readings (up to {maxReadings} points per CML)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New CML Record */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-4">Add New CML Record</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="component">Component</Label>
              <Input
                placeholder="Shell Crs 1, Bottom Plate"
                value={newRecord.component}
                onChange={(e) => setNewRecord(prev => ({ ...prev, component: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                placeholder="Chime Q1-Q2, North Side"
                value={newRecord.location}
                onChange={(e) => setNewRecord(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tNominal">T Nominal (in)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.500"
                value={newRecord.tNominal}
                onChange={(e) => setNewRecord(prev => ({ ...prev, tNominal: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="age">Age/Prev Insp (years)</Label>
              <Input
                type="number"
                placeholder="10"
                value={newRecord.age}
                onChange={(e) => setNewRecord(prev => ({ ...prev, age: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="button" onClick={addRecord}>
              <Plus className="w-4 h-4 mr-2" />
              Add CML Record
            </Button>
            {selectedRecords.length > 0 && (
              <Button type="button" variant="outline" onClick={duplicateRecord}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Selected ({selectedRecords.length})
              </Button>
            )}
          </div>
        </div>

        {/* CML Records Table */}
        {records.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">CML Records ({records.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left border-b">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords(records.map(r => r.id));
                          } else {
                            setSelectedRecords([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-2 text-left border-b">CML</th>
                    <th className="p-2 text-left border-b">Component</th>
                    <th className="p-2 text-left border-b">Location</th>
                    <th className="p-2 text-left border-b">T Nom</th>
                    <th className="p-2 text-left border-b">T Act</th>
                    <th className="p-2 text-left border-b">CR (mils/yr)</th>
                    <th className="p-2 text-left border-b">RL (yrs)</th>
                    <th className="p-2 text-left border-b">Status</th>
                    <th className="p-2 text-left border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords([...selectedRecords, record.id]);
                            } else {
                              setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-2 font-mono text-sm">{record.cmlNumber}</td>
                      <td className="p-2">{record.component}</td>
                      <td className="p-2">{record.location}</td>
                      <td className="p-2">{record.tNominal.toFixed(3)}"</td>
                      <td className="p-2">
                        {record.tActual > 0 ? record.tActual.toFixed(3) + '"' : '-'}
                      </td>
                      <td className="p-2">
                        {record.corrosionRate ? (record.corrosionRate * 1000).toFixed(1) : '-'}
                      </td>
                      <td className="p-2">
                        {record.remainingLife ? record.remainingLife.toFixed(1) : '-'}
                      </td>
                      <td className="p-2">
                        <Badge variant={getStatusColor(record.status)}>
                          {record.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCML(record.id)}
                          >
                            CML Data
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onRecordsChange(records.filter(r => r.id !== record.id));
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CML Data Entry Modal */}
        {editingCML && (
          <CMLReadingsModal
            record={records.find(r => r.id === editingCML)!}
            maxReadings={maxReadings}
            onSave={(readings) => {
              updateCMLReadings(editingCML, readings);
              setEditingCML(null);
            }}
            onClose={() => setEditingCML(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface CMLReadingsModalProps {
  record: CMLRecord;
  maxReadings: number;
  onSave: (readings: CMLReading[]) => void;
  onClose: () => void;
}

function CMLReadingsModal({ record, maxReadings, onSave, onClose }: CMLReadingsModalProps) {
  const [readings, setReadings] = useState<CMLReading[]>(
    record.readings.length > 0 
      ? record.readings 
      : Array.from({ length: maxReadings }, (_, i) => ({ point: i + 1, reading: 0 }))
  );

  const updateReading = (index: number, reading: number) => {
    const newReadings = [...readings];
    newReadings[index] = { ...newReadings[index], reading };
    setReadings(newReadings);
  };

  const handleSave = () => {
    const validReadings = readings.filter(r => r.reading > 0);
    onSave(validReadings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            CML Data Entry: {record.cmlNumber}
          </h3>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm">
            <strong>Component:</strong> {record.component} | 
            <strong> Location:</strong> {record.location} | 
            <strong> T Nominal:</strong> {record.tNominal}" | 
            <strong> Age:</strong> {record.age} years
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {readings.map((reading, index) => (
            <div key={index}>
              <Label htmlFor={`reading-${index}`}>
                Reading Point {reading.point} (in)
              </Label>
              <Input
                id={`reading-${index}`}
                type="number"
                step="0.001"
                placeholder="0.000"
                value={reading.reading || ''}
                onChange={(e) => updateReading(index, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Readings
          </Button>
        </div>
      </div>
    </div>
  );
}