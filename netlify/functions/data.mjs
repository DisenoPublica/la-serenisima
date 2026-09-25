import { getStore } from '@netlify/blobs';
export const config = { path: '/api/data' };
export default async () => {
  const data = await getStore('serenisima').get('data', { type: 'json' });
  if (!data) return new Response('{"error":"sin datos aún"}', { status: 404, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' } });
};
