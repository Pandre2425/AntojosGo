# Cliente Android en Expo

El cliente nativo vive en `mobile/`. La raíz conserva Next.js y `android/` conserva el shell Capacitor anterior. Son rutas diferentes: para abrir este bloque en Expo Go usar `npm.cmd run mobile:android`, no `android:install:dev`.

## Arranque

1. Instalar dependencias: `pnpm.cmd --dir mobile --ignore-workspace install --frozen-lockfile`.
2. Configurar `mobile/.env.local` a partir de `mobile/.env.example`, únicamente con URL y clave pública de Supabase. Nunca copiar service_role ni credenciales de administración. La máquina actual ya tiene la configuración pública preparada.
3. Abrir el emulador en Android Studio.
4. En la raíz: `npm.cmd run mobile:android`. Metro sirve el proyecto en el puerto 8081; Expo CLI configura el acceso al host por ADB. El comando prioriza IPv4 para evitar que Metro escuche en `::1` mientras Android intenta acceder a `127.0.0.1`. La administración accede directamente a Supabase; el catálogo requiere además Next.js en el puerto 3000 y `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` en el emulador.
5. Expo Go abre **AntojosGo Expo**. Usar las cuentas existentes: la base de datos y los IDs no cambiaron.

## Alcance de esta migración

Pantallas nativas: registro/inicio/cierre de sesión, restaurantes propios, crear negocio, editar nombre/descripción, lista paginada y creación de sedes, selección de ubicación moviendo el mapa debajo de un pin y guardado. Hay pantallas iniciales de catálogo, búsqueda y detalle; su publicación y permisos públicos siguen pendientes. Horarios, menú, fotos y favoritos también están pendientes. El MVP no está completo.

Los contratos y adaptadores de `shared/` y `modules/` son comunes. Metro selecciona `lib/supabase/client.native.ts`, que usa sesión persistida con Expo SecureStore, bloqueo de operaciones de autenticación y renovación al volver al primer plano. Next.js conserva su adaptador web. RLS y validaciones de base de datos permanecen vigentes. Esta entrega todavía accede directamente a Supabase con la clave pública: la API Express versionada sigue pendiente.

Actualizado el 28 de septiembre de 2026 a Expo 57.0.25, React Native 0.86.3 y React 19.2.3, junto con Expo Go 57.0.9 en el emulador. Dependencias compatibles verificadas con Expo CLI; versiones fijadas y lockfile propio en mobile.

## Mapas

Leaflet usa DOM y no sirve como componente React Native. El cliente nativo utiliza react-native-maps 1.27.2 compatible con SDK 57. En Expo Go no necesita una clave propia para probar; un APK independiente con Google Maps necesita configurar Maps SDK for Android y una clave restringida por paquete y certificado. No se consultan restaurantes de Google. El catálogo permite solicitar GPS explícitamente, con tiempo de espera limitado; el editor de sede guarda el punto seleccionado por el restaurante. No hay geocodificación.

La exportación `mobile:export` produce JavaScript/Hermes y recursos Android, **no un APK**. No confundir con el APK Capacitor anterior. Para distribuir Expo se necesita un development build o compilación nativa independiente y completar configuración de mapas.

## Comprobaciones

- `npm.cmd run mobile:typecheck`
- `npm.cmd run mobile:export`
- Dentro de mobile: `node node_modules/expo/bin/cli install --check`
- Regresión web: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`.

Durante la migración se corrigieron un alias de React que interfería con Metro, versiones de expo-constants/expo-crypto y vigilancia excesiva de archivos de Next.js. Metro solo observa mobile y las carpetas compartidas; no vigila `.next`.

Recorrido a certificar en dispositivo: acceso, recuperación de sesión al reabrir, crear/editar negocio, crear sede, mover pin, guardar, volver a abrir y verificar punto; cuenta ajena sin acceso; errores de red recuperables. Compilar y revisar logs no reemplaza esta prueba visual.

Verificación del 28 de septiembre: 24 pruebas unitarias y 6 pruebas smoke pasan; compilación Next.js, tipos móviles y exportación Android correctas. Acceso real a Supabase y lectura de negocio/sedes correctos. El emulador solicitó y ejecutó el bundle de desarrollo (1533 módulos). Queda pendiente certificar visualmente el recorrido completo; no equivale a una prueba de carga nacional ni a un APK independiente.

Fuentes: https://docs.expo.dev/versions/latest/sdk/map-view/ y https://supabase.com/docs/guides/auth/quickstarts/react-native.
