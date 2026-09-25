# Tablero La Serenísima · actualización automática (Netlify)

Todos los días a las **10:00 (Argentina)** corre `refresh`, consulta Meltwater y guarda los datos. El tablero los lee al abrirse. Si algo falla, el encabezado muestra una pastilla roja con el error.

## Variables de entorno (Site configuration → Environment variables)
- `MELTWATER_API_KEY` = token de la API de Meltwater
- `MELTWATER_SEARCH_ID` = 29139916
- `RUN_KEY` = una clave inventada (ej. serenisima-2026) para correrlo a mano

**Después de cargar o cambiar variables: Deploys → Trigger deploy → Deploy site.**

## Primera carga / probar
Abrir: `https://<tu-sitio>.netlify.app/api/run?key=<RUN_KEY>`
- `{"ok":true,"docs":...}` → funcionó; recargar el tablero.
- `{"ok":false,"error":"..."}` → el mensaje dice qué falta (token, permisos, ID de búsqueda).

## Ver estado
- `/api/data` → datos + campo `status` con la última corrida.
- Netlify → Logs → Functions → `refresh` (debe figurar como *Scheduled*).
