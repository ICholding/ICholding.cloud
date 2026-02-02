import 'dotenv/config';
import { startPolling } from './telegram/poller.js';

console.log('✅ Janitor bot starting…');
await startPolling();
