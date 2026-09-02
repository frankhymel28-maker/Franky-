import Database from 'better-sqlite3';
import { Job, Material, LogisticsEntry, UnallocatedItem, Spool, Manifest } from './src/types';
import { DEFAULT_JOB, MOCK_MATERIALS, MOCK_LOGISTICS } from './src/constants';

const dbPath = process.env.NODE_ENV === 'production' ? './dist/data.db' : './data.db';
const db = new Database(dbPath);

export function initDb() {
  // Create tables with schema-flexible JSON content, tracked by unique ID and lastUpdated timestamp
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      lastUpdated INTEGER,
      data TEXT
    );
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
    CREATE TABLE IF NOT EXISTS tombstones (
      tableName TEXT,
      id TEXT,
      deletedAt INTEGER,
      PRIMARY KEY (tableName, id)
    );
  `);

  console.log('[SQLITE] Database tables checked/created.');

  // Seed the default demo job once, independent of whether its materials/logs
  // are later cleared out (clearing a job's data should not re-seed the job).
  const jobCount = db.prepare('SELECT count(*) as count FROM jobs').get() as { count: number };
  if (jobCount.count === 0) {
    db.prepare('INSERT INTO jobs (id, lastUpdated, data) VALUES (?, ?, ?)')
      .run(DEFAULT_JOB.id, DEFAULT_JOB.lastUpdated, JSON.stringify(DEFAULT_JOB));
  }

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
  jobs: Job[];
  materials: Material[];
  unallocatedPool: UnallocatedItem[];
  spools: Spool[];
  manifests: Manifest[];
  logs: LogisticsEntry[];
}

export function syncTable(tableName: string, clientRecords: any[]): any[] {
  const selectStmt = db.prepare(`SELECT lastUpdated, data FROM ${tableName} WHERE id = ?`);
  const insertStmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, lastUpdated, data) VALUES (?, ?, ?)`);
  const tombstoneStmt = db.prepare(`SELECT deletedAt FROM tombstones WHERE tableName = ? AND id = ?`);

  // Start a transaction for speed and integrity
  const transaction = db.transaction(() => {
    for (const record of clientRecords) {
      if (!record.id) continue;
      const recordLastUpdated = record.lastUpdated || record.timestamp || Date.now();

      // A client can still be mid-flight with a copy of a record from
      // before it was explicitly deleted (Clear All, Delete Job, orphaned
      // cleanup) - without this check, this insert-only merge would
      // resurrect it. Only let the record back in if the client's copy is
      // genuinely newer than the deletion.
      const tombstone = tombstoneStmt.get(tableName, record.id) as { deletedAt: number } | undefined;
      if (tombstone && tombstone.deletedAt >= recordLastUpdated) {
        continue;
      }

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

function tombstoneIds(tableName: string, ids: string[]) {
  if (ids.length === 0) return;
  const now = Date.now();
  const stmt = db.prepare(`INSERT OR REPLACE INTO tombstones (tableName, id, deletedAt) VALUES (?, ?, ?)`);
  for (const id of ids) stmt.run(tableName, id, now);
}

export function handleSync(payload: SyncPayload): SyncPayload {
  return {
    jobs: syncTable('jobs', payload.jobs || []) as Job[],
    materials: syncTable('materials', payload.materials || []) as Material[],
    unallocatedPool: syncTable('unallocated', payload.unallocatedPool || []) as UnallocatedItem[],
    spools: syncTable('spools', payload.spools || []) as Spool[],
    manifests: syncTable('manifests', payload.manifests || []) as Manifest[],
    logs: syncTable('logs', payload.logs || []) as LogisticsEntry[],
  };
}

export function getWholeDbState() {
  return {
    jobs: db.prepare('SELECT data FROM jobs').all().map((r: any) => JSON.parse(r.data)) as Job[],
    materials: db.prepare('SELECT data FROM materials').all().map((r: any) => JSON.parse(r.data)) as Material[],
    unallocatedPool: db.prepare('SELECT data FROM unallocated').all().map((r: any) => JSON.parse(r.data)) as UnallocatedItem[],
    spools: db.prepare('SELECT data FROM spools').all().map((r: any) => JSON.parse(r.data)) as Spool[],
    manifests: db.prepare('SELECT data FROM manifests').all().map((r: any) => JSON.parse(r.data)) as Manifest[],
    logs: db.prepare('SELECT data FROM logs').all().map((r: any) => JSON.parse(r.data)) as LogisticsEntry[],
  };
}

// Deletes every material/unallocated/spool/manifest/log record belonging to
// one job. Does not touch the job record itself or other jobs' data - the
// generic syncTable() merge above only ever inserts/updates, so this is the
// only way client-side removals actually take effect in SQLite.
const JOB_SCOPED_TABLES = ['materials', 'unallocated', 'spools', 'manifests', 'logs'];

export function clearJobData(jobId: string) {
  const transaction = db.transaction(() => {
    for (const table of JOB_SCOPED_TABLES) {
      const rows = db.prepare(`SELECT id FROM ${table} WHERE json_extract(data, '$.jobId') = ?`).all(jobId) as { id: string }[];
      db.prepare(`DELETE FROM ${table} WHERE json_extract(data, '$.jobId') = ?`).run(jobId);
      tombstoneIds(table, rows.map(r => r.id));
    }
  });
  transaction();
  console.log(`[SQLITE] Cleared data for job ${jobId}.`);
}

export function deleteJob(jobId: string) {
  const transaction = db.transaction(() => {
    for (const table of JOB_SCOPED_TABLES) {
      const rows = db.prepare(`SELECT id FROM ${table} WHERE json_extract(data, '$.jobId') = ?`).all(jobId) as { id: string }[];
      db.prepare(`DELETE FROM ${table} WHERE json_extract(data, '$.jobId') = ?`).run(jobId);
      tombstoneIds(table, rows.map(r => r.id));
    }
    db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
    tombstoneIds('jobs', [jobId]);
  });
  transaction();
  console.log(`[SQLITE] Deleted job ${jobId} and its data.`);
}

// Removes materials/unallocated/spools/manifests/logs whose jobId points to
// a job that no longer exists - leftover from a deleted job. Records with
// NO jobId at all are intentionally-global stock (never tied to a job),
// not orphaned, and are left alone.
export function cleanupOrphanedData(): Record<string, number> {
  const validJobIds = new Set(
    (db.prepare('SELECT id FROM jobs').all() as { id: string }[]).map(r => r.id)
  );

  const removed: Record<string, number> = {};
  const transaction = db.transaction(() => {
    for (const table of JOB_SCOPED_TABLES) {
      const rows = db.prepare(`SELECT id, data FROM ${table}`).all() as { id: string; data: string }[];
      const del = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      const orphanedIds: string[] = [];
      for (const row of rows) {
        const jobId = JSON.parse(row.data)?.jobId;
        if (jobId && !validJobIds.has(jobId)) {
          del.run(row.id);
          orphanedIds.push(row.id);
        }
      }
      tombstoneIds(table, orphanedIds);
      removed[table] = orphanedIds.length;
    }
  });
  transaction();
  console.log('[SQLITE] Cleaned up orphaned data:', removed);
  return removed;
}
