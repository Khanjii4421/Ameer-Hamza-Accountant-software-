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

        // 1. Get record to find documents
        const record = await db.prepare('SELECT * FROM hr_file_records WHERE id = ? AND company_id = ?').get(id, companyId) as any;

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // 2. Delete files
        if (record.document_paths) {
            try {
                const paths = JSON.parse(record.document_paths);
                // paths is an object { docId: "url", ... }
                for (const key in paths) {
                    const fileUrl = paths[key];
                    if (fileUrl) {
                        try {
                            const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
                            const absolutePath = path.join(process.cwd(), 'public', cleanPath);
                            await unlink(absolutePath);
                            console.log(`Deleted file: ${absolutePath}`);
                        } catch (e) {
                            console.error(`Failed to delete file ${fileUrl}:`, e);
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing document_paths:", e);
            }
        }

        // 3. Delete record
        const result = await db.prepare(`
            DELETE FROM hr_file_records 
            WHERE id = ? AND company_id = ?
        `).run(id, companyId);

        return NextResponse.json({ success: true, message: 'Record and files deleted successfully' });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
