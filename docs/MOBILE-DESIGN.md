# Adaptación móvil de la previsualización

Referencia: proyecto `Previsualizacion` indicado por el usuario, su tema y captura `capturas/02-inicio-movil.png`. El original se conservó intacto.

Aplicado en AntojosGo:

- Paleta crema, verde oscuro y terracota; tarjetas redondeadas y controles táctiles de al menos 44 px en móvil.
- Inicio «Descubrir» con saludo, tarjeta de antojo y arte vectorial adaptado del componente FoodArt de la referencia a SVG web.
- El formulario del inicio abre la búsqueda existente con la consulta ingresada.
- Navegación inferior: Descubrir, Para ti, Explorar, Favoritos y Mi perfil. Explorar usa catálogo/búsqueda; no simula mapas.
- Contenido limitado a 720 px en pantallas grandes y ancho disponible en móvil. Campos a 16 px para legibilidad y áreas seguras existentes.
- Acceso, bienvenida y panel de restaurantes comparten la nueva paleta y estilo de tarjetas; conservan Supabase Auth y sus operaciones reales.

No se migró a Expo ni se copiaron los accesos simulados de la referencia. El proyecto Android sigue siendo el contenedor Capacitor de desarrollo, conectado al servidor local. `android:sync:dev` sincroniza esa configuración; no empaqueta la aplicación completa sin servidor.

Validación: TypeScript, suite automatizada, compilación web y sincronización Android. La inspección visual del resultado a 360/390/412 px y en emulador queda pendiente: no había navegador conectado. La captura original se inspeccionó como referencia; no se afirma equivalencia visual exacta ni prueba de dispositivo completada.

Para revisar: abrir `/`, escribir «pizza», pulsar «Encontrar mi antojo», abrir una ficha y volver mediante la navegación inferior. Comprobar acceso de restaurante, teclado, scroll, botón Atrás y que el contenido no quede bajo la barra inferior.
