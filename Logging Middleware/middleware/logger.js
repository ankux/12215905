const axios = require('axios');

async function Log(stack, level, package, message) {
    try {
        const validStacks = ['backend', 'frontend'];
        const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
        const validPackages = [
            'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service'
        ];

        if (!validStacks.includes(stack.toLowerCase())) {
            console.error(`Invalid stack: ${stack}. Must be one of: ${validStacks.join(', ')}`);
            return;
        }

        if (!validLevels.includes(level.toLowerCase())) {
            console.error(`Invalid level: ${level}. Must be one of: ${validLevels.join(', ')}`);
            return;
        }

        if (!validPackages.includes(package.toLowerCase())) {
            console.error(`Invalid package: ${package}. Must be one of: ${validPackages.join(', ')}`);
            return;
        }

        const logData = {
            stack: stack.toLowerCase(),
            level: level.toLowerCase(),
            package: package.toLowerCase(),
            message: message
        };

        const response = await axios.post('http://29.244.56.144/evaluation-service/logs', logData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        if (level === 'error' || level === 'fatal') {
            console.log(`Log sent successfully: ${response.data.logID}`);
        }
        
        return response.data;
    } catch (error) {
        if (!Log.errorShown) {
            console.warn('Test server logging unavailable - using console fallback');
            console.warn(`Error: ${error.message}`);
            Log.errorShown = true;
        }
        
        console.log(`[${stack.toUpperCase()}] [${level.toUpperCase()}] [${package.toUpperCase()}] ${message}`);
    }
}

module.exports = Log; 