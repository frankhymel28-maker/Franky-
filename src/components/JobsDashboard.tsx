import React, { useState } from 'react';
import { Briefcase, Plus, X, MapPin, Building2, Trash2, Package, Truck, ClipboardList, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Job, Material, Spool, Manifest } from '../types';

interface JobsDashboardProps {
  jobs: Job[];
  allMaterials: Material[];
  allSpools: Spool[];
  allManifests: Manifest[];
  onOpenJob: (jobId: string) => void;
  onCreateJob: (input: { jobNumber: string; clientName: string; siteAddress: string; status: Job['status'] }) => void;
  onDeleteJob: (jobId: string) => void;
}

const STATUS_STYLES: Record<Job['status'], string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  'on-hold': 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const JobsDashboard: React.FC<JobsDashboardProps> = ({
  jobs,
  allMaterials,
  allSpools,
  allManifests,
  onOpenJob,
  onCreateJob,
  onDeleteJob,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [status, setStatus] = useState<Job['status']>('active');

  const resetForm = () => {
    setJobNumber('');
    setClientName('');
    setSiteAddress('');
    setStatus('active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber.trim() || !clientName.trim()) return;
    onCreateJob({ jobNumber: jobNumber.trim(), clientName: clientName.trim(), siteAddress: siteAddress.trim(), status });
    resetForm();
    setIsCreateOpen(false);
  };

  return (
    <div className="min-h-screen bg-industrial-bg">
      <header className="h-16 border-b border-industrial-line/10 bg-white flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center bg-green-600">
            <span className="text-white font-bold text-[10px]">F</span>
          </div>
          <h1 className="tech-value text-lg">Jobs</h1>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-industrial-ink text-white px-4 py-1.5 text-xs tech-value flex items-center gap-2 hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
        >
          <Plus size={14} />
          New Job
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {jobs.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center border-2 border-dashed border-industrial-line/20">
            <Briefcase size={40} className="opacity-30 mb-4" />
            <p className="tech-value text-sm mb-1">No Jobs Yet</p>
            <p className="tech-label max-w-xs">Create a job to start tracking inventory, BOM, spools, and manifests for it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => {
              const materialCount = allMaterials.filter(m => m.jobId === job.id).length;
              const spoolCount = allSpools.filter(s => s.jobId === job.id).length;
              const manifestCount = allManifests.filter(m => m.jobId === job.id).length;
              return (
                <div
                  key={job.id}
                  className="bg-white border border-industrial-line/10 p-5 flex flex-col gap-4 hover:border-industrial-line/30 transition-colors cursor-pointer group"
                  onClick={() => onOpenJob(job.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="tech-value text-base font-bold">{job.jobNumber}</p>
                      <p className="tech-label text-[10px] flex items-center gap-1 mt-1">
                        <Building2 size={11} />
                        {job.clientName}
                      </p>
                    </div>
                    <span className={cn('tech-label text-[9px] px-2 py-1 border font-bold', STATUS_STYLES[job.status])}>
                      {job.status}
                    </span>
                  </div>

                  {job.siteAddress && (
                    <p className="tech-label text-[10px] flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      {job.siteAddress}
                    </p>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-industrial-line/10">
                    <div className="flex items-center gap-1.5" title="Materials">
                      <Package size={13} className="opacity-50" />
                      <span className="tech-value text-xs">{materialCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Spools">
                      <Truck size={13} className="opacity-50" />
                      <span className="tech-value text-xs">{spoolCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Manifests">
                      <ClipboardList size={13} className="opacity-50" />
                      <span className="tech-value text-xs">{manifestCount}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(job.id); }}
                      className="ml-auto p-1.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                      title="Delete job"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-industrial-ink/40 backdrop-blur-sm"
          >
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-industrial-bg border-2 border-industrial-line w-full max-w-md flex flex-col"
            >
              <div className="p-4 border-b-2 border-industrial-line flex justify-between items-center bg-white">
                <h2 className="tech-value text-lg">New Job</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); resetForm(); }} className="p-2 hover:bg-industrial-bg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="tech-label">Job Number *</span>
                  <input
                    autoFocus
                    value={jobNumber}
                    onChange={e => setJobNumber(e.target.value)}
                    placeholder="e.g. JOB-2026-014"
                    className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="tech-label">Client *</span>
                  <input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Acme Refining"
                    className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="tech-label">Site Address</span>
                  <input
                    value={siteAddress}
                    onChange={e => setSiteAddress(e.target.value)}
                    placeholder="e.g. 6277 Industrial Drive"
                    className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="tech-label">Status</span>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Job['status'])}
                    className="bg-white border border-industrial-line/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-industrial-accent"
                  >
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>

              <div className="p-4 border-t-2 border-industrial-line flex justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); resetForm(); }}
                  className="px-6 py-2 border border-industrial-line/20 tech-value text-xs hover:bg-industrial-bg transition-colors uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!jobNumber.trim() || !clientName.trim()}
                  className={cn(
                    'px-8 py-2 bg-industrial-ink text-white tech-value text-[10px] transition-all uppercase tracking-widest font-bold',
                    (!jobNumber.trim() || !clientName.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-industrial-accent hover:text-industrial-ink'
                  )}
                >
                  Create Job
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteId && (
          <motion.div
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
              <h2 className="tech-value text-xl mb-2 text-industrial-ink uppercase tracking-tight">Delete Job?</h2>
              <p className="tech-label text-sm opacity-60 mb-8 leading-relaxed">
                This permanently deletes <span className="font-bold">{jobs.find(j => j.id === pendingDeleteId)?.jobNumber}</span> and all of its materials, spools, manifests, and logs. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { onDeleteJob(pendingDeleteId); setPendingDeleteId(null); }}
                  className="w-full py-4 bg-red-600 text-white tech-value text-sm uppercase tracking-widest hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20"
                >
                  Delete Job
                </button>
                <button
                  onClick={() => setPendingDeleteId(null)}
                  className="w-full py-3 tech-value text-xs uppercase tracking-widest text-industrial-ink/60 hover:text-industrial-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
