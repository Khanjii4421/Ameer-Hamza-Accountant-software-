import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        // Left join with clients and projects to get names
        const payments = await db.prepare(`
            SELECT lpr.*, c.name as client_name, p.title as project_title, v.name as vendor_name
            FROM labor_payments_received lpr
            LEFT JOIN clients c ON lpr.client_id = c.id
            LEFT JOIN projects p ON lpr.project_id = p.id
            LEFT JOIN vendors v ON lpr.vendor_id = v.id
            WHERE lpr.company_id = ? 
            ORDER BY lpr.date DESC
        `).all(companyId);

        return NextResponse.json(payments);
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
        const { client_id, project_id, vendor_id, date, amount, description, payment_method, transaction_id, cheque_number, bank_name, proof_url } = body;

        // Validation for client_id/project_id could be added here if critical
        if (!client_id) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        const id = uuidv4();
        const created_at = new Date().toISOString();
        const updated_at = created_at;

        const stmt = db.prepare(`
            INSERT INTO labor_payments_received 
            (id, company_id, vendor_id, client_id, project_id, date, amount, description, payment_method, transaction_id, cheque_number, bank_name, proof_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result = await stmt.get(id, companyId, vendor_id || null, client_id, project_id || null, date, amount, description, payment_method, transaction_id, cheque_number, bank_name, proof_url, created_at, updated_at);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

