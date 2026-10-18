import test from 'node:test'
import assert from 'node:assert/strict'
import { cascadeNoiseFigure, noiseFigureDb, noiseTemperatureK } from '../lib/noise.js'

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`)

test('a single stage returns its own noise figure and gain', () => {
  const result = cascadeNoiseFigure([{ gainDb: 20, noiseFigureDb: 2 }])
  close(result.noiseFigureDb, 2, 1e-9)
  close(result.totalGainDb, 20, 1e-9)
  close(result.noiseFactor, 10 ** 0.2, 1e-9)
})

test('a later stage is diluted by the gain in front of it', () => {
  const result = cascadeNoiseFigure([
    { gainDb: 20, noiseFigureDb: 2 },
    { gainDb: 0, noiseFigureDb: 6 },
  ])
  close(result.noiseFigureDb, 2.08, 0.01)
  close(result.totalGainDb, 20, 1e-9)
})

test('ordering changes the cascade result', () => {
  const goodFirst = cascadeNoiseFigure([
    { gainDb: 20, noiseFigureDb: 2 },
    { gainDb: 0, noiseFigureDb: 6 },
  ]).noiseFigureDb
  const badFirst = cascadeNoiseFigure([
    { gainDb: 0, noiseFigureDb: 6 },
    { gainDb: 20, noiseFigureDb: 2 },
  ]).noiseFigureDb
  assert.ok(badFirst > goodFirst)
})

test('noise temperature follows Te = T0·(F-1)', () => {
  close(noiseTemperatureK(0), 0, 1e-9)
  close(noiseTemperatureK(3), 290 * (10 ** 0.3 - 1), 1e-6)
})

test('zero noise figure is 0 dB', () => {
  close(noiseFigureDb(1), 0, 1e-12)
})

test('an empty chain is rejected', () => {
  assert.throws(() => cascadeNoiseFigure([]), /non-empty array/)
})
