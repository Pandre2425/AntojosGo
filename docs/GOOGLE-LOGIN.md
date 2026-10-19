# Iniciar sesión con Google

El código ya está listo en la web y en la app. El botón «Continuar con Google» **solo aparece cuando Google está activado en Supabase**, así nadie ve un botón que falle. Falta la configuración, unos 10 minutos.

## 1. Crear la credencial en Google Cloud

1. Entrar a https://console.cloud.google.com, iniciar sesión con el Gmail del proyecto y crear un proyecto llamado «AntojosGo».
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo: **Externo**.
   - Nombre de la app: `AntojosGo`; correo de asistencia: el Gmail del proyecto; logo opcional.
   - Dominios autorizados: `antojosgo.com` y `supabase.co`.
   - Permisos: deja los básicos (`email`, `profile`, `openid`).
   - Publica la app («Publicar app»). En modo «Prueba» solo entran los correos que agregues como testers.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**. Sirve también para la app Android, porque el inicio pasa por el navegador.
   - Orígenes autorizados de JavaScript: `https://antojosgo.com`.
   - URI de redireccionamiento autorizados: `https://dmskwpquomqcsumaqaej.supabase.co/auth/v1/callback`.
   - Crear. Copia el **ID de cliente** y el **Secreto del cliente**. No los pegues en el chat ni en git.

## 2. Activar Google en Supabase

1. https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/providers → **Google**.
2. Activar **Enable Sign in with Google**, pegar el ID de cliente y el secreto, **Save**.

## 3. Permitir el regreso a la app

En https://supabase.com/dashboard/project/dmskwpquomqcsumaqaej/auth/url-configuration → **Redirect URLs**, agregar:

- `antojosgo://auth` (la app Android).

`https://antojosgo.com/**` ya está.

## 4. Probar

- **Web:** «Mi perfil» → «Iniciar sesión o crear cuenta» → «Continuar con Google».
- **App:** «Mi cuenta» → «Continuar con Google». Se abre una pestaña del navegador y, al aceptar, vuelve a la app con la sesión iniciada.

Una cuenta de Google con el mismo correo que una cuenta existente entra a esa misma cuenta, porque Supabase las une por correo confirmado.

## Cómo funciona (código)

- Web: `components/account-access.tsx` (`signInWithOAuth`, regresa a la misma página).
- App: `mobile/src/google-auth.ts`: `expo-web-browser` abre Google, la sesión vuelve a `antojosgo://auth` y se guarda con `setSession`.
- Ambos consultan `isGoogleEnabled` (`lib/auth-validation.ts`), que lee la configuración pública de Supabase.
