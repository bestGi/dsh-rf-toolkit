import test from 'node:test'
import assert from 'node:assert/strict'
import { shannonCapacity } from '../lib/capacity.js'
import { matchSummary, mismatchLossDb, returnLossFromVswr, vswrFromReturnLoss } from '../lib/match.js'

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`)

test('20 MHz at 10 dB SNR is about 69 Mbit/s', () => {
  const result = shannonCapacity(20e6, 10)
  close(result.capacityMbps, 69.19, 0.02)
  close(result.spectralEfficiencyBpsHz, Math.log2(11), 1e-9)
})

test('capacity is linear in bandwidth', () => {
  const narrow = shannonCapacity(20e6, 10).capacityBps
  const wide = shannonCapacity(40e6, 10).capacityBps
  close(wide / narrow, 2, 1e-9)
})

test('return loss and VSWR agree in both directions', () => {
  close(vswrFromReturnLoss(10), 1.925, 0.001)
  close(returnLossFromVswr(1.925), 10, 0.02)
})

test('a perfect match has zero mismatch loss', () => {
  close(mismatchLossDb(1), 0, 1e-12)
  assert.equal(matchSummary({ vswr: 1 }).returnLossDb, 1000)
})

test('mismatch loss for VSWR 2 is about 0.51 dB', () => {
  close(mismatchLossDb(2), 0.512, 0.002)
})

test('matchSummary accepts exactly one description of the match', () => {
  const fromVswr = matchSummary({ vswr: 2 })
  const fromReturnLoss = matchSummary({ returnLossDb: returnLossFromVswr(2) })
  close(fromVswr.returnLossDb, fromReturnLoss.returnLossDb, 1e-6)
  assert.throws(() => matchSummary({}), /exactly one/)
  assert.throws(() => matchSummary({ vswr: 2, returnLossDb: 10 }), /exactly one/)
  assert.throws(() => matchSummary({ vswr: 0.5 }), /greater than or equal to 1/)
})
