import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { displayNameSchema } from '../shared/contracts/names'
import { t, msg } from '../shared/i18n'
export { displayNameSchema } from '../shared/contracts/names'
export const loginSchema = z.object({
  email: z.string().trim().email(t('Escribe un correo válido.')).max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1, t('Escribe tu contraseña.')).max(128),
})
const newPassword = z.string().min(10, t('Usa una contraseña de al menos 10 caracteres.')).max(128, t('Usa hasta 128 caracteres.'))
const same = (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword
const mismatch = { path: ['confirmPassword'], message: msg('Las contraseñas no coinciden.') }
export const registrationSchema = loginSchema.extend({ name: displayNameSchema, password: newPassword, confirmPassword: z.string() }).refine(same, mismatch)
export const newPasswordSchema = z.object({ password: newPassword, confirmPassword: z.string() }).refine(same, mismatch)

/** Web page the email links return to (works from any device, so app users finish there too). */
export const accountLink = (base: string, accion: 'confirmar' | 'restablecer') => `${base.replace(/\/+$/, '')}/cuenta?accion=${accion}`

/** Password reset link or a new confirmation email. Returns the auth error, if any. */
export async function sendAccountEmail(auth: SupabaseClient['auth'], kind: 'reset' | 'resend', email: string, base: string) {
  const { error } = kind === 'reset'
    ? await auth.resetPasswordForEmail(email, { redirectTo: accountLink(base, 'restablecer') })
    : await auth.resend({ type: 'signup', email, options: { emailRedirectTo: accountLink(base, 'confirmar') } })
  return error
}
export const accountEmailSent = (kind: 'reset' | 'resend') => kind === 'reset'
  ? t('Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.')
  : t('Te enviamos otro correo de confirmación. Abre el enlace y después inicia sesión. Revisa también la carpeta de spam.')

export function authErrorMessage(error: { code?: string; message?: string; status?: number; name?: string } | null | undefined): string {
  switch (error?.code) {
    case 'email_address_not_authorized': return t('El servicio de correo de AntojosGo todavía no permite enviar confirmaciones a esta dirección. Debemos configurar el envío de correos para habilitar el registro.')
    case 'email_address_invalid':
    case 'validation_failed': return t('El servicio rechazó los datos del registro. Revisa el correo y los campos del formulario.')
    case 'unexpected_failure': return t('El servicio de cuentas tuvo un error interno. Intenta más tarde. Referencia: unexpected_failure.')
    case 'captcha_failed': return t('No se pudo verificar la protección del formulario. Intenta nuevamente.')
    case 'invalid_credentials': return t('Correo o contraseña incorrectos.')
    case 'email_not_confirmed': return t('Confirma tu correo antes de iniciar sesión.')
    case 'user_already_exists': return t('Revisa tu correo o inicia sesión si ya tienes una cuenta.')
    case 'weak_password': return t('Usa una contraseña más segura, de al menos 10 caracteres.')
    case 'over_email_send_rate_limit': return t('Se alcanzó el límite de correos de confirmación de AntojosGo. El registro no pudo completarse. Espera a que se restablezca el cupo; si persiste, debemos revisar el servicio de envío de correos.')
    case 'over_request_rate_limit': return t('Espera unos minutos antes de volver a intentarlo.')
    case 'signup_disabled': return t('El registro está temporalmente deshabilitado.')
    default:
      if (error?.status === 429) return t('Espera unos minutos antes de volver a intentarlo.')
      if (error?.status && error.status >= 500) return t('El servicio de cuentas no pudo completar la operación. Intenta más tarde o comunícalo a soporte.')
      if (error?.name === 'AuthRetryableFetchError' || error?.name === 'TypeError') return t('No pudimos conectar con el servicio de cuentas. Revisa tu conexión e intenta nuevamente.')
      return t('No pudimos completar la operación. Intenta nuevamente; si continúa, comunica el error a soporte.')
  }
}

/** True when Google sign-in is enabled in Supabase Auth (public settings), so the button never leads to an error page. */
export async function isGoogleEnabled(supabaseUrl: string, publicKey: string): Promise<boolean> {
  try {
    const r = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/settings`, { headers: { apikey: publicKey } })
    return r.ok && (await r.json())?.external?.google === true
  } catch { return false }
}
