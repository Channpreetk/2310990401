const LOG_URL = "http://20.207.122.201/evaluation-service/logs";


const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJjaGFubnByZWV0MDQwMS5iZTIzQGNoaXRrYXJhLmVkdS5pbiIsImV4cCI6MTc3Nzk1OTU3MCwiaWF0IjoxNzc3OTU4NjcwLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiMTQ1NzkyOWItYTEzZi00MDcwLTk1ZjQtZGQwODNlMjY2ODhjIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiY2hhbm5wcmVldCBrYXVyIiwic3ViIjoiN2VjMDYzZjktOTFhMC00OGM1LWEzNDItNmJhMmE0OWQxYTBlIn0sImVtYWlsIjoiY2hhbm5wcmVldDA0MDEuYmUyM0BjaGl0a2FyYS5lZHUuaW4iLCJuYW1lIjoiY2hhbm5wcmVldCBrYXVyIiwicm9sbE5vIjoiMjMxMDk5MDQwMSIsImFjY2Vzc0NvZGUiOiJFWGZ2RHAiLCJjbGllbnRJRCI6IjdlYzA2M2Y5LTkxYTAtNDhjNS1hMzQyLTZiYTJhNDlkMWEwZSIsImNsaWVudFNlY3JldCI6InpHVnZWWUdQa3dQRFpHS3kifQ.bIIX6_JkQVN1Pp8hAglVmeQyBhVrgPiOS5fma4dSdZ8"; 

async function Log(stack, level, package, message) {
    const payload = {
        stack: stack,     
        level: level,    
        package: package,
        message: message  
    };

    try {
        const response = await fetch(LOG_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}` 
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Log sent successfully:", data.logID);
        } else {
            const errorText = await response.text();
            console.error("Failed to send log:", response.status, errorText);
        }
    } catch (error) {
        console.error("Error calling Log API:", error);
    }
}

Log("backend", "error", "db", "Critical database connection failure.");
Log("backend", "info", "service", "Notification processed successfully.");