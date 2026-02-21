import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from local env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// We use SERVICE_ROLE_KEY if available (to bypass Storage RLS), otherwise fallback to ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        const urls: string[] = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            // Create a unique file name
            const filename = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.name.replace(/\\s+/g, '_')}`;

            // Upload the file to the Supabase storage bucket named 'uploads'
            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: file.type,
                    upsert: false
                });

            if (error) {
                console.error("Supabase Storage Error:", error);
                throw error;
            }

            // Get the public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(data.path);

            urls.push(publicUrl);
        }

        return NextResponse.json({ urls });

    } catch (error: any) {
        console.error("Upload Route Error:", error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}

