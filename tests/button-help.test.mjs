import test from 'node:test'
import assert from 'node:assert/strict'
import { buttonHelp } from '../src/lib/button-help.ts'

test('ayudas distinguen controles por icono y acciones de confirmación', () => {
  assert.match(buttonHelp('Cancelar aviso: ir al mercado'), /No se elimina hasta que confirmes/)
  assert.match(buttonHelp('Escuchar aviso: ir al mercado'), /Lee este contenido/)
  assert.match(buttonHelp('Sí, salir'), /sin guardar/)
  assert.match(buttonHelp('No, seguir'), /continuar editando/)
  assert.match(buttonHelp('Activar micrófono'), /activa el micrófono/)
  assert.match(buttonHelp('Anterior'), /paso anterior/)
  assert.match(buttonHelp('Ya está, seguimos'), /siguiente paso/)
})
