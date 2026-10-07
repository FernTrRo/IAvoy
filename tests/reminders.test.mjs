import test from "node:test"
import assert from "node:assert/strict"
import { parseSpokenDate, durationMinutes, dueAt, acknowledge, completeReminder, localDateInput } from "../src/lib/reminders.ts"

const now = new Date(2026, 8, 24, 23, 30)
const base = { id: "one", text: "Llamar", when: new Date(2026, 8, 25, 10).toISOString(), done: false }

test("fecha hablada conserva mañana al cruzar medianoche", () => {
  assert.equal(localDateInput(parseSpokenDate("mañana a las diez de la mañana", now)), "2026-09-25T10:00")
  assert.equal(localDateInput(parseSpokenDate("dentro de cuarenta y cinco minutos", now)), "2026-09-25T00:15")
})
test("horas habladas: tarde, medianoche y minutos", () => {
  assert.equal(localDateInput(parseSpokenDate("mañana a las tres y media de la tarde", now)), "2026-09-25T15:30")
  assert.equal(localDateInput(parseSpokenDate("mañana a las doce de la madrugada", now)), "2026-09-25T00:00")
  assert.equal(localDateInput(parseSpokenDate("mañana a las 14:45", now)), "2026-09-25T14:45")
})

test("noche desde las seis y madrugada hasta las seis, con medianoche a las doce", () => {
  for (const hour of [6, 7, 8, 9, 10, 11]) {
    const date = parseSpokenDate(`mañana a las ${hour} de la noche`, now)
    assert.equal(date.getHours(), hour + 12)
    assert.equal(date.getDate(), 25)
  }
  for (const period of ["noche", "madrugada"]) {
    assert.equal(localDateInput(parseSpokenDate(`mañana a las doce de la ${period}`, now)), "2026-09-25T00:00")
    assert.equal(localDateInput(parseSpokenDate(`mañana a las doce y media de la ${period}`, now)), "2026-09-25T00:30")
  }
  for (const hour of [1, 2, 3, 4, 5, 6]) assert.equal(parseSpokenDate(`mañana a las ${hour} de la madrugada`, now).getHours(), hour)
  assert.equal(parseSpokenDate("mañana a las doce de la tarde", now).getHours(), 12)
  assert.throws(() => parseSpokenDate("mañana a las tres de la noche", now), /madrugada/)
  assert.throws(() => parseSpokenDate("mañana a las nueve de la madrugada", now), /mañana/)
})
test("no se adivinan horas ambiguas, pasadas, inválidas ni fechas no soportadas", () => {
  for (const phrase of ["mañana a las diez", "hoy a las diez de la mañana", "mañana a las 25:00", "mañana a las 14:75", "el treinta de febrero", "", "mañana a las diez de la mañana y el viernes"]) assert.throws(() => parseSpokenDate(phrase, now), undefined, phrase)
})
test("anticipación y posposición entienden unidades y límites", () => {
  assert.equal(durationMinutes("avísame quince minutos antes"), 15)
  assert.equal(durationMinutes("posponer dos horas"), 120)
  assert.equal(durationMinutes("posponer cero minutos"), null)
  assert.equal(durationMinutes("posponer 20000 minutos"), null)
})
test("aviso anticipado se silencia sin perder el de la hora exacta", () => {
  const r = { ...base, advanceMinutes: 15 }
  const event = new Date(r.when).getTime()
  assert.equal(dueAt(r), event - 900000)
  const early = acknowledge(r, event - 800000)
  assert.equal(dueAt(early), event)
  assert.equal(dueAt(acknowledge(early, event)), Infinity)
})
test("posposición respeta el evento original y cancelación evita disparo", () => {
  const r = { ...base, notified: true, nextAlertAt: new Date(new Date(base.when).getTime() + 600000).toISOString() }
  assert.equal(dueAt(r), new Date(r.nextAlertAt).getTime())
  assert.equal(dueAt({ ...r, cancelled: true }), Infinity)
  assert.equal(dueAt({ ...r, done: true }), Infinity)
})
test("recurrentes avanzan a la siguiente fecha futura con su hora original", () => {
  const r = completeReminder({ ...base, recurrence: "daily" }, new Date(2026, 8, 28, 11))
  assert.equal(localDateInput(new Date(r.when)), "2026-09-29T10:00")
  assert.equal(r.done, false)
  assert.equal(r.notified, false)
  const weekly = completeReminder({ ...base, recurrence: "weekly" }, new Date(2026, 8, 25, 10))
  assert.equal(localDateInput(new Date(weekly.when)), "2026-10-02T10:00")
  assert.equal(completeReminder(base).done, true)
})
test("silenciar o agotar repeticiones no desactiva una recurrencia", () => {
  const daily = { ...base, recurrence: "daily" }
  const result = acknowledge(daily, new Date(base.when).getTime())
  assert.equal(localDateInput(new Date(result.when)), "2026-09-26T10:00")
  assert.equal(result.done, false)
  assert.notEqual(dueAt(result), Infinity)
})
