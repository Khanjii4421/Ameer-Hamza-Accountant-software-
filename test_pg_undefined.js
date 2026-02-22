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
        const args = ['id1', 'desc', 10, 'cat', 'site_id', undefined, 'date', 'created_by', 'company', 'created_at'];
        const pgSql = 'INSERT INTO labor_expenses (id, description, amount, category, site_id, vendor_id, date, created_by, company_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
        const res = await pool.query(pgSql, args);
        console.log("Success:", res.rows);
    } catch (err) {
        console.error("Insert Error:", err.message);
    } finally {
        pool.end();
    }
}
main();
