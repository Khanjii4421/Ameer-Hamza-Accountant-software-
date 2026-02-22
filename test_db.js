const { db } = require('./src/lib/db.ts');

async function test() {
    try {
        console.log("Testing attendance GET");
        const month = "2026-02";
        const companyId = "default-company";
        const records = await db.prepare(`SELECT * FROM hr_attendance WHERE company_id = ? AND date LIKE ?`).all(companyId, month + '%');
        console.log("Attendance records:", records);
    } catch (e) {
        console.error("GET Error:", e);
    }
}
test();
