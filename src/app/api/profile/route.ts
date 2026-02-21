import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const profile = await db.prepare('SELECT * FROM company_profile WHERE id = ?').get(companyId) as any;
        if (profile && profile.expense_categories) {
            try {
                profile.expense_categories = JSON.parse(profile.expense_categories);
            } catch (e) {
                profile.expense_categories = [];
            }
        }
        if (profile && profile.labor_categories) {
            try {
                profile.labor_categories = JSON.parse(profile.labor_categories);
            } catch (e) {
                profile.labor_categories = [];
            }
        }
        return NextResponse.json(profile);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const body = await request.json();
        const {
            name, address, phone, admin_password,
            letterhead_url, logo_url, sidebar_logo_url, expense_categories, labor_categories
        } = body;

        let expenseCategoriesStr = null;
        if (expense_categories) {
            expenseCategoriesStr = JSON.stringify(expense_categories);
        }

        let laborCategoriesStr = null;
        if (labor_categories) {
            laborCategoriesStr = JSON.stringify(labor_categories);
        }

        const updated_at = new Date().toISOString();

        const stmt = db.prepare(`
      UPDATE company_profile
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          admin_password = COALESCE(?, admin_password),
          letterhead_url = COALESCE(?, letterhead_url),
          logo_url = COALESCE(?, logo_url),
          sidebar_logo_url = COALESCE(?, sidebar_logo_url),
          expense_categories = COALESCE(?, expense_categories),
          labor_categories = COALESCE(?, labor_categories),
          updated_at = ?
      WHERE id = ?
      RETURNING *
    `);

        const result = await stmt.get(
            name, address, phone, admin_password,
            letterhead_url, logo_url, sidebar_logo_url, expenseCategoriesStr, laborCategoriesStr, updated_at,
            companyId
        ) as any;

        if (result && result.expense_categories) {
            try {
                result.expense_categories = JSON.parse(result.expense_categories);
            } catch (e) {
                result.expense_categories = [];
            }
        }
        if (result && result.labor_categories) {
            try {
                result.labor_categories = JSON.parse(result.labor_categories);
            } catch (e) {
                result.labor_categories = [];
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
