import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        console.log('API: GET /api/users called');
        let companyId = request.headers.get('X-Company-ID');
        let users;

        // Log the db path and status if possible (indirectly by success of query)

        if (companyId) {
            console.log(`API: Fetching users for company ${companyId}`);
            users = await db.prepare('SELECT * FROM users WHERE company_id = ? ORDER BY created_at ASC').all(companyId);
        } else {
            console.log('API: Fetching all users');
            // If no companyId header, return all users (used for login check)
            users = await db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
        }

        console.log(`API: Found ${users.length} users`);
        return NextResponse.json(users);
    } catch (error: any) {
        console.error('API Error in GET /api/users:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const body = await request.json();
        const { username, password, name, role, employee_id } = body;
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
          INSERT INTO users (id, username, password, name, role, company_id, employee_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `);

        const newUser = await stmt.get(id, username, password, name, role, companyId, employee_id || null, created_at);
        return NextResponse.json(newUser);
    } catch (error: any) {
        console.error('Add user error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
