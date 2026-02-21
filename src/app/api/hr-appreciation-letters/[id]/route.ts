import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.prepare('DELETE FROM hr_appreciation_letters WHERE id = ?').run(id);
        return NextResponse.json({ success: true, message: 'Appreciation letter deleted' });
    } catch (error: any) {
        console.error('Error deleting appreciation letter:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
