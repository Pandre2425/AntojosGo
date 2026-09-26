# Ubicación por sede

Leaflet 1.9.4, con tipos 1.9.21 fijados en package.json y pnpm-lock.yaml. Se eligió para la app Next.js/Capacitor existente: biblioteca pequeña, independiente del proveedor y compatible con interacción táctil. No constituye una implementación nativa Expo. Al migrar la interfaz se reemplazará el componente; las coordenadas y contratos se conservan.

Ruta: restaurante → Sedes → Seleccionar ubicación. El mapa se importa sin SSR y bajo demanda. El usuario mueve el mapa debajo de un pin fijo cuya punta marca el centro, acerca para ajustar la entrada y pulsa Confirmar y guardar ubicacion. Tambien puede tocar el mapa para centrar el pin en ese punto. Las coordenadas manuales quedan en una opcion secundaria. La vista inicial de Guatemala no guarda una ubicación predeterminada. No hay geocodificación, búsqueda de direcciones, GPS ni solicitud de permisos en esta entrega.

Las coordenadas se guardan juntas en restaurant_branches. La migración branch_owner_location_update permite actualizar únicamente esas dos columnas adicionales. Se conservan RLS de propietario, validación de rangos y restricción de par completo. No habilita publicación ni modificación de la pertenencia al negocio. El contrato descarta campos extra. El adaptador exige una fila devuelta para evitar anunciar éxito cuando RLS bloquea la escritura.

El mapa tiene atribución visible de OpenStreetMap y utiliza caché HTTP del navegador; no realiza descarga masiva, precarga offline ni consultas al catálogo de restaurantes de OSM. Referrer-Policy permite enviar origen. NEXT_PUBLIC_MAP_TILE_URL permite cambiar el servidor al compilar; si se cambia, revisar también atribución y máximo zoom. Para cambiar proveedor sin actualizar una app distribuida se requerirá configuración remota validada. Antes del lanzamiento nacional hay que elegir proveedor con capacidad adecuada y verificar las cabeceras del WebView. El servicio público OSM no tiene SLA.

Si fallan imágenes del mapa se muestra aviso. El formulario permite guardar coordenadas conocidas. Un límite de errores envuelve únicamente el mapa. Se bloquean envíos repetidos y se conservan valores tras un error. La dirección escrita sigue disponible.

## Verificado

- 22 pruebas automatizadas aprobadas; compilación de producción correcta.
- SQL transaccional: escritura de ubicaciones en 21 sedes, rechazo de latitud inválida y par incompleto, aislamiento entre propietarios. Datos de la prueba revertidos.
- Adaptador real: guardar punto de prueba, cerrar/iniciar sesión y recuperar coordenadas. Se restauró la ubicación original; no se dejaron puntos ficticios.
- No se verificó interacción visual ni APK: herramienta de navegador sin superficies disponibles.

## Fuentes

- https://leafletjs.com/examples/quick-start/
- https://leafletjs.com/reference
- https://operations.osmfoundation.org/policies/tiles/
