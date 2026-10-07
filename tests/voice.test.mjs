import test from 'node:test'
import assert from 'node:assert/strict'
import { listenOnce, finishListening, stopListening } from '../src/lib/voice.ts'

class Recognition {
  static current
  constructor() { Recognition.current = this }
  start() {}
  stop() { this.stopped = true }
  result(text) { this.onresult({ results: [[{ transcript: text }]] }) }
}
globalThis.window = { SpeechRecognition: Recognition }

test('detener conserva la transcripción final enviada después de stop', async () => {
  const pending = listenOnce()
  const rec = Recognition.current
  assert.equal(rec.interimResults, true)
  rec.result('crear')
  finishListening()
  assert.equal(rec.stopped, true)
  rec.result('crear aviso')
  rec.onend()
  assert.equal(await pending, 'crear aviso')
})
test('detener durante la espera de silencio procesa lo ya escuchado', async () => {
  const pending = listenOnce()
  const rec = Recognition.current
  rec.result('mis guías')
  rec.onend()
  finishListening()
  assert.equal(await pending, 'mis guías')
})
test('cancelar descarta el texto y los resultados tardíos', async () => {
  const pending = listenOnce()
  const rec = Recognition.current
  rec.result('guardar')
  await stopListening()
  rec.result('guardar aviso')
  rec.onend()
  assert.equal(await pending, '')
})
test('detener sin palabras no inventa un comando', async () => {
  const pending = listenOnce()
  finishListening()
  Recognition.current.onend()
  assert.equal(await pending, '')
})
