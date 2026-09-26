# Desbloquear registro y pruebas

Actualización: ya existe una cuenta sintética de restaurante creada mediante SQL administrativo y verificada con Auth/Data API reales. No se necesitó cambiar el registro público. El script Admin API descrito abajo sigue requiriendo clave administrativa; no fue la vía usada para esta prueba. Ver AUTH.md para los resultados. La observación de 0 cuentas que sigue es histórica, anterior a esta creación.

El 14 de septiembre se verificaron 0 cuentas en Auth. El registro devuelve `over_email_send_rate_limit`. Esto no mide capacidad de usuarios concurrentes y no confirma qué SMTP está activo.

## Registro público

1. Abrir https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/smtp y revisar proveedor configurado.
2. Configurar SMTP transaccional con dominio y remitente verificados. Introducir secretos en Supabase, nunca en variables públicas del frontend.
3. Revisar https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/rate-limits y acordar cuotas de registro/correo según volumen y capacidad del proveedor. Mantener controles de abuso y confirmación.
4. Al restablecer el cupo, probar registro, recepción, confirmación y acceso con un buzón autorizado. No repetir registros continuamente para comprobar el cupo.

El conector actual no expone configuración Auth/SMTP. Pendientes: proveedor, dominio y acceso a configuración. Documentación: https://supabase.com/docs/guides/auth/auth-smtp

## Cuenta de prueba independiente del correo

El script administrativo usa `auth.admin.createUser` con `email_confirm: true` exclusivamente para una identidad sintética en `example.invalid`. No cambia ajustes generales ni otorga roles administrativos. No modifica cuentas existentes. Esta cuenta sirve para probar componentes; no verifica envío de correos.

Configurar una clave privada `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` en el archivo ignorado `.env.local`, sin prefijo `NEXT_PUBLIC`. No compartir la clave en el chat. Ejecutar localmente:

```powershell
node --env-file=.env.local scripts/create-test-account.cjs
```

Cada ejecución crea una cuenta distinta, imprime una contraseña aleatoria solo en esa terminal y verifica inicio y cierre de sesión con la clave pública. No ejecutar repetidamente. Guardar credenciales fuera del repositorio; retirar cuentas de prueba antes del lanzamiento mediante el administrador de Auth.

Estado: script preparado; no se ha creado la cuenta porque no hay clave administrativa disponible.
