import { Material, LogisticsEntry } from './types';

export const MOCK_MATERIALS: Material[] = [
  {
    id: 'mat-1',
    name: '3" Carbon Steel Pipe (Sch 40)',
    sku: 'CS-P-03-40',
    category: 'Piping',
    unit: 'ft',
    quantity: 450,
    expectedQuantity: 500,
    receivedQuantity: 500,
    minThreshold: 200,
    location: 'Yard A-12',
    status: 'received',
    lastUpdated: 1,
    instances: [
      {
        id: 'inst-mock-1',
        heatNumber: 'A403-H12',
        mtrNumber: 'MTR-8829-X',
        mtrUrl: '#/preview',
        qualityStatus: 'verified',
        receivedDate: Date.now() - 1000 * 60 * 60 * 48
      }
    ]
  },
  {
    id: 'mat-2',
    name: 'M24 Structural Bolt Set',
    sku: 'STR-B-M24',
    category: 'Structural',
    unit: 'ea',
    quantity: 120,
    expectedQuantity: 1000,
    receivedQuantity: 120,
    minThreshold: 500,
    location: 'Warehouse B',
    status: 'low-stock',
    lastUpdated: 1,
    instances: [
      {
        id: 'inst-mock-2',
        heatNumber: '882-99-B',
        mtrNumber: 'CERT-BOLT-001',
        mtrUrl: '#/preview',
        qualityStatus: 'pending',
        receivedDate: Date.now() - 1000 * 60 * 60 * 24
      }
    ]
  },
  {
    id: 'mat-3',
    name: 'Type J Thermocouple Wire',
    sku: 'ELE-W-TJ',
    category: 'Electrical',
    unit: 'rl',
    quantity: 15,
    expectedQuantity: 20,
    receivedQuantity: 20,
    minThreshold: 5,
    location: 'Site Area 4',
    status: 'installed',
    lastUpdated: 1,
  },
  {
    id: 'mat-4',
    name: 'Isolation Valve 4"',
    sku: 'VAL-IV-04',
    category: 'Instrumentation',
    unit: 'ea',
    quantity: 8,
    expectedQuantity: 10,
    receivedQuantity: 0,
    minThreshold: 10,
    location: 'In Transit',
    status: 'in-transit',
    lastUpdated: 1,
  },
];

export const MOCK_LOGISTICS: LogisticsEntry[] = [
  {
    id: 'log-1',
    materialId: 'mat-1',
    materialName: '3" Carbon Steel Pipe (Sch 40)',
    type: 'receipt',
    quantity: 500,
    toLocation: 'Yard A-12',
    timestamp: 1,
    userId: 'u-1',
    userName: 'John Doe',
  },
  {
    id: 'log-2',
    materialId: 'mat-1',
    materialName: '3" Carbon Steel Pipe (Sch 40)',
    type: 'issue',
    quantity: 50,
    fromLocation: 'Yard A-12',
    timestamp: 1,
    userId: 'u-2',
    userName: 'Jane Smith',
    notes: 'Issued to Spool Fab Shop',
  },
];
