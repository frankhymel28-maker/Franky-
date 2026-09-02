import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  BarChart3, 
  Package, 
  Truck, 
  Plus, 
  Search, 
  Activity,
  Menu,
  X,
  MapPin,
  FileUp,
  AlertCircle,
  Check,
  ClipboardList,
  FileText,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle,
  Camera,
  Upload,
  RotateCw,
  Zap,
  PackageCheck,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';
import { cn } from './lib/utils';
import { MOCK_MATERIALS, MOCK_LOGISTICS } from './constants';
import { Job, Material, LogisticsEntry, MaterialStatus, LogisticsType, MaterialInstance, UnallocatedItem, VENDORS, Spool, Manifest, ManifestStatus } from './types';
import { MovementForm } from './components/MovementForm';
import { BOMUpload } from './components/BOMUpload';
import { SpoolUpload } from './components/SpoolUpload';
import { ManifestTicket } from './components/ManifestTicket';
import { JobsDashboard } from './components/JobsDashboard';
import { MTRViewer } from './components/MTRViewer';
import { FlangeIcon, ValveIcon, FittingIcon, PipeIcon } from './components/MaterialIcons';
import { GlobalHeatLine } from './components/AddGlobalInventoryModal';
import { GoogleGenAI, Type } from "@google/genai";
import {
  loadLocalState,
  saveToLocalStorage,
  syncStateWithBackend 
} from './sync';

// Components
const StatCard = ({ label, value, subValue, icon: Icon, colorClass }: { label: string, value: string | number, subValue?: string, icon: any, colorClass?: string }) => (
  <div className="bg-white border border-industrial-line/10 p-4 flex flex-col gap-0.5">
    <div className="flex justify-between items-start">
      <span className="tech-label">{label}</span>
      <Icon className={cn("w-4 h-4 opacity-70", colorClass)} />
    </div>
    <div className="flex flex-col">
      <span className="text-xl tech-value">{value}</span>
      {subValue && <span className="text-[10px] tech-label uppercase opacity-60 tracking-wider font-bold">{subValue}</span>}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: MaterialStatus }) => {
  const config = {
    received: 'bg-green-100 text-green-800 border-green-200',
    'in-transit': 'bg-blue-100 text-blue-800 border-blue-200',
    installed: 'bg-gray-100 text-gray-800 border-gray-200',
    'low-stock': 'bg-red-100 text-red-800 border-red-200',
    expected: 'bg-amber-100 text-amber-800 border-amber-200',
  };
  return (
    <span className={cn("px-1.5 py-0.5 text-[9px] border tech-value rounded-sm", config[status])}>
      {status}
    </span>
  );
};

// AI Service for OCR
const extractMTRInfo = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        {
          text: "Identify the Heat Number and MTR Reference/Certificate Number from this document. Return only the JSON."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            heatNumber: { type: Type.STRING, description: "The heat number found on the material test report" },
            mtrReference: { type: Type.STRING, description: "The certificate or MTR reference number" }
          },
          required: ["heatNumber", "mtrReference"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Extraction failed:", error);
    return null;
  }
};

