import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // Removed company ID requirement
        if (!companyId) companyId = 'default-company';

        const records = await db.prepare('SELECT * FROM hr_bio_data WHERE company_id = ? ORDER BY created_at DESC').all(companyId);

        // Parse JSON fields
        const parsed = records.map((r: any) => ({
            ...r,
            education_data: r.education_data ? JSON.parse(r.education_data) : [],
            service_record_data: r.service_record_data ? JSON.parse(r.service_record_data) : [],
            language_proficiency_data: r.language_proficiency_data ? JSON.parse(r.language_proficiency_data) : []
        }));

        return NextResponse.json(parsed);
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

        const id = uuidv4();
        const created_at = new Date().toISOString();

        // Convert arrays to JSON strings
        const education_data = JSON.stringify(body.education_data || []);
        const service_record_data = JSON.stringify(body.service_record_data || []);
        const language_proficiency_data = JSON.stringify(body.language_proficiency_data || []);

        const stmt = db.prepare(`
            INSERT INTO hr_bio_data (
                id, full_name, father_husband_name, gender, marital_status,
                nic_number, nationality, religion, permanent_address, present_address,
                tel, mobile, email, blood_group, emergency_content_name,
                emergency_contact_relation, emergency_contact_address,
                emergency_contact_tel, emergency_contact_mobile,
                dependents_count, hobbies, bank_account_no, bank_name,
                education_data, service_record_data, language_proficiency_data,
                company_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `);

        const result: any = await stmt.get(
            id, body.full_name, body.father_husband_name, body.gender, body.marital_status,
            body.nic_number, body.nationality, body.religion, body.permanent_address, body.present_address,
            body.tel, body.mobile, body.email, body.blood_group, body.emergency_content_name,
            body.emergency_contact_relation, body.emergency_contact_address,
            body.emergency_contact_tel, body.emergency_contact_mobile,
            body.dependents_count, body.hobbies, body.bank_account_no, body.bank_name,
            education_data, service_record_data, language_proficiency_data,
            companyId, created_at
        );

        // Parse back
        if (result) {
            result.education_data = JSON.parse(result.education_data);
            result.service_record_data = JSON.parse(result.service_record_data);
            result.language_proficiency_data = JSON.parse(result.language_proficiency_data);
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
