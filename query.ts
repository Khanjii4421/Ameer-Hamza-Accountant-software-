import Database from 'better-sqlite3';
const db = new Database('main.db');
try {
    const rows = db.prepare('SELECT date, company_id, employee_id, status FROM hr_attendance ORDER BY created_at DESC LIMIT 5').all();
    console.log("Attendance: ", rows);
    const leaves = db.prepare('SELECT from_date, company_id, employee_id, status FROM hr_leaves ORDER BY created_at DESC LIMIT 5').all();
    console.log("Leaves: ", leaves);
    const works = db.prepare('SELECT date, company_id, employee_id FROM daily_work_logs ORDER BY created_at DESC LIMIT 5').all();
    console.log("Works: ", works);
} catch (e) {
    console.error(e);
}
