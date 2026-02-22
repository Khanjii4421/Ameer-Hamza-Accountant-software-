async function test() {
    console.log("Testing POST /api/hr-attendance");
    const postRes = await fetch("http://localhost:3000/api/hr-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-ID": "test" },
        body: JSON.stringify({
            employee_id: "test",
            employee_name: "Test User",
            date: "2026-02-22",
            time_in: "09:00",
            time_out: "18:00",
            status: "Present",
            is_late: false,
        })
    });
    console.log("POST Attendance:", await postRes.text());

    console.log("\Testing GET /api/hr-attendance");
    const getRes = await fetch("http://localhost:3000/api/hr-attendance?month=2026-02", {
        headers: { "X-Company-ID": "test" }
    });
    console.log("GET Attendance:", await getRes.text());

    console.log("\Testing POST /api/hr-leaves");
    const leavePost = await fetch("http://localhost:3000/api/hr-leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-ID": "test" },
        body: JSON.stringify({
            employee_id: "test",
            employee_name: "Test User",
            from_date: "2026-02-23",
            to_date: "2026-02-24",
            reason: "Sick",
            days_count: 2,
            leave_type: "Full"
        })
    });
    console.log("POST Leave:", await leavePost.text());
}
test();
