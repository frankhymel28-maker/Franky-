import React, { useState, useRef } from 'react';
import { X, Printer, Truck, MapPin, Calendar, Hash, ShieldCheck, Download, Edit2, Save, Undo, UserCheck, Timer, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { Manifest, Spool } from '../types';
import { cn } from '../lib/utils';
import { SignatureModal } from './SignatureModal';

interface ManifestTicketProps {
  manifest: Manifest;
  spools: Spool[];
  // Always the owning job's current client name / project title - not
  // stored on the manifest, so renaming the job updates every ticket under
  // it immediately rather than freezing whatever it was at creation time.
  clientName: string;
  jobTitle: string;
  onClose: () => void;
  onUpdateStatus?: (status: Manifest['status'], extra?: Partial<Manifest>) => void;
  onUpdateManifest?: (updates: Partial<Manifest>) => void;
}

export const ManifestTicket: React.FC<ManifestTicketProps> = ({
  manifest,
  spools,
  clientName,
  jobTitle,
  onClose,
  onUpdateStatus,
  onUpdateManifest
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedManifest, setEditedManifest] = useState<Manifest>(manifest);
  const [signingRole, setSigningRole] = useState<'Loader' | 'Driver' | 'Receiver' | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const manifestSpools = spools.filter(s => manifest.items.includes(s.id));
  const totalWeight = manifestSpools.reduce((acc, s) => acc + (s.weight || 0), 0);

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
      // Small delay to ensure any layout updates are rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850, // Force width to match ticket layout
        onclone: (clonedDoc) => {
          // Fix for html2canvas not supporting modern CSS color functions like oklab/oklch
          // which are used by Tailwind 4 for transparency and theme colors.
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const computedStyle = window.getComputedStyle(el);
            
            // Check properties that commony use oklch/oklab in Tailwind 4
            const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
            props.forEach(prop => {
              const val = computedStyle[prop as any];
              if (val && (val.includes('oklch') || val.includes('oklab'))) {
                // simple fallback: if it's a border/line, make it a light gray
                // if it's text, make it black, if bg make it white
                if (prop === 'color') el.style.color = '#141414';
                if (prop === 'backgroundColor') el.style.backgroundColor = 'transparent';
                if (prop === 'borderColor') el.style.borderColor = '#e5e7eb';
              }
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2] // Accurate size based on canvas at 1x
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`MANIFEST_${manifest.manifestNumber}_${manifest.status.toUpperCase()}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSave = () => {
    if (onUpdateManifest) {
      onUpdateManifest(editedManifest);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedManifest(manifest);
    setIsEditing(false);
  };

  const handleChange = (field: keyof Manifest, value: string) => {
    setEditedManifest(prev => ({ ...prev, [field]: value }));
  };

  const [emailToNotify, setEmailToNotify] = useState<string>('');

  const handleSignatureSave = async (signatureData: string, printedName: string) => {
    if (!onUpdateStatus) return;

    if (signingRole === 'Loader') {
      onUpdateStatus('loaded', { 
        loaderSignature: signatureData, 
        loaderName: printedName 
      });
    } else if (signingRole === 'Driver') {
      onUpdateStatus('shipped', { 
        driverSignature: signatureData, 
        driverName: printedName 
      });
    } else if (signingRole === 'Receiver') {
      onUpdateStatus('received', { 
        receiverSignature: signatureData, 
        receiverName: printedName 
      });

      // PROTOTYPE: Mock send email
      if (emailToNotify) {
        try {
          const emailArray = emailToNotify.split(',').map(e => e.trim()).filter(e => e !== '');
          await fetch('/api/send-manifest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: emailArray, manifestId: manifest.id })
          });
          console.log("Manifest sent to:", emailArray);
        } catch (e) {
          console.error("Failed to send manifest email", e);
        }
      }
    }
    setSigningRole(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-industrial-ink/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-12"
      onClick={onClose}
    >
      <SignatureModal 
        isOpen={signingRole !== null}
        onClose={() => setSigningRole(null)}
        onSave={handleSignatureSave}
        role={signingRole || 'Driver'}
        title={`Electronic Authorization: ${signingRole}`}
        initialName={
          signingRole === 'Loader' ? manifest.loaderName :
          signingRole === 'Driver' ? manifest.driverName : 
          manifest.receiverName
        }
        email={emailToNotify}
        onEmailChange={setEmailToNotify}
      />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-5xl h-full flex flex-col shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions Bar ... */}
        <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="tech-value text-sm uppercase tracking-widest font-bold">Shipping Manifest & Material Ticket</h2>
            <div className="h-4 w-[1px] bg-industrial-line/20" />
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] tech-value uppercase font-bold border",
              manifest.status === 'received' || manifest.status === 'completed' ? "bg-green-100 text-green-700 border-green-200" :
              manifest.status === 'shipped' ? "bg-blue-100 text-blue-700 border-blue-200" :
              manifest.status === 'loaded' ? "bg-purple-100 text-purple-700 border-purple-200" :
              "bg-amber-50 text-amber-600 border-amber-200"
            )}>
              STATUS: {manifest.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors text-blue-600"
                >
                  <Edit2 size={14} /> EDIT FIELDS
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors",
                    isGeneratingPDF && "opacity-50 cursor-wait"
                  )}
                >
                  {isGeneratingPDF ? (
                    <Timer size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  {isGeneratingPDF ? "GENERATING..." : "DOWNLOAD PDF"}
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors">
                  <Printer size={14} /> PRINT FORM
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors">
                  <Download size={14} /> EXPORT CSV
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white tech-value text-[10px] font-bold hover:bg-green-700 transition-colors"
                >
                  <Save size={14} /> SAVE CHANGES
                </button>
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-3 py-1.5 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors"
                >
                  <Undo size={14} /> DISCARD
                </button>
              </>
            )}
            <div className="w-[1px] h-6 bg-industrial-line/10 mx-2" />
            <button onClick={onClose} className="p-2 hover:bg-industrial-bg transition-colors rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Ticket Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 flex justify-center bg-white">
          <div ref={ticketRef} className="w-full max-w-[850px] bg-white p-8 md:p-16 flex flex-col gap-10">
            {/* Header Section */}
            <div className="flex justify-between items-start border-b-4 border-industrial-ink pb-8">
              <div className="flex flex-col flex-1">
                <img src="/logo.png" alt="Turner Industries" className="h-20 w-full max-w-sm object-contain object-left" referrerPolicy="no-referrer" />
                <div className="mt-2 flex flex-col gap-0.5" title="Derived from the job - rename the job to update this">
                  <span className="text-[10px] font-sans uppercase font-bold tracking-[0.2em]">
                    {clientName || '—'}
                  </span>
                  {jobTitle && (
                    <span className="tech-label text-[9px] uppercase opacity-60">{jobTitle}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col gap-1 shrink-0">
                <span className="tech-label text-[10px] uppercase font-bold text-industrial-accent">Document ID</span>
                {isEditing ? (
                  <input 
                    value={editedManifest.manifestNumber}
                    onChange={(e) => handleChange('manifestNumber', e.target.value)}
                    className="tech-value text-xl font-bold tracking-tighter text-right border-b border-industrial-line/30 focus:border-industrial-accent outline-none bg-transparent"
                  />
                ) : (
                  <span className="tech-value text-xl font-bold tracking-tighter">{manifest.manifestNumber}</span>
                )}
                <span className="tech-label text-[10px] uppercase mt-2">Manifest Version 1.4-B</span>
              </div>
            </div>

            {/* Logistics Info */}
            <div className="grid grid-cols-2 gap-12 text-xs">
              <div className="space-y-4">
                <div>
                  <h4 className="tech-label font-bold uppercase border-b border-industrial-line/20 mb-2 py-0.5 flex items-center gap-2 text-industrial-accent text-[10px]">
                    <MapPin size={12} /> Origin Point
                  </h4>
                  {isEditing ? (
                    <input 
                      value={editedManifest.origin}
                      onChange={(e) => handleChange('origin', e.target.value)}
                      className="tech-value text-sm font-bold text-industrial-ink uppercase leading-tight w-full border-b border-industrial-line/10 focus:border-industrial-accent outline-none bg-transparent"
                    />
                  ) : (
                    <p className="tech-value text-sm font-bold text-industrial-ink uppercase leading-tight">{manifest.origin}</p>
                  )}
                </div>
                <div>
                  <h4 className="tech-label font-bold uppercase border-b border-industrial-line/20 mb-2 py-0.5 flex items-center gap-2 text-industrial-accent text-[10px]">
                    <Truck size={12} /> Transport Details
                  </h4>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-3 text-[10px] uppercase tech-label font-bold">
                    <span className="opacity-70">Trailer:</span>
                    {isEditing ? (
                      <input 
                        value={editedManifest.trailerNumber || ''}
                        onChange={(e) => handleChange('trailerNumber', e.target.value)}
                        className="text-industrial-ink border-b border-industrial-line/30 bg-transparent outline-none"
                      />
                    ) : (
                      <span className="text-industrial-ink">{manifest.trailerNumber || '--'}</span>
                    )}

                    <span className="opacity-70">Truck:</span>
                    {isEditing ? (
                      <input 
                        value={editedManifest.truckNumber || ''}
                        onChange={(e) => handleChange('truckNumber', e.target.value)}
                        className="text-industrial-ink border-b border-industrial-line/30 bg-transparent outline-none"
                      />
                    ) : (
                      <span className="text-industrial-ink">{manifest.truckNumber || '--'}</span>
                    )}

                    <span className="opacity-70">Carrier:</span>
                    {isEditing ? (
                      <input 
                        value={editedManifest.carrier || ''}
                        onChange={(e) => handleChange('carrier', e.target.value)}
                        className="text-industrial-ink border-b border-industrial-line/30 bg-transparent outline-none"
                      />
                    ) : (
                      <span className="text-industrial-ink">{manifest.carrier || 'Turner Transport'}</span>
                    )}

                    <span className="opacity-70">Driver:</span>
                    {isEditing ? (
                      <input 
                        value={editedManifest.driverName || ''}
                        onChange={(e) => handleChange('driverName', e.target.value)}
                        className="text-industrial-ink border-b border-industrial-line/30 bg-transparent outline-none"
                      />
                    ) : (
                      <span className="text-industrial-ink">{manifest.driverName || 'John Doe'}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="tech-label font-bold uppercase border-b border-industrial-line/20 mb-2 py-0.5 flex items-center gap-2 text-industrial-accent text-[10px]">
                    <MapPin size={12} /> Destination Terminal
                  </h4>
                  {isEditing ? (
                    <div className="space-y-2">
                       <input 
                          value={editedManifest.destination}
                          onChange={(e) => handleChange('destination', e.target.value)}
                          placeholder="LOCATION NAME..."
                          className="tech-value text-sm font-bold text-industrial-ink uppercase leading-tight w-full border-b border-industrial-line/10 focus:border-industrial-accent outline-none bg-transparent"
                        />
                        <textarea 
                          value={editedManifest.destinationAddress || ''}
                          onChange={(e) => handleChange('destinationAddress', e.target.value)}
                          placeholder="STREET ADDRESS..."
                          className="tech-value text-[10px] text-industrial-ink/70 uppercase leading-relaxed w-full border border-industrial-line/10 p-1 resize-none h-12 bg-gray-50/50 outline-none"
                        />
                    </div>
                  ) : (
                    <>
                      <p className="tech-value text-sm font-bold text-industrial-ink uppercase leading-tight">{manifest.destination}</p>
                      {manifest.destinationAddress && (
                        <p className="tech-value text-[10px] text-industrial-ink/60 uppercase mt-1 leading-relaxed max-w-[200px]">
                          {manifest.destinationAddress}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <h4 className="tech-label font-bold uppercase border-b border-industrial-line/20 mb-2 py-0.5 flex items-center gap-2 text-industrial-accent text-[10px]">
                    <Calendar size={12} /> Temporal Markers
                  </h4>
                  <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 text-[10px] uppercase opacity-70 tech-label font-bold">
                    <span>Created:</span>
                    <span className="text-industrial-ink">{new Date(manifest.createdAt).toLocaleDateString()}</span>
                    <span>Loaded:</span>
                    <span className="text-industrial-ink">{manifest.loadedAt ? new Date(manifest.loadedAt).toLocaleDateString() : 'PENDING'}</span>
                    <span>Shipped:</span>
                    <span className="text-industrial-ink">{manifest.shippedAt ? new Date(manifest.shippedAt).toLocaleDateString() : 'PENDING'}</span>
                    <span>Received:</span>
                    <span className="text-industrial-ink">{manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleDateString() : 'PENDING'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manifest Items Table */}
            <div className="flex-1">
              <h4 className="tech-label font-bold uppercase border-b border-industrial-line mb-4 py-2 flex items-center gap-2 text-industrial-ink text-[10px] tracking-widest bg-gray-50 px-4">
                <Hash size={12} /> Registry of Enclosed Material
              </h4>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-industrial-line/20 text-industrial-accent uppercase tracking-tighter text-[9px] font-bold">
                    <th className="py-2 px-4">Line Item</th>
                    <th className="py-2">Spool Tag / Reference</th>
                    <th className="py-2">Drawing #</th>
                    <th className="py-2">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-line/10">
                  {manifestSpools.map((spool, idx) => (
                    <tr key={`manifest-spool-${spool.id}-${idx}`} className="tech-value text-[10px] uppercase h-10">
                      <td className="px-4 font-mono opacity-40">{(idx + 1).toString().padStart(3, '0')}</td>
                      <td className="font-bold underline decoration-industrial-accent/30 underline-offset-2">{spool.tag}</td>
                      <td className="opacity-60">{spool.drawing || '--'}</td>
                      <td>{spool.weight ? `${spool.weight.toLocaleString()} LBS` : '--'}</td>
                    </tr>
                  ))}
                  <tr key="manifest-summary" className="bg-gray-50/80 font-bold tech-value h-12">
                     <td colSpan={3} className="px-4 text-right tech-label uppercase text-[9px] tracking-widest">Total Manifest Cargo Weight:</td>
                     <td className="text-industrial-accent">{totalWeight.toLocaleString()} LBS</td>
                     <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-6 flex flex-col">
                <label className="tech-label text-[9px] uppercase font-bold text-industrial-accent mb-1 px-4">Logistics Notes</label>
                <div className="p-4 border border-dashed border-industrial-line/20 bg-gray-50/30 text-[9px] tech-label italic leading-relaxed uppercase">
                  {isEditing ? (
                    <textarea 
                      value={editedManifest.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="ADD NOTES REGARDING SHIPMENT DISCREPANCIES OR SPECIAL HANDLING..."
                      className="w-full bg-transparent outline-none resize-none h-16"
                    />
                  ) : (
                    manifest.notes || "Notes: Materials must be inspected upon arrival. Any cargo discrepancies or visible damage to assembly coatings or threads must be noted on this ticket prior to final site acceptance."
                  )}
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="mt-auto grid grid-cols-3 gap-8 pt-12 border-t border-industrial-line/20">
              <div className="flex flex-col gap-4">
                <div className="border-b-2 border-industrial-ink pb-1 h-20 flex flex-col justify-end relative group">
                  {manifest.loaderSignature ? (
                    <div className="flex flex-col items-center">
                       <img src={manifest.loaderSignature} alt="Loader Signature" className="h-16 object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    manifest.status === 'draft' ? (
                      <button 
                        onClick={() => setSigningRole('Loader')}
                        className="w-full h-full border border-dashed border-industrial-line/30 flex items-center justify-center gap-2 tech-label text-[10px] hover:bg-gray-50 transition-colors uppercase font-bold"
                      >
                         <UserCheck size={14} /> Tap to Sign (Loader)
                      </button>
                    ) : (
                      <div className="h-full flex items-center justify-center tech-label text-[10px] opacity-20 uppercase font-black italic">Signature Pending</div>
                    )
                  )}
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex justify-between items-baseline">
                      <span className="text-[9px] uppercase font-bold tech-label tracking-tighter">Loading Operator</span>
                      <span className="tech-value text-[10px] font-bold">{manifest.loaderName || '--'}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-40 text-[8px] tech-label font-bold uppercase">
                      <Timer size={10} />
                      {manifest.loadedAt ? new Date(manifest.loadedAt).toLocaleString() : 'PENDING LOAD'}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border-b-2 border-industrial-ink pb-1 h-20 flex flex-col justify-end relative group">
                  {manifest.driverSignature ? (
                    <div className="flex flex-col items-center">
                       <img src={manifest.driverSignature} alt="Driver Signature" className="h-16 object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    manifest.status === 'loaded' ? (
                      <button 
                        onClick={() => setSigningRole('Driver')}
                        className="w-full h-full border border-dashed border-industrial-line/30 flex items-center justify-center gap-2 tech-label text-[10px] hover:bg-gray-50 transition-colors uppercase font-bold"
                      >
                         <UserCheck size={14} /> Tap to Sign (Driver)
                      </button>
                    ) : (
                      <div className="h-full flex items-center justify-center tech-label text-[10px] opacity-20 uppercase font-black italic">Signature Pending</div>
                    )
                  )}
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex justify-between items-baseline">
                      <span className="text-[9px] uppercase font-bold tech-label tracking-tighter">Shipping Agent / Driver</span>
                      <span className="tech-value text-[10px] font-bold">{manifest.driverName || '--'}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-40 text-[8px] tech-label font-bold uppercase">
                      <Timer size={10} />
                      {manifest.shippedAt ? new Date(manifest.shippedAt).toLocaleString() : 'PENDING DEPARTURE'}
                   </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border-b-2 border-industrial-ink pb-1 h-20 flex flex-col justify-end relative">
                  {manifest.receiverSignature ? (
                    <div className="flex flex-col items-center">
                       <img src={manifest.receiverSignature} alt="Receiver Signature" className="h-16 object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    manifest.status === 'shipped' ? (
                      <button 
                        onClick={() => setSigningRole('Receiver')}
                        className="w-full h-full border border-dashed border-industrial-line/30 flex items-center justify-center gap-2 tech-label text-[10px] hover:bg-gray-50 transition-colors uppercase font-bold"
                      >
                         <UserCheck size={14} /> Tap to Sign (Receiver)
                      </button>
                    ) : (
                      <div className="h-full flex items-center justify-center tech-label text-[10px] opacity-20 uppercase font-black italic">Signature Pending</div>
                    )
                  )}
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex justify-between items-baseline">
                      <span className="text-[9px] uppercase font-bold tech-label tracking-tighter">Receiving Authority / Client</span>
                      <span className="tech-value text-[10px] font-bold">{manifest.receiverName || '--'}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-40 text-[8px] tech-label font-bold uppercase">
                      <Timer size={10} />
                      {manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleString() : 'PENDING ARRIVAL'}
                   </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center opacity-30 tech-label text-[8px] uppercase tracking-widest">
               <div className="flex items-center gap-2">
                 <ShieldCheck size={10} />
                 <span>ISO 9001:2015 Compliant Material Control Tracking</span>
               </div>
               <span>Page 01 of 01</span>
            </div>
          </div>
        </div>

        {/* Status Action Bar */}
        {!isEditing && (
          <div className="p-6 border-t border-industrial-line/10 bg-industrial-bg/10 flex justify-center gap-4 shrink-0">
             {manifest.status === 'draft' && onUpdateStatus && (
               <button 
                 onClick={() => setSigningRole('Loader')}
                 className="px-12 py-3 bg-purple-600 text-white tech-value text-xs uppercase tracking-widest font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
               >
                 <UserCheck size={16} /> Loader Auth & Confirm Load
               </button>
             )}
             {manifest.status === 'loaded' && onUpdateStatus && (
               <button 
                 onClick={() => setSigningRole('Driver')}
                 className="px-12 py-3 bg-blue-600 text-white tech-value text-xs uppercase tracking-widest font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
               >
                 <UserCheck size={16} /> Driver Auth & Execute Export
               </button>
             )}
             {manifest.status === 'shipped' && onUpdateStatus && (
               <button 
                 onClick={() => setSigningRole('Receiver')}
                 className="px-12 py-3 bg-green-600 text-white tech-value text-xs uppercase tracking-widest font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
               >
                 <UserCheck size={16} /> Receiver Auth & Import Material
               </button>
             )}
             {manifest.status === 'received' && onUpdateStatus && (
               <button 
                 onClick={() => onUpdateStatus('completed')}
                 className="px-12 py-3 bg-industrial-ink text-white tech-value text-xs uppercase tracking-widest font-bold hover:bg-industrial-accent hover:text-industrial-ink transition-all shadow-lg"
               >
                 Archive To Project Records
               </button>
             )}
             {manifest.status === 'completed' && (
               <button 
                 onClick={handleDownloadPDF}
                 disabled={isGeneratingPDF}
                 className="px-12 py-3 bg-industrial-ink text-white tech-value text-xs uppercase tracking-widest font-bold hover:bg-industrial-accent hover:text-industrial-ink transition-all shadow-lg flex items-center gap-2"
               >
                 {isGeneratingPDF ? <Timer size={16} className="animate-spin" /> : <FileText size={16} />}
                 {isGeneratingPDF ? "Processing Document..." : "Download Official PDF Record"}
               </button>
             )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
