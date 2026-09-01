import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Material, MaterialStatus } from '../types';

interface BOMUploadProps {
  onUpload: (materials: Material[]) => void;
  onClose: () => void;
}

interface CSVRow {
  [key: string]: string;
}

export const BOMUpload: React.FC<BOMUploadProps> = ({ onUpload, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Material>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('System Requirement: File must be in CSV format.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const { data } = results;
        
        if (data.length === 0) {
          setError('Invalid File: No data detected.');
          setIsProcessing(false);
          return;
        }

        // Identify if first row is a header by checking if Column C (quantity) is a number
        const isHeader = isNaN(parseFloat(data[0][2]));
        const rows = isHeader ? data.slice(1) : data;

        const materialsMap: Record<string, Partial<Material>> = {};
        
        rows
          .filter(row => {
            const qty = parseFloat(row[2]);
            return !isNaN(qty) && qty > 0; // Filter out rows without a valid positive quantity in Col C
          })
          .forEach((row) => {
            const name = (row[5] || row[4] || 'Unknown Item').trim();
            const sku = (row[0] || `SKU-${Math.random().toString(36).substr(2, 5)}`).trim();
            const iso = (row[1] || 'UNASSIGNED').trim();
            const key = `${name}:::${iso}`; // Unique key per Description and ISO
            const quantity = parseFloat(row[2]) || 0;
            
            if (materialsMap[key]) {
              materialsMap[key].expectedQuantity = (materialsMap[key].expectedQuantity || 0) + quantity;
            } else {
              const category = (row[4] || 'Uncategorized').trim();
              const unit = (row[3] || 'ea').trim();

              materialsMap[key] = {
                id: `mat-import-${name}-${iso}-${Math.random().toString(36).substr(2, 5)}`,
                name,
                sku,
                iso, 
                category,
                unit,
                quantity: 0, 
                expectedQuantity: quantity, 
                receivedQuantity: 0, 
                minThreshold: 10,
                location: 'Central Warehouse',
                status: 'expected' as MaterialStatus,
                lastUpdated: Date.now()
              };
            }
          });

        setPreview(Object.values(materialsMap));
        setFile(file);
        setIsProcessing(false);
      },
      error: (err) => {
        setError(`Processing Error: ${err.message}`);
        setIsProcessing(false);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleConfirm = () => {
    if (preview.length > 0) {
      onUpload(preview as Material[]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-industrial-ink/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-industrial-bg border-2 border-industrial-line w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-industrial-line flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-industrial-accent p-2">
              <Upload className="w-5 h-5 text-industrial-ink" />
            </div>
            <div>
              <h2 className="tech-value text-lg">BOM Import Utility</h2>
              <p className="tech-label">System Node: CSV_PROCESSOR_V1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-industrial-bg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!file && !isProcessing && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed p-10 flex flex-col items-center justify-center transition-all cursor-pointer group",
                isDragging ? "border-industrial-accent bg-industrial-accent/5" : "border-industrial-line/20 hover:border-industrial-line/40 hover:bg-white/50"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".csv"
              />
              <div className="w-16 h-16 mb-4 flex items-center justify-center bg-industrial-bg border border-industrial-line/10 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 opacity-40" />
              </div>
              <p className="tech-value text-sm mb-2">
                Drop Bill of Materials (CSV) or <span className="text-industrial-accent underline decoration-2 underline-offset-4">Browse Files</span>
              </p>
              <p className="tech-label text-center max-w-xs">
                Select a formatted CSV file to ingest material lists directly into site inventory.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-industrial-accent mb-4" />
              <p className="tech-value">Analyzing Data Streams...</p>
              <p className="tech-label">Validating schema and row integrity</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs font-bold text-red-900 uppercase">Input Exception Occurred</p>
                <p className="font-mono text-[10px] text-red-800 uppercase mt-1">{error}</p>
                <button 
                  onClick={() => { setFile(null); setError(null); }}
                  className="mt-3 text-[10px] font-mono underline uppercase text-red-900 hover:no-underline"
                >
                  Restart terminal
                </button>
              </div>
            </div>
          )}

          {file && !error && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 border border-industrial-line/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="tech-value text-xs">{file.name}</p>
                    <p className="tech-label">{(file.size / 1024).toFixed(1)} KB • {preview.length} ENTRIES MAPPED</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreview([]); }}
                  className="p-1.5 hover:bg-industrial-bg rounded tech-label"
                >
                  Clear
                </button>
              </div>

              <div className="border border-industrial-line/10 overflow-hidden">
                <div className="bg-industrial-ink text-white p-2 tech-label flex justify-between">
                  <span>Data Preview</span>
                  <span>Row Verification (Top 5)</span>
                </div>
                <div className="divide-y divide-industrial-line/5 bg-white">
                  {preview.slice(0, 5).map((item, idx) => (
                    <div key={`bom-preview-${item.id || idx}-${idx}`} className="p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="tech-value text-[11px]">{item.name}</span>
                        <div className="flex gap-2">
                          <span className="tech-label">SKU: {item.sku}</span>
                          {item.iso && <span className="tech-label text-industrial-accent font-bold">ISO: {item.iso}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="tech-value text-[11px]">{item.quantity} {item.unit}</span>
                        <p className="tech-label">{item.category}</p>
                      </div>
                    </div>
                  ))}
                  {preview.length > 5 && (
                    <div className="p-2 bg-industrial-bg/30 text-center tech-label">
                      + {preview.length - 5} additional materials in buffer
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-industrial-line flex justify-end gap-3 bg-white">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-industrial-line/20 tech-value text-xs hover:bg-industrial-bg transition-colors"
          >
            Abort
          </button>
          <button 
            disabled={!file || !!error || isProcessing}
            onClick={handleConfirm}
            className={cn(
              "px-6 py-2 bg-industrial-ink text-white tech-value text-xs transition-all",
              (!file || !!error || isProcessing) ? "opacity-50 cursor-not-allowed" : "hover:bg-industrial-accent hover:text-industrial-ink"
            )}
          >
            Execute Ingestion
          </button>
        </div>
      </motion.div>
    </div>
  );
};
