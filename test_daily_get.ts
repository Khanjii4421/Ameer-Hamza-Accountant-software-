import { db } from './src/lib/db';

async function test() {
    try {
        const stmt = db.prepare(`
            SELECT dw.*, p.title as project_title 
            FROM daily_work_logs dw
            LEFT JOIN projects p ON dw.project_id = p.id
            WHERE dw.company_id = ?
            ORDER BY date DESC
        `);
        const logs = await stmt.all('default-company');
        console.log("Daily Logs GET SUCCESS:", logs.length);
    } catch (e) {
        console.error("Daily Logs GET ERROR:", e);
    }
}
test();
