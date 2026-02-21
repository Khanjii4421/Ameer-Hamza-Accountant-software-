import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { companyName, address, phone, username, password } = body;

        if (!companyName || !username || !password) {
            return NextResponse.json({ error: 'Company Name, Username, and Password are required' }, { status: 400 });
        }

        // Check if username already exists
        const existingUser = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }

        let companyId = uuidv4();
        const userId = uuidv4();
        const now = new Date().toISOString();

        // 1. Create company profile
        await db.prepare(`
            INSERT INTO company_profile (id, name, address, phone, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(companyId, companyName, address || '', phone || '', now);

        // 2. Create Admin user for this company
        await db.prepare(`
            INSERT INTO users (id, username, password, name, role, company_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, username, password, companyName, 'Admin', companyId, now);

        return NextResponse.json({ success: true, message: 'Company registered successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
