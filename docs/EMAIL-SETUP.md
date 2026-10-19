# Correo: confirmación de cuenta y recuperación de contraseña

## Qué está hecho en el código (12 de octubre de 2026)

- **Registro** (web y app): pide a Supabase que el enlace del correo regrese a `https://antojosgo.com/cuenta?accion=confirmar`. Si la confirmación está activa, el formulario dice «Te enviamos un enlace a …» y vuelve a «Iniciar sesión».
- **«¿Olvidaste tu contraseña?»** (web y app, en «Iniciar sesión»): envía un enlace a `…/cuenta?accion=restablecer`. El mensaje es el mismo exista o no la cuenta, para no revelar qué correos están registrados.
- **«Reenviar confirmación»**: aparece si al iniciar sesión Supabase responde que el correo no está confirmado.
- **Página `/cuenta`** (web): muestra «Correo confirmado», o el formulario «Crea tu contraseña nueva» (mínimo 10 caracteres, con confirmación). Si el enlace venció o ya se usó, lo dice y explica cómo pedir otro.
- Los enlaces se abren en el navegador, también si se pidieron desde la app. Después la persona vuelve a la app e inicia sesión. Esto funciona porque el cliente usa el flujo `implicit`, que no depende del dispositivo que pidió el enlace.
- Código: `lib/auth-validation.ts` (`accountLink`, `sendAccountEmail`, `newPasswordSchema`), `app/cuenta/page.tsx`, `components/account-access.tsx`, `mobile/src/access-form.tsx`.

## Qué falta configurar (solo desde el panel de Supabase)

El correo integrado de Supabase solo envía a los miembros del equipo del proyecto y unos pocos correos por hora. Para usuarios reales hace falta un SMTP propio.

### 1. SMTP con Gmail (sin dominio propio)

1. Crear una cuenta de Gmail para el proyecto (por ejemplo `antojosgo.app@gmail.com`) y activar la verificación en dos pasos.
2. En https://myaccount.google.com/apppasswords crear una «contraseña de aplicación» llamada «Supabase». Son 16 letras y solo se muestran una vez.
3. En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/smtp activar **Enable custom SMTP**:
   - Sender email: el Gmail del proyecto. Sender name: `AntojosGo`.
   - Host `smtp.gmail.com`, puerto `465`, usuario: el Gmail del proyecto, contraseña: la contraseña de aplicación.
4. No guardar esa contraseña en git, Vercel ni el chat.

Límite de Gmail: unos 500 correos al día, suficiente para la tesis. Alternativa sin dominio: Brevo (300 al día, verifica un solo remitente). Resend necesita un dominio propio.

### 2. URLs permitidas

En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/url-configuration:

- Site URL: `https://antojosgo.com`
- Redirect URLs: `https://antojosgo.com/**` y, para pruebas locales, `http://localhost:3001/**`. Con `/**` también se aceptan los enlaces que llevan `?accion=…`; sin eso Supabase manda al Site URL.

Prueba del 16 de octubre: el SMTP envió el correo de recuperación, pero el enlace regresaba a `http://localhost:3000` porque el Site URL seguía con ese valor. Con la sesión del enlace, la página `/cuenta` de producción cambió la contraseña: la nueva entra y la anterior da `invalid_credentials`.

Si falta, el enlace del correo regresa al inicio en lugar de `/cuenta` y no se puede cambiar la contraseña.

### 3. Activar la confirmación

En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/providers → Email: activar **Confirm email**. De paso, poner la longitud mínima de contraseña en 10 y activar la protección contra contraseñas filtradas, si el plan la incluye.

Las cuentas creadas antes quedan como confirmadas; solo las nuevas tienen que confirmar.

### 4. Límites

En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/rate-limits subir «emails per hour» (por ejemplo a 30) una vez activo el SMTP propio.

### 5. Plantillas en español

En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/templates:

**Confirm signup**. Asunto: `Confirma tu cuenta de AntojosGo`

```html
<h2>¡Bienvenido a AntojosGo!</h2>
<p>Toca el botón para confirmar tu correo y activar tu cuenta.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#BD481F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar mi correo</a></p>
<p>Si no creaste una cuenta, ignora este mensaje.</p>
```

**Reset password**. Asunto: `Crea una contraseña nueva para AntojosGo`

```html
<h2>¿Olvidaste tu contraseña?</h2>
<p>Toca el botón para crear una contraseña nueva. El enlace sirve una sola vez y vence en una hora.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#BD481F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Crear contraseña nueva</a></p>
<p>Si no lo pediste, ignora este mensaje: tu contraseña no cambia.</p>
```

### 6. Prueba

Con un correo real: registrarse en la app, abrir el correo, ver «Correo confirmado», iniciar sesión en la app. Luego «¿Olvidaste tu contraseña?», abrir el enlace, guardar una contraseña nueva e iniciar sesión con ella. Revisar también la carpeta de spam.

## Cuenta de prueba independiente del correo

`scripts/create-test-account.cjs` crea una cuenta confirmada en `example.invalid` con `auth.admin.createUser`. Necesita `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (nunca con prefijo `NEXT_PUBLIC`):

```powershell
node --env-file=.env.local scripts/create-test-account.cjs
```

Prueba completa del 16 de octubre, después de corregir el Site URL y activar «Confirm email»: una contraseña de 8 caracteres se rechaza con `weak_password`; el registro no abre sesión; entrar sin confirmar da `email_not_confirmed`; el enlace de confirmación lleva a `/cuenta?accion=confirmar` y muestra «Correo confirmado»; después se puede entrar; el enlace de recuperación lleva a `/cuenta?accion=restablecer`; la contraseña nueva entra y la anterior se rechaza.
