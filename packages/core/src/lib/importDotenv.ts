export function importDotenv() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const dotEnvResult = require('dotenv').config({ silent: true });
        console.log(`Loaded .env file with values`, dotEnvResult.parsed);
        // eslint-disable-next-line no-empty
    } catch (err) {}
}
