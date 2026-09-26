# AntojosGo: clientes y restaurantes

**Plan vigente:** [pasos de ejecución y criterios de aceptación](EXECUTION-PLAN.md). Las secciones siguientes conservan antecedentes; sus descripciones de acceso demo están superadas por AUTH.md.

## Prioridad vigente: avanzar por etapas

La prioridad actual es **registro y acceso**, primero para propietarios de restaurantes y con identidad compartida para clientes. Consulta [el estado de cuentas](AUTH.md), que reemplaza las descripciones de autenticación demo de la primera entrega documentada abajo. Mapas, menú, publicación y otros servicios se trabajan después, sin intentar conectarlos todos a la vez.

La estructura conserva módulos separados, carga bajo demanda y recuperación por sección. Cada restaurante nuevo pertenece a una cuenta verificada mediante Supabase Auth y permisos de base de datos. Escalar a nivel nacional sigue siendo un objetivo que requiere pruebas y configuración de infraestructura, no una capacidad ya certificada.

## Base revisada

La propuesta recuperable en este espacio es el código existente y la conversación: descubrir comida en Guatemala, recomendaciones, búsqueda y filtros, favoritos, reseñas, perfil del cliente; y registro, perfil comercial, menú, personal y métricas del restaurante. No se encontró un documento separado con requisitos anteriores. Este plan organiza esa base y debe ajustarse si existe otra propuesta.

## Primera entrega para probar

- Una app y una pantalla de entrada `/welcome` con dos experiencias.
- Cliente `/`: recomendaciones locales, búsqueda con datos de ejemplo, fichas, favoritos y preferencias como base de interfaz.
- Restaurante `/restaurant`: acceso real pendiente de conexión y acceso explícito a un restaurante demo sin credenciales. Perfil y menú se guardan en localStorage con una clave exclusiva del demo; no escriben en Supabase.
- Administración de plataforma `/admin`: separada del restaurante. Actualmente es una demostración, no un sistema de permisos.
- Android `android/`: proyecto Capacitor 7.6.9, compatible con el Android Studio 2025.1.3 instalado. SDK 35 y JDK 21 incluido en Android Studio.

## Arquitectura de esta prueba

Android WebView -> Next.js local en la computadora -> adaptadores de datos de ejemplo o APIs existentes.

El APK de desarrollo carga `http://10.0.2.2:3000/welcome` en el emulador. Next.js sigue ejecutándose fuera del teléfono: sus rutas `/api` no pueden ejecutarse dentro de un APK. El APK depende del servidor para mostrar la aplicación completa. Sin configuración de desarrollo solo se empaqueta una pantalla de instrucciones en `mobile-shell`.

Para una versión distribuible se debe separar el cliente web empaquetable del backend, definir la URL HTTPS de las APIs, gestionar sesiones móviles y generar los recursos web finales. No basta con copiar `.next` al teléfono ni con activar exportación estática: existen rutas de servidor dinámicas. `server.url` de Capacitor queda reservado a esta prueba local. No publicar el APK debug.

Referencias: [configuración Capacitor](https://capacitorjs.com/docs/config), [entorno Capacitor 7](https://capacitorjs.com/docs/v7/getting-started/environment-setup).

## Siguiente secuencia de trabajo

1. Validar ambos recorridos en Android: selección de experiencia, búsqueda, ficha, panel, edición de perfil y menú, teclado, botón Atrás y persistencia tras cerrar la app.
2. Unificar el modelo de datos. Hay inconsistencias visibles: `reviews` frente a `restaurant_reviews`, `total_reviews` frente a `review_count`, y precio numérico frente a símbolos `$`. Definir un único contrato antes de conectar datos reales.
3. Implementar autenticación real de clientes y restaurantes; membresías propietario/personal; sesiones y autorización en cada API; RLS por propietario. El acceso actual del cliente es simulado, el administrador tiene credenciales demo y las rutas comerciales no validan una sesión de propietario. Es un bloqueo para producción.
4. Conectar el perfil y menú publicados por el restaurante al catálogo que consulta el cliente. El almacenamiento local demo no sincroniza dispositivos ni se publica al catálogo de clientes.
5. Completar favoritos, preferencias y reseñas con persistencia por usuario. Auditar botones todavía sin acción y estados vacíos; eliminar cifras simuladas de las métricas reales.
6. Conectar búsqueda geográfica, imágenes y recomendaciones externas. La IA actual es lógica local; la ubicación y algunas distancias son ejemplos. Añadir permisos móviles solo cuando se implementen esas funciones.
7. Preparar distribución: recursos web empaquetados, API HTTPS, seguridad de sesión, firma, iconos, pruebas de dispositivo, política de privacidad y versión compatible con los requisitos vigentes de Google Play.

Pedidos, pagos y repartidores no se consideran implementados ni parte confirmada de esta primera entrega.

## Criterio de avance

La base sirve para iterar cuando compila la web, compila el APK debug y ambos roles se pueden recorrer sin necesitar credenciales externas. Eso no implica preparación para producción. Las pruebas del demo verifican catálogo, filtros y persistencia de perfil/menú; no verifican Supabase real, pagos ni una API de IA.
