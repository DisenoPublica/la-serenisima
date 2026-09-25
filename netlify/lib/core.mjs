// Modelo de análisis: consulta Meltwater, clasifica TODAS las publicaciones en 9 ejes por conceptos
// (cada concepto reconoce variantes de palabras), calcula riesgo por eje y general, y guarda el resultado.
import { getStore } from '@netlify/blobs';

const env = k => (globalThis.Netlify?.env?.get(k)) ?? process.env[k];
const DAYS = 31;

// ───────────── Diccionario de conceptos por eje ─────────────
// [etiqueta, expresión (texto en minúsculas y sin tildes), esEscalada]
const AXES = {
  s1: [
    ['Arcor', 'arcor'], ['Danone', 'danone'], ['Mastellone', 'mastellone'], ['Bagley', 'bagley'], ['Pagani', 'pagani'],
    ['Rescate / venta de la empresa', 'rescate financiero|toma de control|nuevos? duenos?|(compra|venta|adquisicion) de (la serenisima|mastellone)|(compraron|compro|vendio|vendieron) (la serenisima|mastellone)|se queda(n)? con (la serenisima|mastellone)'],
    ['Deuda / obligaciones negociables', 'obligaciones negociables|\\bcnv\\b|\\bdeuda\\b|default|refinanci'],
  ],
  s2: [
    ['Despidos', 'despid(o|os|e|en|io|ieron|ira|iran|iendo)\\b|despedid'],
    ['Desvinculaciones', 'desvincul'],
    ['130 despidos', '\\b130 (despidos|trabajadores|empleados|familias|puestos)', 1],
    ['Telegramas', 'telegrama', 1],
    ['Suspensiones', 'suspension(es)? (de|a) (personal|trabajadores|empleados)|suspend(e|en|io|ieron) (a )?(personal|trabajadores|empleados)', 1],
    ['Vaciamiento', 'vaciamiento|vaciando la empresa', 1],
    ['Retiros voluntarios', 'retiros? voluntarios?'],
    ['Recorte de personal', '(recorte|ajuste|reduccion|achique) (de|del) (personal|plantel|planta)|sin indemnizacion'],
  ],
  s3: [
    ['Costos logísticos', 'costos? (logistic|de distribucion|de transporte|de flete)'],
    ['Frío Sur / distribuidores', 'frio ?sur|distribuidor(a|es|as)?'],
    ['Faltantes / abastecimiento', 'desabastec|abastecimiento|faltante|gondolas? vacias|no (llega|hay) (leche|productos?)'],
    ['Tercerización', 'terceriz'],
    ['Cierre de depósito o centro', 'cierr(e|a|an) (de |del |el |la |su |sus )?(deposito|centro de distribucion|sucursal|planta|base)'],
    ['Flota / camiones', 'camiones? propios|flota|fletero|camion(es)? de (la serenisima|mastellone)'],
    ['Logística / reparto', 'logistic|reparto|red de distribucion'],
  ],
  s4: [
    ['ATILRA', 'atilra'], ['Heber Ríos', 'heber (j )?rios|heberjrios'], ['Etín Ponce', '\\bponce\\b'], ['OSPIL', 'ospil'],
    ['Camioneros', 'camioneros', 1], ['Moyano', 'moyano', 1], ['CGT', '\\bcgt\\b', 1],
    ['Gremio / delegados', 'gremi(o|al|ales)|sindica(to|l|tos|les)|delegad(o|os)|comision interna'],
  ],
  s5: [
    ['Asamblea', 'asamblea'], ['Estado de alerta', 'estado de alerta|alerta y movilizacion', 1],
    ['Paro', '\\bparos?\\b|\\bparan\\b|pararon', 1], ['Huelga', 'huelga', 1],
    ['Quite de colaboración', 'quite de colaboracion|trabajo a reglamento', 1],
    ['Bloqueo / acampe', 'bloque(o|an|aron)|piquete|acampe|toma de (la )?planta', 1],
    ['"No sale la leche"', 'no sale (la leche|ni un camion)|sin reparto', 1],
    ['Conciliación obligatoria', 'conciliacion obligatoria', 1],
    ['Movilización / protesta', 'moviliza(cion|ron|n)|protesta|marcha|reclamo (de|de los) trabajadores'],
  ],
  s6: [
    ['Quiebra / concurso', 'quiebra|quebr(o|a|ar|ada|aron)\\b|concurso (preventivo|de acreedores)|bancarrota|cierra a fin de mes|cierre definitivo'],
    ['SanCor', 'sancor'],
    ['Pérdidas', 'perdida|\\bpierde|perdio|numeros rojos|quebranto|a pura perdida'],
    ['Caída del consumo', '(caida|baja|retraccion|derrumbe|desplome) (de|del) (consumo|las ventas|ventas)|(cae|cayo|se derrumba|se desploma|baja) (el )?consumo|consumo (en caida|cae|cayo)'],
    ['Crisis del sector lácteo', 'crisis (lactea|lechera|del sector)|sector lacteo|industria lactea|lecheria|lacteas?\\b'],
    ['Cadena de pagos', 'cadena de pagos?|cheques? rechazados|no (les )?envien (mas )?mercaderia'],
    ['Tamberos / productores', 'tamber|\\btambos?\\b|productores? (de leche|lecheros?)'],
    ['Verónica', 'veronica'],
    ['Precios', 'precio de la leche|aumento de precios|suba de precios|remarc|inflacion'],
  ],
  s7: [
    ['General Rodríguez', 'general rodriguez|gral\\.? rodriguez'], ['Trenque Lauquen', 'trenque lauquen'], ['Chivilcoy', 'chivilcoy'],
    ['Longchamps', 'longchamps'], ['La Rioja', 'la rioja|riojan'], ['Chubut / Esquel', 'chubut|esquel'], ['Comodoro Rivadavia', 'comodoro'],
    ['Santa Cruz', 'santa cruz'], ['Patagonia', 'patagoni'], ['Córdoba', 'cordoba'], ['Rosario / Santa Fe', 'rosario|santa fe'],
  ],
  s8: [
    ['Boicot', 'boicot|boycott', 1],
    ['Dejar de comprar', '(dejen|dejemos|deje|dejar|dejo) de comprar|no (compren|compres|compro mas)|cambi(ar|en|o) de marca|me paso a otra marca', 1],
    ['"Gobierno de inútiles"', 'gobierno de inutiles'],
    ['Politización (Gobierno / Milei)', '\\bmilei\\b|gobierno|caputo|libertarios?'],
    ['Insultos / codicia empresaria', 'codicia|\\bgarcas?\\b|chorros|ladrones|explotador|miserables?|sueldos? de miseria'],
    ['Sin indemnización', 'sin indemnizacion'],
    ['Socialwashing', 'socialwashing|lavado de imagen'],
    ['Rumor / desmentida', 'rumor|fake|falso|desmint|no quebro|no cierra'],
  ],
  s9: [
    ['#LaSerenisima', '#laserenisima'], ['#Milei', '#milei'], ['#gobiernoCriminal', '#gobiernocriminal'], ['#Mastellone', '#mastellone'],
    ['Ministerio / Secretaría de Trabajo', '(ministerio|secretaria|cartera) de trabajo', 1],
    ['Legisladores', 'diputad|senador|legislador|concejal|concejo deliberante', 1],
    ['Intendente / municipio', 'intendent|municipio|municipalidad'],
    ['Medios nacionales', 'infobae|clarin|la nacion|pagina ?12|perfil\\.com|ambito|iprofesional|\\btn\\b|c5n|a24|el cronista|la izquierda diario'],
  ],
};
const NAMES = { s1: 'Marca y controlantes', s2: 'Conflicto laboral', s3: 'Logística', s4: 'Sindicatos', s5: 'Acción sindical', s6: 'Crisis láctea', s7: 'Geografía', s8: 'Sentimiento', s9: 'Amplificadores' };
const LV_TXT = ['sin señal', 'bajo', 'medio', 'alto'];

