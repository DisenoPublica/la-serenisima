// Programada: todos los días 13:00 UTC = 10:00 Argentina
import { runRefresh } from '../lib/core.mjs';
export const config = { schedule: '0 13 * * *' };
export default async () => { await runRefresh('10:00 automático'); return new Response('ok'); };
