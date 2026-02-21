import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const { searchParams } = new URL(request.url);
        const project_id = searchParams.get('project_id');
        const client_id = searchParams.get('client_id');

        let sql = `
        SELECT l.*, 
               c.name as client_name, 
               v.name as vendor_name, 
               p.title as project_title 
        FROM ledger_entries l
        LEFT JOIN clients c ON l.client_id = c.id
        LEFT JOIN vendors v ON l.vendor_id = v.id
        LEFT JOIN projects p ON l.project_id = p.id
    `;

        const conditions = [`l.company_id = ?`];
        const args = [companyId];

        if (project_id) {
            conditions.push(`l.project_id = ?`);
            args.push(project_id);
        }
        if (client_id) {
            // Include entries directly linked to client OR entries linked to projects owned by client
            conditions.push(`(l.client_id = ? OR p.client_id = ?)`);
            args.push(client_id, client_id);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        sql += ` ORDER BY l.date DESC`;

        const entries = await db.prepare(sql).all(...args) as any[];

        const formatted = entries.map(e => {
            const { client_name, vendor_name, project_title, ...rest } = e;
            return {
                ...rest,
                clients: client_name ? { name: client_name } : null,
                vendors: vendor_name ? { name: vendor_name } : null,
                projects: project_title ? { title: project_title } : null
            };
        });

        return NextResponse.json(formatted);
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
        const { type, amount, description, payment_method, date, client_id, vendor_id, project_id, transaction_id, received_by, attachment_url } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO ledger_entries (id, type, amount, description, payment_method, date, client_id, vendor_id, project_id, company_id, created_at, transaction_id, received_by, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

        const result = await stmt.get(id, type, amount, description, payment_method, date, client_id, vendor_id, project_id, companyId, created_at, transaction_id, received_by, attachment_url);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