// ───────────── Semáforo ─────────────
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

// ───────────── Utilidades ─────────────
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ymd = d => d.toISOString().slice(0, 10);
const dm = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' mil' : String(n);
const list = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const RX = {};
Object.values(AXES).flat().forEach(([l, p]) => { RX[l] = new RegExp('(^|[^a-z0-9])(' + p + ')', 'i'); });
const hit = (d, label) => RX[label].test(d.n);

// Busca en todo el documento (cualquier profundidad) valores por nombre de campo
function findAll(obj, keyRe, depth = 0, out = []) {
  if (!obj || typeof obj !== 'object' || depth > 5) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (keyRe.test(k) && (typeof v === 'string' || typeof v === 'number')) out.push(v);
    if (v && typeof v === 'object') findAll(v, keyRe, depth + 1, out);
  }
  return out;
}
const textOf = d => {
  const parts = [];
  const walk = (v, depth) => {
    if (depth > 4 || v == null) return;
    if (typeof v === 'string') { if (v.length > 2 && !/^https?:\/\//.test(v)) parts.push(v); return; }
    if (Array.isArray(v)) return v.forEach(x => walk(x, depth + 1));
    if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/url|id$|date|image|avatar|lang|country|type|author|source/i.test(k)) walk(x, depth + 1); });
  };
  walk(d.content ?? {}, 0);
  ['title', 'body', 'text', 'opening_text', 'hit_sentence', 'snippet', 'description'].forEach(k => typeof d[k] === 'string' && parts.push(d[k]));
  return [...new Set(parts)].join(' ').replace(/https?:\/\/\S+/g, ' ');
};
const platformOf = d => {
  const s = norm([d.url, d.source?.url, d.source?.name, d.source?.type, d.source?.subtype, d.content_type, d.type, d.source_type, ...findAll(d, /^(source_?type|media_?type|network|platform|social_network)$/i)].filter(Boolean).join(' '));
  if (/twitter|x\.com|\btwitter\b|\bx\b/.test(s)) return 'X';
  if (/instagram/.test(s)) return 'IG';
  if (/tiktok/.test(s)) return 'TikTok';
  if (/facebook|fb\.com/.test(s)) return 'Facebook';
  if (/youtube|youtu\.be/.test(s)) return 'YouTube';
  return 'Prensa / web';
};
const sentimentOf = d => {
  const v = norm(String(d.enrichments?.sentiment ?? d.sentiment ?? findAll(d, /sentiment/i)[0] ?? ''));
  if (/neg/.test(v) || (+v < 0)) return 'neg';
  if (/pos/.test(v) || (+v > 0)) return 'pos';
  return 'neu';
};
const engagementOf = d => {
  const e = findAll(d, /^(engagement|engagement_total|total_engagement|social_echo)$/i).map(Number).find(x => x > 0);
  if (e) return e;
  return findAll(d, /^(likes?|comments?|shares?|retweets?|reposts?|replies|quotes|reactions|favorites?)(_count)?$/i).map(Number).filter(x => x > 0).reduce((a, b) => a + b, 0);
};
const dateOf = d => String(d.published_date || d.document_publish_date || d.published_at || d.date || findAll(d, /publish/i)[0] || '').slice(0, 10);
const isRepost = d => /retweet|repost|reshare|^share$/i.test(String(d.content_type || d.source?.subtype || d.type || d.post_type || '')) || /^rt @/i.test(textOf(d).trim());

