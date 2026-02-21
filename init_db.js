const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use the same path as the application
const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

console.log('\n=== INITIALIZING DATABASE ===\n');

try {
  // 1. Create company_profile table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      admin_password TEXT DEFAULT 'mb401',
      letterhead_url TEXT,
      logo_url TEXT,
      sidebar_logo_url TEXT,
      updated_at TEXT,
      expense_categories TEXT 
    );
  `);
  console.log('✓ company_profile table created');

  // 2. Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT CHECK (role IN ('Admin', 'Manager', 'Accountant', 'Viewer')),
      company_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
    );
  `);
  console.log('✓ users table created');

  // 3. Create company
  const companyId = uuidv4();
  const companyName = 'MIRAN';
  
  db.prepare(`
    INSERT OR IGNORE INTO company_profile (id, name, address, phone, admin_password, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(companyId, companyName, 'Karachi, Pakistan', '03001234567', 'mb401', new Date().toISOString());
  
  console.log(`\n✓ Company created: ${companyName}`);
  console.log(`  Company ID: ${companyId}`);

  // 4. Create test users
  const testUsers = [
    { username: 'admin', password: 'admin123', name: 'Admin User', role: 'Admin' },
    { username: 'manager', password: 'manager123', name: 'Manager User', role: 'Manager' },
    { username: 'viewer', password: 'viewer123', name: 'Viewer User', role: 'Viewer' }
  ];

  console.log('\n=== TEST USERS ===\n');

  testUsers.forEach(user => {
    try {
      const userId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, username, password, name, role, company_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, user.username, user.password, user.name, user.role, companyId, new Date().toISOString());
      
      console.log(`✓ ${user.role}: ${user.username} / ${user.password}`);
    } catch (e) {
      console.log(`⚠ ${user.role} already exists`);
    }
  });

  console.log('\n=== LOGIN CREDENTIALS ===\n');
  console.log('Admin:');
  console.log('  Username: admin');
  console.log('  Password: admin123\n');
  console.log('Manager:');
  console.log('  Username: manager');
  console.log('  Password: manager123\n');

  db.close();
  console.log('✓ Setup complete!\n');

} catch (error) {
  console.error('Error:', error.message);
  db.close();
  process.exit(1);
}
