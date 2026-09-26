# AntojosGo — especificación y reglas de desarrollo

## Producto
App móvil Android que ayuda a decidir dónde comer a partir de solicitudes como «quiero comida típica», «algo dulce» o «sushi cerca». Interpreta la intención, usa la ubicación con permiso del usuario, busca SOLO restaurantes registrados en AntojosGo y presenta opciones con una explicación útil.

Inicio del MVP: Quetzaltenango (Xela). Diseñar datos, API y geolocalización para incorporar otras ciudades y departamentos de Guatemala sin rehacer la arquitectura. No asumir que ya existen restaurantes o cobertura nacional.

## Alcance del MVP
**Comensal:** registro/inicio de sesión con Firebase Auth (Google y correo); mapa con ubicación y marcadores de restaurantes registrados; búsqueda por texto y voz; filtros por comida, ingredientes, precio, distancia, horario y opciones alimentarias cuando esos datos existan; tarjetas con nombre, fotos, distancia, tiempo estimado si se puede calcular, rango de precio, calificación y razón de la recomendación; ficha del restaurante, sedes, horarios, menú/platillos, favoritos, restaurantes no deseados, botón «Sorpréndeme», perfil y ajustes básicos de accesibilidad.

**Restaurante:** registro del negocio y sus sedes; dirección y coordenadas de cada sede; horarios, fotos, categorías, etiquetas, menú/platillos y precios; consulta y respuesta a reseñas; panel de administración con roles para varios integrantes. Separar claramente datos del negocio y de cada sede. Una cadena puede tener varias sedes.

**No incluir:** reservas, pedidos, delivery ni restaurantes obtenidos de Google Maps u otros catálogos externos. El mapa muestra únicamente sedes registradas y aprobadas dentro de AntojosGo.

## Recomendaciones
Flujo: texto/voz → intención estructurada → filtros verificables → consulta geográfica a sedes activas → ordenamiento → explicación. La IA interpreta la solicitud; la base de datos decide qué restaurantes cumplen los filtros. Nunca inventar restaurantes, platos, precios, horarios, valoraciones ni disponibilidad.

El resultado debe distinguir entre datos confirmados y estimaciones. Si falta un precio, menú, horario, calificación o tiempo de viaje, mostrar «Sin información» o una indicación apropiada; no fabricar el valor. Explicar por qué se recomienda una opción usando atributos que realmente estén registrados. Ofrecer una alternativa útil cuando no haya resultados y permitir ampliar distancia o quitar filtros. «Sorpréndeme» elige entre opciones válidas según los filtros y exclusiones del usuario.

Priorizar resultados relevantes y próximos sin dejar que restaurantes sin datos completos aparenten cumplir filtros que no pueden verificarse. Definir y documentar cómo se calcula el ordenamiento. Evitar enviar coordenadas precisas o datos personales al modelo si la tarea puede resolverse con atributos generales.

## Tecnologías acordadas
- App: Expo + React Native + TypeScript, expo-router y navegación compatible con la versión de Expo instalada.
- Backend preferido: Node.js + Express + TypeScript.
- Datos: Supabase PostgreSQL; usar PostGIS para búsqueda por distancia cuando esté disponible.
- Autenticación: Firebase Auth; el backend verifica el ID token en cada ruta protegida y relaciona el UID con el usuario interno.
- Imágenes: Cloudinary, con carga gestionada de forma segura por el backend.
- Mapas: Mapbox como preferencia, sujeto a compatibilidad real con Expo y la compilación Android. Mantener el proveedor de mapas aislado para poder sustituirlo.
- IA: proveedor configurable; OpenAI es la primera opción, pero la app debe funcionar con búsqueda y filtros convencionales si la API no tiene crédito, falla o está desactivada.
- Comunicación: API REST versionada. Variables de entorno separadas para desarrollo y producción.

Las versiones de Expo, React Native, Firebase y librerías deben ser compatibles ENTRE SÍ. Revisar `package.json`, lockfile y documentación de la versión instalada antes de cambiar dependencias. No mezclar código o contratos de un backend FastAPI/MongoDB anterior con el backend Node/PostgreSQL sin una migración explícita.

