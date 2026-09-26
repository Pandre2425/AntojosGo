# Negocios y sedes

Actualización: ya existe selección y guardado de ubicación por sede; ver MAPS.md. Las referencias siguientes a ubicación pendiente describen la primera entrega. La decisión posterior del usuario conserva Supabase Auth; Firebase deja de ser una migración requerida.

Especificación vigente: PRODUCT-SPEC.md. El MVP inicia en Xela; los contratos no fijan ciudad ni cobertura nacional. Reservas, pedidos y delivery quedan fuera.

`restaurants` representa el negocio existente. `restaurant_branches` contiene sedes con dirección y territorio propios, coordenadas opcionales y estado. No se copiaron direcciones legadas automáticamente porque no hay evidencia de que representen una sede validada.

La entrega permite crear y listar sedes privadas desde «Sedes» en el panel. Nombre único por negocio; ID estable para reintentar sin duplicar; paginación de 20 sedes. La base valida longitudes, coordenadas emparejadas y estado. La interfaz no pide GPS ni afirma disponer de horarios o mapas.

Departamentos/municipios son texto en esta primera entrega; normalizar mediante catálogo territorial antes de búsqueda geográfica pública. No se han implementado edición de sedes, horarios, miembros, aprobación ni publicación. Los clientes no tienen permiso para publicar ni mover una sede de negocio.

Migración aplicada: `private_restaurant_branches`; fuente `scripts/restaurant-branches.sql`. Políticas actuales usan al propietario Supabase Auth existente. Las cuentas reales se mantienen durante la transición; no se agregó Firebase en paralelo.

## Transición requerida por la especificación

El repositorio actual es Next.js/Capacitor/Supabase Auth; el objetivo es Expo/Express/Firebase Auth, con Supabase PostgreSQL. No son equivalentes. Antes de cambiar autenticación: configurar Firebase, verificar tokens en Express, mapear UID a usuario interno, migrar pertenencia y políticas con pruebas de acceso, y retirar el camino anterior en una entrega explícita. No pedir contraseñas previas ni crear roles a partir de metadatos editables.

La persistencia de sedes está aislada en `modules/restaurants/data/branches.ts` y los contratos puros en `shared/contracts/branches.ts`, para poder reemplazar el adaptador por REST versionada durante la transición. No existe aún un endpoint Express para este bloque.

## Integraciones necesarias más adelante

- Firebase: proyecto e ID, configuración pública de app y credenciales de servidor guardadas de forma privada, nunca en el chat.
- Cloudinary: cuenta y configuración de carga firmada en backend, cuando se aborde fotos.
- Mapbox: token y verificación de compatibilidad con la versión de Expo/Android elegida.
- IA: opcional; búsqueda convencional debe continuar funcionando sin proveedor.

Ninguna de esas APIs es necesaria para guardar las sedes de este bloque. No se instaló ni probó un build Expo; el Android actual sigue en Capacitor.

## Verificación de esta entrega (2026-09-26)

- 21 pruebas automatizadas aprobadas y compilación de producción completada.
- `tests/branches-rls.sql` ejecutado en Supabase: 21 sedes de un propietario, aislamiento de otro usuario, rechazo de publicación desde cliente y dirección inválida. La transacción revierte sus datos de prueba.
- Adaptadores reales de la app comprobados con la cuenta autorizada: dos sedes privadas, reintento con el mismo ID sin duplicados y persistencia después de cerrar e iniciar sesión. Las sedes «Sede de prueba Centro» y «Sede de prueba Norte» se conservaron como borradores con dirección explícitamente pendiente.
- Esta verificación de persistencia usa los módulos y el SDK; no equivale a una prueba visual ni a una instalación Android.
