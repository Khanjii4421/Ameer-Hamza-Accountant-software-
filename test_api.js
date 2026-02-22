async function testAPI() {
    try {
        console.log("Testing POST /api/hr-attendance");
        let resAtt = await fetch("http://localhost:3000/api/hr-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Company-ID": "test-company" },
            body: JSON.stringify({
                employee_id: "test",
                employee_name: "test",
                date: "2029-01-01",
                time_in: "09:00",
                time_out: "",
                status: "Present",
                is_late: false,
                latitude: 10,
                longitude: 10,
                address: "local",
                image_url: ""
            })
        });
        console.log("HR Attendance POST:", resAtt.status, await resAtt.text());

        console.log("Testing POST /api/daily-work");
        let resWork = await fetch("http://localhost:3000/api/daily-work", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Company-ID": "test-company" },
            body: JSON.stringify({
                date: "2029-01-01",
                employee_id: "test",
                project_id: "test_proj",
                description: "test desc",
                work_description: "test work",
                feet: "10",
                expenses: 10,
                expense_description: "test exp",
                weather: "Sunny"
            })
        });
        console.log("Daily Work POST:", resWork.status, await resWork.text());

        console.log("Testing GET /api/hr-attendance");
        let resAttGet = await fetch("http://localhost:3000/api/hr-attendance?month=2029-01", {
            headers: { "X-Company-ID": "test-company" }
        });
        console.log("HR Attendance GET:", resAttGet.status);
    } catch (e) {
        console.error("Test Error", e);
    }
}
testAPI();
