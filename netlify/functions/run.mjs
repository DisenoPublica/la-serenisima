// Botón "Actualizar" del tablero. Limite: una corrida cada 3 minutos.
import { getStore } from '@netlify/blobs';
import { runRefresh } from '../lib/core.mjs';
export const config = { path: '/api/run' };
export default async () => {
  const last = await getStore('serenisima').get('status', { type: 'json' });
  if (last?.at && Date.now() - new Date(last.at).getTime() < 180000)
    return Response.json({ status: last, skipped: 'Se actualizó hace menos de 3 minutos.' });
  return Response.json({ status: await runRefresh('botón Actualizar') });
};
