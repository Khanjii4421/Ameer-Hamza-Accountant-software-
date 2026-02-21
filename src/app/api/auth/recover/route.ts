import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { companyName, phone, newPassword } = body;

        if (!companyName || !phone) {
            return NextResponse.json({ error: 'Company Name and Mobile Number are required' }, { status: 400 });
        }

        // 1. Find the company by name and phone
        // Using COLLATE NOCASE for case-insensitive matching on company name
        const company = await db.prepare('SELECT id, name FROM company_profile WHERE name = ? COLLATE NOCASE AND phone = ?').get(companyName, phone) as { id: string, name: string } | undefined;

        if (!company) {
            return NextResponse.json({ error: 'No matching company found with these details.' }, { status: 404 });
        }

        // 2. Find the Admin user for this company
        const adminUser = await db.prepare('SELECT id, username FROM users WHERE company_id = ? AND role = ?').get(company.id, 'Admin') as { id: string, username: string } | undefined;

        if (!adminUser) {
            return NextResponse.json({ error: 'No Admin account found for this company.' }, { status: 404 });
        }

        // 3. Update password if newPassword is provided
        if (newPassword && newPassword.trim().length > 0) {
            await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword, adminUser.id);
            return NextResponse.json({ success: true, message: 'Password updated successfully' });
        }

        // 4. Return username if only recovering account info
        return NextResponse.json({ success: true, username: adminUser.username });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