const CameraScanner = ({ onCapture, onClose }: { onCapture: (base64: string) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  React.useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(activeStream);
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        alert("Please allow camera access to scan documents.");
        onClose();
      }
    };

    startCamera();
    return () => {
      activeStream?.getTracks().forEach(track => track.stop());
    };
  }, [onClose]);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
        onCapture(base64);
      }
    }
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur text-white z-10">
        <span className="tech-value text-sm uppercase tracking-widest font-bold">Document Scanner</span>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] h-[60%] border-2 border-industrial-accent border-dashed opacity-50 relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-industrial-accent" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-industrial-accent" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-industrial-accent" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-industrial-accent" />
          </div>
        </div>
      </div>

      <div className="p-8 bg-black flex justify-center items-center gap-8">
        <button 
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white" />
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const TraceabilityModal = ({ material, onSave, onClose }: { 
  material: any, 
  onSave: (instances: MaterialInstance[]) => void, 
  onClose: () => void 
}) => {
  const [instances, setInstances] = useState<MaterialInstance[]>(material.instances || []);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const undocumentedQty = (material.quantity || material.receivedQuantity || 0) - instances.reduce((acc, inst) => acc + (inst.quantity || 0), 0);

  const addInstance = () => {
    setInstances([...instances, {
      id: `inst-new-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      heatNumber: '',
      mtrNumber: '',
      quantity: undocumentedQty > 0 ? undocumentedQty : 1,
      receivedDate: Date.now(),
      qualityStatus: 'pending'
    }]);
  };

  const removeInstance = (id: string) => {
    setInstances(instances.filter(i => i.id !== id));
  };

  const updateInstance = (id: string, updates: Partial<MaterialInstance>) => {
    setInstances(instances.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleCapture = async (base64: string, idx: number) => {
    const data = await extractMTRInfo(base64);
    if (data) {
      updateInstance(instances[idx].id, {
        heatNumber: data.heatNumber,
        mtrNumber: data.mtrReference,
        mtrUrl: `data:image/jpeg;base64,${base64}`
      });
    }
    setIsScannerOpen(false);
    setScanningIdx(null);
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
            <span className="tech-label text-[10px] uppercase font-bold text-industrial-accent tracking-widest">Traceability Management</span>
            <h2 className="tech-value text-xl mt-1">{material.name}</h2>
            <div className="flex gap-4 mt-1">
              <span className="tech-label opacity-60 uppercase font-bold text-[10px]">Total Stock: {material.quantity || material.receivedQuantity} {material.unit}</span>
              <span className={cn(
                "tech-label uppercase font-bold text-[10px]",
                undocumentedQty > 0 ? "text-amber-600" : undocumentedQty < 0 ? "text-red-600" : "text-green-600"
              )}>
                {undocumentedQty > 0 ? `${undocumentedQty} Units Undocumented` : undocumentedQty < 0 ? `${Math.abs(undocumentedQty)} Units Over-Documented` : 'Fully Documented'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-industrial-bg rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="tech-label uppercase font-bold text-[11px] tracking-wider">Heat Records</h3>
            <button 
              onClick={addInstance}
              className="flex items-center gap-1.5 px-3 py-1 bg-industrial-ink text-white tech-value text-[9px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors uppercase font-bold"
            >
              <Plus size={10} /> Add Heat Record
            </button>
          </div>

          <div className="space-y-4">
            {instances.map((inst, idx) => (
              <div key={`trace-inst-${inst.id}-${idx}`} className="p-4 border border-industrial-line/10 bg-industrial-bg/5 space-y-4 relative group">
                <button 
                  onClick={() => removeInstance(inst.id)}
                  className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
                
                <div className="grid grid-cols-12 gap-4">
                   <div className="col-span-4">
                    <label className="tech-label text-[9px] mb-1 block">HEAT NUMBER</label>
                    <div className="relative">
                      <input 
                        className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent pr-8"
                        value={inst.heatNumber}
                        onChange={(e) => updateInstance(inst.id, { heatNumber: e.target.value })}
                        placeholder="e.g. H-9928"
                      />
                      <button 
                        onClick={() => { setScanningIdx(idx); setIsScannerOpen(true); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-industrial-accent hover:scale-110"
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="tech-label text-[9px] mb-1 block">VENDOR</label>
                    <select 
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                      value={inst.vendor || ''}
                      onChange={(e) => updateInstance(inst.id, { vendor: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {VENDORS.map((v, vIdx) => <option key={`vendor-opt-${inst.id}-${v}-${vIdx}`} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="tech-label text-[9px] mb-1 block">MTR REF</label>
                    <input 
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                      value={inst.mtrNumber}
                      onChange={(e) => updateInstance(inst.id, { mtrNumber: e.target.value })}
                      placeholder="MTR-881"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="tech-label text-[9px] mb-1 block">QUANTITY</label>
                    <input 
                      type="number"
                      className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent font-bold"
                      value={inst.quantity === 0 ? '' : inst.quantity}
                      onChange={(e) => updateInstance(inst.id, { quantity: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-industrial-line/5 pt-3">
                  <div className="flex-1">
                    <label className="tech-label text-[9px] mb-1 block uppercase">Verification Status</label>
                    <div className="flex gap-2">
                      {['pending', 'verified', 'rejected'].map((s, sIdx) => (
                        <button
                          key={`${inst.id}-status-${s}-${sIdx}`}
                          onClick={() => updateInstance(inst.id, { qualityStatus: s as any })}
                          className={cn(
                            "px-3 py-1 text-[9px] tech-value border rounded transition-colors uppercase",
                            inst.qualityStatus === s 
                              ? (s === 'verified' ? "bg-green-600 text-white border-green-700" : s === 'rejected' ? "bg-red-600 text-white border-red-700" : "bg-amber-600 text-white border-amber-700")
                              : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <label className="tech-label text-[9px] mb-1 block">DOCUMENTATION</label>
                    {isExtracting ? (
                      <span className="text-[9px] tech-value text-industrial-accent">Extracting...</span>
                    ) : inst.mtrUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] tech-value text-green-600 flex items-center gap-1 font-bold">
                          <Check size={10} /> ATTACHED
                        </span>
                        <button 
                          onClick={() => updateInstance(inst.id, { mtrUrl: undefined })}
                          className="text-[9px] tech-value text-red-500 hover:underline"
                        >
                          REMOVE
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-[9px] tech-value text-industrial-accent hover:underline flex items-center gap-1">
                        <Upload size={10} /> UPLOAD MTR
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*,.pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsExtracting(true);
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const fileUrl = reader.result as string;
                                const base64Data = fileUrl.split(',')[1];
                                
                                let extractedMtr = '';
                                if (file.type.startsWith('image/')) {
                                  const result = await extractMTRInfo(base64Data);
                                  if (result) extractedMtr = result.mtrReference;
                                }
                                
                                updateInstance(inst.id, { 
                                  mtrUrl: fileUrl,
                                  mtrNumber: inst.mtrNumber || extractedMtr
                                });
                                setIsExtracting(false);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {instances.length === 0 && (
              <div className="py-12 border-2 border-dashed border-industrial-line/10 flex flex-col items-center gap-3 text-industrial-line">
                <ShieldCheck size={48} className="opacity-20" />
                <p className="tech-value text-xs italic">No traceability records added to this item yet.</p>
                <button onClick={addInstance} className="text-industrial-accent hover:underline tech-value text-[11px] font-bold">ADD INITIAL HEAT RECORD</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-industrial-line/10 bg-industrial-bg/10 flex justify-between gap-4">
          <div className="text-right">
             {undocumentedQty !== 0 && (
               <div className="flex items-center gap-1.5 text-amber-600 tech-label text-[10px] font-bold">
                 <AlertCircle size={14} /> 
                 {undocumentedQty > 0 
                  ? "Documentation shortfall detected" 
                  : "Assigned quantity exceeds stock"
                 }
               </div>
             )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-industrial-line/20 tech-value text-xs hover:bg-white transition-colors uppercase"
            >
              Cancel
            </button>
            <button 
              onClick={() => onSave(instances)}
              className="px-8 py-2 bg-industrial-ink text-white tech-value text-xs hover:bg-industrial-accent hover:text-industrial-ink transition-colors uppercase font-bold"
            >
              Save Documentation
            </button>
          </div>
        </div>

        {isScannerOpen && (
          <CameraScanner 
            onCapture={(base64) => handleCapture(base64, scanningIdx!)} 
            onClose={() => setIsScannerOpen(false)} 
          />
        )}
      </motion.div>
    </motion.div>
  );
};

const EMPTY_ARRAY: any[] = [];

// Filters an "all jobs" array down to one job's records, and returns a
// setter with the same signature as the original per-job useState setters
// (value or updater fn) so existing call sites (setMaterials(prev => ...))
// keep working unchanged. Any record missing a jobId (i.e. newly created)
// is stamped with the active job automatically; other jobs' records are
// left untouched in the "all" array.
function useJobScoped<T extends { jobId?: string }>(
  all: T[],
  setAll: React.Dispatch<React.SetStateAction<T[]>>,
  activeJobId: string | null
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const scoped = useMemo(
    () => (activeJobId ? all.filter(item => item.jobId === activeJobId) : (EMPTY_ARRAY as T[])),
    [all, activeJobId]
  );
  const setScoped = useCallback((update: React.SetStateAction<T[]>) => {
    setAll(prevAll => {
      const others = activeJobId ? prevAll.filter(item => item.jobId !== activeJobId) : prevAll;
      const prevScoped = activeJobId ? prevAll.filter(item => item.jobId === activeJobId) : prevAll;
      const nextScoped = typeof update === 'function' ? (update as (p: T[]) => T[])(prevScoped) : update;
      const stamped = nextScoped.map(item => item.jobId ? item : { ...item, jobId: activeJobId ?? undefined });
      return activeJobId ? [...others, ...stamped] : stamped;
    });
  }, [activeJobId, setAll]);
  return [scoped, setScoped];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'logistics' | 'remaining' | 'global_inventory' | 'quality'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // App Sync & Connection States
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);

  // Load initial cached state or fallback to default mocks
  const initialState = React.useMemo(() => loadLocalState(), []);

  // Job selection - null means "on the Jobs dashboard", not inside any job
  const [jobs, setJobs] = useState<Job[]>(initialState.jobs);
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('franky_active_job_id');
    } catch {
      return null;
    }
  });
  React.useEffect(() => {
    try {
      if (activeJobId) localStorage.setItem('franky_active_job_id', activeJobId);
      else localStorage.removeItem('franky_active_job_id');
    } catch { /* local storage unavailable, ignore */ }
  }, [activeJobId]);
  // If the active job was deleted (or never existed), fall back to the dashboard
  React.useEffect(() => {
    if (activeJobId && jobs.length > 0 && !jobs.some(j => j.id === activeJobId)) {
      console.warn(`[JOBS] activeJobId "${activeJobId}" not found in current jobs list (${jobs.map(j => j.jobNumber).join(', ')}) - bouncing back to the Jobs dashboard.`);
      setActiveJobId(null);
    }
  }, [activeJobId, jobs]);

  // App State - these hold EVERY job's records. All rendering/mutation below
  // operates on the job-scoped views defined further down (materials, spools,
  // etc.), which are derived from these "all" arrays and shadow these names.
  const [allMaterials, setAllMaterials] = useState<Material[]>(initialState.materials);
  const [allUnallocatedPool, setAllUnallocatedPool] = useState<UnallocatedItem[]>(initialState.unallocatedPool);
  const [allSpools, setAllSpools] = useState<Spool[]>(initialState.spools);
  const [allManifests, setAllManifests] = useState<Manifest[]>(initialState.manifests);
  const [allLogs, setAllLogs] = useState<LogisticsEntry[]>(initialState.logs);
  const [selectedSpoolIds, setSelectedSpoolIds] = useState<string[]>([]);

  // Job-scoped views of the "all" arrays above, plus setters with the exact
  // same signature as the original useState setters (value or updater fn)
  // that operate on and return job-scoped arrays, so every existing call
  // site below (setMaterials(prev => ...), etc.) keeps working unchanged.
  const [materials, setMaterials] = useJobScoped(allMaterials, setAllMaterials, activeJobId);
  const [unallocatedPool, setUnallocatedPool] = useJobScoped(allUnallocatedPool, setAllUnallocatedPool, activeJobId);
  const [spools, setSpools] = useJobScoped(allSpools, setAllSpools, activeJobId);
  const [manifests, setManifests] = useJobScoped(allManifests, setAllManifests, activeJobId);
  const [logs, setLogs] = useJobScoped(allLogs, setAllLogs, activeJobId);

  const syncingFromServerRef = useRef(false);
  const isSyncingRef = useRef(false);
  // If a sync is requested while one is already in flight, it's dropped
  // rather than queued - this flag remembers to retry once the in-flight
  // one finishes, so newly created data is never just left unsent.
  const pendingSyncRef = useRef(false);
  // Bumped whenever any synced state changes locally. Used to detect (and
  // discard) a sync response that started before, and resolved after, a
  // newer local edit - otherwise that stale response would overwrite the
  // newer edit with the older data it was sent with. This happens for real:
  // React StrictMode double-fires the mount-time sync effect in dev, so a
  // stale first request is still in flight when a user creates something
  // moments after page load.
  const localVersionRef = useRef(0);
  React.useEffect(() => {
    localVersionRef.current++;
  }, [jobs, allMaterials, allUnallocatedPool, allSpools, allManifests, allLogs]);

  // Unified function to sync with backend SQLite DB. Always syncs the FULL
  // multi-job dataset (all "all*" arrays), not just the currently open job -
  // otherwise switching jobs or reloading would lose other jobs' data.
  const triggerSync = useCallback(async (forcedState?: {
    jobs?: Job[];
    materials?: Material[];
    unallocatedPool?: UnallocatedItem[];
    spools?: Spool[];
    manifests?: Manifest[];
    logs?: LogisticsEntry[];
  }) => {
    if (isSyncingRef.current) {
      pendingSyncRef.current = true;
      return;
    }
    isSyncingRef.current = true;
    const versionAtRequestStart = localVersionRef.current;
    setSyncStatus('syncing');

    try {
      const stateToSync = {
        jobs: forcedState?.jobs !== undefined ? forcedState.jobs : jobs,
        materials: forcedState?.materials !== undefined ? forcedState.materials : allMaterials,
        unallocatedPool: forcedState?.unallocatedPool !== undefined ? forcedState.unallocatedPool : allUnallocatedPool,
        spools: forcedState?.spools !== undefined ? forcedState.spools : allSpools,
        manifests: forcedState?.manifests !== undefined ? forcedState.manifests : allManifests,
        logs: forcedState?.logs !== undefined ? forcedState.logs : allLogs,
      };

      console.log(`[SYNC] Sending ${stateToSync.jobs.length} jobs, ${stateToSync.materials.length} materials to server...`);
      const merged = await syncStateWithBackend(stateToSync);
      console.log(`[SYNC] Server responded with ${merged.jobs.length} jobs:`, merged.jobs.map(j => j.jobNumber));

      if (localVersionRef.current === versionAtRequestStart) {
        // No local edits happened while this request was in flight - safe
        // to apply. If there were, applying this older snapshot would wipe
        // out the newer edit, so skip it; pendingSyncRef/the debounce/the
        // 8s interval will pick the newer state up in a follow-up sync.
        syncingFromServerRef.current = true;
        setJobs(merged.jobs);
        setAllMaterials(merged.materials);
        setAllUnallocatedPool(merged.unallocatedPool);
        setAllSpools(merged.spools);
        setAllManifests(merged.manifests);
        setAllLogs(merged.logs);
      } else {
        console.warn('[SYNC] Discarding stale response - local data changed while this request was in flight. A follow-up sync will pick up the newer data.');
      }

      setSyncStatus('synced');
      setLastSyncedTime(Date.now());
    } catch (err) {
      console.warn('[SYNC] Offline or server inaccessible. Caching updates locally.', err);
      setSyncStatus('offline');
    } finally {
      isSyncingRef.current = false;
      if (pendingSyncRef.current) {
        console.log('[SYNC] Retrying a sync that was queued while the previous one was in flight.');
        pendingSyncRef.current = false;
        triggerSyncRef.current();
      }
    }
  }, [jobs, allMaterials, allUnallocatedPool, allSpools, allManifests, allLogs]);

  // Save to local storage and trigger sync when state changes
  React.useEffect(() => {
    if (syncingFromServerRef.current) {
      syncingFromServerRef.current = false;
      return;
    }

    // Save to local storage instantly for offline protection
    saveToLocalStorage({ jobs, materials: allMaterials, unallocatedPool: allUnallocatedPool, spools: allSpools, manifests: allManifests, logs: allLogs });

    // Debounce the network synchronization
    const timer = setTimeout(() => {
      triggerSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [jobs, allMaterials, allUnallocatedPool, allSpools, allManifests, allLogs, triggerSync]);

  // Keep a ref to the latest triggerSync so the interval/listener below never
  // call a stale closure holding onto old (e.g. pre-clear) state.
  const triggerSyncRef = useRef(triggerSync);
  React.useEffect(() => {
    triggerSyncRef.current = triggerSync;
  }, [triggerSync]);

  // Run initial sync on mount and set up periodic auto-sync every 8 seconds
  React.useEffect(() => {
    // Initial sync
    triggerSyncRef.current();

    const interval = setInterval(() => {
      triggerSyncRef.current();
    }, 8000);

    // Watch for online connection status to automatically trigger sync
    const handleOnline = () => {
      triggerSyncRef.current();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [isSpoolModalOpen, setIsSpoolModalOpen] = useState(false);
  const [logisticsSubTab, setLogisticsSubTab] = useState<'spools' | 'manifests'>('spools');
  const [manifestFilter, setManifestFilter] = useState<'active' | 'archived'>('active');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [receivingMaterialId, setReceivingMaterialId] = useState<string | null>(null);
  const [tempReceiptLines, setTempReceiptLines] = useState<{ id: string, heat: string, vendor?: string, mtr: string, qty: number, fileName?: string, fileData?: string }[]>([]);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewingMTR, setViewingMTR] = useState<any | null>(null);
  const [viewingManifestId, setViewingManifestId] = useState<string | null>(null);
  const [allocatingItem, setAllocatingItem] = useState<UnallocatedItem | null>(null);
  const [tracingMaterial, setTracingMaterial] = useState<{ id: string, type: 'bom' | 'pool' } | null>(null);
  const [allocationISO, setAllocationISO] = useState<string>('');
  const [allocationQty, setAllocationQty] = useState<number>(0);
  const [allocationQuantities, setAllocationQuantities] = useState<Record<string, number>>({});

  const handleDownloadAllMTRs = async (iso: string) => {
    // 1. Collect all MTRs for this ISO
    const isoMaterials = materials.filter(m => (m.iso || 'UNASSIGNED') === iso);
    const mtrUrls = isoMaterials.flatMap(m => (m.instances || []).map(inst => ({ url: inst.mtrUrl, name: m.name, heat: inst.heatNumber })));
    
    // Filter out missing URLs - for prototype support data URLs (scans/uploads)
    const validMtrs = mtrUrls.filter(mtr => mtr.url && mtr.url.startsWith('data:'));
    
    if (validMtrs.length === 0) {
      alert("No digital MTR documents (scanned/uploaded) found for this ISO.");
      return;
    }

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const mtr of validMtrs) {
        try {
          const dataUrlParts = mtr.url!.split(',');
          const mimeType = dataUrlParts[0].match(/:(.*?);/)?.[1];
          const base64Data = dataUrlParts[1];
          const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          if (mimeType === 'application/pdf') {
            const pdfDoc = await PDFDocument.load(bytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          } else if (mimeType?.startsWith('image/')) {
            const page = mergedPdf.addPage();
            const { width, height } = page.getSize();
            let image;
            if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
              image = await mergedPdf.embedJpg(bytes);
            } else if (mimeType === 'image/png') {
              image = await mergedPdf.embedPng(bytes);
            }
            
            if (image) {
              const dims = image.scaleToFit(width - 40, height - 40);
              page.drawImage(image, {
                x: width / 2 - dims.width / 2,
                y: height / 2 - dims.height / 2,
                width: dims.width,
                height: dims.height,
              });
            }
          }
        } catch (innerError) {
          console.warn(`Skipping one MTR record due to processing error:`, innerError);
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${iso}_MTR_Package.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error("PDF Merge failed:", error);
      alert("Failed to merge PDF documents. Ensure documents are valid PDF or images.");
    }
  };

  const totalReceiveQty = useMemo(() => 
    tempReceiptLines.reduce((acc, line) => acc + line.qty, 0),
  [tempReceiptLines]);

  const filteredMaterials = useMemo(() => 
    materials.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [materials, searchQuery]
  );

  const stats = useMemo(() => {
    // 1. Calculate Individual ISO Potential
    const isoGroups = materials.reduce((acc, m) => {
      const iso = m.iso || 'UNASSIGNED';
      if (!acc[iso]) {
        acc[iso] = { received: 0, total: 0, progress: 0 };
      }
      
      const poolItem = unallocatedPool.find(p => p.name.trim() === (m.name || '').trim());
      const bucketQty = poolItem ? poolItem.quantity : 0;
      
      const mExp = m.expectedQuantity || 0;
      const mAllocated = m.receivedQuantity || 0;
      const mNeeded = Math.max(0, mExp - mAllocated);
      
      // Each ISO sees the full bucket as "potential" to satisfy its specific needs
      const potentialFromBucket = Math.min(mNeeded, bucketQty);
      const effectiveProgress = mAllocated + potentialFromBucket;
      
      acc[iso].received += mAllocated;
      acc[iso].total += mExp;
      acc[iso].progress += effectiveProgress;
      return acc;
    }, {} as Record<string, { received: number, total: number, progress: number }>);

    const isoStats = Object.entries(isoGroups)
      .map(([iso, data]) => {
        const d = data as { received: number, total: number, progress: number };
        return {
          iso,
          percent: d.total > 0 ? Math.min(100, Math.round((d.progress / d.total) * 100)) : 100,
          received: d.received,
          total: d.total
        };
      })
      .sort((a, b) => b.percent - a.percent);

    // 2. Summary stats (Global Progress)
    // Global completion: (Total Allocated + Total Unallocated) / Total BOM
    const totalBOMUnits = materials.reduce((acc, m) => acc + (m.expectedQuantity || 0), 0);
    const totalAllocated = materials.reduce((acc, m) => acc + (m.receivedQuantity || 0), 0);
    const totalUnallocated = unallocatedPool.reduce((acc, p) => acc + p.quantity, 0);
    
    const receivedPercent = totalBOMUnits > 0 
      ? Math.min(100, Math.round(((totalAllocated + totalUnallocated) / totalBOMUnits) * 100)) 
      : 0;

    const getCatStats = (catName: string) => {
      const filtered = materials.filter(m => m.category.toLowerCase().includes(catName.toLowerCase()));
      const unallocatedFiltered = unallocatedPool.filter(p => p.category.toLowerCase().includes(catName.toLowerCase()));
      
      const r = filtered.reduce((acc, m) => ({
        received: acc.received + (m.receivedQuantity || 0),
        total: acc.total + (m.expectedQuantity || 0)
      }), { received: 0, total: 0 });
      
      const unallocatedQty = unallocatedFiltered.reduce((acc, p) => acc + p.quantity, 0);
      
      return { ...r, unallocated: unallocatedQty };
    };

    const flanges = getCatStats('flange');
    const valves = getCatStats('valve');
    const fittings = getCatStats('fitting');
    const pipe = getCatStats('pipe');

    return {
      receivedPercent: `${receivedPercent}%`,
      isoStats,
      flanges: {
        display: `${(flanges.received + flanges.unallocated).toLocaleString()} / ${flanges.total.toLocaleString()}`,
        label: 'Potential Coverage'
      },
      valves: {
        display: `${(valves.received + valves.unallocated).toLocaleString()} / ${valves.total.toLocaleString()}`,
        label: 'Potential Coverage'
      },
      fittings: {
        display: `${(fittings.received + fittings.unallocated).toLocaleString()} / ${fittings.total.toLocaleString()}`,
        label: 'Potential Coverage'
      },
      pipeFootage: {
        display: `${(pipe.received + pipe.unallocated).toLocaleString()} / ${pipe.total.toLocaleString()}`,
        label: 'Potential Coverage'
      },
    };
  }, [materials, unallocatedPool]);

  const globalInventory = useMemo(() => {
    // We want to show all item types mentioned in the BOM, 
    // but the "On Hand" should reflect only what is in the unallocatedPool.
    const itemNames = new Set([
      ...materials.map(m => m.name.trim()),
      ...unallocatedPool.map(i => i.name.trim())
    ]);

    const inventory = Array.from(itemNames).map(name => {
      const bomItems = materials.filter(m => m.name.trim() === name);
      const poolItem = unallocatedPool.find(i => i.name.trim() === name);
      
      const expected = bomItems.reduce((acc, m) => acc + (m.expectedQuantity || 0), 0);
      const allocated = bomItems.reduce((acc, m) => acc + (m.receivedQuantity || 0), 0);
      const received = poolItem ? poolItem.quantity : 0; // Unallocated On-Hand
      
      return {
        id: poolItem?.id || `pool-ref-${name}`,
        name,
        category: bomItems[0]?.category || poolItem?.category || 'Uncategorized',
        sku: bomItems[0]?.sku || poolItem?.sku || 'N/A',
        unit: bomItems[0]?.unit || poolItem?.unit || 'ea',
        received, // Unallocated
        allocated, 
        expected,
        poolItem // Reference to the actual pool item for allocation
      };
    });

    return inventory.sort((a, b) => {
      const aNeed = a.expected - a.allocated - a.received;
      const bNeed = b.expected - b.allocated - b.received;
      return bNeed - aNeed;
    });
  }, [materials, unallocatedPool]);

  const handleLogisticsSubmit = (data: {
    materialId: string;
    type: LogisticsType;
    quantity: number;
    location: string;
    notes?: string;
  }) => {
    const material = materials.find(m => m.id === data.materialId);
    if (!material) return;

    // Create log entry
    const newLog: LogisticsEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      materialId: data.materialId,
      materialName: material.name,
      type: data.type,
      quantity: data.quantity,
      timestamp: Date.now(),
      userId: 'u-1',
      userName: 'Frank Hymel',
      notes: data.notes,
      [data.type === 'receipt' ? 'toLocation' : 'fromLocation']: data.location,
    };

    // Update material quantity and status
    const updatedMaterials = materials.map(m => {
      if (m.id === data.materialId) {
        let newQty = m.quantity;
        let newReceived = m.receivedQuantity || 0;
        if (data.type === 'receipt') {
          newQty += data.quantity;
          newReceived += data.quantity;
        }
        if (data.type === 'issue') newQty -= data.quantity;
        if (data.type === 'adjustment') newQty = data.quantity;
        
        return {
          ...m,
          quantity: newQty,
          receivedQuantity: newReceived,
          location: data.location || m.location,
          status: (newQty < m.minThreshold ? 'low-stock' : (data.type === 'receipt' ? 'received' : m.status)) as MaterialStatus,
          lastUpdated: Date.now()
        };
      }
      return m;
    });

    setMaterials(updatedMaterials);
    setLogs([newLog, ...logs]);
    setIsMovementModalOpen(false);
    setReceivingMaterialId(null);
  };

  const handleStatusChange = (materialId: string, newStatus: MaterialStatus) => {
    if (newStatus === 'received') {
      setReceivingMaterialId(materialId);
      setTempReceiptLines([{ id: `receipt-${Date.now()}`, heat: '', mtr: '', qty: 1 }]);
      return;
    }

    setMaterials(prev => prev.map(m => 
      m.id === materialId ? { ...m, status: newStatus, lastUpdated: Date.now() } : m
    ));
    
    // Also log this change
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
        const newLog: LogisticsEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          materialId: materialId,
      materialName: material.name,
      type: 'receipt', // Defaulting to receipt for status updates like this
      quantity: material.quantity,
      timestamp: Date.now(),
      userId: 'u-1',
      userName: 'Frank Hymel',
      notes: `Status manually updated to ${newStatus}`,
      toLocation: material.location,
    };
    setLogs([newLog, ...logs]);
  };

  const handleFinalizeReceipt = (materialId: string | null) => {
    // Determine the material details even if receiving into pool
    const targetMaterial = materials.find(m => m.id === materialId);
    if (!targetMaterial && !materialId) return;

    const newInstances: MaterialInstance[] = tempReceiptLines.map((line, lineIdx) => ({
      id: `inst-${Date.now()}-${lineIdx}-${Math.random().toString(36).substr(2, 4)}`,
      heatNumber: line.heat || 'PENDING',
      mtrNumber: line.mtr || 'PENDING',
      vendor: line.vendor,
      mtrUrl: line.fileData || (line.fileName ? `#/${line.fileName}` : undefined),
      receivedDate: Date.now(),
      quantity: line.qty,
      qualityStatus: 'pending'
    }));

    // Always add to unallocated pool first as per user request
    setUnallocatedPool(prev => {
      const next = [...prev];
      const name = targetMaterial?.name || 'Unknown Material';
      const sku = targetMaterial?.sku || 'N/A';
      
      const existingIdx = next.findIndex(item => item.name === name && item.sku === sku);
      
      if (existingIdx >= 0) {
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + totalReceiveQty,
          instances: [...next[existingIdx].instances, ...newInstances],
          lastUpdated: Date.now()
        };
      } else {
        next.push({
          id: `pool-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: name,
          sku: sku,
          category: targetMaterial?.category || 'Uncategorized',
          unit: targetMaterial?.unit || 'ea',
          quantity: totalReceiveQty,
          instances: newInstances,
          lastUpdated: Date.now()
        });
      }
      return next;
    });

    if (targetMaterial) {
      const newLog: LogisticsEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        materialId: materialId!,
        materialName: targetMaterial.name,
        type: 'receipt',
        quantity: totalReceiveQty,
        timestamp: Date.now(),
        userId: 'u-1',
        userName: 'Frank Hymel',
        notes: `Received ${totalReceiveQty} units into inventory bucket`,
        toLocation: targetMaterial.location,
      };
      setLogs(prev => [newLog, ...prev]);
    }
    
    setReceivingMaterialId(null);
    setTempReceiptLines([]);
  };

  const handleSaveDocumentation = (newInstances: MaterialInstance[]) => {
    if (!tracingMaterial) return;
    
    if (tracingMaterial.type === 'bom') {
      setMaterials(prev => prev.map(m => m.id === tracingMaterial.id ? { ...m, instances: newInstances, lastUpdated: Date.now() } : m));
    } else {
      setUnallocatedPool(prev => prev.map(p => p.id === tracingMaterial.id ? { ...p, instances: newInstances, lastUpdated: Date.now() } : p));
    }
    
    setTracingMaterial(null);
  };

  const handleAllocate = () => {
    if (!allocatingItem || !allocationISO) return;

    // Calculate total from individual inputs if they exist, otherwise use allocationQty (legacy/fallback)
    const totalToAllocate = Object.values(allocationQuantities).length > 0 
      ? (Object.values(allocationQuantities) as number[]).reduce((a: number, b: number) => a + b, 0)
      : allocationQty;

    if (totalToAllocate <= 0) return;

    // 1. Find the BOM requirement for this ISO and item
    const requirementIdx = materials.findIndex(m => (m.iso || 'UNASSIGNED') === allocationISO && m.name === allocatingItem.name);
    
    if (requirementIdx < 0) {
      alert("No requirement found for this item in selected ISO");
      return;
    }

    const requirement = materials[requirementIdx];
    
    // 2. Prepare Moved Instances and Updated Pool Instances
    const movedInstances: MaterialInstance[] = [];
    const updatedPoolInstancesForPoolState: MaterialInstance[] = [];

    allocatingItem.instances.forEach(inst => {
      const qtyRequested = allocationQuantities[inst.id] || 0;
      const availableQty = inst.quantity || 1;

      if (qtyRequested > 0) {
        const actualQtyToMove = Math.min(qtyRequested, availableQty);
        
        // Add to moved (BOM)
        movedInstances.push({
          ...inst,
          id: `${inst.id}-allocated-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Ensure unique ID for the allocated part
          quantity: actualQtyToMove
        });

        // If something is left, keep it in pool
        if (availableQty > actualQtyToMove) {
          updatedPoolInstancesForPoolState.push({
            ...inst,
            id: `${inst.id}-pool-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Ensure unique ID for the pool part
            quantity: availableQty - actualQtyToMove
          });
        }
      } else {
        // Not allocated, stays in pool
        updatedPoolInstancesForPoolState.push(inst);
      }
    });

    // If we used the legacy allocationQty fallback (auto-allocate from top)
    if (Object.values(allocationQuantities).length === 0 && allocationQty > 0) {
      let remaining = allocationQty;
      const currentInstances = [...allocatingItem.instances];
      
      const legacyUpdatedPoolInstances: MaterialInstance[] = [];
      const legacyMovedInstances: MaterialInstance[] = [];

      currentInstances.forEach(inst => {
        if (remaining <= 0) {
          legacyUpdatedPoolInstances.push(inst);
          return;
        }
        const instQty = inst.quantity || 1;
        if (instQty <= remaining) {
          legacyMovedInstances.push({
            ...inst,
            id: `${inst.id}-allocated-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
          });
          remaining -= instQty;
        } else {
          legacyMovedInstances.push({
            ...inst,
            id: `${inst.id}-split-allocated-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            quantity: remaining
          });
          legacyUpdatedPoolInstances.push({
            ...inst,
            id: `${inst.id}-split-pool-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            quantity: instQty - remaining
          });
          remaining = 0;
        }
      });

      movedInstances.push(...legacyMovedInstances);
      updatedPoolInstancesForPoolState.length = 0;
      updatedPoolInstancesForPoolState.push(...legacyUpdatedPoolInstances);
    }

    const actualTotal = movedInstances.reduce((acc, inst) => acc + (inst.quantity || 0), 0);
    if (actualTotal === 0) return;

    // 3. Update materials (BOM rows)
    setMaterials(prev => {
      const next = [...prev];
      const m = next[requirementIdx];
      
      next[requirementIdx] = {
        ...m,
        receivedQuantity: (m.receivedQuantity || 0) + actualTotal,
        quantity: (m.quantity || 0) + actualTotal,
        instances: [...(m.instances || []), ...movedInstances],
        lastUpdated: Date.now(),
        status: 'received'
      };
      return next;
    });

    // 4. Update unallocatedPool
    setUnallocatedPool(prev => {
      return prev.map(item => {
        if (item.id === allocatingItem.id) {
          return {
            ...item,
            quantity: Math.max(0, item.quantity - actualTotal),
            instances: updatedPoolInstancesForPoolState,
            lastUpdated: Date.now()
          };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });

    // 5. Log it
    const newLog: LogisticsEntry = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      materialId: requirement.id,
      materialName: requirement.name,
      type: 'issue',
      quantity: actualTotal,
      timestamp: Date.now(),
      userId: 'u-1',
      userName: 'Frank Hymel',
      notes: `Allocated ${actualTotal} units to ISO ${allocationISO}`,
      toLocation: requirement.location,
    };
    setLogs(prev => [newLog, ...prev]);

    // Reset
    setAllocatingItem(null);
    setAllocationISO('');
    setAllocationQty(0);
    setAllocationQuantities({});
  };

  const handleBOMUpload = (newMaterials: Material[]) => {
    setMaterials(prev => {
      const next = [...prev];
      newMaterials.forEach(newItem => {
        const existingIdx = next.findIndex(m => m.name === newItem.name && m.iso === newItem.iso);
        if (existingIdx >= 0) {
          // Merge into existing Description+ISO entry
          next[existingIdx] = {
            ...next[existingIdx],
            expectedQuantity: next[existingIdx].expectedQuantity + newItem.expectedQuantity,
            lastUpdated: Date.now()
          };
        } else {
          next.push(newItem);
        }
      });
      return next;
    });
    setIsBOMModalOpen(false);
  };

  const handleSpoolUpload = (newSpools: Spool[]) => {
    setSpools(prev => {
      const next = [...prev];
      newSpools.forEach(newSpool => {
        const idx = next.findIndex(s => s.tag === newSpool.tag);
        if (idx >= 0) {
          next[idx] = { ...newSpool, id: next[idx].id };
        } else {
          next.push(newSpool);
        }
      });
      return next;
    });
    
    // Log the import
    const newLog: LogisticsEntry = {
      id: `log-spool-import-${Date.now()}`,
      materialId: 'system',
      materialName: `${newSpools.length} Spools Imported`,
      type: 'receipt',
      quantity: newSpools.length,
      timestamp: Date.now(),
      userId: 'u-1',
      userName: 'Frank Hymel',
      notes: `Imported spool registry via CSV upload.`,
    };
    setLogs(prev => [newLog, ...prev]);
    setIsSpoolModalOpen(false);
  };

  // Clears only the CURRENT job's materials/spools/manifests/logs. These
  // setters are job-scoped, so this leaves other jobs' data in allMaterials
  // etc. untouched; the normal auto-save/sync effect persists the change.
  const handleClearInventory = async () => {
    if (!activeJobId) return;
    const jobId = activeJobId;

    setMaterials([]);
    setUnallocatedPool([]);
    setLogs([]);
    setSpools([]);
    setManifests([]);
    setSelectedSpoolIds([]);
    setIsClearConfirmOpen(false);

    try {
      setSyncStatus('syncing');
      // syncTable() only ever inserts/updates, so this dedicated endpoint is
      // what actually deletes the job's rows server-side.
      await fetch('/api/clear-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      setSyncStatus('synced');
    } catch (err) {
      console.error('[SYNC] Failed to reset remote database:', err);
      setSyncStatus('error');
    }
  };

  const handleCreateJob = (input: { jobNumber: string; projectName: string; clientName: string; siteAddress: string; status: Job['status'] }) => {
    const now = Date.now();
    const newJob: Job = {
      id: `job-${now}`,
      jobNumber: input.jobNumber,
      projectName: input.projectName || undefined,
      clientName: input.clientName,
      siteAddress: input.siteAddress,
      status: input.status,
      createdAt: now,
      lastUpdated: now,
    };
    console.log(`[JOBS] Creating job "${newJob.jobNumber}" (id=${newJob.id})`);
    setJobs(prev => [newJob, ...prev]);
    setActiveJobId(newJob.id);
  };

  const handleDeleteJob = async (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    // Also drop that job's records from the local "all" arrays so they don't
    // linger in local storage/UI until the next server sync.
    setAllMaterials(prev => prev.filter(m => m.jobId !== jobId));
    setAllUnallocatedPool(prev => prev.filter(u => u.jobId !== jobId));
    setAllSpools(prev => prev.filter(s => s.jobId !== jobId));
    setAllManifests(prev => prev.filter(m => m.jobId !== jobId));
    setAllLogs(prev => prev.filter(l => l.jobId !== jobId));

    try {
      await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
    } catch (err) {
      console.error('[SYNC] Failed to delete job on server:', err);
    }
  };

  // Records with no jobId, or a jobId that doesn't match any current job -
  // left behind by data created before the Jobs feature existed, or
  // belonging to a job that was since deleted.
  // A record with a jobId pointing to a job that no longer exists is
  // orphaned (leftover from a deleted job). A record with NO jobId at all
  // is intentionally-global stock (never tied to a job), not orphaned.
  const orphanedCounts = useMemo(() => {
    const validJobIds = new Set(jobs.map(j => j.id));
    const isOrphaned = (item: { jobId?: string }) => !!item.jobId && !validJobIds.has(item.jobId);
    return {
      materials: allMaterials.filter(isOrphaned).length,
      unallocatedPool: allUnallocatedPool.filter(isOrphaned).length,
      spools: allSpools.filter(isOrphaned).length,
      manifests: allManifests.filter(isOrphaned).length,
      logs: allLogs.filter(isOrphaned).length,
    };
  }, [jobs, allMaterials, allUnallocatedPool, allSpools, allManifests, allLogs]);

  const handleClearOrphanedData = async () => {
    const validJobIds = new Set(jobs.map(j => j.id));
    const keep = <T extends { jobId?: string }>(item: T) => !item.jobId || validJobIds.has(item.jobId);
    setAllMaterials(prev => prev.filter(keep));
    setAllUnallocatedPool(prev => prev.filter(keep));
    setAllSpools(prev => prev.filter(keep));
    setAllManifests(prev => prev.filter(keep));
    setAllLogs(prev => prev.filter(keep));

    try {
      await fetch('/api/cleanup-orphaned', { method: 'POST' });
    } catch (err) {
      console.error('[SYNC] Failed to clean up orphaned data on server:', err);
    }
  };

  // Adds stock directly to the global (no job) unallocated pool - material
  // that was never for a specific job. Merges into an existing global item
  // of the same name/SKU if one exists, same as a normal per-job receipt.
  const handleAddGlobalInventory = (input: { name: string; sku: string; category: string; unit: string; heatLines: GlobalHeatLine[] }) => {
    const now = Date.now();
    const newInstances: MaterialInstance[] = input.heatLines.map((line, idx) => ({
      id: `inst-global-${now}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      heatNumber: line.heatNumber || 'PENDING',
      mtrNumber: line.mtrNumber || 'PENDING',
      vendor: line.vendor,
      mtrUrl: line.fileData,
      receivedDate: now,
      quantity: line.quantity,
      qualityStatus: 'pending',
    }));
    const totalQty = input.heatLines.reduce((acc, l) => acc + (l.quantity || 0), 0);

    setAllUnallocatedPool(prev => {
      const existingIdx = prev.findIndex(item => !item.jobId && item.name === input.name && item.sku === input.sku);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + totalQty,
          instances: [...next[existingIdx].instances, ...newInstances],
          lastUpdated: now,
        };
        return next;
      }
      return [...prev, {
        id: `pool-global-${now}-${Math.random().toString(36).substr(2, 4)}`,
        // No jobId - intentionally global stock, not tied to any job.
        name: input.name,
        sku: input.sku,
        category: input.category,
        unit: input.unit,
        quantity: totalQty,
        instances: newInstances,
        lastUpdated: now,
      }];
    });
  };

  // Removes specific unallocated-pool records (e.g. a material's line in
  // the Global Unallocated Inventory table, which can span several
  // UnallocatedItem records across jobs and global stock). syncTable() only
  // ever inserts/updates, so the dedicated endpoint is what actually makes
  // the deletion stick server-side.
  const handleDeleteUnallocatedItems = async (itemIds: string[]) => {
    setAllUnallocatedPool(prev => prev.filter(item => !itemIds.includes(item.id)));
    try {
      await fetch('/api/unallocated/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
    } catch (err) {
      console.error('[SYNC] Failed to delete unallocated items on server:', err);
    }
  };

  // Removes one heat record from an unallocated-pool item. If it was the
  // item's last remaining heat record, the whole (now-empty) item is
  // deleted the same way handleDeleteUnallocatedItems does (dedicated
  // endpoint + tombstone, so it can't resurrect from a stale sync).
  // Otherwise this is just an in-place update (fewer instances, lower
  // quantity, newer lastUpdated) - the normal sync flow persists that fine
  // on its own, the same way any other quantity/status edit does.
  const handleDeleteHeatRecord = (itemId: string, instanceId: string) => {
    const item = allUnallocatedPool.find(i => i.id === itemId);
    if (!item) return;
    const removedInstance = item.instances.find(i => i.id === instanceId);
    const remainingInstances = item.instances.filter(i => i.id !== instanceId);

    if (remainingInstances.length === 0) {
      handleDeleteUnallocatedItems([itemId]);
      return;
    }

    setAllUnallocatedPool(prev => prev.map(i => i.id === itemId ? {
      ...i,
      instances: remainingInstances,
      quantity: Math.max(0, i.quantity - (removedInstance?.quantity || 0)),
      lastUpdated: Date.now(),
    } : i));
  };

  const createManifest = () => {
    if (selectedSpoolIds.length === 0) return;
    
    const manifestId = `manifest-${Date.now()}`;
    const newManifest: Manifest = {
      id: manifestId,
      manifestNumber: `TICKET-${Math.floor(1000 + Math.random() * 9000)}`,
      origin: '6277 Industrial Drive',
      destination: 'Plaquemine Site A',
      status: 'draft',
      items: [...selectedSpoolIds],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    setManifests(prev => [newManifest, ...prev]);
    
    // Update spools to link to manifest
    setSpools(prev => prev.map(s => 
      selectedSpoolIds.includes(s.id) ? { ...s, manifestId } : s
    ));

    setSelectedSpoolIds([]);
    setLogisticsSubTab('manifests');
  };

  const updateManifest = (id: string, updates: Partial<Manifest>) => {
    setManifests(prev => prev.map(m => m.id === id ? { ...m, ...updates, lastUpdated: Date.now() } : m));
  };

  const updateManifestStatus = (id: string, status: ManifestStatus, extraUpdates?: Partial<Manifest>) => {
    setManifests(prev => prev.map(m => {
      if (m.id === id) {
        const updates: Partial<Manifest> = { status, ...extraUpdates };
        if (status === 'loaded') updates.loadedAt = Date.now();
        if (status === 'shipped') updates.shippedAt = Date.now();
        if (status === 'received') updates.receivedAt = Date.now();
        return { ...m, ...updates, lastUpdated: Date.now() };
      }
      return m;
    }));

    // Update spool statuses based on manifest status
    const manifest = manifests.find(m => m.id === id);
    if (manifest) {
      setSpools(prev => prev.map(s => {
        if (manifest.items.includes(s.id)) {
          let newStatus = s.status;
          if (status === 'loaded') newStatus = 'loaded';
          if (status === 'shipped') newStatus = 'shipped';
          if (status === 'received' || status === 'completed') newStatus = 'delivered';
          return { ...s, status: newStatus as Spool['status'] };
        }
        return s;
      }));
    }
  };

  const activeJob = jobs.find(j => j.id === activeJobId);

  // No job selected yet - show the top-level Jobs dashboard instead of the
  // per-job app shell below.
  if (!activeJobId || !activeJob) {
    return (
      <JobsDashboard
        jobs={jobs}
        allMaterials={allMaterials}
        allUnallocatedPool={allUnallocatedPool}
        allSpools={allSpools}
        allManifests={allManifests}
        orphanedCounts={orphanedCounts}
        onOpenJob={setActiveJobId}
        onCreateJob={handleCreateJob}
        onDeleteJob={handleDeleteJob}
        onClearOrphanedData={handleClearOrphanedData}
        onAddGlobalInventory={handleAddGlobalInventory}
        onDeleteUnallocatedItems={handleDeleteUnallocatedItems}
        onDeleteHeatRecord={handleDeleteHeatRecord}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-industrial-bg">
      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-industrial-ink text-industrial-bg flex flex-col transition-all duration-300 z-50",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-industrial-bg/10">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center bg-green-600">
                <span className="text-white font-bold text-[10px]">F</span>
              </div>
              <span className="font-mono font-bold tracking-tighter text-lg uppercase">FRANKY</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/10 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <button
          onClick={() => setActiveJobId(null)}
          className="flex items-center gap-3 px-4 py-3 text-sm tech-value border-b border-industrial-bg/10 hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
        >
          <Briefcase size={18} />
          {isSidebarOpen && <span>All Jobs</span>}
        </button>

        <nav className="flex-1 py-4 flex flex-col gap-1">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Analytics' },
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'quality', icon: ShieldCheck, label: 'Quality / MTR' },
            { id: 'remaining', icon: ClipboardList, label: 'Remaining' },
            { id: 'logistics', icon: Truck, label: 'Logistics' },
          ].map((item, idx) => (
            <button
              key={`sidebar-nav-${item.id}-${idx}`}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors text-sm tech-value",
                activeTab === item.id ? "bg-industrial-accent text-industrial-ink" : "hover:bg-white/5 opacity-70 hover:opacity-100"
              )}
            >
              <item.icon size={18} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-industrial-bg/10">
          <div className="flex items-center gap-3 opacity-60">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono text-xs">FH</div>
            {isSidebarOpen && (
              <div className="flex flex-col text-[10px] tech-value">
                <span>Frank Hymel</span>
                <span className="opacity-50">Creator</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-industrial-line/10 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="tech-value text-lg">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'inventory' && 'Raw Material Inventory Pool'}
              {activeTab === 'quality' && 'Quality Documentation & MTRs'}
              {activeTab === 'remaining' && 'Remaining Material Backlog'}
              {activeTab === 'logistics' && 'Movement Log'}
            </h1>
            <div className="h-4 w-[1px] bg-industrial-line/20" />
            <div className="flex flex-col leading-tight">
              <span className="tech-value text-sm font-bold">{activeJob.clientName}</span>
              {activeJob.projectName && (
                <span className="tech-label text-[10px] opacity-70">{activeJob.projectName}</span>
              )}
              <span className="tech-label text-[9px] opacity-40">#{activeJob.jobNumber}</span>
            </div>
            <div className="h-4 w-[1px] bg-industrial-line/20" />
            <div className="flex items-center gap-4" title={lastSyncedTime ? `Last synced at ${new Date(lastSyncedTime).toLocaleTimeString()}` : 'Not synced yet'}>
              <div className="flex items-center gap-2">
                {syncStatus === 'synced' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="tech-label lowercase text-green-700 font-bold">sqlite active</span>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="tech-label lowercase text-amber-600 font-bold">syncing...</span>
                  </>
                )}
                {syncStatus === 'offline' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="tech-label lowercase text-gray-500">local cache only</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="tech-label lowercase text-red-600 font-bold">sync issue</span>
                  </>
                )}
              </div>
              <button 
                onClick={() => triggerSync()} 
                title="Force sync data with SQLite database" 
                className="p-1.5 hover:bg-industrial-bg/80 active:scale-95 text-industrial-ink flex items-center justify-center transition-all cursor-pointer rounded-sm border border-industrial-line/5"
              >
                <RotateCw size={10} className={cn(syncStatus === 'syncing' && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input 
                type="text" 
                placeholder="Search materials..."
                className="pl-9 pr-4 py-1.5 bg-industrial-bg/50 border border-industrial-line/10 tech-value text-xs focus:ring-1 focus:ring-industrial-accent outline-none w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsBOMModalOpen(true)}
              className="px-4 py-1.5 text-xs tech-value flex items-center gap-2 border border-industrial-line/10 hover:bg-industrial-bg transition-colors"
            >
              <FileUp size={14} />
              BOM Import
            </button>
            <button 
              onClick={() => setIsClearConfirmOpen(true)}
              className="px-4 py-1.5 text-xs tech-value flex items-center gap-2 border border-red-500/20 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Clear All
            </button>
            <button 
              onClick={() => setIsMovementModalOpen(true)}
              className="bg-industrial-ink text-white px-4 py-1.5 text-xs tech-value flex items-center gap-2 hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
            >
              <Plus size={14} />
              Add Resource
            </button>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <div className="flex-1 overflow-y-auto p-6 text-industrial-ink">
          {/* Modals outside wait transition */}
          <AnimatePresence>
            {isMovementModalOpen && (
              <MovementForm 
                key="modal"
                materials={materials}
                onClose={() => setIsMovementModalOpen(false)}
                onSubmit={handleLogisticsSubmit}
              />
            )}
            {isBOMModalOpen && (
              <BOMUpload 
                key="bom-modal"
                onClose={() => setIsBOMModalOpen(false)}
                onUpload={handleBOMUpload}
              />
            )}
            {isSpoolModalOpen && (
              <SpoolUpload
                key="spool-modal"
                onClose={() => setIsSpoolModalOpen(false)}
                onUpload={handleSpoolUpload}
              />
            )}
            {viewingManifestId && (
               <ManifestTicket
                  key="manifest-ticket-modal"
                  manifest={manifests.find(m => m.id === viewingManifestId)!}
                  spools={spools}
                  onClose={() => setViewingManifestId(null)}
                  onUpdateManifest={(updates) => updateManifest(viewingManifestId, updates)}
                  onUpdateStatus={(status, extra) => {
                    updateManifestStatus(viewingManifestId, status, extra);
                    if (status === 'completed') setViewingManifestId(null);
                  }}
               />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard label="Material Received" value={stats.receivedPercent} icon={CheckCircle} colorClass="text-green-500" />
                  <StatCard label="Total Flanges" value={stats.flanges.display} subValue={stats.flanges.label} icon={FlangeIcon} />
                  <StatCard label="Total Valves" value={stats.valves.display} subValue={stats.valves.label} icon={ValveIcon} />
                  <StatCard label="Total Fittings" value={stats.fittings.display} subValue={stats.fittings.label} icon={FittingIcon} />
                  <StatCard label="Total Pipe (FT)" value={stats.pipeFootage.display} subValue={stats.pipeFootage.label} icon={PipeIcon} />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* ISO Completion Status */}
                  <div className="bg-white border border-industrial-line/10 flex flex-col">
                    <div className="px-4 py-3 border-b border-industrial-line/10 flex justify-between items-center bg-industrial-bg/5">
                      <span className="tech-label uppercase tracking-widest font-bold">ISO Completion Status</span>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-industrial-accent" />
                        <span className="text-[10px] tech-value">{stats.isoStats.length} Unique ISOs</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {stats.isoStats.map((stat, idx) => (
                          <button 
                            key={`dashboard-iso-${stat.iso}-${idx}`}
                            onClick={() => setSelectedISO(stat.iso)}
                            className="flex flex-col text-left group hover:opacity-80 transition-opacity"
                          >
                          <div className="flex justify-between items-end text-[11px] tech-value mb-1">
                            <div className="flex flex-col">
                              <span className="truncate pr-4 group-hover:text-industrial-accent transition-colors">{stat.iso}</span>
                              <span className="text-[8px] tech-label opacity-40 uppercase font-bold">
                                {(stat.total - stat.received).toLocaleString()} STILL NEEDED
                              </span>
                            </div>
                            <span className={cn(
                              stat.percent === 100 ? "text-green-600" : "text-industrial-accent"
                            )}>{stat.percent}%</span>
                          </div>
                          <div className="h-1.5 bg-industrial-bg overflow-hidden rounded-full">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                stat.percent === 100 ? "bg-green-500" : "bg-industrial-ink"
                              )}
                              style={{ width: `${stat.percent}%` }} 
                            />
                          </div>
                        </button>
                      ))}
                      {stats.isoStats.length === 0 && (
                        <div className="py-10 text-center opacity-30 col-span-full">
                          <p className="tech-label">Waiting for BOM Import...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-industrial-line/10"
              >
                <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center">
                  <div>
                    <h2 className="tech-value text-sm uppercase tracking-wider">Raw Inventory Pool</h2>
                    <p className="tech-label">Aggregated stock totals available for assignment</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-industrial-ink text-white px-3 py-1 tech-value text-[10px]">
                      {globalInventory.length} UNIQUE ITEMS
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-industrial-line/10 bg-industrial-bg/30">
                        <th className="px-6 py-3 tech-label">Material / SKU</th>
                        <th className="px-6 py-3 tech-label text-right">On Hand</th>
                        <th className="px-6 py-3 tech-label text-right">Projected (BOM)</th>
                        <th className="px-6 py-3 tech-label">Location</th>
                        <th className="px-6 py-3 tech-label">Status</th>
                        <th className="px-6 py-3 tech-label text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-line/5">
                      {globalInventory
                        .filter(item => 
                          (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item, idx) => (
                        <tr key={`inventory-row-${item.id}-${idx}`} className="hover:bg-industrial-bg/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="tech-value text-sm font-bold">{item.name}</span>
                              <span className="text-[10px] tech-label opacity-40">{item.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className={cn(
                                "tech-value text-sm",
                                item.received > 0 ? "text-green-600 font-bold" : "text-gray-400"
                              )}>
                                {item.received.toLocaleString()} <span className="text-[10px] opacity-50">{item.unit}</span>
                              </span>
                              <span className="text-[10px] tech-label opacity-40">UNALLOCATED</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="tech-value text-sm">
                                {item.allocated.toLocaleString()} <span className="text-[10px] opacity-50 text-industrial-accent">ALLOCATED</span>
                              </span>
                              <span className="text-[10px] tech-label opacity-40">
                                OF {item.expected.toLocaleString()} BOM TOTAL
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 opacity-60">
                              <MapPin size={12} />
                              <span className="text-[11px] tech-value">Multiple Locations</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={item.received + item.allocated < (item.expected * 0.2) ? 'low-stock' : 'received'} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {item.received > 0 && (
                                <button 
                                  onClick={() => {
                                    const poolItem = unallocatedPool.find(p => p.name === item.name);
                                    if (poolItem) {
                                      setAllocatingItem(poolItem);
                                      setAllocationQty(poolItem.quantity);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-industrial-accent text-industrial-ink tech-value text-[9px] hover:bg-industrial-ink hover:text-white transition-colors uppercase font-bold"
                                >
                                  <Zap size={10} /> Allocate
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  // Find a material ID that matches this name to use as a template for receipt
                                  const refId = materials.find(m => m.name === item.name)?.id;
                                  setReceivingMaterialId(refId || `temp-${item.name}`);
                                  setTempReceiptLines([{ id: `receipt-${Date.now()}`, heat: '', mtr: '', qty: 1 }]);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-industrial-ink text-white tech-value text-[9px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors uppercase font-bold"
                              >
                                <Plus size={10} /> Receive
                              </button>
                              <button 
                                onClick={() => {
                                  const poolItem = unallocatedPool.find(p => p.name === item.name);
                                  if (poolItem) {
                                    setTracingMaterial({ id: poolItem.id, type: 'pool' });
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-industrial-ink tech-value text-[8px] hover:text-industrial-accent transition-colors uppercase font-bold border border-industrial-line/10"
                              >
                                Documentation
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'quality' && (
              <motion.div 
                key="quality"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="flex flex-col gap-6"
              >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-industrial-line/10 p-4">
                      <span className="tech-label block text-xs mb-1">MTRs on File</span>
                      <span className="tech-value text-2xl font-bold">
                        {materials.reduce((acc, m) => acc + (m.instances?.length || 0), 0) + unallocatedPool.reduce((acc, p) => acc + (p.instances?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="bg-white border border-industrial-line/10 p-4">
                      <span className="tech-label block text-xs mb-1">Pending Verification</span>
                      <span className="tech-value text-2xl font-bold text-amber-600">
                        {materials.reduce((acc, m) => acc + (m.instances?.filter(i => i.qualityStatus === 'pending').length || 0), 0) + 
                         unallocatedPool.reduce((acc, p) => acc + (p.instances?.filter(i => i.qualityStatus === 'pending').length || 0), 0)}
                      </span>
                    </div>
                    <div className="bg-white border border-industrial-line/10 p-4">
                      <span className="tech-label block text-xs mb-1">Total Assets Tracked</span>
                      <span className="tech-value text-2xl font-bold">
                        {materials.reduce((acc, m) => acc + (m.receivedQuantity || 0), 0) + unallocatedPool.reduce((acc, p) => acc + p.quantity, 0)}
                      </span>
                    </div>
                    <div className="bg-white border border-industrial-line/10 p-4">
                      <span className="tech-label block text-xs mb-1">Non-Conformance</span>
                      <span className="tech-value text-2xl font-bold text-red-600">
                        {materials.reduce((acc, m) => acc + (m.instances?.filter(i => i.qualityStatus === 'rejected').length || 0), 0) + 
                         unallocatedPool.reduce((acc, p) => acc + (p.instances?.filter(i => i.qualityStatus === 'rejected').length || 0), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-industrial-line/10 overflow-hidden">
                    <div className="p-4 border-b border-industrial-line/10 flex justify-between items-center bg-industrial-bg/10">
                      <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-line w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Search Heat # or MTR..." 
                          className="w-full pl-9 pr-4 py-2 tech-value text-xs border border-industrial-line/10 focus:border-industrial-accent outline-none"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-industrial-ink text-white tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors">
                        <Download size={14} /> EXPORT COMPLIANCE PACK
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-industrial-line/10 bg-industrial-bg/30">
                            <th className="px-6 py-3 tech-label">Material / ISO</th>
                            <th className="px-6 py-3 tech-label">Heat Number</th>
                            <th className="px-6 py-3 tech-label">MTR Reference</th>
                            <th className="px-6 py-3 tech-label text-center">Status</th>
                            <th className="px-6 py-3 tech-label text-right">Vendor</th>
                            <th className="px-6 py-3 tech-label text-right">Qty</th>
                            <th className="px-6 py-3 tech-label">Receipt Date</th>
                            <th className="px-6 py-3 tech-label text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-line/5">
                          {(() => {
                            const rawRecords = [
                              ...materials.flatMap(m => (m.instances || []).map(instance => ({ ...instance, materialId: m.id, material: m, iso: m.iso }))),
                              ...unallocatedPool.flatMap(p => (p.instances || []).map(instance => ({ ...instance, materialId: p.id, material: p, iso: 'UNALLOCATED' })))
                            ].sort((a, b) => b.receivedDate - a.receivedDate);

                            // Group by heat number to show unique records
                            const uniqueByHeat: typeof rawRecords = [];
                            const seenHeats = new Set<string>();

                            rawRecords.forEach(record => {
                              const key = `${record.heatNumber}-${record.material.name}`;
                              if (!seenHeats.has(key)) {
                                seenHeats.add(key);
                                uniqueByHeat.push(record);
                              }
                            });

                            const filtered = uniqueByHeat.filter(record => 
                              record.material.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              record.heatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              record.mtrNumber.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return (
                                <tr key="quality-no-results">
                                  <td colSpan={8} className="px-6 py-12 text-center opacity-30 tech-label italic">
                                    No records matching search.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((record, rIdx) => (
                              <tr key={`quality-rec-${record.id}-${rIdx}`} className="hover:bg-industrial-bg/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="tech-value text-[11px] font-bold">{record.material.name}</span>
                                    <span className={cn(
                                      "tech-label text-[9px]",
                                      record.iso === 'UNALLOCATED' ? "text-industrial-accent" : "opacity-60"
                                    )}>
                                      {record.iso === 'UNALLOCATED' ? 'IN BUCKET' : `ISO: ${record.iso}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="tech-value text-[11px] border border-industrial-line/20 px-2 py-0.5 bg-white">
                                    {record.heatNumber}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className={cn(record.mtrUrl ? "text-green-600" : "text-industrial-accent")} />
                                    <span className="tech-value text-[11px]">{record.mtrNumber}</span>
                                    {record.mtrUrl && (
                                      <span className="tech-label text-[9px] bg-green-50 text-green-700 px-1 rounded border border-green-100">ATTACHED</span>
                                    )}
                                  </div>
                                </td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "text-[9px] tech-value px-2 py-0.5 border rounded-full",
                                      record.qualityStatus === 'verified' ? "bg-green-100 text-green-800 border-green-200" :
                                      record.qualityStatus === 'rejected' ? "bg-red-100 text-red-800 border-red-200" :
                                      "bg-amber-100 text-amber-800 border-amber-200"
                                    )}>
                                      {record.qualityStatus.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="tech-value text-[11px] uppercase font-bold text-industrial-accent">
                                      {record.vendor || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="tech-value text-[11px] font-bold">
                                      {record.quantity || 1}
                                    </span>
                                  </td>
                                <td className="px-6 py-4">
                                  <span className="tech-label text-[10px]">{new Date(record.receivedDate).toLocaleDateString()}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    <button 
                                      onClick={() => setTracingMaterial({ id: record.materialId, type: record.iso === 'UNALLOCATED' ? 'pool' : 'bom' })}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 text-industrial-ink tech-value text-[8px] hover:text-industrial-accent transition-colors uppercase font-bold border border-industrial-line/10"
                                    >
                                      Documentation
                                    </button>
                                    {record.mtrUrl && (
                                      <button 
                                        onClick={() => setViewingMTR(record)}
                                        className="text-industrial-accent hover:underline tech-value text-[10px] font-bold uppercase"
                                      >
                                        View MTR
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* ISO Bulk Documentation Export */}
                    <div className="bg-industrial-ink text-white">
                      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-industrial-accent" />
                          <span className="tech-label uppercase tracking-widest font-bold text-white">ISO Documentation Bulk Export</span>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.isoStats.map((stat, idx) => (
                          <button
                            key={`bulk-download-quality-${stat.iso}-${idx}`}
                            onClick={() => handleDownloadAllMTRs(stat.iso)}
                            className="flex items-center justify-between p-3 border border-white/10 hover:border-industrial-accent hover:bg-white/5 transition-all group"
                          >
                            <div className="flex flex-col text-left">
                              <span className="tech-value text-[11px] uppercase truncate max-w-[180px]">{stat.iso}</span>
                              <span className="text-[9px] tech-label opacity-40">Download Combined MTRs</span>
                            </div>
                            <Download size={14} className="text-industrial-accent group-hover:scale-110 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
              </motion.div>
            )}

            {activeTab === 'remaining' && (
              <motion.div 
                key="remaining"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-industrial-line/10"
              >
                <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center">
                  <div>
                    <h2 className="tech-value text-sm">Material Backlog</h2>
                    <p className="tech-label">Variance Analysis: BOM vs Actual Receipts</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="tech-label">Total Outstanding</span>
                      <span className="tech-value text-lg">
                        {materials.reduce((acc, m) => acc + Math.max(0, m.expectedQuantity - (m.receivedQuantity || 0)), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-industrial-line/10 bg-industrial-bg/30">
                        <th className="px-6 py-3 tech-label">Material</th>
                        <th className="px-6 py-3 tech-label text-right">BOM Total</th>
                        <th className="px-6 py-3 tech-label text-right">Received</th>
                        <th className="px-6 py-3 tech-label text-right">Remaining</th>
                        <th className="px-6 py-3 tech-label">Completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-line/5">
                      {materials
                        .filter(m => (m.expectedQuantity - (m.receivedQuantity || 0)) > 0)
                        .map((m, idx) => {
                          const remaining = Math.max(0, m.expectedQuantity - (m.receivedQuantity || 0));
                          const percent = Math.min(100, Math.round(((m.receivedQuantity || 0) / m.expectedQuantity) * 100));
                          
                          return (
                            <tr key={`backlog-row-${m.id}-${idx}`} className="hover:bg-industrial-bg/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="tech-value text-sm">{m.name}</span>
                                  <span className="tech-label lowercase opacity-40">{m.category}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right tech-value text-sm">
                                {m.expectedQuantity.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right tech-value text-sm text-green-600">
                                {(m.receivedQuantity || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right tech-value text-sm text-red-600 font-bold">
                                {remaining.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-industrial-bg rounded-full overflow-hidden min-w-[100px]">
                                    <div 
                                      className="h-full bg-industrial-ink transition-all duration-500" 
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="tech-value text-[10px] w-8">{percent}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {materials.filter(m => (m.expectedQuantity - (m.receivedQuantity || 0)) > 0).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                              <CheckCircle size={32} />
                              <p className="tech-value">All Materials Received</p>
                              <p className="tech-label">No outstanding items in backlog</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'logistics' && (
               <motion.div 
                key="logistics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex justify-between items-center bg-white border border-industrial-line/10 p-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLogisticsSubTab('spools')}
                      className={cn(
                        "px-4 py-1.5 tech-value text-[10px] uppercase tracking-widest transition-all",
                        logisticsSubTab === 'spools' ? "bg-industrial-ink text-white" : "hover:bg-industrial-bg"
                      )}
                    >
                      Spool Registry
                    </button>
                    <button 
                      onClick={() => setLogisticsSubTab('manifests')}
                      className={cn(
                        "px-4 py-1.5 tech-value text-[10px] uppercase tracking-widest transition-all",
                        logisticsSubTab === 'manifests' ? "bg-industrial-ink text-white" : "hover:bg-industrial-bg"
                      )}
                    >
                      Shipping Tickets
                    </button>
                  </div>
                  <div className="flex gap-4 items-center">
                    {logisticsSubTab === 'manifests' && (
                      <div className="flex bg-industrial-bg/10 p-0.5 rounded border border-industrial-line/5">
                        <button 
                          onClick={() => setManifestFilter('active')}
                          className={cn(
                            "px-3 py-1 tech-value text-[8px] uppercase tracking-widest transition-all rounded-sm",
                            manifestFilter === 'active' ? "bg-white text-industrial-ink shadow-sm font-bold" : "text-industrial-ink/40 hover:text-industrial-ink"
                          )}
                        >
                          Active Queue
                        </button>
                        <button 
                          onClick={() => setManifestFilter('archived')}
                          className={cn(
                            "px-3 py-1 tech-value text-[8px] uppercase tracking-widest transition-all rounded-sm",
                            manifestFilter === 'archived' ? "bg-white text-industrial-ink shadow-sm font-bold" : "text-industrial-ink/40 hover:text-industrial-ink"
                          )}
                        >
                          Project Archive
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {logisticsSubTab === 'spools' && selectedSpoolIds.length > 0 && (
                        <button 
                          onClick={createManifest}
                          className="px-4 py-1.5 bg-industrial-ink text-white tech-value text-[10px] uppercase tracking-widest hover:bg-industrial-accent hover:text-industrial-ink transition-colors flex items-center gap-2"
                        >
                          <Truck size={12} /> Add {selectedSpoolIds.length} to Trailer
                        </button>
                      )}
                      {logisticsSubTab === 'spools' && (
                        <button 
                          onClick={() => setIsSpoolModalOpen(true)}
                          className="px-4 py-1.5 bg-blue-600 text-white tech-value text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <FileUp size={12} /> Upload Spool CSV
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {logisticsSubTab === 'spools' ? (
                  <div className="bg-white border border-industrial-line/10 divide-y divide-industrial-line/5">
                    <div className="grid grid-cols-[30px_1fr_1fr_1fr_100px_120px] bg-industrial-bg/50 p-3 tech-label text-[10px] uppercase font-bold tracking-wider items-center">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => {
                            if (selectedSpoolIds.length === spools.length) setSelectedSpoolIds([]);
                            else setSelectedSpoolIds(spools.map(s => s.id));
                          }}
                          className="w-4 h-4 border border-industrial-line/30 flex items-center justify-center hover:bg-white transition-colors"
                        >
                          {selectedSpoolIds.length === spools.length && <Check size={12} className="text-industrial-accent" />}
                        </button>
                      </div>
                      <span>Tag Number</span>
                      <span>ISO Reference</span>
                      <span>Drawing Num</span>
                      <span className="text-center">Weight</span>
                      <span className="text-right">Status</span>
                    </div>
                    {spools.length > 0 ? (
                      spools.map((spool, idx) => (
                        <div 
                          key={`spool-reg-row-${spool.id}-${idx}`} 
                          className={cn(
                            "grid grid-cols-[30px_1fr_1fr_1fr_100px_120px] p-4 items-center hover:bg-industrial-bg/20 transition-colors cursor-pointer",
                            selectedSpoolIds.includes(spool.id) && "bg-industrial-accent/10"
                          )}
                          onClick={() => {
                            if (selectedSpoolIds.includes(spool.id)) setSelectedSpoolIds(selectedSpoolIds.filter(id => id !== spool.id));
                            else setSelectedSpoolIds([...selectedSpoolIds, spool.id]);
                          }}
                        >
                          <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                             <button 
                               onClick={() => {
                                 if (selectedSpoolIds.includes(spool.id)) setSelectedSpoolIds(selectedSpoolIds.filter(id => id !== spool.id));
                                 else setSelectedSpoolIds([...selectedSpoolIds, spool.id]);
                               }}
                               className={cn(
                                 "w-4 h-4 border flex items-center justify-center transition-colors",
                                 selectedSpoolIds.includes(spool.id) ? "border-industrial-ink bg-industrial-ink text-white" : "border-industrial-line/30 bg-white"
                               )}
                             >
                               {selectedSpoolIds.includes(spool.id) && <Check size={10} />}
                             </button>
                          </div>
                          <span className="tech-value text-xs font-bold uppercase">{spool.tag}</span>
                          <span className="tech-value text-xs text-industrial-accent">{spool.iso || '--'}</span>
                          <span className="tech-label text-xs uppercase">{spool.drawing || '--'}</span>
                          <span className="text-center tech-value text-xs">{spool.weight?.toLocaleString() || '--'}</span>
                          <div className="text-right flex items-center justify-end gap-2">
                             <span className={cn(
                               "px-2 py-0.5 rounded-full text-[9px] tech-value uppercase font-bold border",
                               spool.status === 'installed' ? "bg-green-100 text-green-700 border-green-200" :
                               spool.status === 'delivered' ? "bg-blue-100 text-blue-700 border-blue-200" :
                               spool.status === 'received' ? "bg-blue-100 text-blue-700 border-blue-200" :
                               spool.status === 'shipped' ? "bg-purple-100 text-purple-700 border-purple-200" :
                               "bg-amber-50 text-amber-600 border-amber-200"
                             )}>
                               {spool.status}
                             </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-industrial-bg flex items-center justify-center rounded-full opacity-20">
                           <Zap size={32} />
                        </div>
                        <div>
                          <p className="tech-value text-sm">No Spool Data Detected</p>
                          <p className="tech-label uppercase text-[10px]">Import a spool registry CSV to begin tracking kitted assemblies.</p>
                        </div>
                        <button 
                          onClick={() => setIsSpoolModalOpen(true)}
                          className="mt-2 px-6 py-2 bg-industrial-ink text-white tech-value text-[10px] uppercase tracking-widest hover:bg-industrial-accent hover:text-industrial-ink transition-all"
                        >
                          Execute Initial Import
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {manifests.filter(m => manifestFilter === 'archived' ? m.status === 'completed' : m.status !== 'completed').length > 0 ? (
                      manifests
                        .filter(m => manifestFilter === 'archived' ? m.status === 'completed' : m.status !== 'completed')
                        .map((manifest, mIdx) => (
                        <div key={`manifest-card-${manifest.id}-${mIdx}`} className="bg-white border border-industrial-line/10 shadow-sm flex flex-col">
                          <div className="p-4 border-b border-industrial-line/10 flex justify-between items-start bg-industrial-bg/5">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-industrial-accent" />
                                <span className="tech-value text-xs font-bold">{manifest.manifestNumber}</span>
                              </div>
                              <p className="tech-label text-[9px] uppercase tracking-tighter">Created {new Date(manifest.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] tech-value uppercase font-bold border",
                              manifest.status === 'received' || manifest.status === 'completed' ? "bg-green-100 text-green-700 border-green-200" :
                              manifest.status === 'shipped' ? "bg-blue-100 text-blue-700 border-blue-200" :
                              manifest.status === 'loaded' ? "bg-purple-100 text-purple-700 border-purple-200" :
                              "bg-amber-50 text-amber-600 border-amber-200"
                            )}>
                              {manifest.status}
                              {manifest.status === 'loaded' && manifest.loadedAt && <span className="ml-1 opacity-70">({new Date(manifest.loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>}
                              {manifest.status === 'shipped' && manifest.shippedAt && <span className="ml-1 opacity-70">({new Date(manifest.shippedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>}
                              {manifest.status === 'received' && manifest.receivedAt && <span className="ml-1 opacity-70">({new Date(manifest.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>}
                            </span>
                          </div>
                          
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <span className="tech-label text-[8px] uppercase tracking-widest opacity-60">Origin</span>
                                <span className="tech-value text-[10px] truncate">{manifest.origin}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="tech-label text-[8px] uppercase tracking-widest opacity-60">Destination</span>
                                <span className="tech-value text-[10px] truncate">{manifest.destination}</span>
                              </div>
                            </div>
                            
                            <div className="bg-industrial-bg/30 p-2 border border-industrial-line/5 rounded">
                               <div className="flex justify-between items-center mb-1">
                                 <span className="tech-label text-[8px] uppercase font-bold">Kitted Spools</span>
                                 <span className="tech-value text-[10px] px-1.5 py-0.5 bg-industrial-ink text-white rounded-sm">{manifest.items.length}</span>
                               </div>
                               <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                                 {manifest.items.slice(0, 4).map((itemId, iIdx) => {
                                   const spool = spools.find(s => s.id === itemId);
                                   return spool ? (
                                     <span key={`manifest-mini-item-${manifest.id}-${itemId}-${iIdx}`} className="tech-label text-[8px] bg-white border border-industrial-line/10 px-1 py-0.5">{spool.tag}</span>
                                   ) : null;
                                 })}
                                 {manifest.items.length > 4 && <span key={`more-items-${manifest.id}-${mIdx}`} className="tech-label text-[8px] opacity-40">+{manifest.items.length - 4} more</span>}
                               </div>
                            </div>
                            {(manifest.loaderSignature || manifest.driverSignature || manifest.receiverSignature) && (
                              <div key={`manifest-auth-log-${manifest.id}-${mIdx}`} className="flex items-center gap-2 pt-2 border-t border-industrial-line/5">
                                 <div className="flex -space-x-2">
                                   {manifest.loaderSignature && <div key={`ldr-dot-${manifest.id}-${mIdx}`} className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-[8px] font-bold text-purple-600">L</div>}
                                   {manifest.driverSignature && <div key={`drv-dot-${manifest.id}-${mIdx}`} className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[8px] font-bold text-blue-600">D</div>}
                                   {manifest.receiverSignature && <div key={`rcv-dot-${manifest.id}-${mIdx}`} className="w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-[8px] font-bold text-green-600">R</div>}
                                 </div>
                                 <span className="tech-label text-[7px] uppercase font-bold text-industrial-ink/40 tracking-widest">Digital Auth Logged</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto p-4 border-t border-industrial-line/5 bg-gray-50 flex gap-2">
                             {manifest.status === 'draft' && (
                               <button 
                                 onClick={() => setViewingManifestId(manifest.id)}
                                 className="flex-1 py-1.5 bg-purple-600 text-white tech-value text-[9px] uppercase tracking-widest font-bold hover:bg-purple-700"
                               >
                                 Prepare Load
                               </button>
                             )}
                             {manifest.status === 'loaded' && (
                               <button 
                                 onClick={() => setViewingManifestId(manifest.id)}
                                 className="flex-1 py-1.5 bg-blue-600 text-white tech-value text-[9px] uppercase tracking-widest font-bold hover:bg-blue-700"
                               >
                                 Execute Export
                               </button>
                             )}
                             {manifest.status === 'shipped' && (
                               <button 
                                 onClick={() => setViewingManifestId(manifest.id)}
                                 className="flex-1 py-1.5 bg-green-600 text-white tech-value text-[9px] uppercase tracking-widest font-bold hover:bg-green-700"
                                >
                                 Process Import
                               </button>
                             )}
                             <button 
                               onClick={() => setViewingManifestId(manifest.id)}
                               className={cn(
                                 "flex-1 py-1.5 tech-value text-[9px] uppercase tracking-widest font-bold transition-colors",
                                 manifest.status === 'completed' 
                                   ? "bg-industrial-ink/10 text-industrial-ink hover:bg-industrial-ink hover:text-white"
                                   : "bg-industrial-ink text-white hover:bg-industrial-accent hover:text-industrial-ink"
                               )}
                             >
                               {manifest.status === 'completed' ? 'View Record' : 'Ticket Details'}
                             </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 opacity-30">
                        <Truck size={48} />
                        <div>
                          <p className="tech-value text-sm">
                            {manifestFilter === 'active' ? 'No Active Shipments' : 'Project Archive Empty'}
                          </p>
                          <p className="tech-label uppercase text-[10px]">
                            {manifestFilter === 'active' 
                              ? 'Select spools from the registry to generate a shipping manifest.'
                              : 'Once a ticket is accepted and archived, it will appear here for permanent records.'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global View Logic merged into Inventory */}

            {/* ISO Detail Overlay */}
            {/* Traceability Management Modal */}
            <AnimatePresence>
              {tracingMaterial && (
                <TraceabilityModal 
                  key={`trace-modal-${tracingMaterial.id}`}
                  material={tracingMaterial.type === 'bom' ? materials.find(m => m.id === tracingMaterial.id) : unallocatedPool.find(p => p.id === tracingMaterial.id)}
                  onSave={handleSaveDocumentation}
                  onClose={() => setTracingMaterial(null)}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedISO && (
                <motion.div
                  key="iso-detail-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-industrial-ink/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                  onClick={() => setSelectedISO(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white border border-industrial-line/20 w-full max-w-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center">
                      <div>
                        <h3 className="tech-value text-sm">ISO DETAIL: {selectedISO}</h3>
                        {(() => {
                          const summary = stats.isoStats.find(s => s.iso === selectedISO);
                          return (
                            <div className="flex flex-col">
                              <p className="tech-label text-[10px]">
                                Shortfall: <span className="text-industrial-accent font-bold">{((summary?.total || 0) - (summary?.received || 0)).toLocaleString()}</span> units still needed
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <button 
                        onClick={() => setSelectedISO(null)}
                        className="p-1 hover:bg-industrial-line/10 rounded-full"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-industrial-line/10 bg-industrial-bg/30">
                            <th className="px-6 py-2 tech-label text-[10px]">Material</th>
                            <th className="px-6 py-2 tech-label text-[10px]">Heat Number</th>
                            <th className="px-6 py-2 tech-label text-[10px] text-right">Qty (Stock/Need)</th>
                            <th className="px-6 py-2 tech-label text-[10px]">Status</th>
                            <th className="px-6 py-2 tech-label text-[10px] text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-line/5">
                          {materials
                            .filter(m => (m.iso || 'UNASSIGNED') === selectedISO)
                            .flatMap((m, mIdx) => {
                              const rows: any[] = [];
                              
                              // Group received by heat
                              const heatGroups = (m.instances || []).reduce((acc: Record<string, { heat: string, qty: number, instance?: any }>, inst) => {
                                const key = inst.heatNumber || 'PENDING';
                                if (!acc[key]) acc[key] = { heat: key, qty: 0, instance: inst };
                                acc[key].qty++;
                                return acc;
                              }, {});

                              // Add rows for received heat numbers
                              (Object.values(heatGroups) as { heat: string, qty: number, instance?: any }[]).forEach((group, gIdx) => {
                                rows.push(
                                  <tr key={`iso-group-${m.id}-${group.heat}-${gIdx}`} className="hover:bg-industrial-bg/10 transition-colors">
                                    <td className="px-6 py-3">
                                      <div className="flex flex-col">
                                        <span className="tech-value text-xs">{m.name}</span>
                                        <span className="tech-label opacity-40 lowercase">{m.category}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <button 
                                        onClick={() => {
                                          setSearchQuery(group.heat);
                                          setActiveTab('quality');
                                          setSelectedISO(null);
                                        }}
                                        className="tech-value text-xs text-industrial-accent hover:underline font-bold"
                                      >
                                        {group.heat}
                                      </button>
                                    </td>
                                    <td className="px-6 py-3 text-right text-green-600 tech-value text-xs font-bold">
                                      {group.qty}
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className="text-[9px] tech-value px-2 py-0.5 border rounded-full bg-green-50 text-green-700 border-green-200 uppercase">
                                        Received
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                      {group.instance?.mtrUrl && (
                                        <button 
                                          onClick={() => setViewingMTR({ ...group.instance, material: m })}
                                          className="text-industrial-accent hover:underline tech-value text-[10px] font-bold"
                                        >
                                          VIEW MTR
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                              
                              // Add row for remaining expected
                              const remaining = m.expectedQuantity - (m.receivedQuantity || 0);
                              const poolItem = unallocatedPool.find(p => p.name.trim() === m.name.trim());
                              const availableStock = poolItem ? poolItem.quantity : 0;

                              if (remaining > 0) {
                                rows.push(
                                  <tr key={`iso-remaining-${m.id}-${mIdx}`} className="hover:bg-industrial-bg/10 transition-colors bg-industrial-bg/5">
                                    <td className="px-6 py-3">
                                      <div className="flex flex-col">
                                        <span className="tech-value text-xs opacity-60 italic">{m.name}</span>
                                        <span className="tech-label opacity-30 lowercase">remaining shortfall</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-industrial-line tech-label text-[10px] italic">
                                      Outstanding arrival
                                    </td>
                                    <td className="px-6 py-3 text-right tech-value text-xs">
                                      <div className="flex flex-col items-end leading-tight">
                                        <div className="flex items-baseline gap-1">
                                          <span className={cn(
                                            "font-bold",
                                            availableStock > 0 ? "text-green-600" : "text-industrial-accent"
                                          )}>
                                            {availableStock.toLocaleString()}
                                          </span>
                                          <span className="text-[9px] opacity-40 uppercase tracking-tighter">Stock</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-industrial-line font-bold">{remaining.toLocaleString()}</span>
                                          <span className="text-[9px] opacity-40 uppercase tracking-tighter">Needed</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <StatusBadge status="expected" />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                        {availableStock > 0 && (
                                          <button 
                                            onClick={() => {
                                              if (poolItem) {
                                                setAllocatingItem(poolItem);
                                                setAllocationQty(Math.min(poolItem.quantity, remaining));
                                              }
                                            }}
                                            className="text-industrial-accent hover:underline tech-value text-[10px] font-bold uppercase"
                                          >
                                            ALLOCATE
                                          </button>
                                        )}
                                        <button 
                                          onClick={() => {
                                            setReceivingMaterialId(m.id);
                                            setTempReceiptLines([{ id: `receipt-${Date.now()}-${Math.random()}`, heat: '', mtr: '', qty: remaining }]);
                                          }}
                                          className="text-industrial-ink hover:text-industrial-accent transition-colors tech-value text-[10px] font-bold uppercase"
                                        >
                                          RECEIVE
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return rows;
                            })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="p-4 border-t border-industrial-line/10 bg-industrial-bg/5 flex justify-end">
                      <button 
                        onClick={() => setSelectedISO(null)}
                        className="px-6 py-2 bg-industrial-ink text-white tech-value text-xs hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
                      >
                        CLOSE
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {allocatingItem && (
                <motion.div
                  key="allocation-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-industrial-ink/60 backdrop-blur-md z-[120] flex items-center justify-center p-4"
                  onClick={() => setAllocatingItem(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white border border-industrial-line/20 w-full max-w-xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6 border-b border-industrial-line/10 bg-industrial-bg/5 flex justify-between items-start">
                      <div>
                        <span className="tech-label text-[10px] uppercase font-bold text-industrial-accent tracking-widest">Inventory Allocation Tool</span>
                        <h2 className="tech-value text-xl mt-1">Allocate: {allocatingItem.name}</h2>
                        <p className="tech-label opacity-60">Source Bucket: {allocatingItem.quantity} {allocatingItem.unit} UNALLOCATED</p>
                      </div>
                      <button onClick={() => setAllocatingItem(null)} className="p-2 hover:bg-industrial-bg rounded-full transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div>
                        <label className="tech-label text-[10px] uppercase font-bold mb-2 block">1. Select Target ISO Requirement</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[30vh] overflow-y-auto pr-2">
                          {materials
                            .filter(m => m.name === allocatingItem.name && (m.expectedQuantity - (m.receivedQuantity || 0)) > 0)
                            .map((req, reqIdx) => {
                              const needed = req.expectedQuantity - (req.receivedQuantity || 0);
                              return (
                                <button
                                  key={`alloc-req-${req.id}-${reqIdx}`}
                                  onClick={() => {
                                    setAllocationISO(req.iso || 'UNASSIGNED');
                                    setAllocationQty(Math.min(needed, allocatingItem.quantity));
                                  }}
                                  className={cn(
                                    "p-3 border text-left transition-all group flex justify-between items-center",
                                    allocationISO === req.iso ? "bg-industrial-ink text-white border-industrial-ink" : "bg-white border-industrial-line/10 hover:border-industrial-accent"
                                  )}
                                >
                                  <div className="flex flex-col">
                                    <span className="tech-value text-sm">ISO-{req.iso}</span>
                                    <span className={cn("text-[10px] tech-label uppercase font-bold", allocationISO === req.iso ? "text-industrial-accent" : "opacity-40")}>
                                      Requirement ID: {req.id.slice(-6)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="tech-value text-lg leading-none">{needed}</span>
                                    <span className="block text-[8px] tech-label uppercase opacity-60">Units Needed</span>
                                  </div>
                                </button>
                              );
                            })}
                          {materials.filter(m => m.name === allocatingItem.name && (m.expectedQuantity - (m.receivedQuantity || 0)) > 0).length === 0 && (
                            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200">
                              <p className="tech-label opacity-40 italic">No active requirements found for this item type on any ISO.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {allocationISO && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4"
                        >
                          <div className="flex justify-between items-end">
                            <label className="tech-label text-[10px] uppercase font-bold block">2. Select Heat Numbers & Quantities</label>
                            <div className="text-right">
                              <span className="tech-label text-[10px] opacity-60">Total Selected:</span>
                              <span className="ml-2 tech-value text-lg text-industrial-accent">
                                {(Object.values(allocationQuantities) as number[]).reduce((a: number, b: number) => a + b, 0)}
                              </span>
                            </div>
                          </div>

                          <div className="border border-industrial-line/10 divide-y divide-industrial-line/5 max-h-[35vh] overflow-y-auto bg-industrial-bg/5">
                            {allocatingItem.instances.map((inst, instIdx) => (
                              <div key={`alloc-inst-${inst.id}-${instIdx}`} className="p-3 flex items-center justify-between gap-4 bg-white/50 hover:bg-white transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="tech-value text-xs font-bold">{inst.heatNumber}</span>
                                    <span className="text-[9px] tech-label bg-industrial-bg px-1.5 py-0.5 border border-industrial-line/10">MTR: {inst.mtrNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] tech-label opacity-60 uppercase font-bold">Available: {inst.quantity || 1} {allocatingItem.unit}</span>
                                    {inst.mtrUrl && (
                                      <button 
                                        onClick={() => setViewingMTR({ ...inst, material: { name: allocatingItem.name } })}
                                        className="text-[9px] text-industrial-accent hover:underline uppercase font-bold"
                                      >
                                        View MTR
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="w-24">
                                  <input 
                                    type="number"
                                    max={inst.quantity || 1}
                                    min="0"
                                    placeholder="0"
                                    className="w-full bg-white border border-industrial-line/10 p-2 text-sm tech-value text-right outline-none focus:border-industrial-accent font-bold"
                                    value={allocationQuantities[inst.id] === 0 ? '' : allocationQuantities[inst.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Math.min(inst.quantity || 1, Number(e.target.value));
                                      setAllocationQuantities(prev => ({ ...prev, [inst.id]: val }));
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2">
                            <button 
                              onClick={handleAllocate}
                              disabled={!allocationISO || (Object.values(allocationQuantities) as number[]).reduce((a: number, b: number) => a + b, 0) === 0}
                              className="w-full py-4 bg-industrial-accent text-industrial-ink tech-value text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-industrial-accent/20"
                            >
                              <PackageCheck size={16} />
                              Finalize Allocation for ISO-{allocationISO}
                            </button>
                          </div>

                          <p className="text-[9px] tech-label italic opacity-50 text-right uppercase">
                            * Specific heat records will be detached from unallocated pool and kitted to ISO-{allocationISO}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    <div className="p-6 border-t border-industrial-line/10 bg-industrial-bg/5 flex justify-end gap-3">
                      <button 
                        onClick={() => setAllocatingItem(null)}
                        className="px-6 py-2 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        disabled={!allocationISO || ((Object.values(allocationQuantities) as number[]).reduce((a: number, b: number) => a + b, 0) === 0 && allocationQty <= 0)}
                        onClick={handleAllocate}
                        className="px-8 py-2 bg-industrial-ink text-white tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink disabled:opacity-30 disabled:hover:bg-industrial-ink transition-colors uppercase tracking-widest font-bold"
                      >
                        Confirm Allocation
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quality Receipt Modal */}
            <AnimatePresence>
              {receivingMaterialId && (
                <motion.div
                  key="quality-receipt-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-industrial-ink/60 backdrop-blur-md z-[80] flex items-center justify-center p-4"
                >
                  <motion.div
                    key="quality-receipt-modal-content"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white border border-industrial-line/20 w-full max-w-3xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-industrial-line/10 bg-industrial-bg/5 flex justify-between items-start">
                      <div>
                        <span className="tech-label text-[10px] uppercase font-bold text-industrial-accent tracking-widest">Quality Ingest Portal</span>
                        <h2 className="tech-value text-xl mt-1">
                          Receiving: {materials.find(m => m.id === receivingMaterialId)?.name}
                        </h2>
                        <p className="tech-label opacity-60">SKU: {materials.find(m => m.id === receivingMaterialId)?.sku}</p>
                      </div>
                      <button onClick={() => { setReceivingMaterialId(null); setTempReceiptLines([]); }} className="p-2 hover:bg-industrial-bg rounded-full transition-colors">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <span className="tech-label font-bold text-lg">Receipt Lines</span>
                          <span className="tech-label text-[10px]">Log arrivals by Heat Number</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="tech-label text-[10px] block">TOTAL UNITS</span>
                            <span className="tech-value text-xl text-industrial-accent">{totalReceiveQty}</span>
                          </div>
                          <button 
                            onClick={() => setTempReceiptLines([...tempReceiptLines, { id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, heat: '', mtr: '', qty: 1 }])}
                            className="bg-industrial-ink text-white px-4 py-2 tech-value text-[10px] hover:bg-industrial-accent hover:text-industrial-ink transition-colors flex items-center gap-2"
                          >
                            <Plus size={14} /> ADD HEAT GROUP
                          </button>
                          {tempReceiptLines.length > 0 && (
                            <button 
                              onClick={() => setTempReceiptLines([])}
                              className="border border-red-500/20 text-red-600 px-3 py-2 tech-value text-[10px] hover:bg-red-50 transition-colors"
                            >
                              CLEAR ALL
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tempReceiptLines.map((line, idx) => (
                          <React.Fragment key={`rcpt-grp-${line.id}-${idx}`}>
                            <div className="grid grid-cols-12 gap-3 p-3 border border-industrial-line/10 bg-industrial-bg/5 relative group items-end">
                              <div className="col-span-3">
                                <label className="tech-label text-[9px] mb-1 block">HEAT NUMBER</label>
                                <input 
                                  placeholder="e.g. A403-XYZ" 
                                  className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                                  value={line.heat}
                                  onChange={(e) => {
                                    setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { ...l, heat: e.target.value } : l));
                                  }}
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="tech-label text-[9px] mb-1 block">VENDOR</label>
                                <select 
                                  className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                                  value={line.vendor || ''}
                                  onChange={(e) => {
                                    setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { ...l, vendor: e.target.value } : l));
                                  }}
                                >
                                  <option value="">Select...</option>
                                  {VENDORS.map((v, vIdx) => <option key={`rcpt-vendor-${line.id}-${v}-${vIdx}`} value={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="col-span-3">
                                <label className="tech-label text-[9px] mb-1 block">MTR REFERENCE</label>
                                <input 
                                  placeholder="e.g. MTR-9982" 
                                  className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent"
                                  value={line.mtr}
                                  onChange={(e) => {
                                    setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { ...l, mtr: e.target.value } : l));
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="tech-label text-[9px] mb-1 block">QUANTITY</label>
                                <input 
                                  type="number"
                                  className="w-full bg-white border border-industrial-line/10 p-2 text-xs tech-value outline-none focus:border-industrial-accent font-bold"
                                  value={line.qty === 0 ? '' : line.qty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                    setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { ...l, qty: val } : l));
                                  }}
                                />
                              </div>
                              <div className="col-span-1 flex flex-col items-center justify-end pb-1 gap-2">
                                <button 
                                  onClick={() => {
                                    setScanningIdx(tempReceiptLines.findIndex(l => l.id === line.id));
                                    setIsScannerOpen(true);
                                  }}
                                  className="p-2 rounded bg-industrial-bg/20 text-industrial-line hover:bg-industrial-accent hover:text-industrial-ink transition-all"
                                  title="Scan MTR"
                                >
                                  <Camera size={16} />
                                </button>
                                <label className="cursor-pointer group/upload">
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          const fileUrl = reader.result as string;
                                          const base64Data = fileUrl.split(',')[1];
                                          
                                          // Update file data immediately
                                          setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { ...l, fileName: file.name, fileData: fileUrl } : l));

                                          // Auto-extract if it's an image
                                          if (file.type.startsWith('image/')) {
                                            setIsExtracting(true);
                                            const result = await extractMTRInfo(base64Data);
                                            if (result) {
                                              setTempReceiptLines(prev => prev.map(l => l.id === line.id ? { 
                                                ...l, 
                                                heat: l.heat || result.heatNumber,
                                                mtr: l.mtr || result.mtrReference
                                              } : l));
                                            }
                                            setIsExtracting(false);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  <div className={cn(
                                    "p-2 rounded transition-all",
                                    line.fileName ? "bg-green-100 text-green-600" : "bg-industrial-bg/20 text-industrial-line hover:bg-industrial-accent hover:text-industrial-ink"
                                  )}>
                                    <FileUp size={16} />
                                  </div>
                                  {line.fileName && (
                                    <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-white">
                                      <Check size={8} />
                                    </span>
                                  )}
                                </label>
                                <button 
                                  onClick={() => setTempReceiptLines(prev => prev.filter(l => l.id !== line.id))}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            {line.fileName && (
                              <div className="px-3 py-1 bg-green-50/50 border-x border-b border-green-100 flex items-center gap-2 -mt-3 mb-2 rounded-b-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="tech-label text-[10px] text-green-700 truncate">Ready to link: {line.fileName}</span>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                        {tempReceiptLines.length === 0 && (
                          <div className="py-12 text-center border-2 border-dashed border-industrial-line/10 rounded-sm">
                            <p className="tech-label opacity-40 italic">Click "Add Heat Group" to begin documentation ingest.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 border-t border-industrial-line/10 bg-industrial-bg/5 flex justify-end gap-3">
                      <button 
                        onClick={() => { setReceivingMaterialId(null); setTempReceiptLines([]); }}
                        className="px-6 py-2 border border-industrial-line/20 tech-value text-[10px] hover:bg-industrial-bg transition-colors uppercase tracking-widest"
                      >
                        Abort
                      </button>
                      <button 
                        onClick={() => handleFinalizeReceipt(receivingMaterialId)}
                        disabled={totalReceiveQty <= 0}
                        className="px-8 py-2 bg-industrial-ink text-white tech-value text-[10px] hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-industrial-ink transition-colors uppercase tracking-widest"
                      >
                        Finalize Batch Receipt
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          <AnimatePresence>
            {viewingMTR && (
              <MTRViewer 
                record={viewingMTR}
                onClose={() => setViewingMTR(null)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isClearConfirmOpen && (
              <motion.div
                key="clear-confirm-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-industrial-ink/90 backdrop-blur-xl z-[150] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white border border-red-500/20 w-full max-w-md shadow-2xl overflow-hidden text-center p-8"
                >
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={32} className="text-red-600" />
                  </div>
                  <h2 className="tech-value text-xl mb-2 text-industrial-ink uppercase tracking-tight">Purge Job Data?</h2>
                  <p className="tech-label text-sm opacity-60 mb-8 leading-relaxed">
                    You are about to perform a <span className="text-red-600 font-bold">CRITICAL ACTION</span>.
                    This will permanently delete all materials, spools, manifests, and logs for <span className="font-bold">{activeJob.jobNumber}</span> only - other jobs are not affected.
                    This action cannot be undone.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleClearInventory}
                      className="w-full py-4 bg-red-600 text-white tech-value text-sm uppercase tracking-widest hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20"
                    >
                      CONFIRM TOTAL PURGE
                    </button>
                    <button 
                      onClick={() => setIsClearConfirmOpen(false)}
                      className="w-full py-4 bg-industrial-bg text-industrial-ink tech-value text-xs uppercase tracking-widest hover:bg-industrial-line/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {isScannerOpen && (
            <CameraScanner 
              onClose={() => setIsScannerOpen(false)}
              onCapture={async (base64) => {
                if (scanningIdx !== null) {
                  setIsScannerOpen(false);
                  setIsExtracting(true);
                  const result = await extractMTRInfo(base64);
                  const next = [...tempReceiptLines];
                  
                  // Store the scan data even if OCR partially fails or for viewing
                  next[scanningIdx].fileData = `data:image/jpeg;base64,${base64}`;
                  next[scanningIdx].fileName = `SCAN_RESULT_${Date.now()}.jpg`;

                  if (result) {
                    next[scanningIdx].heat = result.heatNumber;
                    next[scanningIdx].mtr = result.mtrReference;
                    next[scanningIdx].fileName = `SCAN_${result.mtrReference}.jpg`;
                  }
                  setTempReceiptLines(next);
                  setIsExtracting(false);
                }
              }}
            />
          )}

          {isExtracting && (
            <div className="fixed inset-0 z-[110] bg-industrial-ink/60 backdrop-blur-md flex items-center justify-center">
              <div className="bg-white p-8 border border-industrial-line/20 flex flex-col items-center gap-6 max-w-sm text-center shadow-2xl">
                <div className="relative">
                  <Activity size={48} className="text-industrial-accent animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-industrial-accent" />
                  </div>
                </div>
                <div>
                  <h3 className="tech-value text-lg mb-2">Analyzing MTR Document</h3>
                  <p className="tech-label opacity-60">Gemini is extracting Heat Number and Reference information from your scan...</p>
                </div>
                <div className="w-full h-1 bg-industrial-bg overflow-hidden relative">
                  <div className="absolute inset-0 bg-industrial-accent w-1/3 animate-[slide_2s_infinite_linear]" />
                </div>
              </div>
            </div>
          )}

          <style>{`
            @keyframes slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      </main>
    </div>
  );
}
