import { db } from './src/lib/db';

async function test() {
    try {
        console.log("Describing daily_work_logs:");
        const res1 = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_work_logs'").all();
        console.log(res1);

        console.log("Describing hr_leaves:");
        const res2 = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_leaves'").all();
        console.log(res2);

        console.log("Describing hr_attendance:");
        const res3 = await db.prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_attendance'").all();
        console.log(res3);
    } catch (e) {
        console.error(e);
    }
}
test();
