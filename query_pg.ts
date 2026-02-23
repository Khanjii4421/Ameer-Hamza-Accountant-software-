import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres.phwjrazbsmftbuqpmill:Ameerhamza%402025@13.239.87.90:6543/postgres",
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        const att = await pool.query('SELECT date, company_id, employee_id, employee_name, created_at FROM hr_attendance ORDER BY created_at DESC LIMIT 5');
        console.log("Attendance: ", att.rows);
        const lvs = await pool.query('SELECT from_date, company_id, employee_id, created_at FROM hr_leaves ORDER BY created_at DESC LIMIT 5');
        console.log("Leaves: ", lvs.rows);
        const wl = await pool.query('SELECT * FROM daily_work_logs ORDER BY created_at DESC LIMIT 5');
        console.log("Works: ", wl.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
main();
