
import { db } from '@/lib/db';

export function runMigrations() {
    // 1. Add 'leave_type' to 'hr_leaves'
    const leavesCols = await db.prepare('PRAGMA table_info(hr_leaves)').all() as any[];
    if (!leavesCols.find(c => c.name === 'leave_type')) {
        try {
            await db.prepare("ALTER TABLE hr_leaves ADD COLUMN leave_type TEXT DEFAULT 'Full'").run(); // 'Full' or 'Half'
            console.log('Added leave_type to hr_leaves');
        } catch (e) {
            console.error('Failed to add leave_type:', e);
        }
    }
}

runMigrations();
