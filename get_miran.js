const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);
const miran = db.prepare("SELECT * FROM company_profile WHERE name = 'Miran Builders'").get();
console.log(miran);
