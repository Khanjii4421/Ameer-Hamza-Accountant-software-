import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        const id = params.id;
        const body = await request.json();
        const {
            employee_name, father_name, designation, department, cnic,
            contact, email, address, joining_date, basic_salary,
            house_rent, medical_allowance, transport_allowance,
            other_allowance, bank_name, bank_account_no, status
        } = body;

        const stmt = await db.prepare(`
            UPDATE hr_employees SET
                employee_name = ?, father_name = ?, designation = ?, department = ?, cnic = ?,
                contact = ?, email = ?, address = ?, joining_date = ?, basic_salary = ?,
                house_rent = ?, medical_allowance = ?, transport_allowance = ?,
                other_allowance = ?, bank_name = ?, bank_account_no = ?, status = ?
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        const result = await stmt.get(
            employee_name, father_name, designation, department, cnic,
            contact, email, address, joining_date, basic_salary || 0,
            house_rent || 0, medical_allowance || 0, transport_allowance || 0,
            other_allowance || 0, bank_name, bank_account_no, status || 'Active',
            id, companyId
        );

        if (!result) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        await db.prepare('DELETE FROM hr_employees WHERE id = ? AND company_id = ?').run(params.id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