const pick = d => {
  const text = textOf(d);
  return {
    date: dateOf(d), text, n: norm(text), pl: platformOf(d), s: sentimentOf(d), eng: engagementOf(d),
    url: d.url || d.content?.url || d.source?.url || '',
    h: String(d.author?.handle || d.author?.username || d.author?.name || d.source?.name || 'autor').replace(/^@+/, ''),
  };
};

// ───────────── Meltwater ─────────────
async function fetchAll(start, end) {
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const r = await fetch('https://api.meltwater.com/v3/search/' + (env('MELTWATER_SEARCH_ID') || '29139916'), {
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

// ───────────── Textos por reglas ─────────────
function readAxis(k, counts, a, lv, total) {
  const on = counts.filter(c => c[1] > 0).sort((x, y) => y[1] - x[1]);
  const off = counts.filter(c => c[1] === 0).map(c => c[0]);
  if (!a.hits) return 'Sin menciones en los últimos 30 días. Se vigila: ' + list(off.slice(0, 4)) + '.';
  const share = Math.round(a.hits / Math.max(total, 1) * 100);
  let t = (k === 's8' ? a.hits + ' publicaciones negativas' : a.hits + ' publicaciones (' + share + '% de la conversación)') + ', riesgo ' + LV_TXT[lv] + '. Lo que más aparece: ' + list(on.slice(0, 3).map(c => c[0] + ' (' + c[1] + ')')) + '.';
  if (a.escOn.length) t += ' Señales de escalada: ' + list(a.escOn.map(c => c[0] + ' (' + c[1] + ')')) + '.';
  else if (off.length) t += ' Sin menciones de ' + list(off.slice(0, 3)) + '.';
  return t;
}
function peakNotes(daily, startDay, docs) {
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length || 1;
  return daily.map((v, i) => ({ v, i })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3).map(({ v, i }) => {
    const day = ymd(new Date(new Date(startDay).getTime() + i * 864e5));
    const top = docs.filter(d => d.date === day).sort((a, b) => b.eng - a.eng)[0];
    const x = (v / avg).toFixed(1).replace('.', ',');
    return { d: dm(day), t: v + ' menciones (' + x + '× el promedio).' + (top ? ' Principal: @' + top.h + ' (' + top.pl + ', ' + fmt(top.eng) + ' interacciones): “' + top.text.slice(0, 110).trim() + '…”' : '') };
  });
}
function whyText(docs) {
  const neg = docs.filter(d => d.s === 'neg');
  if (!neg.length) return { a: 'ninguna publicación del período tiene tono negativo.', b: 'sin señales de rechazo hacia la marca.' };
  const byAxis = Object.keys(AXES).filter(k => k !== 's8').map(k => [k, neg.filter(d => AXES[k].some(([l]) => hit(d, l))).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const top = [...neg].sort((a, b) => b.eng - a.eng)[0];
  const boicot = neg.filter(d => hit(d, 'Boicot') || hit(d, 'Dejar de comprar')).length;
  const pol = neg.filter(d => hit(d, 'Politización (Gobierno / Milei)')).length;
  return {
    a: neg.length + ' de ' + docs.length + ' publicaciones tienen tono negativo según Meltwater.' + (byAxis.length ? ' Se concentran en ' + list(byAxis.slice(0, 3).map(([k, n]) => NAMES[k].toLowerCase() + ' (' + n + ')')) + '.' : '') + ' La de mayor alcance: @' + top.h + ' (' + fmt(top.eng) + ' interacciones).',
    b: (boicot ? 'hay ' + boicot + ' llamados a boicot o a dejar de comprar.' : 'no hay llamados a boicot ni a dejar de comprar.') + (pol ? ' ' + pol + ' negativas apuntan al Gobierno.' : '')
  };
}

// ───────────── Análisis ─────────────
let diag = null;
async function build() {
  const now = new Date(), from = new Date(now); from.setDate(from.getDate() - (DAYS - 1));
  const startDay = ymd(from);
  const all = await fetchAll(startDay + 'T00:00:00', ymd(now) + 'T23:59:59');
  const raw = all.filter(d => !isRepost(d));
  const docs = raw.map(pick);
  const total = docs.length, negTotal = docs.filter(d => d.s === 'neg').length;

  const daily = Array(DAYS).fill(0);
  docs.forEach(d => { const i = Math.round((new Date(d.date) - new Date(startDay)) / 864e5); if (i >= 0 && i < DAYS) daily[i]++; });

  const secs = {};
  for (const [k, concepts] of Object.entries(AXES)) {
    const counts = concepts.map(([l]) => [l, docs.filter(d => hit(d, l)).length]);
    const esc = concepts.filter(c => c[2]).map(([l]) => [l, counts.find(c => c[0] === l)[1]]);
    const hd = k === 's8' ? docs.filter(d => d.s === 'neg') : docs.filter(d => concepts.some(([l]) => hit(d, l)));
    const a = { hits: hd.length, neg: hd.filter(d => d.s === 'neg').length, trig: esc.reduce((s, c) => s + c[1], 0), escOn: esc.filter(c => c[1] > 0) };
    const lv = level(k, a, total, negTotal);
    secs[k] = { terms: counts, esc, lv, hits: a.hits, neg: a.neg, trig: a.trig, read: readAxis(k, counts, a, lv, total) };
  }
  const axisOf = d => Object.entries(AXES).filter(([k, c]) => k === 's8' ? d.s === 'neg' : c.some(([l]) => hit(d, l))).map(([k]) => +k.slice(1));
  const posts = [...docs].sort((a, b) => b.eng - a.eng || (b.date > a.date ? 1 : -1)).slice(0, 300)
    .map((d, i) => ({ id: i + 1, d: dm(d.date), h: d.h, pl: d.pl, s: d.s, eng: d.eng, s_: axisOf(d), url: d.url, txt: d.text.slice(0, 300) }));
  const notes = peakNotes(daily, startDay, docs);
  const count = p => docs.filter(d => d.pl === p).length;
  const unmatched = docs.filter(d => !Object.entries(AXES).some(([k, c]) => k !== 's8' && c.some(([l]) => hit(d, l))));
  diag = {
    recibidas: all.length, reposts: all.length - raw.length, analizadas: total, sinEje: unmatched.length,
    ejemplosSinEje: unmatched.slice(0, 5).map(d => d.text.slice(0, 120)),
    plataformas: Object.fromEntries([...new Set(docs.map(d => d.pl))].map(p => [p, count(p)])),
    sentimiento: { neg: negTotal, pos: docs.filter(d => d.s === 'pos').length, neu: docs.filter(d => d.s === 'neu').length },
    sinFecha: docs.filter(d => !d.date).length, conInteracciones: docs.filter(d => d.eng > 0).length,
    campos: Object.keys(raw[0] || {}), camposContenido: Object.keys(raw[0]?.content || {})
  };
  const data = {
    v: 3, updatedAt: now.toISOString(), start: startDay, daily, posts, secs, notes, why: whyText(docs),
    peakDay: notes[0]?.d || null, peakNote: '',
    kpi: { total, neg: negTotal, pos: docs.filter(d => d.s === 'pos').length, x: count('X'), ig: count('IG'), tt: count('TikTok'), otros: total - count('X') - count('IG') - count('TikTok') }
  };
  await getStore('serenisima').setJSON('data', data);
  return { docs: total };
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
