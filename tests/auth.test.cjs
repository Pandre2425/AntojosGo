const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { loginSchema, registrationSchema, authErrorMessage } = require('../lib/auth-validation.ts')
const { businessProfileSchema } = require('../lib/business-profile-validation.ts')
const { branchInputSchema } = require('../shared/contracts/branches.ts')
const { branchLocationSchema } = require('../shared/contracts/branches.ts')
test('location requires a finite pair and accepts world coordinates including zero', () => {
  for (const point of [{ latitude: 0, longitude: 0 }, { latitude: -90, longitude: 180 }, { latitude: 14.84, longitude: -91.52 }]) assert.equal(branchLocationSchema.safeParse(point).success, true)
  for (const point of [{ latitude: null, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: NaN, longitude: 0 }, { latitude: 0, longitude: Infinity }, { latitude: 1 }]) assert.equal(branchLocationSchema.safeParse(point).success, false)
  assert.deepEqual(branchLocationSchema.parse({ latitude: 0, longitude: 0, status: 'published', restaurant_id: 'other' }), { latitude: 0, longitude: 0 })
})

test('branch contract accepts different territories and strips publication/ownership claims', () => {
  const input = { name: ' Centro ', department: 'Alta Verapaz', municipality: 'Coban', address: 'Zona 1, centro', status: 'published', restaurant_id: 'forged' }
  const result = branchInputSchema.parse(input)
  assert.equal(result.name, 'Centro')
  assert.equal(result.municipality, 'Coban')
  assert.equal(result.status, undefined)
  assert.equal(result.restaurant_id, undefined)
  assert.equal(branchInputSchema.safeParse({ ...input, municipality: '' }).success, false)
  assert.equal(branchInputSchema.safeParse({ ...input, address: 'a'.repeat(301) }).success, false)
})

test('business profile validates boundaries and excludes ownership fields', () => {
  const parsed = businessProfileSchema.parse({ name: ' Restaurante ', description: ' Comida casera ', auth_owner_id: 'forged' })
  assert.deepEqual(parsed, { name: 'Restaurante', description: 'Comida casera' })
  assert.equal(businessProfileSchema.safeParse({ name: ' ', description: '' }).success, false)
  assert.equal(businessProfileSchema.safeParse({ name: 'Restaurante', description: 'a'.repeat(2001) }).success, false)
  assert.equal(businessProfileSchema.safeParse({ name: 'Restaurante', description: '' }).success, true)
})

test('registration requires a personal name, valid email and matching long passwords', () => {
  const valid = { name: 'Ana Lopez', email: ' ANA@example.com ', password: 'Una frase larga 123', confirmPassword: 'Una frase larga 123' }
  assert.equal(registrationSchema.parse(valid).email, 'ana@example.com')
  assert.equal(registrationSchema.safeParse({ ...valid, name: ' ' }).success, false)
  assert.equal(registrationSchema.safeParse({ ...valid, email: 'invalid' }).success, false)
  assert.equal(registrationSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' }).success, false)
  assert.equal(registrationSchema.safeParse({ ...valid, confirmPassword: 'does not match' }).success, false)
  assert.equal(registrationSchema.safeParse({ ...valid, password: 'Test.pass12', confirmPassword: 'Test.pass12' }).success, true)
  assert.equal(registrationSchema.safeParse({ ...valid, password: 'Test.1234', confirmPassword: 'Test.1234' }).success, false)
})
test('login preserves password whitespace and does not apply new-account length restrictions', () => {
  assert.equal(loginSchema.parse({ email: 'ana@example.com', password: ' pass ' }).password, ' pass ')
})
test('auth errors are understandable and never reveal raw provider details', () => {
  assert.match(authErrorMessage({ code: 'over_email_send_rate_limit', status: 429 }), /límite de correos de confirmación/)
  assert.match(authErrorMessage({ code: 'email_address_not_authorized' }), /configurar el envío/)
  assert.match(authErrorMessage({ code: 'email_address_invalid' }), /Revisa el correo/)
  assert.match(authErrorMessage({ status: 500 }), /servicio de cuentas/)
  assert.match(authErrorMessage({ name: 'AuthRetryableFetchError' }), /conectar/)
  assert.doesNotThrow(() => authErrorMessage(null))
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /Confirma/)
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /incorrectos/)
  assert.ok(!authErrorMessage({ message: 'sensitive internal details' }).includes('sensitive'))
})
