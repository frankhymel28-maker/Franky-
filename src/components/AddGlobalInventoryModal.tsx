import React, { useState } from 'react';
import { X, Plus, Trash2, FileUp, Check, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { VENDORS } from '../types';

export interface GlobalHeatLine {
  id: string;
  heatNumber: string;
  mtrNumber: string;
  vendor?: string;
  quantity: number;
  fileName?: string;
  fileData?: string;
}

interface AddGlobalInventoryModalProps {
  onClose: () => void;
  onSubmit: (input: { name: string; sku: string; category: string; unit: string; heatLines: GlobalHeatLine[] }) => void;
}

export const AddGlobalInventoryModal: React.FC<AddGlobalInventoryModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('ea');
  const [heatLines, setHeatLines] = useState<GlobalHeatLine[]>([]);

  const totalQty = heatLines.reduce((acc, l) => acc + (l.quantity || 0), 0);
  const canSubmit = name.trim().length > 0 && totalQty > 0;

  const addLine = () => {
    setHeatLines(prev => [...prev, { id: `heat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, heatNumber: '', mtrNumber: '', quantity: 1 }]);
  };
  const updateLine = (id: string, updates: Partial<GlobalHeatLine>) => {
    setHeatLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  const removeLine = (id: string) => {
    setHeatLines(prev => prev.filter(l => l.id !== id));
  };

  const handleFileUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateLine(id, { fileName: file.name, fileData: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), sku: sku.trim(), category: category.trim() || 'Uncategorized', unit: unit.trim() || 'ea', heatLines });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-industrial-ink/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white border border-industrial-line/20 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-industrial-line/10 bg-industrial-bg/5 flex justify-between items-start">
          <div>
            <span className="tech-label text-[10px] uppercase font-bold text-industrial-accent tracking-widest">Global Stock Intake</span>
            <h2 className="tech-value text-xl mt-1">Add Global Inventory</h2>
            <p className="tech-label opacity-60 mt-1">Not tied to any job - stock on hand for future assignment.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-industrial-bg rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="tech-label">Material Name *</span>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. 6" Carbon Steel Elbow'
                className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="tech-label">SKU</span>
              <input
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. CS-E-06"
                className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="tech-label">Category</span>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Fittings"
                className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="tech-label">Unit</span>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="e.g. ea, ft, rl"
                className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
              />
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col">
                <span className="tech-label font-bold text-sm">Heat Records</span>
                <span className="tech-label text-[10px]">Log each heat/lot received, with its MTR document</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="tech-label text-[10px] block">TOTAL QTY</span>
                  <span className="tech-value text-lg text-industrial-accent">{totalQty}</span>
                </div>
                <button
                  onClick={addLine}
                  className="bg-industrial-ink text-white px-3 py-2 tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Add Heat
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {heatLines.map(line => (
                <div key={line.id} className="grid grid-cols-12 gap-3 p-3 border border-industrial-line/10 bg-industrial-bg/5 items-end">
                  <div className="col-span-3">
                    <label className="tech-label text-[9px] mb-1 block">Heat Number</label>
                    <input
                      value={line.heatNumber}
                      onChange={e => updateLine(line.id, { heatNumber: e.target.value })}
                      placeholder="e.g. A403-XYZ"
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="tech-label text-[9px] mb-1 block">Vendor</label>
                    <select
                      value={line.vendor || ''}
                      onChange={e => updateLine(line.id, { vendor: e.target.value })}
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                    >
                      <option value="">Select...</option>
                      {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="tech-label text-[9px] mb-1 block">MTR Reference</label>
                    <input
                      value={line.mtrNumber}
                      onChange={e => updateLine(line.id, { mtrNumber: e.target.value })}
                      placeholder="e.g. MTR-9982"
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="tech-label text-[9px] mb-1 block">Quantity</label>
                    <input
                      type="number"
                      value={line.quantity === 0 ? '' : line.quantity}
                      onChange={e => updateLine(line.id, { quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent font-bold"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col items-center justify-end gap-2">
                    <label className="cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(line.id, f); }}
                      />
                      <div className={cn(
                        'p-2 rounded transition-all',
                        line.fileName ? 'bg-green-100 text-green-600' : 'bg-industrial-bg/20 text-industrial-line hover:bg-industrial-accent hover:text-industrial-ink'
                      )}>
                        <FileUp size={16} />
                      </div>
                      {line.fileName && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                          <Check size={8} />
                        </span>
                      )}
                    </label>
                    <button onClick={() => removeLine(line.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {line.fileName && (
                    <div className="col-span-12 -mt-1 px-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="tech-label text-[10px] text-green-700 truncate">MTR attached: {line.fileName}</span>
                    </div>
                  )}
                </div>
              ))}
              {heatLines.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-industrial-line/10">
                  <p className="tech-label opacity-40 italic">Click "Add Heat" to log at least one heat/lot.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-industrial-line/10 bg-industrial-bg/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'px-8 py-2 bg-industrial-ink text-white tech-value text-[10px] transition-all uppercase tracking-widest font-bold flex items-center gap-2',
              !canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-industrial-accent hover:text-industrial-ink'
            )}
          >
            <Save size={14} /> Add to Global Inventory
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
