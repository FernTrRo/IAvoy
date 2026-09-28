# IA-Recuerdo

Prototipo de recordatorios hablados y guías paso a paso. React, TypeScript, Vite y Capacitor para Android. Los datos se conservan en este dispositivo; no hay cuentas ni sincronización.

## Ejecutar en tu computadora

1. Instala **Node.js 24 LTS**, que incluye npm: https://nodejs.org/en/download
2. Abre PowerShell en esta carpeta (donde está `package.json`).
3. Ejecuta:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173/ en Chrome o Edge. Mantén abierta la terminal; Ctrl+C detiene el servidor. En macOS/Linux usa `npm` en lugar de `npm.cmd`.

También puedes usar `iniciar.cmd` en Windows después de instalar Node. Instala dependencias solo si faltan y arranca el servidor. Si el puerto 5173 ya está ocupado por esta app, abre la dirección existente. No necesitas iniciar dos servidores.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd`, como en los ejemplos, sin cambiar la política de seguridad. Si no encuentra Node/npm, cierra y abre la terminal después de instalar Node.

Para llevar estos cambios a otra computadora, copia esta carpeta sin `node_modules`, `dist` ni `.git`, e instala con `npm ci`. Los cambios son locales hasta que se publiquen en GitHub; clonar el repositorio remoto antes de publicarlos obtiene la versión anterior.

## Funciones actuales

- Crear y modificar avisos por dictado guiado o controles táctiles; se revisa el resumen antes de guardar.
- Fecha y hora futuras, anticipación opcional y frecuencia única, diaria o semanal.
- Aviso visual dentro de la aplicación y lectura hablada: de 1 a 5 repeticiones, con 30 segundos de pausa después de cada lectura. Tres por defecto.
- Si hay anticipación, se anuncia al comenzar esa anticipación y de nuevo al llegar la hora. Si la app estaba cerrada, el aviso se atiende al volver; no se promete puntualidad en segundo plano.
- Listo, posposición configurable, silenciar y cancelación confirmada. Listo en un aviso recurrente programa la siguiente fecha futura.
- Varias guías con progreso independiente, navegación por voz y pausa. Se mantienen las dos guías de ejemplo originales.
- Perfil local: nombre, tutor y teléfono, modelo de dispositivo, rutina y temas preferidos. Las sugerencias se basan en temas marcados, no en IA.
- Ayuda para llamar al tutor: abre el marcador del teléfono con el contacto configurado.
- Pregunta opcional una vez al día al entrar en inicio.

## Probar la voz

Un único micrófono circular de 96 px permanece fijo en todas las pantallas, incluida la ayuda y los avisos. Gris = apagado, verde = escuchando, ámbar = procesando, coral = error. El texto y el icono también indican el estado. Tócalo para iniciar y otra vez para cancelar la escucha. No escucha permanentemente ni desde otras aplicaciones.

Puedes decir desde inicio: **“Recuérdame llamar a mi hija mañana a las diez de la mañana, todos los días”**. La tarea, fecha, hora y recurrencia se capturan juntas. Revisa el resumen y di **“guardar”**, **“confirma”** o **“así está bien”**. No se guarda automáticamente por el dictado.

También funciona: “hacer un aviso para regar las plantas dentro de cinco minutos”, o “crear un aviso para llamar mañana a las diez de la mañana y avísame quince minutos antes”. La frecuencia por defecto es una sola vez. “Todos los días”, “a diario” y “cada día” son equivalentes; “cada semana” activa frecuencia semanal.

Si dices “a las diez” sin especificar período, pide mañana/tarde/noche; conserva el contenido y acepta “de la tarde” como aclaración. No adivina fechas o recurrencias no soportadas. Puedes escribir la frase en el mismo formulario y usar “Corregir datos a mano” para fechas de calendario y opciones adicionales.

Variantes de comandos:

- Crear: crear aviso, nuevo aviso, hacer aviso, haz un recordatorio, ponme un aviso, recuérdame.
- Navegación: mis avisos, ver pendientes, mis actividades, aprender, mi perfil, volver.
- Avisos: cambiar/editar/modificar seguido de su nombre; quitar/borrar/cancelar seguido del nombre pide confirmación.
- Guías: sigue, siguiente, avanza, ya está; atrás, anterior, vuelve al paso anterior; repite, otra vez, no entendí; más lento; pausar, luego sigo.
- Aviso activo: listo, hecho, ya lo hice; después, más tarde, posponer cinco minutos; silencio, deja de hablar.
- Ayuda: ayuda o ayúdame lee una indicación contextual. En la ventana de ayuda, llamar a mi tutor abre el marcador.
- Nombres: wasa/guasap/wasap se reconocen como WhatsApp; yutu/yutub como YouTube. YouTube se identifica, pero su guía aún no existe; se informa de ello.

El catálogo tiene diseño de cuaderno y cada actividad conserva su avance. Usa el micrófono o toca la actividad completa. No hay botones Hablar en cada pantalla.

La interpretación utiliza reglas y sinónimos, todavía no un modelo de lenguaje. Los ejemplos describen los formatos probados; no se promete comprender cualquier frase. El motor de voz requiere permisos y puede necesitar conexión. Chrome/Edge o el teléfono ofrecen distinta disponibilidad.

## Lo que queda pendiente

- API de generación y comprensión de lenguaje natural, fuentes verificadas y catálogo ampliado (YouTube, tienda, comida, Uber).
- Adaptación efectiva de guías al modelo de teléfono y a la rutina.
- Activación por frase sin tocar y control desde segundo plano mientras se usa otra aplicación.
- Notificaciones nativas con la app cerrada, funcionamiento sin conexión verificado en Android y Alexa.

Los recordatorios actuales requieren la app en ejecución. Las guías son ejemplos locales; el modo exclusivamente en línea corresponde a la futura generación con IA. No se incluyen claves API ni se envía el perfil a un servicio.

## Comprobar cambios

```powershell
npm.cmd test
npm.cmd run build
```

Las pruebas cubren sinónimos, nombres coloquiales, frases completas, fechas ambiguas o inválidas, medianoche, anticipación, posposición y recurrencia. La compilación web no sustituye pruebas de micrófono y voz en un teléfono.

## Android

Instala Android Studio y los requisitos de Capacitor 8: https://capacitorjs.com/docs/getting-started/environment-setup

```powershell
npm.cmd run android
```

Este comando compila, sincroniza y abre Android Studio. Selecciona un teléfono/emulador y ejecuta Run. Después de cambios web: `npm.cmd run cap:sync` y vuelve a ejecutar en Android Studio. El nombre mostrado es IA-Recuerdo y se conserva `mx.iarecuerdo.app` para no cambiar la identidad de la aplicación instalada.

## Organización

- `src/lib/reminders.ts`: fechas y programación de avisos.
- `src/lib/voice.ts`: síntesis y reconocimiento.
- `src/components/voice-command.tsx`: interacción de voz por frase.
- `src/screens/`: inicio, avisos, guías y perfil.
- `src/data/demo.ts`: ejemplos y tipos.
- `tests/`: pruebas de lógica de recordatorios.
