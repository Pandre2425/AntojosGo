# Probar AntojosGo en Android Studio

**Ruta actual de desarrollo: Expo.** Usa `npm.cmd run mobile:android`; instrucciones y alcance en [EXPO-ANDROID.md](EXPO-ANDROID.md). Los comandos Capacitor de este documento corresponden al cliente anterior y no abren Expo Go.

## Flujo reproducible Windows

- `npm.cmd run android:doctor`: comprueba Java, SDK y lista dispositivos.
- Mantén el servidor en el puerto 3000: `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000` (o el servidor de producción local ya iniciado).
- `npm.cmd run android:build:dev`: sincroniza y compila APK para emulador.
- `npm.cmd run android:install:dev`: compila e instala en un emulador conectado.
- Para teléfono por USB: `npm.cmd run android:install:dev -- -Target usb`. Autoriza la depuración USB en el teléfono. El script usa `adb reverse` y la URL 127.0.0.1 para acceder a la computadora sin abrir el servidor a la red. Si hay varios dispositivos, añade `-Serial IDENTIFICADOR`.

Se prioriza el JDK incluido en Android Studio (21); JAVA_HOME se usa como alternativa. El SDK se toma de ANDROID_HOME o de la ubicacion habitual en Windows. No se cambian variables globales. El script se detiene al fallar sincronización, compilación o instalación; no borra datos para resolver conflictos de firma.

El APK sigue siendo de desarrollo, dependiente de la computadora. Las tareas release rechazan configuración con servidor de desarrollo; quitar esa URL no convierte la pantalla local de instrucciones en una app completa. La migración Expo y el despliegue del backend siguen pendientes.

En desarrollo la confirmación de correo está desactivada por decisión del usuario: el registro puede abrir sesión directamente. La sección histórica de confirmación aplica al futuro entorno con SMTP.

### Recorrido Android pendiente de certificar

Entrar → restaurante → sedes → seleccionar ubicación → mover mapa/pin → guardar → cerrar/reabrir → comprobar punto. Revisar teclado, botón Atrás, rotación, pérdida de red y persistencia. La compilación o instalación del APK por sí solas no certifican este recorrido.

### Resultado de esta entrega

- Compilación `assembleDebug` aprobada con JDK 21.0.7. Se corrigió la selección de JAVA_HOME que apuntaba a Java 17.
- `android:doctor` ejecutado correctamente.
- APK instalado con éxito en Medium_Phone_API_36.1, serial emulator-5554, mediante `android:install:dev`.
- Petición HTTP generada dentro del emulador hacia `10.0.2.2:3000/welcome`: `200 OK`. La primera prueba mediante stdin de ADB produjo una petición malformada; se corrigió generándola dentro de Android.
- `:app:verifyReleaseServer` rechazó intencionalmente la URL de desarrollo. Este fallo esperado confirma el control, no es un fallo del APK debug.
- Pendiente interacción visual de registro, sedes y mapa; no se declara certificado el recorrido completo. La instalación por teléfono USB está preparada pero no probada con hardware físico.

## Preparar y ejecutar

En PowerShell, desde la raíz del proyecto:

```powershell
pnpm.cmd install --frozen-lockfile
npm.cmd run dev -- --hostname 127.0.0.1
```

Dejar esa terminal abierta. En otra:

```powershell
npm.cmd run android:sync:dev
npm.cmd run android:open
```

También puedes abrir la carpeta `android` directamente con Android Studio. Selecciona el JDK incluido en Android Studio (21), espera la sincronización Gradle, elige el emulador y ejecuta `app` con Run.

El emulador usa `10.0.2.2` para acceder a la computadora anfitriona. La web debe responder en el puerto 3000. Si el servidor elige otro puerto porque está ocupado, liberar el 3000 o ajustar el script de sincronización. Este flujo está configurado para el emulador, no para un teléfono físico por Wi-Fi.

## Compilar desde PowerShell

```powershell
$env:JAVA_HOME = 'C:/Program Files/Android/Android Studio/jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA/Android/Sdk"
.\android\gradlew.bat -p android assembleDebug --console=plain
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

`npm.cmd run android:sync` elimina la URL de desarrollo y copia la pantalla local de instrucciones. No genera una versión completa sin servidor. Ejecutar nuevamente `android:sync:dev` para recuperar la prueba conectada a Next.js. HTTP se usa únicamente para el servidor local de pruebas.

## Recorrido de prueba

1. Abrir la app: aparecen cliente y restaurante.
2. Elegir restaurante y pulsar `No tengo cuenta · Registrarme`.
3. Registrar nombre personal, correo y contraseña; confirmar el correo recibido.
4. Volver a la app e iniciar sesión con correo y contraseña.
5. Registrar el nombre comercial y comprobar que aparece después de volver a entrar.
6. Cerrar sesión y entrar con otra cuenta: no debe ver los negocios de la anterior.
7. Elegir cliente y comprobar que el catálogo de ejemplo continúa disponible.

La confirmación por correo requiere conexión y configuración de Supabase. El retorno automático al Android WebView por enlace todavía está pendiente: después de confirmar, volver manualmente a la app e iniciar sesión. El perfil comercial completo y el menú conectado son la siguiente etapa. Ver [alcance y pruebas de autenticación](AUTH.md).
