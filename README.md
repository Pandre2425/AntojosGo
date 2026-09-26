# AntojosGo

## Android y alcance del proyecto

**Etapa actual:** [registro, acceso y propietarios reales con Supabase Auth](docs/AUTH.md). El portal `/restaurant` usa cuentas reales y permite registrar el nombre del negocio. El demo comercial previo se conserva en código; su editor y menú aún no forman parte del nuevo recorrido conectado.

- [Ejecutar en Android Studio](docs/ANDROID.md)
- [Plan de clientes y restaurantes](docs/PROJECT-PLAN.md)

Entrada de ambas experiencias: http://localhost:3000/welcome.
El portal de restaurantes usa Supabase para registrar cuentas y guardar negocios. El catálogo del cliente sigue usando datos de ejemplo.
El proyecto Android de esta etapa carga la web desde el servidor de desarrollo; todavía no es una app completa sin servidor.

## Ejecutar en Windows (PowerShell)

Las dependencias actuales usan pnpm-lock.yaml. Para instalarlas: `pnpm.cmd install --frozen-lockfile`.

- Desarrollo: `npm.cmd run dev`
- Comprobar tipos: `npm.cmd run typecheck`
- Pruebas automatizadas: `npm.cmd test`
- Compilar: `npm.cmd run build`
- Servir la compilación: `npm.cmd start`

Abrir http://localhost:3000. Los ejecutables `.cmd` evitan el bloqueo de scripts de PowerShell.

## Sin APIs

No se requieren credenciales para arrancar el catálogo de ejemplo. La búsqueda, las fichas y las recomendaciones usan datos de demostración en esta etapa. El asistente usa reglas locales. El registro y acceso de clientes y propietarios usan Supabase Auth. El administrador anterior sigue siendo una demostración y no concede permisos reales.

Para conectar Supabase, copiar `.env.example` a `.env.local`, completar las variables y reiniciar. No subir credenciales al repositorio.
