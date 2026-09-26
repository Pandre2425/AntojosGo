# Cliente Android en Expo

El cliente nativo vive en `mobile/`. La raíz conserva Next.js y `android/` conserva el shell Capacitor anterior. Son rutas diferentes: para abrir este bloque en Expo Go usar `npm.cmd run mobile:android`, no `android:install:dev`.

## Arranque

1. Instalar dependencias: `pnpm.cmd --dir mobile --ignore-workspace install --frozen-lockfile`.
2. Configurar `mobile/.env.local` a partir de `mobile/.env.example`, únicamente con URL y clave pública de Supabase. Nunca copiar service_role ni credenciales de administración. La máquina actual ya tiene la configuración pública preparada.
3. Abrir el emulador en Android Studio.
4. En la raíz: `npm.cmd run mobile:android`. Metro sirve el proyecto en el puerto 8081; Expo CLI configura el acceso al host por ADB. No requiere Next.js en el puerto 3000.
5. Expo Go abre **AntojosGo Expo**. Usar las cuentas existentes: la base de datos y los IDs no cambiaron.

## Alcance de esta migración

Pantallas nativas: registro/inicio/cierre de sesión, restaurantes propios, crear negocio, editar nombre/descripción, lista paginada y creación de sedes, selección de ubicación moviendo el mapa debajo de un pin y guardado. No se migró aún el catálogo de clientes ni se declaró completo el MVP. Horarios, menú, fotos, favoritos y publicación siguen pendientes.

Los contratos y adaptadores de `shared/` y `modules/` son comunes. Metro selecciona `lib/supabase/client.native.ts`, que usa sesión persistida con Expo SecureStore, bloqueo de operaciones de autenticación y renovación al volver al primer plano. Next.js conserva su adaptador web. RLS y validaciones de base de datos permanecen vigentes. Esta entrega todavía accede directamente a Supabase con la clave pública: la API Express versionada sigue pendiente.

Se eligió SDK 54 porque Expo Go instalado era 54.0.6. Expo CLI recomienda 54.0.8 para ese SDK. Versiones fijadas y lockfile propio en mobile. SDK 57 de la previsualización no se mezcló con este runtime. Actualizar SDK/Expo Go de forma conjunta en una etapa posterior.

## Mapas

Leaflet usa DOM y no sirve como componente React Native. El cliente nativo utiliza react-native-maps compatible con SDK 54. En Expo Go no necesita una clave propia para probar; un APK independiente con Google Maps necesita configurar Maps SDK for Android y una clave restringida por paquete y certificado. No se consultan restaurantes de Google: solo se modifica el punto de las sedes propias. No hay GPS ni geocodificación en esta entrega.

La exportación `mobile:export` produce JavaScript/Hermes y recursos Android, **no un APK**. No confundir con el APK Capacitor anterior. Para distribuir Expo se necesita un development build o compilación nativa independiente y completar configuración de mapas.

## Comprobaciones

- `npm.cmd run mobile:typecheck`
- `npm.cmd run mobile:export`
- Dentro de mobile: `node node_modules/expo/bin/cli install --check`
- Regresión web: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`.

Durante la migración se corrigieron un alias de React que interfería con Metro, versiones de expo-constants/expo-crypto y vigilancia excesiva de archivos de Next.js. Metro solo observa mobile y las carpetas compartidas; no vigila `.next`.

Recorrido a certificar en dispositivo: acceso, recuperación de sesión al reabrir, crear/editar negocio, crear sede, mover pin, guardar, volver a abrir y verificar punto; cuenta ajena sin acceso; errores de red recuperables. Compilar y revisar logs no reemplaza esta prueba visual.

Fuentes: https://docs.expo.dev/versions/v54.0.0/sdk/map-view/ y https://supabase.com/docs/guides/auth/quickstarts/react-native.
