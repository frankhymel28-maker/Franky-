import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string, printedName: string) => void;
  title: string;
  role: 'Loader' | 'Driver' | 'Receiver';
  initialName?: string;
  email?: string;
  onEmailChange?: (email: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title, 
  role,
  initialName = '',
  email,
  onEmailChange
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [printedName, setPrintedName] = useState(initialName || '');

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    const canvas = sigCanvas.current;
    if (!canvas) return;

    if (canvas.isEmpty()) {
      alert('Please provide a signature before saving.');
      return;
    }
    
    if (!printedName || !printedName.trim()) {
      alert('Please print your name.');
      return;
    }

    try {
      let signatureData: string | undefined;
      
      // Attempt to get trimmed canvas first
      try {
        signatureData = canvas.getTrimmedCanvas().toDataURL('image/png');
      } catch (trimError) {
        console.warn('Trimming failed, falling back to full canvas:', trimError);
        // Fallback to the raw canvas data directly from the underlying canvas element
        const rawCanvas = canvas.getCanvas();
        signatureData = rawCanvas.toDataURL('image/png');
      }

      if (signatureData) {
        onSave(signatureData, printedName.trim());
      } else {
        throw new Error('No signature data captured');
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to process signature. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="fixed inset-0 z-[200] bg-industrial-ink/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div 
            key="signature-modal-content"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md border-2 border-industrial-line shadow-2xl"
          >
            <div className="p-4 border-b border-industrial-line/10 flex justify-between items-center bg-gray-50">
              <h3 className="tech-value text-xs uppercase tracking-widest font-bold">{title}</h3>
              <button 
                type="button"
                onClick={onClose} 
                className="p-1 hover:bg-gray-200 transition-colors rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="tech-label text-[10px] uppercase font-bold text-industrial-accent">Printed {role} Name</label>
                <input 
                  autoFocus
                  value={printedName}
                  onChange={(e) => setPrintedName(e.target.value)}
                  className="w-full tech-value text-sm border-b-2 border-industrial-line/20 focus:border-industrial-accent outline-none bg-transparent py-2"
                  placeholder="ENTER FULL NAME..."
                />
              </div>

              {role === 'Receiver' && (
                <div className="space-y-2">
                  <label className="tech-label text-[10px] uppercase font-bold text-industrial-accent">Notification Emails (comma separated)</label>
                  <input 
                    type="text"
                    value={email || ''}
                    onChange={(e) => onEmailChange?.(e.target.value)}
                    className="w-full tech-value text-sm border-b-2 border-industrial-line/20 focus:border-industrial-accent outline-none bg-transparent py-2"
                    placeholder="CLIENT1@EMAIL.COM, CLIENT2@EMAIL.COM..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="tech-label text-[10px] uppercase font-bold text-industrial-accent">Digital Signature</label>
                  <button 
                    type="button"
                    onClick={clear} 
                    className="flex items-center gap-1 text-[9px] tech-label uppercase hover:text-industrial-ink transition-colors"
                  >
                    <RotateCcw size={10} /> Reset Canvas
                  </button>
                </div>
                <div className="border-2 border-industrial-line/10 bg-gray-50 rounded-sm overflow-hidden h-48 relative">
                   <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="black"
                    velocityFilterWeight={0.7}
                    minWidth={0.5}
                    maxWidth={2.5}
                    canvasProps={{
                      className: 'signature-canvas w-full h-full cursor-crosshair touch-none',
                      style: { width: '100%', height: '100%' }
                    }}
                  />
                  <div className="absolute bottom-4 left-0 right-0 border-b border-industrial-ink/20 pointer-events-none mx-4" />
                </div>
                <p className="text-[9px] tech-label text-center uppercase opacity-40">Sign with finger or stylus above the line</p>
              </div>
            </div>

            <div className="p-4 border-t border-industrial-line/10 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-industrial-line/20 tech-value text-[10px] uppercase tracking-widest font-bold hover:bg-gray-100 transition-colors"
              >
                Abort
              </button>
              <button 
                type="button"
                onClick={save}
                className="flex-1 py-3 bg-industrial-ink text-white tech-value text-[10px] uppercase tracking-widest font-bold hover:bg-industrial-accent hover:text-industrial-ink transition-all flex items-center justify-center gap-2"
              >
                <Check size={14} /> Submit & Authorize
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
