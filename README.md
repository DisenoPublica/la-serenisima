# Tablero La Serenísima · Meltwater

Estructura del repo (todo en la raíz):

- index.html — el tablero
- support.js — necesario para el tablero
- netlify.toml, package.json — configuración de Netlify
- netlify/functions/ — data.mjs (/api/data), run.mjs (botón Actualizar), refresh.mjs (10:00 diario)
- netlify/lib/core.mjs — modelo de análisis

Variables en Netlify: MELTWATER_API_KEY, MELTWATER_SEARCH_ID.
