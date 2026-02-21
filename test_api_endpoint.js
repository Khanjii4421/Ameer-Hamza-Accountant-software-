// using global fetch


async function testApi() {
    try {
        console.log('Fetching from http://localhost:3000/api/users...');
        const res = await fetch('http://localhost:3000/api/users');

        if (!res.ok) {
            console.log('Status:', res.status, res.statusText);
            try {
                const data = await res.json();
                console.log('Error Body:', data);
            } catch (e) {
                console.log('Could not parse error body:', e.message);
                const text = await res.text();
                console.log('Response Text:', text);
            }
        } else {
            const data = await res.json();
            console.log('Success! Users found:', data.length);
            console.log(data);
        }
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

testApi();
