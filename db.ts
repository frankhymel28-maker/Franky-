import Database from 'better-sqlite3';
import { Material, LogisticsEntry, UnallocatedItem, Spool, Manifest } from './src/types';
import { MOCK_MATERIALS, MOCK_LOGISTICS } from './src/constants';

const dbPath = process.env.NODE_ENV === 'production' ? './dist/data.db' : './data.db';
const db = new Database(dbPath);

export function initDb() {
  // Create tables with schema-flexible JSON content, tracked by unique ID and lastUpdated timestamp
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS unallocated (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS spools (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS manifests (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
  `);

  console.log('[SQLITE] Database tables checked/created.');

  // Check if seeding is needed
  const materialCount = db.prepare('SELECT count(*) as count FROM materials').get() as { count: number };
  if (materialCount.count === 0) {
    console.log('[SQLITE] Seeding initial database with mock data...');
    
    // Seed materials
    const insertMaterial = db.prepare('INSERT INTO materials (id, lastUpdated, data) VALUES (?, ?, ?)');
    for (const mat of MOCK_MATERIALS) {
      insertMaterial.run(mat.id, mat.lastUpdated || Date.now(), JSON.stringify(mat));
    }

    // Seed logs
    const insertLog = db.prepare('INSERT INTO logs (id, lastUpdated, data) VALUES (?, ?, ?)');
    for (const log of MOCK_LOGISTICS) {
      insertLog.run(log.id, log.timestamp || Date.now(), JSON.stringify(log));
    }
    
    console.log('[SQLITE] Seeding complete.');
  }
}

interface SyncPayload {
  materials: Material[];
  unallocatedPool: UnallocatedItem[];
  spools: Spool[];
  manifests: Manifest[];
  logs: LogisticsEntry[];
}

export function syncTable(tableName: string, clientRecords: any[]): any[] {
  const selectStmt = db.prepare(`SELECT lastUpdated, data FROM ${tableName} WHERE id = ?`);
  const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, lastUpdated, data) VALUES (?, ?, ?)`);

  // Start a transaction for speed and integrity
  const transaction = db.transaction(() => {
    for (const record of clientRecords) {
      if (!record.id) continue;
      const recordLastUpdated = record.lastUpdated || record.timestamp || Date.now();
      
      const existing = selectStmt.get(record.id) as { lastUpdated: number; data: string } | undefined;
      
      if (!existing || recordLastUpdated > existing.lastUpdated) {
        // Client record is newer or doesn't exist, update database
        insertStmt.run(record.id, recordLastUpdated, JSON.stringify(record));
      }
    }
  });
  
  transaction();

  // Retrieve all updated records from this table to send back to the client
  const allRecords = db.prepare(`SELECT data FROM ${tableName}`).all() as { data: string }[];
  return allRecords.map(r => JSON.parse(r.data));
}

export function handleSync(payload: SyncPayload): SyncPayload {
  return {
    materials: syncTable('materials', payload.materials || []) as Material[],
    unallocatedPool: syncTable('unallocated', payload.unallocatedPool || []) as UnallocatedItem[],
    spools: syncTable('spools', payload.spools || []) as Spool[],
    manifests: syncTable('manifests', payload.manifests || []) as Manifest[],
    logs: syncTable('logs', payload.logs || []) as LogisticsEntry[],
  };
}

export function getWholeDbState() {
  return {
    materials: db.prepare('SELECT data FROM materials').all().map((r: any) => JSON.parse(r.data)) as Material[],
    unallocatedPool: db.prepare('SELECT data FROM unallocated').all().map((r: any) => JSON.parse(r.data)) as UnallocatedItem[],
    spools: db.prepare('SELECT data FROM spools').all().map((r: any) => JSON.parse(r.data)) as Spool[],
    manifests: db.prepare('SELECT data FROM manifests').all().map((r: any) => JSON.parse(r.data)) as Manifest[],
    logs: db.prepare('SELECT data FROM logs').all().map((r: any) => JSON.parse(r.data)) as LogisticsEntry[],
  };
}

export function clearAllDb() {
  db.exec(`
    DELETE FROM materials;
    DELETE FROM unallocated;
    DELETE FROM spools;
    DELETE FROM manifests;
    DELETE FROM logs;
  `);
  console.log('[SQLITE] Database cleared.');
}
