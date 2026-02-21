import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const projects = await db.prepare(`
        SELECT projects.*, clients.name as client_name 
        FROM projects 
        LEFT JOIN clients ON projects.client_id = clients.id 
        WHERE projects.company_id = ?
        ORDER BY projects.created_at DESC
    `).all(companyId) as any[];

        // Transform to match match response shape
        const formatted = projects.map(p => {
            const { client_name, ...rest } = p;
            return {
                ...rest,
                clients: client_name ? { name: client_name } : null
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
        const { title, description, location, status, client_id, start_date, end_date } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO projects (id, title, description, location, status, client_id, company_id, start_date, end_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

        const result = await stmt.get(id, title, description, location, status, client_id, companyId, start_date, end_date, created_at);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
