import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const url = new URL(request.url);
        const employeeId = url.searchParams.get('employee_id');

        let records;
        if (employeeId) {
            records = await db.prepare(`
                SELECT sr.*, e.employee_name, e.designation, e.department
                FROM hr_salary_records sr
                LEFT JOIN hr_employees e ON sr.employee_id = e.id
                WHERE sr.company_id = ? AND sr.employee_id = ?
                ORDER BY sr.salary_month DESC
            `).all(companyId, employeeId);
        } else {
            records = await db.prepare(`
                SELECT sr.*, e.employee_name, e.designation, e.department
                FROM hr_salary_records sr
                LEFT JOIN hr_employees e ON sr.employee_id = e.id
                WHERE sr.company_id = ?
                ORDER BY sr.salary_month DESC
            `).all(companyId);
        }

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
        const {
            employee_id, salary_month, total_days_in_month, days_worked,
            basic_salary, house_rent, medical_allowance, transport_allowance,
            other_allowance, overtime_hours, overtime_rate, deductions,
            advance_deduction, loan_deduction, tax_deduction, other_deduction,
            bonus, net_salary, payment_date, payment_status, remarks,
            leaves_count, absent_count
        } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        // Calculate gross salary
        const gross = (basic_salary || 0) + (house_rent || 0) + (medical_allowance || 0) +
            (transport_allowance || 0) + (other_allowance || 0) +
            ((overtime_hours || 0) * (overtime_rate || 0)) + (bonus || 0);

        // Calculate total deductions
        const totalDeductions = (deductions || 0) + (advance_deduction || 0) +
            (loan_deduction || 0) + (tax_deduction || 0) + (other_deduction || 0);

        const calculatedNet = gross - totalDeductions;

        const stmt = db.prepare(`
            INSERT INTO hr_salary_records (
                id, employee_id, salary_month, total_days_in_month, days_worked,
                basic_salary, house_rent, medical_allowance, transport_allowance,
                other_allowance, overtime_hours, overtime_rate, deductions,
                advance_deduction, loan_deduction, tax_deduction, other_deduction,
                bonus, gross_salary, net_salary, payment_date, payment_status,
                remarks, leaves_count, absent_count, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(
            id, employee_id, salary_month, total_days_in_month || 30, days_worked || 30,
            basic_salary || 0, house_rent || 0, medical_allowance || 0, transport_allowance || 0,
            other_allowance || 0, overtime_hours || 0, overtime_rate || 0, deductions || 0,
            advance_deduction || 0, loan_deduction || 0, tax_deduction || 0, other_deduction || 0,
            bonus || 0, gross, net_salary || calculatedNet, payment_date,
            payment_status || 'Pending', remarks, leaves_count || 0, absent_count || 0,
            companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
