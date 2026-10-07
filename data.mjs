import { getStore } from '@netlify/blobs';
export const config = { path: '/api/data' };
export default async () => {
  const store = getStore('serenisima');
  const [data, status] = await Promise.all([store.get('data', { type: 'json' }), store.get('status', { type: 'json' })]);
  return Response.json({ ...(data || {}), status: status || { ok: false, error: 'La actualización nunca corrió todavía.' } }, { headers: { 'cache-control': 'no-store' } });
};
