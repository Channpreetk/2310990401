const LOG_URL = "http://20.207.122.201/evaluation-service/logs";
const ACCESS_TOKEN = process.env.EVAL_API_TOKEN || process.env.ACCESS_TOKEN;

async function Log(stack, level, package, message) {
    if (!ACCESS_TOKEN) {
        console.error("Missing token. Set EVAL_API_TOKEN or ACCESS_TOKEN before running logger.js");
        return;
    }

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