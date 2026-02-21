import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.prepare('DELETE FROM hr_leave_applications WHERE id = ?').run(id);
        return NextResponse.json({ success: true, message: 'Leave application deleted' });
    } catch (error: any) {
        console.error('Error deleting leave application:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
