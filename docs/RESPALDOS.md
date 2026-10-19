# Respaldos de la base de datos

El plan gratuito de Supabase no guarda copias descargables, así que los respaldos se hacen desde esta computadora.

## Hacer un respaldo (1 minuto)

```powershell
node --env-file=.env.local scripts/backup-db.mjs
```

- Crea dos archivos en `C:\Users\pablo\Documents\AntojosGo-respaldos` (fuera del proyecto, porque contienen correos de usuarios; **nunca** deben subirse a GitHub):
  - `antojosgo-<fecha>-public.dump`: todas las tablas de la app (restaurantes, sedes, menús, reseñas, favoritos…).
  - `antojosgo-<fecha>-auth.dump`: las cuentas (`auth.users` y `auth.identities`).
- Comprueba cada archivo al terminar y conserva los últimos 10.
- Necesita `SUPABASE_DB_URL` en `.env.local` y PostgreSQL 17 instalado (ya está en `C:\Program Files\PostgreSQL\17`).
- Las fotos están en Supabase Storage, no en estos archivos.

Recomendado: un respaldo por semana y antes de cada cambio grande (por ejemplo, antes de una migración).

## Restaurar

**En el mismo proyecto de Supabase o en uno nuevo** (ya trae `auth`, extensiones y PostGIS):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --no-owner --no-privileges --data-only -d "<SUPABASE_DB_URL>" antojosgo-<fecha>-auth.dump
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --no-owner --no-privileges -d "<SUPABASE_DB_URL>" antojosgo-<fecha>-public.dump
```

En un proyecto nuevo, primero se aplican las migraciones de `supabase/migrations/` o se restaura sin `--data-only`.

**En un PostgreSQL vacío** (por ejemplo, para revisar datos): antes de restaurar, crear los roles `anon`, `authenticated` y `service_role`, los esquemas `extensions` y `auth`, y las extensiones `uuid-ossp`, `unaccent` y `pgcrypto` en `extensions` (PostGIS si está disponible).

## Ensayo de restauración (19 de octubre de 2026)

Se restauró el respaldo en un PostgreSQL 17 temporal y se compararon los conteos con producción: restaurantes 9, sedes 6, platillos 3, perfiles 9, favoritos 1, opiniones 1 y 12 cuentas. **Todos coincidieron.** El único error fue el índice del mapa, que necesita PostGIS (Supabase lo tiene).
