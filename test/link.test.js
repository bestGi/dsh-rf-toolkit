import test from 'node:test'
import assert from 'node:assert/strict'
import { linkBudget, maxRangeM, noiseFloorDbm, pathLossDb } from '../lib/link.js'

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`)

test('2.4 GHz over 1 km is about 100 dB of path loss', () => {
  close(pathLossDb(2.4e9, 1000), 100.05, 0.02)
})

test('path loss grows 6 dB per doubling of distance', () => {
  const near = pathLossDb(5.8e9, 100)
  const far = pathLossDb(5.8e9, 200)
  close(far - near, 6.02, 0.02)
})

test('link budget adds EIRP, gains and losses consistently', () => {
  const result = linkBudget({
    txPowerDbm: 20,
    txAntennaGainDbi: 6,
    cableLossDb: 1,
    frequencyHz: 2.4e9,
    distanceM: 1000,
  })
  close(result.eirpDbm, 25)
  close(result.pathLossDb, 100.05, 0.02)
  close(result.receivedPowerDbm, -75.05, 0.02)
  assert.equal(result.noiseFloorDbm, undefined)
})

test('noise floor and SNR appear only when a bandwidth is supplied', () => {
  const result = linkBudget({
    txPowerDbm: 20,
    txAntennaGainDbi: 6,
    cableLossDb: 1,
    frequencyHz: 2.4e9,
    distanceM: 1000,
    bandwidthHz: 20e6,
    noiseFigureDb: 3,
  })
  close(result.noiseFloorDbm, -97.97, 0.02)
  close(result.snrDb, 22.92, 0.02)
})

test('link margin compares received power with sensitivity', () => {
  const result = linkBudget({
    txPowerDbm: 20,
    frequencyHz: 2.4e9,
    distanceM: 100,
    rxSensitivityDbm: -90,
  })
  close(result.linkMarginDb, result.receivedPowerDbm + 90, 1e-9)
})

test('noise floor scales with 10·log10 of bandwidth', () => {
  close(noiseFloorDbm(20e6, 0), -173.98 + 10 * Math.log10(20e6), 0.01)
  close(noiseFloorDbm(20e6, 3) - noiseFloorDbm(20e6, 0), 3, 1e-9)
})

test('maximum range matches the distance used to build the budget', () => {
  const distanceM = maxRangeM({ eirpDbm: 25, rxPowerDbm: -75.05, frequencyHz: 2.4e9 })
  close(distanceM, 1000, 2)
})

test('invalid geometry and frequencies are rejected', () => {
  assert.throws(() => pathLossDb(0, 1000), /frequencyHz/)
  assert.throws(() => pathLossDb(2.4e9, 0), /distanceM/)
})