## Modelo mínimo de datos
Usuarios y preferencias; negocios; sedes (con ubicación, estado y horarios); miembros del negocio con rol; categorías/etiquetas; platos y menú; fotos; reseñas y respuestas; favoritos; exclusiones del usuario. Definir claves foráneas, índices, restricciones y estados. Los resultados públicos incluyen solo negocios/sedes publicados y activos. Cada sede tiene su propia dirección, coordenadas y horarios. Preparar identificadores estables para crecimiento nacional; no fijar Xela en el código o en los contratos.

## API y seguridad
Definir contratos compartidos entre app y backend antes de conectar pantallas: autenticación/perfil, negocios, sedes, búsqueda, recomendaciones, favoritos, exclusiones, menú, imágenes y reseñas. Validar entradas y autorizar cada operación por propietario, sede y rol. No confiar en IDs ni roles enviados por el cliente. No exponer claves privadas de Firebase, Supabase, Cloudinary o IA en la app. Limitar tamaño y tipo de imágenes; validar coordenadas, precios y horarios. Aplicar paginación a listados y consultas geográficas. Manejar errores con códigos y mensajes coherentes.

El backend debe verificar Firebase y operar con permisos seguros sobre PostgreSQL. Revisar políticas de acceso de Supabase si la app consulta tablas directamente; preferir que los datos protegidos pasen por el backend. Implementar protección básica contra abuso y registrar errores sin guardar tokens o datos sensibles.

## Experiencia y funcionamiento
Solicitar ubicación cuando aporte valor y permitir buscar por municipio o zona si el usuario la niega. Manejar permisos denegados, GPS desactivado, red lenta, API caída, cero resultados y datos incompletos. Mostrar carga, error y reintento claros. Accesibilidad: tamaños de texto, contraste, etiquetas para lectores de pantalla y controles fáciles de pulsar. El mapa y la lista deben representar los mismos resultados. No usar `localhost` como URL de backend en builds Android instalables; configurar una URL accesible según entorno.

## Orden de implementación
1. Inspeccionar el repositorio real; identificar qué funciona, qué es prototipo y qué backend está conectado. No declarar funcionalidades terminadas solo porque existe una pantalla.
2. Fijar versiones compatibles, estructura, `.env.example`, contratos API y modelo de datos/migraciones.
3. Hacer funcional el recorrido esencial con datos reales o de prueba claramente identificados: autenticación → ubicación o municipio → búsqueda → resultados → detalle.
4. Implementar alta y administración de negocio/sedes/menú con permisos.
5. Completar favoritos, exclusiones, reseñas y «Sorpréndeme».
6. Añadir interpretación IA como mejora de la búsqueda; conservar funcionamiento sin IA.
7. Completar imágenes, accesibilidad, rendimiento, manejo de errores y compilación Android.
8. Probar en dispositivo/emulador y generar build de prueba. Documentar despliegue del backend, configuración y pasos para añadir nuevos territorios.

## Verificación obligatoria
Probar contratos app/backend; verificación real de tokens; permisos de roles; consulta de sedes por ubicación y filtros; búsqueda sin GPS; horario y precios ausentes; negocios inactivos; cero resultados; fallo de IA y de red; carga de imágenes; varias sedes por negocio; paginación; y build Android instalado. Confirmar que la URL del backend funciona desde el teléfono, no solo desde la computadora.

Antes de declarar listo el MVP, comprobar tablas y migraciones reales en Supabase, configuración efectiva de Cloudinary, endpoints Node, autenticación, mapa, búsqueda y flujo completo en Android. Registrar lo que esté simulado o pendiente.

## Instrucciones para Codex
Trabaja sobre el código existente. Antes de editar, lee únicamente los archivos relevantes y resume en pocas líneas el estado de la función solicitada. Mantén un solo contrato API y una sola fuente de verdad para tipos y configuración. Corrige la causa de los errores; no añadas parches duplicados ni soluciones paralelas. No cambies librerías, arquitectura o servicios sin explicar la incompatibilidad concreta. No inventes endpoints, tablas, variables o credenciales: comprueba que existen o créalos con su migración y documentación.

Implementa por partes pequeñas y funcionales. Después de cada cambio, ejecuta las verificaciones pertinentes y corrige los fallos que introdujiste. Evita pruebas que solo repitan la implementación. No afirmes que funciona en Android sin probar el build y el recorrido afectado. Al responder, usa este formato breve: «Hecho / Verificado / Pendiente o bloqueo». No vuelvas a copiar esta especificación en tus respuestas.