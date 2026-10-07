// Botón "Actualizar" del tablero. Límite: una corrida cada 2 minutos (salvo que los datos sean del modelo anterior).
import { getStore } from '@netlify/blobs';
import { runRefresh } from '../lib/core.mjs';
export const config = { path: '/api/run' };
export default async () => {
  const store = getStore('serenisima');
  const [last, data] = await Promise.all([store.get('status', { type: 'json' }), store.get('data', { type: 'json' })]);
  const fresh = data?.v === 3 && last?.ok && last?.at && Date.now() - new Date(last.at).getTime() < 120000;
  if (fresh) return Response.json({ status: last, skipped: true });
  return Response.json({ status: await runRefresh('botón Actualizar') });
};
