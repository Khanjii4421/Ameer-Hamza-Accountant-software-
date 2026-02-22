const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const resAtt = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_attendance'");
        console.log("HR_ATTENDANCE COLUMNS:", resAtt.rows);

        const resWork = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_work_logs'");
        console.log("DAILY_WORK_LOGS COLUMNS:", resWork.rows);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        pool.end();
    }
}
main();
