import 'dotenv/config';
import { startBot } from './telegram/bot.js';

console.log('✅ Janitor bot starting modular commands…');
await startBot();
