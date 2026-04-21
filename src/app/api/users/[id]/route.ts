import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { password } = body;

        if (!password || password.trim() === '') {
            return NextResponse.json({ error: 'Password cannot be empty' }, { status: 400 });
        }

        const result = await db.prepare(
            'UPDATE users SET password = ? WHERE id = ? RETURNING *'
        ).get(password.trim(), id) as any;

        if (!result) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Try to update Supabase Auth password as well
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                // Fetch all users to find the matching one
                const { data: { users }, error } = await supabase.auth.admin.listUsers();
                if (!error && users && users.length > 0) {
                    // Match by username/email, or just update the primary user
                    const match = users.find(u => u.email === result.username) || users[0];
                    if (match) {
                        await supabase.auth.admin.updateUserById(match.id, {
                            password: password.trim()
                        });
                        console.log("Successfully synced password to Supabase Auth for:", match.email);
                    }
                }
            }
        } catch (authError) {
            console.error("Failed to sync password with Supabase Auth:", authError);
            // We don't throw here to ensure the local DB update still succeeds
        }

        return NextResponse.json({ success: true, user: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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
