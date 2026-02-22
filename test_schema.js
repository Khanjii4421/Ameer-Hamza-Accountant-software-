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
        const q1 = await pool.query(\`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'labor_expenses'\`);
    console.log("LABOR EXPENSES:");
    console.table(q1.rows);

    const q2 = await pool.query(\`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'ledger_entries'\`);
    console.log("LEDGER ENTRIES:");
    console.table(q2.rows);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    pool.end();
  }
}
main();
