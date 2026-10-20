# Atlántida Ajedrez · Android (prueba 0.1.0)

Aplicación Android híbrida generada con Bubblewrap 1.27.0 y Android Browser Helper 2.7.4. Usa una Trusted Web Activity (TWA) del sitio `https://atlantida-ajedrez.vercel.app/`.

## Qué se comparte con la web

Las pantallas se recuperan de la web publicada. Noticias, torneos, bots, entrenamiento, partidas online y correcciones aparecen al abrir o recargar la app después de publicar en Vercel. No se reconstruye un APK por cada cambio web. La base de Supabase y las cuentas siguen siendo las existentes: no se copian usuarios ni se incluyen claves privadas de Supabase en el paquete.

La interfaz sigue siendo web, renderizada por un navegador compatible dentro de la aplicación Android. No es una reescritura de todas las pantallas con controles nativos. Esto conserva las APIs web utilizadas por el sitio, incluidos motores y archivos PGN. El acceso con Google sigue su flujo web y puede mostrar temporalmente la interfaz del navegador durante la autenticación. Pegasus y Bluetooth necesitan una prueba en un teléfono real compatible; esta versión no sustituye las limitaciones del dispositivo o del navegador.

La app necesita conexión. No se debe cerrar y reabrir durante una partida para obtener una actualización: el reloj sigue corriendo. Los cambios se reciben en la siguiente navegación o apertura normal.

## Qué requiere un APK nuevo

Permisos, identificación del paquete, firma, iconos nativos, accesos directos de Android, versiones del contenedor y nuevas funciones nativas requieren incrementar `versionCode` / `versionName`, recompilar y distribuir una actualización. Un cambio del dominio de la web también requiere revisar y actualizar la configuración Android.

Esta versión es para pruebas, no está publicada en Google Play. Requiere Android 8 o posterior y un navegador compatible actualizado. Cuando no se puede verificar la relación con el sitio o falta soporte TWA, Android puede mostrar una pestaña del navegador como alternativa. No se omite esa comprobación.

## Verificación entre app y sitio

- Paquete: `uy.atlantida.ajedrez`.
- Sitio: `https://atlantida-ajedrez.vercel.app`.
- Declaración pública: `public/.well-known/assetlinks.json`.
- La huella de esa declaración debe coincidir con el certificado que firma el APK.
- Si se publica con Google Play App Signing, habrá que agregar la huella **de firma de Google Play**, manteniendo la del APK si ambos canales siguen vigentes.

Las claves de firma y contraseñas se guardan fuera del repositorio. Conservar una copia privada: no se puede actualizar una instalación existente con una clave distinta. Nunca subirlas a `public/`, al repositorio o al paquete APK.

## Compilar en Windows

1. Instalar JDK 21 y Android SDK con plataforma 36 y build-tools 36.0.0, aceptando la licencia del SDK.
2. Configurar `JAVA_HOME` y `ANDROID_HOME`. Opcional: configurar `GRADLE_USER_HOME` para ubicar la caché de compilación.
3. Configurar `ATLANTIDA_ANDROID_KEYSTORE` (ruta del PKCS12 privado) y `ATLANTIDA_ANDROID_KEY_PASSWORD` en el entorno, sin imprimir el valor ni pasarlo en argumentos.
4. Ejecutar `./mobile/build-android.ps1`. Compila, ejecuta Android Lint, alinea, firma y verifica el APK. Salida: `mobile/dist/` (ignorada por Git).

Los fuentes en `mobile/android` se pueden abrir en Android Studio. El Gradle Wrapper verifica el SHA-256 de su distribución. Las versiones de dependencias Android están fijadas.

## Prueba en teléfono pendiente

- Instalar el APK firmado y verificar la apertura sin barra del navegador con Digital Asset Links válido.
- Entrar con usuario/contraseña y con Google; confirmar que se recupera el usuario existente.
- Abrir entrenamiento y partidas guardadas de la misma cuenta; verificar bots, sonido y PGN.
- Completar una partida online, minimizar, volver y comprobar los relojes.
- Conectar Pegasus desde un teléfono/navegador compatible, si se utiliza allí.
- Volver a abrir después de publicar un cambio web y comprobar que lo recibe.

Documentación: [Android TWA](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities), [guía oficial de Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli).
