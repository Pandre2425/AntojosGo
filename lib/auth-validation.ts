import { z } from 'zod'

import { displayNameSchema } from '../shared/contracts/names'
export { displayNameSchema } from '../shared/contracts/names'
export const loginSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido.').max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Escribe tu contraseña.').max(128),
})
export const registrationSchema = loginSchema.extend({
  name: displayNameSchema,
  password: z.string().min(10, 'Usa una contraseña de al menos 10 caracteres.').max(128, 'Usa hasta 128 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden.' })

export function authErrorMessage(error: { code?: string; message?: string; status?: number; name?: string } | null | undefined): string {
  switch (error?.code) {
    case 'email_address_not_authorized': return 'El servicio de correo de AntojosGo todavía no permite enviar confirmaciones a esta dirección. Debemos configurar el envío de correos para habilitar el registro.'
    case 'email_address_invalid':
    case 'validation_failed': return 'El servicio rechazó los datos del registro. Revisa el correo y los campos del formulario.'
    case 'unexpected_failure': return 'El servicio de cuentas tuvo un error interno. Intenta más tarde. Referencia: unexpected_failure.'
    case 'captcha_failed': return 'No se pudo verificar la protección del formulario. Intenta nuevamente.'
    case 'invalid_credentials': return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed': return 'Confirma tu correo antes de iniciar sesión.'
    case 'user_already_exists': return 'Revisa tu correo o inicia sesión si ya tienes una cuenta.'
    case 'weak_password': return 'Usa una contraseña más segura, de al menos 10 caracteres.'
    case 'over_email_send_rate_limit': return 'Se alcanzó el límite de correos de confirmación de AntojosGo. El registro no pudo completarse. Espera a que se restablezca el cupo; si persiste, debemos revisar el servicio de envío de correos.'
    case 'over_request_rate_limit': return 'Espera unos minutos antes de volver a intentarlo.'
    case 'signup_disabled': return 'El registro está temporalmente deshabilitado.'
    default:
      if (error?.status === 429) return 'Espera unos minutos antes de volver a intentarlo.'
      if (error?.status && error.status >= 500) return 'El servicio de cuentas no pudo completar la operación. Intenta más tarde o comunícalo a soporte.'
      if (error?.name === 'AuthRetryableFetchError' || error?.name === 'TypeError') return 'No pudimos conectar con el servicio de cuentas. Revisa tu conexión e intenta nuevamente.'
      return 'No pudimos completar la operación. Intenta nuevamente; si continúa, comunica el error a soporte.'
  }
}
