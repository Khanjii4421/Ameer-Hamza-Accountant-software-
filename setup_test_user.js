const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use the same path as the application
const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);

console.log('\n=== SETTING UP TEST USER ===\n');

try {
  // Create company first
  const companyId = uuidv4();
  const companyName = 'Test Company';
  
  db.prepare(`
    INSERT OR IGNORE INTO company_profile (id, name, address, phone, admin_password, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(companyId, companyName, 'Test Address', '03001234567', 'mb401', new Date().toISOString());
  
  console.log(`✓ Company created: ${companyName}`);
  console.log(`  Company ID: ${companyId}\n`);

  // Create admin user
  const adminId = uuidv4();
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  
  try {
    db.prepare(`
      INSERT INTO users (id, username, password, name, role, company_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, adminUsername, adminPassword, 'Admin User', 'Admin', companyId, new Date().toISOString());
    
    console.log(`✓ Admin user created:`);
    console.log(`  Username: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  Role: Admin\n`);
  } catch (e) {
    console.log(`⚠ Admin user already exists\n`);
  }

  // Create manager user
  const managerId = uuidv4();
  const managerUsername = 'manager';
  const managerPassword = 'manager123';
  
  try {
    db.prepare(`
      INSERT INTO users (id, username, password, name, role, company_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(managerId, managerUsername, managerPassword, 'Manager User', 'Manager', companyId, new Date().toISOString());
    
    console.log(`✓ Manager user created:`);
    console.log(`  Username: ${managerUsername}`);
    console.log(`  Password: ${managerPassword}`);
    console.log(`  Role: Manager\n`);
  } catch (e) {
    console.log(`⚠ Manager user already exists\n`);
  }

  // Display all users
  console.log('=== ALL USERS ===\n');
  const users = db.prepare('SELECT id, username, password, name, role FROM users').all();
  users.forEach(user => {
    console.log(`Username: ${user.username} | Password: ${user.password} | Role: ${user.role}`);
  });
  console.log('\n');

  db.close();
  console.log('✓ Setup complete!');

} catch (error) {
  console.error('Error:', error.message);
  db.close();
  process.exit(1);
}
