# Arquitectura modular de AntojosGo

Decisión: mantener un repositorio y el despliegue actual durante la transición. Separar por responsabilidades antes de crear servidores independientes.

## Estructura vigente

- `app/`: rutas Next.js y composición de pantallas; `app/api/` conserva los endpoints de servidor.
- `components/`: interfaz React. Las pantallas de cuentas y restaurantes consumen módulos de datos.
- `modules/accounts/data/`: persistencia del perfil personal.
- `modules/restaurants/data/`: lectura y escritura de los restaurantes del propietario.
- `shared/contracts/`: tipos y validaciones puros; sin React, Next.js, acceso a red ni credenciales.
- `lib/supabase/client.ts`: integración del cliente con Supabase y límites de espera.
- `lib/server/`: operaciones exclusivas del backend, protegidas con `server-only`.

Los archivos `lib/accounts.ts` y `lib/business-profile-validation.ts` quedan como reexportaciones de compatibilidad. Las pantallas migradas importan desde su módulo o contratos compartidos.

## Flujo actual

Pantalla → módulo de datos → cliente Supabase → Auth/Postgres con RLS.

Las rutas de servidor existentes verifican token y propiedad antes de operar. La propiedad no se concede por metadatos editables del usuario. Las comprobaciones frontend mejoran la experiencia; la autorización definitiva sigue en el backend y las políticas de base de datos.

Esta entrega separa código, no despliegues. No añade un salto de red innecesario para operaciones que ya protege Supabase. No amplía privilegios ni modifica esquema. SMTP sigue siendo una dependencia externa pendiente.

## Reglas para nuevas funcionalidades

1. Definir contrato de entrada/salida y reglas de validación en `shared/contracts`.
2. Ubicar acceso a datos en el módulo correspondiente; no añadir consultas SQL o Supabase dentro de componentes visuales.
3. Ejecutar operaciones con secretos, privilegios o coordinación entre entidades en servidor. Validar allí los contratos; no confiar en datos validados solo por el navegador.
4. Devolver errores comprensibles sin detalles internos; aislar carga, cancelación y recuperación por módulo.
5. Probar contratos, permisos e integración antes de conectar la pantalla al catálogo real.

## Próximos cortes

1. Conciliar el menú antiguo con `foods` antes de extraerlo al módulo de restaurantes.
2. Crear un contrato público separado para catálogo: no reutilizar el registro privado con `auth_owner_id`.
3. Conectar publicación y persistencia de cliente con pruebas de aislamiento.
4. Cuando el cliente Android sea empaquetable, decidir separación física de frontend/backend según necesidades de despliegue, conservando los contratos.

Los módulos antiguos todavía no están migrados por completo. La capacidad nacional depende de pruebas de carga y operación, no de carpetas ni del número de servidores.
