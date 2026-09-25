// Actualización manual: https://<sitio>.netlify.app/api/run?key=<RUN_KEY>
import { runRefresh } from '../lib/core.mjs';
export const config = { path: '/api/run' };
export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  const want = Netlify.env.get('RUN_KEY');
  if (!want || key !== want) return new Response('No autorizado: cargá RUN_KEY en Netlify y usá ?key=...', { status: 401 });
  return Response.json(await runRefresh('manual'));
};
