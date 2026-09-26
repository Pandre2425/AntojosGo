# Correo y seguridad: revisión del 14 de septiembre de 2026

## Decisión propuesta

Recomiendo Resend mediante SMTP para iniciar: su integración documentada con Supabase requiere dominio verificado y clave de envío, sin crear un servicio de correo propio. Amazon SES queda como alternativa si el costo por volumen y la operación en AWS lo justifican. Esta es una recomendación de implementación, no una garantía de entregabilidad.

| Opción | Evaluación |
| --- | --- |
| Resend | Integración directa con Supabase; plan gratuito limitado a 100 correos diarios. Los planes pagados anuncian ausencia de límite diario, pero conservan condiciones de volumen/facturación y capacidad. |
| Amazon SES | Tarifa base a la carta de USD 0.10 por 1000 correos salientes, más datos y extras; requiere configurar identidades, credenciales y capacidad de envío. |
| Correo predeterminado de Supabase | Servicio de pruebas restringido; no es la base de correo para el lanzamiento nacional. |

Fuentes: [Resend y Supabase](https://resend.com/docs/send-with-supabase-smtp), [planes Resend](https://resend.com/pricing), [tarifas SES](https://aws.amazon.com/ses/pricing/), [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Implementación de correo pendiente de configuración externa

1. Registrar/verificar el dominio y un remitente de autenticación separado de marketing. Configurar SPF, DKIM y DMARC según el proveedor.
2. En Supabase SMTP: host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña igual a la clave de envío Resend. Guardar la clave solamente en configuración segura de Supabase.
3. Mantener confirmación de email, desactivar seguimiento de enlaces de autenticación y configurar destinos de retorno permitidos.
4. Ajustar la cuota Auth de Supabase y la del proveedor al volumen acordado. Supabase documenta un límite inicial de 30 nuevos usuarios por hora con SMTP personalizado: cambiar SMTP sin revisar esa cuota puede mantener bloqueos.
5. Activar protección contra bots y monitorizar entregas, rebotes, abuso y costos. No sustituir límites del servidor por un contador frontend.
6. Probar registro y recuperación con buzones autorizados. Antes de lanzamiento, ensayar picos sin enviar correo real masivo.

Referencia adicional: [lista de producción](https://supabase.com/docs/guides/deployment/going-into-prod). No se contrató ni configuró un proveedor: faltan dominio, cuenta y credenciales. El registro público no está corregido hasta verificar entrega y confirmación.

## Seguridad aplicada y verificada

- Contraseñas gestionadas por Supabase Auth con bcrypt. No se añade un segundo hash en el navegador; autenticación y almacenamiento siguen en Auth. [Referencia](https://supabase.com/docs/guides/auth/password-security).
- Consultas de los módulos conectados mediante filtros y objetos del SDK, sin concatenar SQL a partir de entradas del usuario. RLS limita datos por propietario y permisos por columna impiden transferir la propiedad.
- Límite de 2000 caracteres de descripción también en PostgreSQL, para que no pueda eludirse saltando la interfaz.
- Revocados permisos API innecesarios sobre `public.users` legado.
- Las respuestas de error de APIs de restaurante ya no devuelven mensajes internos del backend. Eliminada impresión del error completo en esas rutas.
- Validación UUID antes de consultar la propiedad del restaurante; tiempo máximo por petición en la comprobación de acceso.
- Cabeceras contra interpretación de tipos y carga en marcos, política de referencia y caché privada sin almacenamiento en APIs. Cámara, micrófono y geolocalización permanecen deshabilitados mientras no se implementen.

## Pendientes explícitos

- La auditoría de Supabase señala PostGIS en `public`, objetos geográficos accesibles y funciones `SECURITY DEFINER` heredadas. Su reubicación/restricción necesita una migración separada verificada; no se cambiaron objetos de extensión a ciegas. [Avisos](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
- Activar protección contra contraseñas filtradas y configurar MFA del proveedor, con flujos de recuperación. Estos ajustes no están accesibles con el conector actual. [Contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [MFA](https://supabase.com/docs/guides/auth/auth-mfa).
- CSP compatible con el cliente/Android, controles antiabuso distribuidos, auditoría de dependencias, validación completa de APIs antiguas de menú/imágenes y retirada de administrador demo antes de producción.
- HTTPS de producción, política de sesiones móviles, secretos, restauración y pruebas de carga según EXECUTION-PLAN.md.

Esta revisión cubre mejoras concretas del alcance actual, no certifica que toda la aplicación esté libre de vulnerabilidades.

Resultados: 20 pruebas automatizadas y compilación correctas. Prueba SQL transaccional real aprobada para aislamiento, cambio de propietario prohibido y límite de descripción. Consulta de privilegios confirmó SELECT denegado en usuarios legados a anon/authenticated. La comprobación adicional por HTTP con texto de inyección fue bloqueada por una respuesta de Cloudflare; no se cuenta como validación de inyección a nivel de aplicación. No se eludió ese bloqueo. La segunda auditoría mantiene los pendientes de PostGIS, MFA y contraseñas filtradas descritos arriba.
