/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobStatus = 'active' | 'on-hold' | 'completed';

export interface Job {
  id: string;
  jobNumber: string;
  projectName?: string;
  clientName: string;
  siteAddress: string;
  status: JobStatus;
  createdAt: number;
  lastUpdated: number;
}

export type MaterialStatus = 'expected' | 'received' | 'in-transit' | 'installed' | 'low-stock';

export interface MaterialInstance {
  id: string;
  heatNumber: string;
  mtrNumber: string;
  mtrUrl?: string; // For future file upload
  vendor?: string;
  receivedDate: number;
  quantity?: number;
  qualityStatus: 'pending' | 'verified' | 'rejected';
  notes?: string;
}

export const VENDORS = [
  'Ferguson',
  'Southern Pipe',
  'Sunbelt Supply',
  'STS',
  'MRC',
  'Nugent',
  'Internal/Other'
];

export interface Material {
  id: string;
  jobId?: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number; // For BOM items: this is basically 'allocated' now
  expectedQuantity: number; // Total quantity from BOM
  receivedQuantity: number; // For BOM items: Total amount allocated so far
  iso?: string;
  minThreshold: number;
  location: string;
  status: MaterialStatus;
  lastUpdated: number;
  instances?: MaterialInstance[];
}

export interface UnallocatedItem {
  id: string;
  jobId?: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number; // Available quantity in bucket
  instances: MaterialInstance[];
  lastUpdated: number;
}

export type LogisticsType = 'receipt' | 'transfer' | 'issue' | 'adjustment';

export interface LogisticsEntry {
  id: string;
  jobId?: string;
  materialId: string;
  materialName: string;
  type: LogisticsType;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  timestamp: number;
  userId: string;
  userName: string;
  notes?: string;
}

export interface SiteStats {
  totalItems: number;
  pendingReceipts: number;
  inTransit: number;
  lowStockAlerts: number;
}

export interface Spool {
  id: string;
  jobId?: string;
  tag: string;
  drawing?: string;
  iso?: string;
  status: 'pending' | 'fabricated' | 'loaded' | 'shipped' | 'received' | 'delivered' | 'installed';
  weight?: number;
  materialIds?: string[];
  lastUpdated: number;
  manifestId?: string;
}

export type ManifestStatus = 'draft' | 'loaded' | 'shipped' | 'received' | 'completed';

export interface Manifest {
  id: string;
  jobId?: string;
  manifestNumber: string;
  clientName?: string;
  jobTitle?: string;
  trailerNumber?: string;
  truckNumber?: string;
  driverName?: string;
  carrier?: string;
  origin: string;
  destination: string;
  destinationAddress?: string;
  status: ManifestStatus;
  items: string[]; // Array of Spool IDs or other item references
  shippedAt?: number;
  receivedAt?: number;
  loadedAt?: number;
  createdAt: number;
  lastUpdated: number;
  notes?: string;
  loaderSignature?: string; // Data URL
  loaderName?: string;
  driverSignature?: string; // Data URL
  receiverSignature?: string; // Data URL
  receiverName?: string;
}
