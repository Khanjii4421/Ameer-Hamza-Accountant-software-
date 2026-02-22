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
        await pool.query("ALTER TABLE daily_work_logs ADD COLUMN expense_description TEXT;");
        console.log("Added expense_description column");
    } catch (e) { console.log(e.message); }

    pool.end();
}
main();
