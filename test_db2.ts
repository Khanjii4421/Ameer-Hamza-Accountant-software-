import { db } from './src/lib/db';

async function test() {
    console.log("Reading hr_attendance rows...");
    const rows = await db.prepare('SELECT * FROM hr_attendance ORDER BY created_at DESC LIMIT 5').all();
    console.log("Rows:", rows);

    if (rows.length > 0) {
        const row = rows[0];
        console.log("First row date:", row.date);

        console.log("Testing LIKE query...");
        const month = row.date.substring(0, 7); // e.g. 'YYYY-MM'
        try {
            const likeRows = await db.prepare('SELECT * FROM hr_attendance WHERE date LIKE ?').all(month + '%');
            console.log("LIKE result size:", likeRows.length);
        } catch (e) {
            console.error("LIKE query error:", e.message);
        }
    }
}
test();
