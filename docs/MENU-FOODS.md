# Menú: decisión `foods` vs `dishes`

**Fecha:** 26 de septiembre de 2026 (Sprint 0+1).

## Decisión

La tabla canónica del menú es **`public.foods`**, alineada con `scripts/auth-accounts.sql` y `docs/EXECUTION-PLAN.md`. Los adaptadores antiguos que leían/escribían `dishes` (`lib/server/menu-management.ts`, analytics) se migraron a `foods`.

Las rutas HTTP `/api/restaurants/[id]/menu` y `/api/restaurants/[id]/dishes` se conservan como API de compatibilidad (nombres de recurso) pero persisten en `foods`.

## Estado de publicación

- Columna `status`: `draft` | `published` (migración `scripts/menu-foods.sql`).
- `is_available` se mantiene sincronizado: `published` ⇒ disponible; borrador ⇒ no disponible, para no romper clientes que solo conocen `isAvailable`.

## Aislamiento

CRUD de menú sigue restringido al propietario (`restaurants.auth_owner_id` vía RLS). No hay lectura pública de platillos en este sprint; el catálogo diner solo publica sedes (`restaurant_branches.status = 'published'`).

## Pendiente (App agent / Pablo)

1. Aplicar `scripts/menu-foods.sql` y `scripts/public-catalog.sql` en Supabase.
2. Conectar UI de menú del propietario si aún no existe en `RestaurantAccountHome`.
3. Lectura pública de platillos publicados cuando el producto lo pida.
