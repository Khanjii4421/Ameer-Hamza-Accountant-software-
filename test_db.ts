import { db } from './src/lib/db';

async function test() {
    try {
        console.log("Testing attendance GET");
        const month = "2026-02";
        const companyId = "default-company";
        const param = month + '%';

        let query = `SELECT * FROM hr_attendance WHERE company_id = ? AND date LIKE ?`;
        console.log(query, companyId, param);

        const records = await db.prepare(query).all(companyId, param);
        console.log("Attendance records:", records.length);

        // Let's also test DB insertion
        const employeeId = "test_emp_999";
        const date = "2026-02-22";

        const insertStmt = await db.prepare(`
            INSERT INTO hr_attendance (id, employee_id, employee_name, date, time_in, time_out, status, is_late, company_id, created_at, latitude, longitude, address, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const id = "test_uuid_123";
        const created_at = new Date().toISOString();
        const res = await insertStmt.get(id, employeeId, "Test", date, "09:00", "18:00", "Present", 0, companyId, created_at, 0, 0, "", "");
        console.log("Insert result:", !!res);


    } catch (e) {
        console.error("Test Error:");
        console.error(e);
    }
}
test();
