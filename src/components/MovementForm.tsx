import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Material, LogisticsType } from '../types';
import { cn } from '../lib/utils';

interface MovementFormProps {
  materials: Material[];
  onClose: () => void;
  onSubmit: (data: {
    materialId: string;
    type: LogisticsType;
    quantity: number;
    location: string;
    notes?: string;
  }) => void;
}

export const MovementForm: React.FC<MovementFormProps> = ({ materials, onClose, onSubmit }) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [type, setType] = useState<LogisticsType>('receipt');
  const [quantity, setQuantity] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || quantity <= 0 || !location) return;
    
    onSubmit({
      materialId: selectedMaterialId,
      type,
      quantity,
      location,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white border border-industrial-line w-full max-w-lg flex flex-col shadow-2xl">
        <div className="p-4 border-b border-industrial-line/10 bg-industrial-ink text-white flex justify-between items-center">
          <span className="font-mono text-sm uppercase tracking-widest">Resource Logistics Entry</span>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* Material Selection */}
          <div className="flex flex-col gap-2">
            <label className="tech-label">Reference Resource</label>
            <select 
              value={selectedMaterialId} 
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full bg-industrial-bg/30 border border-industrial-line/10 p-2 text-xs tech-value focus:ring-1 focus:ring-industrial-accent outline-none"
              required
            >
              <option value="">Select Material...</option>
              {materials.map((m, idx) => (
                <option key={`move-mat-opt-${m.id || idx}-${idx}`} value={m.id}>{m.name} ({m.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Movement Type */}
            <div className="flex flex-col gap-2">
              <label className="tech-label">Movement Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as LogisticsType)}
                className="w-full bg-industrial-bg/30 border border-industrial-line/10 p-2 text-xs tech-value focus:ring-1 focus:ring-industrial-accent outline-none"
              >
                <option value="receipt">Material Receipt</option>
                <option value="issue">Field Issue</option>
                <option value="transfer">Inter-Site Transfer</option>
                <option value="adjustment">Stock Adjustment</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <label className="tech-label">Quantity ({selectedMaterial?.unit || 'units'})</label>
              <input 
                type="number"
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full bg-industrial-bg/30 border border-industrial-line/10 p-2 text-xs tech-value focus:ring-1 focus:ring-industrial-accent outline-none"
                required
                min="0.1"
                step="0.1"
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="tech-label">Destination / Origin Location</label>
            <input 
              type="text"
              placeholder="e.g. Yard A, Unit 4, Fab Shop"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-industrial-bg/30 border border-industrial-line/10 p-2 text-xs tech-value focus:ring-1 focus:ring-industrial-accent outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label className="tech-label">Operational Notes</label>
            <textarea 
              rows={3}
              placeholder="Enter transfer details, BOL #, or reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-industrial-bg/30 border border-industrial-line/10 p-2 text-xs tech-value focus:ring-1 focus:ring-industrial-accent outline-none resize-none"
            />
          </div>

          {selectedMaterial && type === 'issue' && quantity > selectedMaterial.quantity && (
            <div className="p-3 bg-red-50 border border-red-100 flex items-center gap-3 text-red-700">
               <AlertCircle size={16} className="shrink-0" />
               <span className="text-[10px] tech-value leading-tight">Warning: Issued quantity exceeds current stock. Entry will result in negative inventory.</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 border border-industrial-line/10 text-xs tech-value hover:bg-industrial-bg/50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-industrial-ink text-white text-xs tech-value flex items-center gap-2 hover:bg-industrial-accent hover:text-industrial-ink transition-all"
            >
              <Save size={14} />
              Finalize Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
