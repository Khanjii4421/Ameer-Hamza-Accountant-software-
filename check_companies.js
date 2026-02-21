const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);

const companies = db.prepare("SELECT * FROM company_profile").all();
console.log('Companies:', JSON.stringify(companies, null, 2));
