import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const month = url.searchParams.get('month'); // YYYY-MM
        const employeeId = url.searchParams.get('employee_id');

        let query = `SELECT * FROM hr_attendance WHERE company_id = ?`;
        const params: any[] = [companyId];

        if (month) {
            query += ` AND date LIKE ?`;
            params.push(month + '%');
        }
        if (employeeId) {
            query += ` AND employee_id = ?`;
            params.push(employeeId);
        }

        query += ` ORDER BY date DESC, time_in ASC`;
        const records = await db.prepare(query).all(...params);
        return NextResponse.json(records);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { employee_id, employee_name, date, time_in, time_out, status, is_late, latitude, longitude, address, image_url } = body;

        // Check if attendance already marked for today
        const existing = await db.prepare('SELECT id FROM hr_attendance WHERE company_id = ? AND employee_id = ? AND date = ?')
            .get(companyId, employee_id, date);

        if (existing) {
            return NextResponse.json({ error: 'Attendance already marked for this date.' }, { status: 400 });
        }

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = await db.prepare(`
            INSERT INTO hr_attendance (id, employee_id, employee_name, date, time_in, time_out, status, is_late, company_id, created_at, latitude, longitude, address, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);
        const result = await stmt.get(id, employee_id, employee_name, date, time_in, time_out, status, is_late ? 1 : 0, companyId, created_at, latitude || null, longitude || null, address || null, image_url || null);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const result = await db.prepare('DELETE FROM hr_attendance WHERE id = ? AND company_id = ?').run(id, companyId);
        if (result.changes === 0) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        return NextResponse.json({ success: true, message: 'Attendance record deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
