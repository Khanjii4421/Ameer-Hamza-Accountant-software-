import { db } from './src/lib/db';
import { v4 as uuidv4 } from 'uuid';

async function test() {
    try {
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO daily_work_logs (id, date, project_id, weather, description, work_description, feet, company_id, created_at, employee_id, expenses, expense_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.run(id, '2026-02-22', 'dummy-project', 'Sunny', 'Desc', 'Work Desc', '50', 'default-company', created_at, 'dummy-employee', 0, '');
        console.log("Insert daily_work_logs SUCCESS");
    } catch (e) {
        console.error("Insert daily_work_logs ERROR:", e);
    }
}
test();
