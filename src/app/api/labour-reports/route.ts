import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const masonName = searchParams.get('masonName');

        let query = 'SELECT * FROM labour_reports WHERE company_id = ?';
        const params: any[] = [companyId];

        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }
        if (masonName && masonName.trim() !== '') {
            query += ' AND mason_name ILIKE ?'; // using ILIKE for Postgres
            params.push(`%${masonName}%`);
        }

        query += ' ORDER BY date DESC, created_at DESC';

        const data = await db.prepare(query).all(...params);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { date, mason_name, helper_name, mason_payment, labour_payment, work_description, details } = body;

        const result = await db.prepare(`
            INSERT INTO labour_reports (
                company_id, date, mason_name, helper_name, 
                mason_payment, labour_payment, work_description, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `).get(
            companyId, date, mason_name, helper_name,
            mason_payment || 0, labour_payment || 0, work_description || '', details || ''
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
