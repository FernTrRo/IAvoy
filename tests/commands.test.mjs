import test from 'node:test'
import assert from 'node:assert/strict'
import { parseReminderRequest, isIntent, guideTopic, reminderTarget, reminderConfirmation } from '../src/lib/commands.ts'
const now = new Date(2026,8,28,12)
const local = iso => { const d = new Date(iso); return [d.getDate(),d.getHours(),d.getMinutes()] }
test('mercado: aclaraciones mantienen pendiente y no inventan el día', () => {
  const first = parseReminderRequest('Recuérdame ir al rato al mercado', now)
  assert.equal(first.patch.text, 'Ir al mercado')
  const hour = parseReminderRequest('como a las 2', now, first.context)
  assert.equal(hour.patch.text, undefined)
  assert.equal(hour.patch.when, undefined)
  const period = parseReminderRequest('de la tarde', now, hour.context)
  assert.equal(period.patch.text, undefined)
  assert.equal(period.patch.when, undefined)
  assert.ok(period.questions.some(q => q.includes('día')))
  const day = parseReminderRequest('hoy', now, period.context)
  assert.deepEqual(day.questions, [])
  assert.equal(day.patch.text, undefined)
  assert.deepEqual(local(day.patch.when), [28,14,0])
})
test('día primero y corrección de hora mantienen el contexto', () => {
  const first = parseReminderRequest('Recuérdame ir al mercado mañana', now)
  assert.equal(first.patch.text, 'Ir al mercado')
  const hour = parseReminderRequest('como a las dos', now, first.context)
  const period = parseReminderRequest('de la tarde', now, hour.context)
  assert.deepEqual(local(period.patch.when), [29,14,0])
  const corrected = parseReminderRequest('a las tres de la tarde', now, period.context)
  assert.deepEqual(local(corrected.patch.when), [29,15,0])
  assert.equal(corrected.patch.text, undefined)
})
test('respuestas a guardar son acciones y las negativas no guardan', () => {
  for (const s of ['sí', 'sí, guárdalo', 'sí sí guárdalo', 'sí, guárdalo por favor', 'guardar']) assert.equal(reminderConfirmation(s), 'save', s)
  for (const s of ['no', 'no gracias', 'no lo guardes', 'todavía no', 'quiero cambiar algo']) assert.equal(reminderConfirmation(s), 'change', s)
  for (const s of ['sí pero cambia la hora', 'no quiero guardar', 'ir al mercado']) assert.notEqual(reminderConfirmation(s), 'save', s)
})
test('sinónimos para crear sin activar frases negativas', () => {
  for (const s of ['crear aviso','nuevo aviso','hacer aviso','haz un recordatorio','ponme un aviso','por favor, quiero hacer un aviso','recuérdame llamar mañana']) assert.equal(isIntent(s,'new'),true,s)
  assert.equal(isIntent('no quiero crear aviso','new'), false)
})
test('vocabulario coloquial y acciones con variantes', () => {
  assert.equal(guideTopic('quiero mandar un audio por wasa'),'whatsapp-nota')
  assert.equal(guideTopic('enseñame yutu'),'youtube')
  assert.equal(guideTopic('llamada por video llamada'),'videollamada')
  assert.equal(isIntent('vuelve al paso anterior','back'),true)
  assert.equal(isIntent('otra vez','repeat'),true)
  assert.equal(isIntent('luego sigo','pause'),true)
  assert.deepEqual(reminderTarget('quita el recordatorio de llamar a Ana'), {action:'cancel',name:'llamar a ana'})
})
test('una frase aporta tarea, fecha, hora y recurrencia', () => {
  const r=parseReminderRequest('Recuérdame llamar a mi hija mañana a las diez de la mañana todos los días',now)
  assert.deepEqual(r.questions,[])
  assert.equal(r.patch.text,'Llamar a mi hija')
  assert.equal(r.patch.recurrence,'daily')
  assert.deepEqual(local(r.patch.when),[29,10,0])
})
test('recurrencia antes de la hora y próxima fecha diaria', () => {
  const r=parseReminderRequest('hacer un aviso para tomar agua todos los días a las ocho de la mañana',now)
  assert.equal(r.patch.text,'Tomar agua'); assert.deepEqual(local(r.patch.when),[29,8,0])
})
test('anticipación se extrae sin confundirla con hora o tarea', () => {
  const r=parseReminderRequest('recuérdame llamar al médico mañana a las diez de la mañana y avísame quince minutos antes',now)
  assert.deepEqual(r.questions,[]); assert.equal(r.patch.advanceMinutes,15); assert.equal(r.patch.text,'Llamar al medico')
  assert.deepEqual(local(r.patch.when),[29,10,0])
})
test('relativo y frecuencia única', () => {
  const r=parseReminderRequest('Llamar a mi hija dentro de cinco minutos una sola vez',now)
  assert.deepEqual(local(r.patch.when),[28,12,5]); assert.equal(r.patch.recurrence,'once'); assert.equal(r.patch.text,'Llamar a mi hija')
})
test('aclaración AM/PM conserva tarea sin inventar la hora', () => {
  const r=parseReminderRequest('Recuérdame llamar a Ana mañana a las diez',now)
  assert.equal(r.patch.when,undefined); assert.equal(r.patch.text,'Llamar a ana'); assert.ok(r.questions[0].includes('tarde'))
  const clarified=parseReminderRequest('Recuérdame llamar a Ana mañana a las diez de la tarde',now)
  assert.deepEqual(local(clarified.patch.when),[29,22,0])
})
test('día al final y corrección solo de fecha conservan significado', () => {
  const r=parseReminderRequest('Llamar a Ana a las diez de la tarde mañana',now)
  assert.deepEqual(r.questions,[]); assert.deepEqual(local(r.patch.when),[29,22,0]); assert.equal(r.patch.text,'Llamar a ana')
  const date=parseReminderRequest('mañana a las diez de la mañana',now)
  assert.equal(date.patch.text,undefined)
})
test('fechas y calendarios no soportados requieren aclaración', () => {
  for(const phrase of ['Llamar mañana a las 25:00','Llamar el viernes a las diez de la mañana','Llamar a las diez de la tarde']) {
    assert.ok(parseReminderRequest(phrase,now).questions.length,phrase)
  }
})
