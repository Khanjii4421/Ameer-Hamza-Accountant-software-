const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'local_database.sqlite');
const db = new Database(dbPath);

console.log('--- hr_employee_salaries ---');
const salaries = db.prepare('SELECT * FROM hr_employee_salaries LIMIT 5').all();
console.log(JSON.stringify(salaries, null, 2));

console.log('--- hr_employee_advances ---');
const advances = db.prepare('SELECT * FROM hr_employee_advances LIMIT 5').all();
console.log(JSON.stringify(advances, null, 2));
