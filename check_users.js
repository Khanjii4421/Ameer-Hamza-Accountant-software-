const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'local_database.sqlite');
const db = new Database(dbPath);

console.log('\n=== CHECKING DATABASE ===\n');

console.log('USERS:');
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

console.log('\nCOMPANY PROFILES:');
const companies = db.prepare('SELECT * FROM company_profile').all();
console.log(companies);

console.log('\nCLIENTS:');
const clients = db.prepare('SELECT * FROM clients').all();
console.log(clients);

console.log('\nPROJECTS:');
const projects = db.prepare('SELECT * FROM projects').all();
console.log(projects);

db.close();
