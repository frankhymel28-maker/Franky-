import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Spool } from '../types';

interface SpoolUploadProps {
  onUpload: (spools: Spool[]) => void;
  onClose: () => void;
}

export const SpoolUpload: React.FC<SpoolUploadProps> = ({ onUpload, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Spool>[]>([]);
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

        // Expected format: Tag is in Column A (index 0)
        // Optionally: ISO (col B), Drawing (col C), Weight (col D), Status (col E)
        const isHeader = data[0][0].toLowerCase().includes('tag') || data[0][0].toLowerCase().includes('number');
        const rows = isHeader ? data.slice(1) : data;

        const spools: Spool[] = rows.map((row, idx) => {
          const tag = (row[0] || '').trim();
          const iso = (row[1] || '').trim() || undefined;
          const drawing = (row[2] || '').trim() || undefined;
          const weight = parseFloat(row[3]) || undefined;
          const rawStatus = (row[4] || 'pending').toLowerCase().trim();
          
          let status: Spool['status'] = 'pending';
          if (['fabricated', 'shipped', 'received', 'delivered', 'installed'].includes(rawStatus)) {
            status = rawStatus as Spool['status'];
          }

          return {
            id: `spool-${tag}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            tag,
            iso,
            drawing,
            weight,
            status,
            lastUpdated: Date.now()
          };
        }).filter(s => s.tag);

        if (spools.length === 0) {
          setError('No valid tags found in Column A. Please verify CSV content.');
        } else {
          setPreview(spools);
          setFile(file);
        }
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
      onUpload(preview as Spool[]);
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
            <div className="bg-blue-600 p-2 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="tech-value text-lg">Spool Registry Import</h2>
              <p className="tech-label">Logistics Node: SPOOL_PROCESSOR_V1</p>
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
                isDragging ? "border-blue-500 bg-blue-500/5" : "border-industrial-line/20 hover:border-industrial-line/40 hover:bg-white/50"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".csv"
              />
              <div className="w-16 h-16 mb-4 flex items-center justify-center bg-industrial-bg border border-industrial-line/10 group-hover:scale-110 transition-transform text-blue-600">
                <FileText className="w-8 h-8 opacity-40" />
              </div>
              <p className="tech-value text-sm mb-2">
                Drop Spool List (CSV) or <span className="text-industrial-accent underline decoration-2 underline-offset-4">Browse Files</span>
              </p>
              <p className="tech-label text-center max-w-xs uppercase text-[10px] tracking-wider leading-relaxed">
                Ingest fabricated spools, drawing numbers, and weights into the logistics module.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="tech-value">Synchronizing Spool Data...</p>
              <p className="tech-label uppercase text-[9px]">Analyzing row metadata</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 flex gap-3 items-start font-mono">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-900 uppercase">Input Exception</p>
                <p className="text-[10px] text-red-800 uppercase mt-1">{error}</p>
                <button 
                  onClick={() => { setFile(null); setError(null); }}
                  className="mt-3 text-[10px] underline uppercase text-red-900 hover:no-underline"
                >
                  Clear Buffer
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
                    <p className="tech-value text-xs uppercase tracking-tight">{file.name}</p>
                    <p className="tech-label uppercase text-[9px]">{preview.length} SPOOLS IDENTIFIED • {(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreview([]); }}
                  className="p-1.5 hover:bg-industrial-bg rounded tech-label uppercase text-[9px] border border-industrial-line/10"
                >
                  Clear
                </button>
              </div>

              <div className="border border-industrial-line/10 overflow-hidden">
                <div className="bg-industrial-ink text-white p-2 tech-label flex justify-between uppercase text-[9px] tracking-widest">
                  <span>Registry Preview</span>
                  <span>Validation</span>
                </div>
                <div className="divide-y divide-industrial-line/5 bg-white">
                  {preview.slice(0, 8).map((item, idx) => (
                    <div key={`spool-preview-${item.id || idx}-${idx}`} className="p-3 flex justify-between items-center border-l-2 border-l-blue-500">
                      <div className="flex flex-col">
                        <span className="tech-value text-[11px] font-bold">{item.tag}</span>
                        <div className="flex gap-2 text-[9px] tech-label uppercase opacity-60">
                          {item.iso && <span>ISO: {item.iso}</span>}
                          {item.drawing && <span>DWG: {item.drawing}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="tech-value text-[9px] px-2 py-0.5 border rounded-full bg-industrial-bg uppercase font-bold tracking-tighter">
                          {item.status}
                        </span>
                        {item.weight && <p className="tech-label text-[9px] mt-1">{item.weight} LBS</p>}
                      </div>
                    </div>
                  ))}
                  {preview.length > 8 && (
                    <div className="p-2 bg-industrial-bg/30 text-center tech-label uppercase text-[9px]">
                      + {preview.length - 8} more records queued in buffer
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
            className="px-6 py-2 border border-industrial-line/20 tech-value text-xs hover:bg-industrial-bg transition-colors uppercase tracking-widest text-[10px]"
          >
            Abort
          </button>
          <button 
            disabled={!file || !!error || isProcessing}
            onClick={handleConfirm}
            className={cn(
              "px-8 py-2 bg-industrial-ink text-white tech-value text-[10px] transition-all uppercase tracking-widest font-bold",
              (!file || !!error || isProcessing) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
            )}
          >
            Finalize Import
          </button>
        </div>
      </motion.div>
    </div>
  );
};
