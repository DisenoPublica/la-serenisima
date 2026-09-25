// Lógica compartida: consulta Meltwater y guarda data + estado en Netlify Blobs
import { getStore } from '@netlify/blobs';

const env = k => (globalThis.Netlify?.env?.get(k)) ?? process.env[k];
const DAYS = 31;
const AXES = {
 "s1": [
  "Arcor",
  "Danone",
  "Mastellone",
  "Grupo Arcor",
  "Bagley",
  "Pagani",
  "CNV",
  "obligaciones negociables"
 ],
 "s2": [
  "despidos",
  "desvinculados",
  "130 despidos",
  "130 familias",
  "telegramas",
  "suspensiones",
  "vaciamiento",
  "retiros voluntarios"
 ],
 "s3": [
  "costos logísticos",
  "Frío Sur",
  "distribución",
  "abastecimiento",
  "tercerización",
  "cierre de depósito",
  "camiones propios",
  "reparto"
 ],
 "s4": [
  "Heber Ríos",
  "ATILRA",
  "Etín Ponce",
  "OSPIL",
  "Camioneros",
  "Moyano",
  "CGT"
 ],
 "s5": [
  "asamblea",
  "paro",
  "huelga",
  "quite de colaboración",
  "bloqueo",
  "no sale la leche",
  "conciliación obligatoria"
 ],
 "s6": [
  "quiebra",
  "SanCor",
  "fuerte caída",
  "pérdidas",
  "caída de consumo",
  "cadena de pagos",
  "tamberos",
  "Verónica"
 ],
 "s7": [
  "La Rioja",
  "Trenque Lauquen",
  "Chubut",
  "Esquel",
  "Comodoro",
  "General Rodríguez",
  "Chivilcoy"
 ],
 "s8": [
  "gobierno de inútiles",
  "sin indemnización",
  "boicot",
  "dejar de comprar",
  "codicia empresarial",
  "socialwashing"
 ],
 "s9": [
  "#LaSerenisima",
  "#gobiernoCriminal",
  "#Milei",
  "#Mastellone",
  "#ATILRA",
  "#Camioneros",
  "#NosDejanSinTrabajo",
  "Ministerio de Trabajo"
 ]
};

const NAMES = { s1:'Marca y controlantes', s2:'Conflicto laboral', s3:'Logística', s4:'Sindicatos', s5:'Acciones gremiales', s6:'Crisis láctea', s7:'Geografía', s8:'Sentimiento', s9:'Amplificadores externos' };
const LV_TXT = ['sin señal', 'bajo', 'medio', 'alto'];
// Señales de escalada: una sola mención ya sube el eje a medio.
const TRIG = { s2: ['130 despidos', '130 familias', 'telegramas', 'suspensiones'], s4: ['Camioneros', 'Moyano', 'CGT'], s5: ['paro', 'huelga', 'bloqueo', 'quite de colaboración', 'no sale la leche', 'conciliación obligatoria'], s8: ['boicot', 'dejar de comprar'], s9: ['Ministerio de Trabajo'] };
// Semáforo (misma regla que muestra el tablero):
//  Alto (3):  el eje pesa ≥20% de la conversación y ≥50% es negativa, o ≥30 negativas, o ≥5 señales de escalada.
//  Medio (2): pesa ≥10%, o ≥8 negativas, o ≥1 señal de escalada.
//  Bajo (1):  hay menciones.  Sin señal (0): no hay.
//  Sentimiento (s8): alto con ≥50% negativo general o ≥5 llamados a boicot; medio con ≥25% o ≥1.
function level(k, a, total, negTotal) {
  if (k === 's8') { const ns = negTotal / Math.max(total, 1); return (ns >= 0.5 || a.trig >= 5) ? 3 : (ns >= 0.25 || a.trig >= 1) ? 2 : total ? 1 : 0; }
  if (!a.hits) return 0;
  const share = a.hits / Math.max(total, 1), negShare = a.neg / a.hits;
  if ((share >= 0.2 && negShare >= 0.5) || a.neg >= 30 || a.trig >= 5) return 3;
  if (share >= 0.1 || a.neg >= 8 || a.trig >= 1) return 2;
  return 1;
}
// Junta todo el texto del documento, venga en el campo que venga.
const textOf = d => {
  const out = [];
  const walk = (v, depth) => {
    if (depth > 4 || v == null) return;
    if (typeof v === 'string') { if (v.length > 2 && !/^https?:\/\//.test(v)) out.push(v); return; }
    if (Array.isArray(v)) return v.forEach(x => walk(x, depth + 1));
    if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/url|id$|date|image|avatar|lang|country|type/i.test(k)) walk(x, depth + 1); });
  };
  walk(d.content ?? d, 0);
  ['title', 'body', 'text', 'opening_text', 'hit_sentence', 'snippet'].forEach(k => typeof d[k] === 'string' && out.push(d[k]));
  return [...new Set(out)].join(' ');
};
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ymd = d => d.toISOString().slice(0, 10);
const dm = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' mil' : String(n);
const list = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];

