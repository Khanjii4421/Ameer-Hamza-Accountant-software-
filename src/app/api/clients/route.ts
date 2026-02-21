import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const clients = await db.prepare('SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC').all(companyId);
        return NextResponse.json(clients);
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
        const { name, phone, address, email } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO clients (id, name, phone, address, email, company_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);

        const result = await stmt.get(id, name, phone, address, email, companyId, created_at);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
