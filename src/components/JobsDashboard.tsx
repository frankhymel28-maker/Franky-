import React, { useMemo, useState } from 'react';
import { Briefcase, Plus, X, MapPin, Trash2, Package, Truck, ClipboardList, AlertCircle, Boxes, Hash, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { FlangeIcon, ValveIcon, FittingIcon, PipeIcon } from './MaterialIcons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Job, Material, Spool, Manifest, UnallocatedItem } from '../types';
import { MTRViewer } from './MTRViewer';
import { AddGlobalInventoryModal, GlobalHeatLine } from './AddGlobalInventoryModal';

interface JobsDashboardProps {
  jobs: Job[];
  allMaterials: Material[];
  allUnallocatedPool: UnallocatedItem[];
  allSpools: Spool[];
  allManifests: Manifest[];
  orphanedCounts: { materials: number; unallocatedPool: number; spools: number; manifests: number; logs: number };
  onOpenJob: (jobId: string) => void;
  onCreateJob: (input: { jobNumber: string; projectName: string; clientName: string; siteAddress: string; status: Job['status'] }) => void;
  onDeleteJob: (jobId: string) => void;
  onClearOrphanedData: () => void;
  onAddGlobalInventory: (input: { name: string; sku: string; category: string; unit: string; heatLines: GlobalHeatLine[] }) => void;
}

const STATUS_STYLES: Record<Job['status'], string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  'on-hold': 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const JobsDashboard: React.FC<JobsDashboardProps> = ({
  jobs,
  allMaterials,
  allUnallocatedPool,
  allSpools,
  allManifests,
  orphanedCounts,
  onOpenJob,
  onCreateJob,
  onDeleteJob,
  onClearOrphanedData,
  onAddGlobalInventory,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isClearOrphanedConfirmOpen, setIsClearOrphanedConfirmOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [status, setStatus] = useState<Job['status']>('active');
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null);
  const [viewingMTR, setViewingMTR] = useState<any | null>(null);

  const jobNumberById = useMemo(() => new Map(jobs.map(j => [j.id, j.jobNumber])), [jobs]);
  const totalOrphaned = orphanedCounts.materials + orphanedCounts.unallocatedPool + orphanedCounts.spools + orphanedCounts.manifests + orphanedCounts.logs;

  // Same material aggregated across multiple jobs' (and global) unallocated
  // pools is merged into one row (grouped by name), with a per-job quantity
  // breakdown, so the same part number bought for two jobs shows as one
  // line rather than duplicates. Items with a jobId pointing to a deleted
  // job are orphaned data, not real inventory, so they're excluded here -
  // see the "Clear Orphaned Data" action instead. Items with NO jobId are
  // intentionally-global stock (never tied to a job) and are included,
  // tagged "Global". Each row also carries its heat records (from every
  // underlying UnallocatedItem's instances) so the row can expand to show
  // per-heat detail and MTR documents.
  const globalUnallocated = useMemo(() => {
    const validJobIds = new Set(jobs.map(j => j.id));
    const byName = new Map<string, {
      name: string; sku: string; category: string; unit: string;
      total: number;
      byJob: { jobId: string; jobNumber: string; quantity: number }[];
      heatRecords: { instance: UnallocatedItem['instances'][number]; jobNumber: string; material: { name: string; sku: string; category: string } }[];
    }>();

    for (const item of allUnallocatedPool) {
      if (item.jobId && !validJobIds.has(item.jobId)) continue;
      const key = item.name.trim();
      if (!byName.has(key)) {
        byName.set(key, { name: key, sku: item.sku, category: item.category, unit: item.unit, total: 0, byJob: [], heatRecords: [] });
      }
      const entry = byName.get(key)!;
      entry.total += item.quantity;
      const jobNumber = item.jobId ? (jobNumberById.get(item.jobId) || 'Unknown Job') : 'Global';
      entry.byJob.push({ jobId: item.jobId || '__global__', jobNumber, quantity: item.quantity });
      for (const instance of item.instances || []) {
        entry.heatRecords.push({
          instance,
          jobNumber,
          material: { name: item.name, sku: item.sku, category: item.category },
        });
      }
    }

    return Array.from(byName.values()).sort((a, b) => b.total - a.total);
  }, [allUnallocatedPool, jobs, jobNumberById]);

  // High-level on-hand totals by broad category, across every row in
  // globalUnallocated (job-tied and global stock alike) - same substring
  // category match used by the per-job stat cards.
  const categoryTotals = useMemo(() => {
    const totalFor = (catName: string) =>
      globalUnallocated
        .filter(item => item.category.toLowerCase().includes(catName))
        .reduce((acc, item) => acc + item.total, 0);
    return {
      flanges: totalFor('flange'),
      valves: totalFor('valve'),
      fittings: totalFor('fitting'),
      pipe: totalFor('pipe'),
    };
  }, [globalUnallocated]);

  const visibleUnallocated = useMemo(() => {
    if (!categoryFilter) return globalUnallocated;
    return globalUnallocated.filter(item => item.category.toLowerCase().includes(categoryFilter));
  }, [globalUnallocated, categoryFilter]);

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilter(prev => (prev === cat ? null : cat));
  };

  const resetForm = () => {
    setJobNumber('');
    setProjectName('');
    setClientName('');
    setSiteAddress('');
    setStatus('active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber.trim() || !clientName.trim()) return;
    onCreateJob({ jobNumber: jobNumber.trim(), projectName: projectName.trim(), clientName: clientName.trim(), siteAddress: siteAddress.trim(), status });
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
        {totalOrphaned > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <p className="tech-label text-amber-800 normal-case tracking-normal">
                {totalOrphaned} record{totalOrphaned === 1 ? '' : 's'} found belonging to a deleted job - {orphanedCounts.materials} materials, {orphanedCounts.unallocatedPool} unallocated, {orphanedCounts.spools} spools, {orphanedCounts.manifests} manifests, {orphanedCounts.logs} logs.
              </p>
            </div>
            <button
              onClick={() => setIsClearOrphanedConfirmOpen(true)}
              className="shrink-0 px-4 py-2 border border-amber-300 text-amber-800 tech-value text-[10px] uppercase tracking-widest hover:bg-amber-100 transition-colors"
            >
              Clear Orphaned Data
            </button>
          </div>
        )}

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
                      <p className="tech-value text-base font-bold">{job.clientName}</p>
                      {job.projectName && (
                        <p className="tech-label text-[10px] opacity-70 mt-0.5">{job.projectName}</p>
                      )}
                      <p className="tech-label text-[10px] flex items-center gap-1 mt-1">
                        <Hash size={11} />
                        {job.jobNumber}
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

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { key: 'flange', label: 'Total Flanges', value: categoryTotals.flanges, icon: FlangeIcon },
            { key: 'valve', label: 'Total Valves', value: categoryTotals.valves, icon: ValveIcon },
            { key: 'fitting', label: 'Total Fittings', value: categoryTotals.fittings, icon: FittingIcon },
            { key: 'pipe', label: 'Total Pipe (FT)', value: categoryTotals.pipe, icon: PipeIcon },
          ] as const).map(({ key, label, value, icon: Icon }) => {
            const isActive = categoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => toggleCategoryFilter(key)}
                className={cn(
                  'text-left bg-white border p-4 flex flex-col gap-0.5 transition-colors',
                  isActive ? 'border-industrial-accent ring-1 ring-industrial-accent' : 'border-industrial-line/10 hover:border-industrial-line/30'
                )}
              >
                <div className="flex justify-between items-start">
                  <span className="tech-label">{label}</span>
                  <Icon className="w-4 h-4 opacity-70" />
                </div>
                <span className="text-xl tech-value">{value.toLocaleString()}</span>
                <span className="text-[10px] tech-label uppercase opacity-60 tracking-wider font-bold">
                  {isActive ? 'Click to clear filter' : 'On hand · click to filter'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 bg-white border border-industrial-line/10">
          <div className="p-4 border-b border-industrial-line/10 bg-industrial-bg/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Boxes size={16} className="opacity-50" />
              <div>
                <h2 className="tech-value text-sm">Global Unallocated Inventory</h2>
                <p className="tech-label">
                  Unassigned stock on hand across every job
                  {categoryFilter && (
                    <>
                      {' '}&middot; filtered to <span className="font-bold capitalize">{categoryFilter}s</span>
                      <button onClick={() => setCategoryFilter(null)} className="ml-2 underline hover:no-underline">clear</button>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="tech-label text-[9px] px-2 py-1 bg-industrial-bg font-bold">
                {visibleUnallocated.length} UNIQUE ITEMS
              </span>
              <button
                onClick={() => setIsAddInventoryOpen(true)}
                className="bg-industrial-ink text-white px-3 py-1.5 text-[10px] tech-value flex items-center gap-1.5 hover:bg-industrial-accent hover:text-industrial-ink transition-colors font-bold"
              >
                <Plus size={12} />
                Add Global Inventory
              </button>
            </div>
          </div>

          {visibleUnallocated.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Boxes size={28} className="opacity-20 mb-3" />
              <p className="tech-label">{categoryFilter ? `No ${categoryFilter}s on hand` : 'No unallocated materials in any job yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-industrial-line/10 bg-industrial-bg/30">
                    <th className="px-6 py-3 tech-label w-8"></th>
                    <th className="px-6 py-3 tech-label">Material / SKU</th>
                    <th className="px-6 py-3 tech-label text-right">Total On Hand</th>
                    <th className="px-6 py-3 tech-label">By Job</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-line/5">
                  {visibleUnallocated.map((item, idx) => {
                    const isExpanded = expandedMaterial === item.name;
                    return (
                      <React.Fragment key={`global-unalloc-${item.name}-${idx}`}>
                        <tr
                          onClick={() => setExpandedMaterial(isExpanded ? null : item.name)}
                          className="hover:bg-industrial-bg/30 transition-colors cursor-pointer"
                        >
                          <td className="pl-6 py-4 opacity-40">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="tech-value text-sm">{item.name}</span>
                              <span className="tech-label lowercase opacity-40">{item.sku} &middot; {item.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="tech-value text-sm font-bold">{item.total.toLocaleString()}</span>
                            <span className="tech-label lowercase ml-1">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.byJob.map(({ jobId, jobNumber, quantity }) => (
                                <span
                                  key={`${item.name}-${jobId}`}
                                  className={cn(
                                    'tech-label text-[9px] px-2 py-1 border font-bold',
                                    jobId === '__global__'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-industrial-bg border-industrial-line/10'
                                  )}
                                >
                                  {jobNumber}: {quantity.toLocaleString()}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="p-0 bg-industrial-bg/20">
                              {item.heatRecords.length === 0 ? (
                                <p className="tech-label px-6 py-4">No heat records logged for this material.</p>
                              ) : (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-industrial-line/10">
                                      <th className="pl-14 pr-6 py-2 tech-label text-[9px]">Heat Number</th>
                                      <th className="px-6 py-2 tech-label text-[9px]">MTR Reference</th>
                                      <th className="px-6 py-2 tech-label text-[9px]">Job</th>
                                      <th className="px-6 py-2 tech-label text-[9px] text-right">Qty</th>
                                      <th className="px-6 py-2 tech-label text-[9px]">Quality</th>
                                      <th className="px-6 py-2 tech-label text-[9px] text-right">Documentation</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-industrial-line/5">
                                    {item.heatRecords.map(({ instance, jobNumber, material }, hIdx) => (
                                      <tr key={`heat-${item.name}-${instance.id}-${hIdx}`}>
                                        <td className="pl-14 pr-6 py-3 tech-value text-xs font-bold">{instance.heatNumber || '—'}</td>
                                        <td className="px-6 py-3 tech-label">{instance.mtrNumber || '—'}</td>
                                        <td className="px-6 py-3 tech-label">{jobNumber}</td>
                                        <td className="px-6 py-3 text-right tech-value text-xs">{instance.quantity?.toLocaleString() ?? '—'}</td>
                                        <td className="px-6 py-3">
                                          <span className={cn(
                                            'tech-label text-[9px] px-2 py-0.5 border font-bold',
                                            instance.qualityStatus === 'verified' ? 'bg-green-50 text-green-700 border-green-200' :
                                            instance.qualityStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                          )}>
                                            {instance.qualityStatus}
                                          </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                          {instance.mtrUrl ? (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setViewingMTR({ ...instance, material }); }}
                                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-industrial-ink text-white tech-label text-[9px] font-bold hover:bg-industrial-accent hover:text-industrial-ink transition-colors"
                                            >
                                              <FileText size={11} /> View MTR
                                            </button>
                                          ) : (
                                            <span className="tech-label text-[9px] opacity-40">No MTR on file</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                  <span className="tech-label">Project Name</span>
                  <input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. Unit 4 Turnaround"
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

      <AnimatePresence>
        {isClearOrphanedConfirmOpen && (
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
              <h2 className="tech-value text-xl mb-2 text-industrial-ink uppercase tracking-tight">Clear Orphaned Data?</h2>
              <p className="tech-label text-sm opacity-60 mb-8 leading-relaxed">
                This permanently deletes {totalOrphaned} record{totalOrphaned === 1 ? '' : 's'} belonging to a deleted job: {orphanedCounts.materials} materials, {orphanedCounts.unallocatedPool} unallocated, {orphanedCounts.spools} spools, {orphanedCounts.manifests} manifests, {orphanedCounts.logs} logs. Global stock and every existing job's data is unaffected. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { onClearOrphanedData(); setIsClearOrphanedConfirmOpen(false); }}
                  className="w-full py-4 bg-red-600 text-white tech-value text-sm uppercase tracking-widest hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20"
                >
                  Clear Orphaned Data
                </button>
                <button
                  onClick={() => setIsClearOrphanedConfirmOpen(false)}
                  className="w-full py-3 tech-value text-xs uppercase tracking-widest text-industrial-ink/60 hover:text-industrial-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingMTR && <MTRViewer record={viewingMTR} onClose={() => setViewingMTR(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isAddInventoryOpen && (
          <AddGlobalInventoryModal
            onClose={() => setIsAddInventoryOpen(false)}
            onSubmit={(input) => {
              onAddGlobalInventory(input);
              setIsAddInventoryOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
