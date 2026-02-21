import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js 15, params is a promise
) {
    try {
        const { id } = await params;
        const info = await db.prepare('DELETE FROM users WHERE id = ?').run(id);

        if (info.changes === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
