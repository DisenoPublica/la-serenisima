# Dashboard La Serenísima · actualización diaria en Netlify

Todos los días a las **10:00 (Argentina)** Netlify ejecuta `refresh`: consulta Meltwater con el token guardado en una variable de entorno, recalcula todo y lo guarda. El dashboard lo lee al abrirse. Sin IA: los textos se arman con reglas a partir de los datos.

## Qué se actualiza
- Cifras, volumen diario, torta de plataformas
- Términos, conteos y semáforo de los 9 ejes
- Lectura de cada eje (texto armado por reglas)
- Notas de los 3 picos del gráfico (fecha, volumen, publicación principal)
- "¿Por qué es negativo?" (cantidad, ejes donde se concentra, publicación de mayor alcance, llamados a boicot)
- Publicaciones (las 200 con más interacción) y la fecha de "Última actualización"

## Pasos
1. GitHub → New repository (privado) → "uploading an existing file" → arrastrar TODO el contenido de esta carpeta (public/, netlify/, netlify.toml, package.json) → Commit.
2. Netlify → Add new site → Import from GitHub → elegir el repo (la configuración la toma de `netlify.toml`).
3. Site configuration → Environment variables:
   - `MELTWATER_API_KEY` = token de Meltwater
   - `MELTWATER_SEARCH_ID` = 29139916
4. Deploy. Primera carga: Netlify → Functions → `refresh` → **Run now**.

## A revisar con el primer dato real
- Mapeo de campos (`pick` en refresh.mjs): plataforma, sentimiento y engagement según el template `api.json`.
- Umbrales de semáforo (`LEVEL`): 0 / 1–2 / 3–7 / 8–19 / 20+ menciones por eje.
- Las funciones programadas de Netlify tienen un límite de 30 s: alcanza para ~2.000 menciones por corrida.
- Si la función falla, el dashboard sigue mostrando los últimos datos guardados.
