# Contrato catálogo público — AntojosGo App

**Fecha:** 2026-09-26 (Sprint 0+1). Implementación: `modules/catalog/data/public-catalog.ts` + rutas `app/api/catalog/*`.

## Principio

Solo sedes con `restaurant_branches.status = 'published'`. Sin filas → `{ items: [], count: 0 }`. Cero restaurantes inventados.

## Shape `PublicCatalogItem`

```ts
{
  id: string                 // UUID sede (branch)
  restaurant_id?: string     // UUID negocio
  name: string               // nombre del negocio
  branch_name: string        // nombre de la sede
  description: string | null
  address: string
  municipality: string
  department: string
  latitude: number | null
  longitude: number | null
  distanceKm?: number        // solo si la petición envió lat/lng
}
```

Campos **no** expuestos: `auth_owner_id`, credenciales, coords de borradores, teléfono privado, métricas inventadas.

## Query params

| Param | Tipo | Endpoints | Notas |
|-------|------|-----------|--------|
| `q` | string | `/api/catalog/search` | Texto sobre name, branch_name, description, address, municipality, department |
| `lat` | number | search, nearby | Latitud diner |
| `lng` | number | search, nearby | Longitud diner |
| `radiusMeters` | number | search, nearby | Default `5000`. Se convierte a km en el adaptador |
| `limit` | number | search, nearby | Default `20`, tope `100` |

## Endpoints (Next.js)

Base URL = origen del servidor Next.

### 1. Búsqueda / listado
`GET /api/catalog/search?q=&lat=&lng=&radiusMeters=&limit=`

- Sin geo: publicados filtrados por `q`.
- Con `lat`+`lng`: filtrados por radio, ordenados por `distanceKm` asc; `q` opcional.
- Respuesta: `{ items: PublicCatalogItem[], count: number }`

### 2. Cercanos
`GET /api/catalog/nearby?lat=&lng=&radiusMeters=&limit=`

- Requiere `lat` y `lng`.
- Respuesta: `{ items: PublicCatalogItem[], count: number }`

### 3. Detalle sede publicada
Hoy: `getPublishedBranch(client, id)` en el módulo (sin ruta HTTP).  
Web legacy: `getRestaurantById` / `searchRestaurants` en `lib/restaurants.ts` (mismo filtro `status=published`, shape Restaurant más ancha).

## Menú owner (API existente, tabla `foods`)

Auth: `Authorization: Bearer <supabase_access_token>` + ownership RLS.

| Método | Ruta | Persistencia |
|--------|------|----------------|
| GET | `/api/restaurants/:restaurantId/menu` | `foods` |
| POST | `/api/restaurants/:restaurantId/dishes` | insert `foods` |
| PUT | `/api/restaurants/:restaurantId/dishes/:dishId` | update `foods` |
| DELETE | `/api/restaurants/:restaurantId/dishes/:dishId` | delete `foods` |

Ítem menú (respuesta API, camelCase):

```ts
{
  id, restaurantId, name, description, ingredients: string[],
  category, price: number, imageUrl?, isAvailable, isSpecial,
  allergens: string[], dietaryInfo: string[], preparationTime?,
  status?: "draft" | "published",
  createdAt, updatedAt
}
```

## SQL pendiente (Pablo en Supabase)

1. `scripts/public-catalog.sql` — lectura anon/authenticated de sedes `published`
2. `scripts/menu-foods.sql` — columnas `status` + CRUD owner en `foods`

Sin (1) el catálogo App seguirá vacío aunque existan borradores privados.