async function fetchAll(start, end) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`https://api.meltwater.com/v3/search/${env('MELTWATER_SEARCH_ID') || '29139916'}`, {
      method: 'POST',
      headers: { apikey: env('MELTWATER_API_KEY'), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ start, end, tz: 'America/Argentina/Buenos_Aires', page, page_size: 100, sort_by: 'date', sort_order: 'desc', template: { name: 'api.json' } })
    });
    if (!r.ok) throw new Error('Meltwater ' + r.status + ': ' + (await r.text()));
    const j = await r.json();
    const docs = j.documents || j.result?.documents || [];
    out.push(...docs);
    if (docs.length < 100) break;
  }
  return out;
}

// Mapeo defensivo del template api.json — ajustar si el payload real difiere
const pick = d => {
  const text = textOf(d);
  const src = norm(d.source?.type || d.source?.name || d.content_type || d.url || '');
  const pl = /twitter|x\.com|^x$/.test(src) ? 'X' : /instagram/.test(src) ? 'IG' : /tiktok/.test(src) ? 'TikTok' : 'Otro';
  const s = norm(d.enrichments?.sentiment || d.sentiment || '');
  return { date: (d.published_date || d.date || '').slice(0, 10), text, pl, url: d.url,
    h: d.author?.handle || d.author?.name || 'autor',
    s: s.startsWith('neg') ? 'neg' : s.startsWith('pos') ? 'pos' : 'neu',
    eng: +(d.metrics?.engagement?.total ?? d.metrics?.engagement ?? d.engagement ?? 0) || 0 };
};
const RX = {};
const has = (d, t) => { const n = norm(t); const re = RX[n] || (RX[n] = new RegExp('(^|[^a-z0-9#@])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])')); return re.test(norm(d.text)); };
const isRepost = d => /retweet|repost|reshare|^share$/i.test(String(d.content_type || d.source?.subtype || d.type || d.post_type || '')) || /^rt @/i.test(d.content?.body || d.content?.opening_text || '');

