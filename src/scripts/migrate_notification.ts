
import { db } from '@/lib/db';

export function runMigrations() {
    // 1. Add 'expense_description' to 'daily_work_logs'
    const workLogCols = await db.prepare('PRAGMA table_info(daily_work_logs)').all() as any[];
    if (!workLogCols.find(c => c.name === 'expense_description')) {
        try {
            await db.prepare('ALTER TABLE daily_work_logs ADD COLUMN expense_description TEXT').run();
            console.log('Added expense_description to daily_work_logs');
        } catch (e) {
            console.error('Failed to add expense_description:', e);
        }
    }

    // 2. Create 'notifications' table if not exists
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- info, warning, error, success
            related_id TEXT, -- e.g., leave_id, attendance_id
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT -- Target user/admin id if specific, or null for general admin
        )
    `).run();
    console.log('Notifications table initialized');
}

runMigrations();
