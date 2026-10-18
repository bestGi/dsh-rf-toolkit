import test from 'node:test'
import assert from 'node:assert/strict'
import { convertLevel, dbmToDbuV, dbuVToDbm, wattsToDbm } from '../lib/levels.js'

const close = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`)

test('30 dBm is one watt', () => {
  close(convertLevel(30, 'dBm').W, 1)
  close(convertLevel(30, 'dBm').mW, 1000)
})

test('0 dBm is 106.99 dBµV across 50 ohms', () => {
  close(dbmToDbuV(0, 50), 106.99, 0.01)
})

test('dBµV round-trips through dBm', () => {
  close(dbuVToDbm(dbmToDbuV(-73, 50), 50), -73)
  close(dbmToDbuV(0, 75), 0 + 90 + 10 * Math.log10(75))
})

test('watts convert to the expected dBm', () => {
  close(wattsToDbm(1), 30)
  close(wattsToDbm(0.001), 0)
})

test('unit aliases are accepted', () => {
  close(convertLevel(0, 'dbm').dBm, 0)
  close(convertLevel(1, 'W').dBm, 30)
})

test('unknown units and non-positive linear values are rejected', () => {
  assert.throws(() => convertLevel(1, 'dBf'), /unknown level unit/)
  assert.throws(() => convertLevel(0, 'W'), /greater than 0/)
})
