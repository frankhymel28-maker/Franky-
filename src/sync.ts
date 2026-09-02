import { Job, Material, LogisticsEntry, UnallocatedItem, Spool, Manifest } from './types';
import { DEFAULT_JOB, MOCK_MATERIALS, MOCK_LOGISTICS } from './constants';

export interface LocalState {
  jobs: Job[];
  materials: Material[];
  unallocatedPool: UnallocatedItem[];
  spools: Spool[];
  manifests: Manifest[];
  logs: LogisticsEntry[];
}

const STORAGE_KEYS = {
  jobs: 'franky_jobs',
  materials: 'franky_materials',
  unallocatedPool: 'franky_unallocated',
  spools: 'franky_spools',
  manifests: 'franky_manifests',
  logs: 'franky_logs',
};

// Initial state loading
export function loadLocalState(): LocalState {
  try {
    const jobsStr = localStorage.getItem(STORAGE_KEYS.jobs);
    const materialsStr = localStorage.getItem(STORAGE_KEYS.materials);
    const unallocatedStr = localStorage.getItem(STORAGE_KEYS.unallocatedPool);
    const spoolsStr = localStorage.getItem(STORAGE_KEYS.spools);
    const manifestsStr = localStorage.getItem(STORAGE_KEYS.manifests);
    const logsStr = localStorage.getItem(STORAGE_KEYS.logs);

    return {
      jobs: jobsStr ? JSON.parse(jobsStr) : [DEFAULT_JOB],
      materials: materialsStr ? JSON.parse(materialsStr) : MOCK_MATERIALS,
      unallocatedPool: unallocatedStr ? JSON.parse(unallocatedStr) : [],
      spools: spoolsStr ? JSON.parse(spoolsStr) : [],
      manifests: manifestsStr ? JSON.parse(manifestsStr) : [],
      logs: logsStr ? JSON.parse(logsStr) : MOCK_LOGISTICS,
    };
  } catch (error) {
    console.error('Failed to load local storage state:', error);
    return {
      jobs: [DEFAULT_JOB],
      materials: MOCK_MATERIALS,
      unallocatedPool: [],
      spools: [],
      manifests: [],
      logs: MOCK_LOGISTICS,
    };
  }
}

// Save active state to local storage
export function saveToLocalStorage(state: Partial<LocalState>) {
  try {
    if (state.jobs) localStorage.setItem(STORAGE_KEYS.jobs, JSON.stringify(state.jobs));
    if (state.materials) localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(state.materials));
    if (state.unallocatedPool) localStorage.setItem(STORAGE_KEYS.unallocatedPool, JSON.stringify(state.unallocatedPool));
    if (state.spools) localStorage.setItem(STORAGE_KEYS.spools, JSON.stringify(state.spools));
    if (state.manifests) localStorage.setItem(STORAGE_KEYS.manifests, JSON.stringify(state.manifests));
    if (state.logs) localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(state.logs));
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
}

// Sync local state payload with SQLITE Server Database
export async function syncStateWithBackend(localState: LocalState): Promise<LocalState> {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(localState),
  });

  if (!response.ok) {
    throw new Error(`Server responded with action status: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Sync operation rejected by server.');
  }

  // Extract merged collections
  const mergedState: LocalState = {
    jobs: result.jobs || [],
    materials: result.materials || [],
    unallocatedPool: result.unallocatedPool || [],
    spools: result.spools || [],
    manifests: result.manifests || [],
    logs: result.logs || [],
  };

  // Cache the merged result locally immediately
  saveToLocalStorage(mergedState);

  return mergedState;
}
