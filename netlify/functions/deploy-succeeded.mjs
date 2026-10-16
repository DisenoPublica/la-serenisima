// Corre sola al terminar cada deploy. Si hoy todavía no hubo una actualización buena, la hace en ese momento
// (así el tablero muestra lo de hoy sin esperar a mañana). Las siguientes quedan a cargo de la de las 10:00.
import { getStore } from '@netlify/blobs';
import { runRefresh } from '../lib/core.mjs';
const hoyAR = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
export default async () => {
  const last = await getStore('serenisima').get('status', { type: 'json' });
  if (last?.ok && !last.aviso && last.at && hoyAR(new Date(last.at)) === hoyAR(new Date())) return new Response('ya actualizado hoy');
  const s = await runRefresh('al publicar', 5000);
  return Response.json({ ok: s.ok });
};