// Textos generados por reglas (sin IA)
function readAxis(k, counts, hits, lv) {
  const on = counts.filter(c => c[1] > 0).sort((a, b) => b[1] - a[1]);
  const off = counts.filter(c => c[1] === 0).map(c => '“' + c[0] + '”');
  if (!hits) return `Sin menciones en los últimos 30 días. Términos vigilados: ${list(off.slice(0, 4))}.`;
  let t = `${hits} publicaciones en 30 días (riesgo ${LV_TXT[lv]}). Lo más mencionado: ${list(on.slice(0, 3).map(c => '“' + c[0] + '” (' + c[1] + ')'))}.`;
  if (off.length) t += ` Todavía sin aparecer: ${list(off.slice(0, 3))}.`;
  return t;
}
function peakNotes(daily, startDay, docs) {
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length || 1;
  return daily.map((v, i) => ({ v, i })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3).map(({ v, i }) => {
    const day = ymd(new Date(new Date(startDay).getTime() + i * 864e5));
    const top = docs.filter(d => d.date === day).sort((a, b) => b.eng - a.eng)[0];
    const x = (v / avg).toFixed(1).replace('.', ',');
    return { d: dm(day), t: `${v} menciones (${x}× el promedio).` + (top ? ` Principal: @${top.h} en ${top.pl}, ${fmt(top.eng)} interacciones: “${top.text.slice(0, 90).trim()}…”` : '') };
  });
}
function whyText(docs) {
  const neg = docs.filter(d => d.s === 'neg');
  if (!neg.length) return { a: 'ninguna publicación del período tiene tono negativo.', b: 'sin señales de rechazo hacia la marca.' };
  const byAxis = Object.entries(AXES).map(([k, t]) => [k, neg.filter(d => t.some(x => has(d, x))).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const top = [...neg].sort((a, b) => b.eng - a.eng)[0];
  const boicot = neg.filter(d => ['boicot', 'dejar de comprar', 'no compren'].some(x => has(d, x))).length;
  return {
    a: `${neg.length} de ${docs.length} publicaciones cumplen ese criterio.` + (byAxis.length ? ` Se concentran en ${list(byAxis.slice(0, 2).map(([k, n]) => NAMES[k].toLowerCase() + ' (' + n + ')'))}.` : '') + ` La de mayor alcance: @${top.h} (${fmt(top.eng)} interacciones).`,
    b: boicot ? `hay ${boicot} llamados a boicot o a dejar de comprar: revisar.` : 'no hay llamados a boicot ni a dejar de comprar.'
  };
}

let diag = null;
async function build() {
  const now = new Date(), from = new Date(now); from.setDate(from.getDate() - (DAYS - 1));
  const startDay = ymd(from);
  const all = await fetchAll(startDay + 'T00:00:00', ymd(now) + 'T23:59:59');
  const raw = all.filter(d => !isRepost(d));
  const docs = raw.map(pick);
  diag = { campos: Object.keys(raw[0] || {}), camposContenido: Object.keys(raw[0]?.content || {}), sinTexto: docs.filter(d => !d.text).length, sentimiento: [...new Set(docs.map(d => d.s))], reposts: all.length - raw.length, ejemploSentimiento: raw[0]?.enrichments?.sentiment ?? raw[0]?.sentiment ?? null };
  const daily = Array(DAYS).fill(0);
  docs.forEach(d => { const i = Math.round((new Date(d.date) - new Date(startDay)) / 864e5); if (i >= 0 && i < DAYS) daily[i]++; });

  const secs = {};
  Object.entries(AXES).forEach(([k, terms]) => {
    const counts = terms.map(t => [t, docs.filter(d => has(d, t)).length]);
    const negTotal = docs.filter(d => d.s === 'neg').length;
    const hd = k === 's8' ? docs.filter(d => d.s === 'neg') : docs.filter(d => terms.some(t => has(d, t)));
    const hits = hd.length, neg = hd.filter(d => d.s === 'neg').length;
    const trig = (TRIG[k] || []).reduce((s, t) => s + docs.filter(d => has(d, t)).length, 0);
    const lv = level(k, { hits, neg, trig }, docs.length, negTotal);
    secs[k] = { terms: counts, lv, hits, neg, trig, read: readAxis(k, counts, hits, lv) };
  });
  const axisOf = d => Object.entries(AXES).filter(([, t]) => t.some(x => has(d, x))).map(([k]) => +k.slice(1));
  const posts = [...docs].sort((a, b) => b.eng - a.eng).slice(0, 200)
    .map((d, i) => ({ id: i + 1, d: dm(d.date), h: d.h, pl: d.pl, s: d.s, eng: d.eng, s_: axisOf(d), url: d.url, txt: d.text.slice(0, 280) }));
  const notes = peakNotes(daily, startDay, docs);
  const count = p => docs.filter(d => d.pl === p).length;
  const data = {
    v: 2, updatedAt: now.toISOString(), start: startDay, daily, posts, secs, notes, why: whyText(docs),
    peakDay: notes[0]?.d || null, peakNote: '',
    kpi: { total: docs.length, neg: docs.filter(d => d.s === 'neg').length, pos: docs.filter(d => d.s === 'pos').length, x: count('X'), ig: count('IG'), tt: count('TikTok') }
  };
  await getStore('serenisima').setJSON('data', data);
  return { docs: docs.length };
}

export async function runRefresh(source) {
  const store = getStore('serenisima'), at = new Date().toISOString();
  let status;
  await store.setJSON('status', { ok: false, at, source, error: 'La actualización empezó (' + source + ') pero no terminó: se cortó por tiempo o por un error interno. Ver Netlify → Logs → Functions.' });
  try {
    if (!env('MELTWATER_API_KEY')) throw new Error('Falta la variable MELTWATER_API_KEY en Netlify (y hacer un nuevo deploy después de cargarla).');
    const r = await build();
    status = { ok: true, at, source, docs: r.docs, diag };
  } catch (e) {
    status = { ok: false, at, source, error: String(e.message || e).slice(0, 400) };
  }
  await store.setJSON('status', status);
  console.log('[refresh]', JSON.stringify(status));
  return status;
}
