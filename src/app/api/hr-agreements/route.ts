import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_agreements WHERE company_id = ? ORDER BY created_at DESC').all(companyId);

        // parse the scope_of_work from stringified JSON if needed
        const parsedRecords = records.map((record: any) => {
            try { record.scope_of_work = JSON.parse(record.scope_of_work); } catch (e) { record.scope_of_work = []; }
            try { record.rates_of_work = JSON.parse(record.rates_of_work); } catch (e) { record.rates_of_work = []; }
            try { record.payment_schedule = JSON.parse(record.payment_schedule); } catch (e) { record.payment_schedule = []; }
            return record;
        });

        return NextResponse.json(parsedRecords);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) companyId = 'default-company';

        const body = await request.json();
        const { title, party_one_name, party_one_details, scope_of_work, rates_of_work, payment_schedule } = body;

        const id = uuidv4();
        const created_at = new Date().toISOString();

        const scopeStr = JSON.stringify(scope_of_work || []);
        const ratesStr = JSON.stringify(rates_of_work || []);
        const payStr = JSON.stringify(payment_schedule || []);

        const stmt = db.prepare(`
            INSERT INTO hr_agreements (
                id, title, party_one_name, party_one_details, 
                scope_of_work, rates_of_work, payment_schedule, company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        // Use standard array insertion
        const result = await stmt.get(
            id, title, party_one_name, party_one_details,
            scopeStr, ratesStr, payStr, companyId, created_at
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
