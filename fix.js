const Database = require('better-sqlite3');
const db = new Database('../local_database.sqlite');

try {
    // Turn off foreign keys for the migration 
    db.pragma('foreign_keys = OFF');

    // Start a transaction
    db.exec('BEGIN TRANSACTION;');

    // 1. Rename affected tables
    db.exec('ALTER TABLE office_expenses RENAME TO office_expenses_broken;');
    db.exec('ALTER TABLE labor_expenses RENAME TO labor_expenses_broken;');

    // 2. Recreate them with proper references to `users` instead of `users_old_role_mig`
    db.exec(`
    CREATE TABLE office_expenses ( 
      id TEXT PRIMARY KEY,     
      description TEXT NOT NULL,
      amount REAL NOT NULL,    
      category TEXT,
      date TEXT NOT NULL,      
      created_by TEXT,
      company_id TEXT,
      created_at TEXT NOT NULL,
      proof_url TEXT, 
      is_paid INTEGER DEFAULT 0, 
      payment_date TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
    );
  `);

    db.exec(`
    CREATE TABLE labor_expenses (
      id TEXT PRIMARY KEY,     
      description TEXT NOT NULL,
      amount REAL NOT NULL,    
      category TEXT,
      site_id TEXT,
      date TEXT NOT NULL,      
      created_by TEXT,
      company_id TEXT,
      created_at TEXT NOT NULL,
      vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL, 
      is_paid INTEGER DEFAULT 0, 
      payment_date TEXT, 
      proof_url TEXT, 
      worker_name TEXT,
      FOREIGN KEY (site_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
    );
  `);

    // 3. Copy data
    db.exec('INSERT INTO office_expenses SELECT * FROM office_expenses_broken;');
    db.exec('INSERT INTO labor_expenses SELECT * FROM labor_expenses_broken;');

    // 4. Drop the broken tables
    db.exec('DROP TABLE office_expenses_broken;');
    db.exec('DROP TABLE labor_expenses_broken;');

    // 5. If users_old_role_mig is still here, drop it
    try {
        db.exec('DROP TABLE users_old_role_mig;');
        console.log("Dropped users_old_role_mig successfully.");
    } catch (e) {
        console.log("Could not drop users_old_role_mig:", e.message);
    }

    db.exec('COMMIT;');
    console.log("Migration completed successfully. Foreign Keys restored.");

} catch (e) {
    if (db.inTransaction) db.exec('ROLLBACK;');
    console.error("Migration failed:", e);
} finally {
    db.close();
}
