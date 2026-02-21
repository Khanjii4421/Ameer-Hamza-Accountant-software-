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
            salary_month, total_days_in_month, days_worked,
            basic_salary, house_rent, medical_allowance, transport_allowance,
            other_allowance, overtime_hours, overtime_rate, deductions,
            advance_deduction, loan_deduction, tax_deduction, other_deduction,
            bonus, net_salary, payment_date, payment_status, remarks
        } = body;

        const gross = (basic_salary || 0) + (house_rent || 0) + (medical_allowance || 0) +
            (transport_allowance || 0) + (other_allowance || 0) +
            ((overtime_hours || 0) * (overtime_rate || 0)) + (bonus || 0);

        const totalDeductions = (deductions || 0) + (advance_deduction || 0) +
            (loan_deduction || 0) + (tax_deduction || 0) + (other_deduction || 0);

        const calculatedNet = gross - totalDeductions;

        const stmt = await db.prepare(`
            UPDATE hr_salary_records SET
                salary_month = ?, total_days_in_month = ?, days_worked = ?,
                basic_salary = ?, house_rent = ?, medical_allowance = ?, transport_allowance = ?,
                other_allowance = ?, overtime_hours = ?, overtime_rate = ?, deductions = ?,
                advance_deduction = ?, loan_deduction = ?, tax_deduction = ?, other_deduction = ?,
                bonus = ?, gross_salary = ?, net_salary = ?, payment_date = ?, payment_status = ?,
                remarks = ?
            WHERE id = ? AND company_id = ?
            RETURNING *
        `);

        const result = await stmt.get(
            salary_month, total_days_in_month || 30, days_worked || 30,
            basic_salary || 0, house_rent || 0, medical_allowance || 0, transport_allowance || 0,
            other_allowance || 0, overtime_hours || 0, overtime_rate || 0, deductions || 0,
            advance_deduction || 0, loan_deduction || 0, tax_deduction || 0, other_deduction || 0,
            bonus || 0, gross, net_salary || calculatedNet, payment_date, payment_status || 'Pending',
            remarks,
            id, companyId
        );

        if (!result) return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
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
        await db.prepare('DELETE FROM hr_salary_records WHERE id = ? AND company_id = ?').run(params.id, companyId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
