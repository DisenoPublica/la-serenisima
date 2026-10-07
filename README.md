# Tablero La Serenísima · actualización automática (Netlify)

Todos los días a las **10:00 (Argentina)** corre `refresh`, consulta Meltwater y guarda los datos. El tablero los lee al abrirse. Si algo falla, el encabezado muestra una pastilla roja con el error.

## Variables de entorno (Site configuration → Environment variables)
- `MELTWATER_API_KEY` = token de la API de Meltwater
- `MELTWATER_SEARCH_ID` = 29139916

**Después de cargar o cambiar variables: Deploys → Trigger deploy → Deploy site.**

## Actualizar a mano
Botón **↻ Actualizar** en el encabezado del tablero (máximo una vez cada 3 minutos).
