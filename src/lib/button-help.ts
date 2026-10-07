export function buttonHelp(label: string) {
  const s = label.toLowerCase().trim()
  const rules: [RegExp, string][] = [
    [/micrófono|^detener escucha$|^procesando$/, "Este botón activa el micrófono para que me digas qué necesitas. Si está escuchando, puedes tocarlo para detenerlo."],
    [/^detener$/, "Detiene la lectura en voz alta."],
    [/^escuchar|escucharlo/, "Lee este contenido en voz alta. Puedes volver a tocarlo para detener la lectura."],
    [/^cancelar aviso:|^cancelar aviso$/, "Te pregunta si deseas quitar este aviso. No se elimina hasta que confirmes."],
    [/^sí, cancelar/, "Confirma que quieres cancelar el aviso seleccionado."],
    [/^no, conservar/, "Conserva el aviso y cierra la confirmación."],
    [/^decir un aviso|^crear aviso/, "Abre un aviso nuevo. Puedes decir qué quieres recordar, el día y la hora."],
    [/^mis guías/, "Abre las actividades que puedes aprender paso a paso."],
    [/^ver mis avisos/, "Muestra tus recordatorios para escucharlos, modificarlos o cancelarlos."],
    [/^mi perfil/, "Abre tus datos y los de tu tutor para consultarlos o cambiarlos."],
    [/^guardar/, "Guarda los datos que revisaste en esta pantalla."],
    [/^revisar frase/, "Revisa tu frase y prepara el resumen del aviso antes de guardarlo."],
    [/^modificar/, "Abre este aviso para cambiar su contenido, fecha o frecuencia."],
    [/^listo$/, "Marca este aviso como realizado."],
    [/^más tarde/, "Pospone el aviso para que vuelva a recordártelo después."],
    [/^silenciar/, "Detiene las repeticiones de voz de este aviso."],
    [/^anterior/, "Regresa al paso anterior de esta actividad."],
    [/^ya está|^siguiente/, "Guarda tu avance y muestra el siguiente paso de la actividad."],
    [/^terminé/, "Finaliza esta guía y regresa al inicio."],
    [/^empezar:|^continuar:/, "Abre esta actividad en el paso donde la dejaste."],
    [/^sí, salir/, "Sale de esta pantalla sin guardar los cambios."],
    [/^no, seguir/, "Cierra esta pregunta y te permite continuar editando tu aviso."],
    [/^volver/, "Regresa a la pantalla anterior. Si hay un aviso sin guardar, te pide confirmación."],
    [/^cerrar/, "Cierra esta ventana para regresar a la pantalla anterior."],
    [/^ayuda/, "Abre las indicaciones para usar esta pantalla y contactar a tu tutor."],
    [/tutor/, "Abre la opción para contactar a tu tutor."],
    [/restablecer/, "Reemplaza los avisos actuales por los ejemplos de demostración."],
    [/preguntarme/, "Activa o desactiva la pregunta diaria sobre tus pendientes."],
  ]
  return rules.find(([pattern]) => pattern.test(s))?.[1] ?? `Este botón permite ${label.toLowerCase()}.`
}
