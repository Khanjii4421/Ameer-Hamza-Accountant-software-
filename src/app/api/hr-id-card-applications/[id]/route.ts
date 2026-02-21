import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        let companyId = request.headers.get('X-Company-ID');
        // if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        if (!companyId) companyId = 'default-company';

        const params = await context.params;
        const id = params.id;

        // 1. Get the record first to find file paths
        const record = await db.prepare('SELECT * FROM hr_id_card_applications WHERE id = ? AND company_id = ?').get(id, companyId) as any;

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // 2. Delete associated files
        const deleteFile = async (fileUrl: string | null) => {
            if (!fileUrl) return;
            // Remove /uploads/ prefix if present to get filename, assuming stored as /uploads/filename.ext or similar
            // or if it's a full URL, we extract the part after public
            try {
                // Assuming url is like "/uploads/filename.jpg"
                const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
                const absolutePath = path.join(process.cwd(), 'public', cleanPath);
                await unlink(absolutePath);
                console.log(`Deleted file: ${absolutePath}`);
            } catch (err) {
                console.error(`Failed to delete file ${fileUrl}:`, err);
                // Continue even if file delete fails (maybe file missing)
            }
        };

        if (record.photo_url) await deleteFile(record.photo_url);
        if (record.signature_url) await deleteFile(record.signature_url);

        // 3. Delete the record from DB
        const result = await db.prepare(`
            DELETE FROM hr_id_card_applications 
            WHERE id = ? AND company_id = ?
        `).run(id, companyId);

        return NextResponse.json({ success: true, message: 'Record and files deleted successfully' });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
