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
        const res = await pool.query(
            `INSERT INTO labor_expenses 
       (id, description, amount, category, site_id, vendor_id, date, created_by, company_id, created_at, proof_url, is_paid)
       VALUES ('test_uuid2', 'Test Ex', 100, 'Category', 'cf0aa1a5-812e-4b71-bdfc-af4fddb2e9d2', 'some_vendor', '2023-01-01', 'created_by', 'company', '2023-01-01T00:00:00Z', '', 0)
       RETURNING *`
        );
        console.log("Success:", res.rows);
    } catch (err) {
        console.error("Insert Error:", err.message);
    } finally {
        pool.end();
    }
}
main();
