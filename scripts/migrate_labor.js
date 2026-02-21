const Database = require('better-sqlite3');
const path = require('path');

// Go up two levels from scripts/ to frontend/ then up to parent of frontend (where database is)
// Original path in db.ts: path.resolve(process.cwd(), '..', 'local_database.sqlite');
// process.cwd() when running 'npm run dev' is 'frontend'.
// So database is in 'frontend/../local_database.sqlite' = 'Software/local_database.sqlite'.
// From scripts/ (frontend/scripts), we need to go ../../.. to get to Software/
// directory of script is frontend/scripts.
const dbPath = path.resolve(__dirname, '../../local_database.sqlite');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
    console.log('Checking labor_payments_received schema...');

    // Create table if not exists
    db.exec(`
    CREATE TABLE IF NOT EXISTS labor_payments_received (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      vendor_id TEXT, 
      client_id TEXT,
      project_id TEXT,
      date TEXT,
      amount REAL,
      description TEXT,
      payment_method TEXT,
      transaction_id TEXT,
      cheque_number TEXT,
      bank_name TEXT,
      proof_url TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

    const columns = db.prepare('PRAGMA table_info(labor_payments_received)').all();

    if (!columns.find(c => c.name === 'client_id')) {
        db.prepare('ALTER TABLE labor_payments_received ADD COLUMN client_id TEXT').run();
        console.log('Added client_id column');
    } else {
        console.log('client_id column already exists');
    }

    if (!columns.find(c => c.name === 'project_id')) {
        db.prepare('ALTER TABLE labor_payments_received ADD COLUMN project_id TEXT').run();
        console.log('Added project_id column');
    } else {
        console.log('project_id column already exists');
    }

    console.log('Migration check complete.');
} catch (error) {
    console.error('Migration failed:', error);
}
