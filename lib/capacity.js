/**
 * Channel capacity.
 *
 * Shannon capacity is an upper bound: it assumes ideal coding and a
 * band-limited AWGN channel, so real systems sit below it.
 */

/** Shannon capacity in bit/s for a bandwidth and an SNR in dB. */
export function shannonCapacity(bandwidthHz, snrDb) {
  if (typeof bandwidthHz !== 'number' || !Number.isFinite(bandwidthHz) || bandwidthHz <= 0) {
    throw new Error('bandwidthHz must be a finite number greater than 0')
  }
  if (typeof snrDb !== 'number' || !Number.isFinite(snrDb)) {
    throw new Error('snrDb must be a finite number')
  }

  const snrLinear = 10 ** (snrDb / 10)
  const spectralEfficiency = Math.log2(1 + snrLinear)
  const capacityBps = bandwidthHz * spectralEfficiency

  return {
    snrLinear,
    spectralEfficiencyBpsHz: spectralEfficiency,
    capacityBps,
    capacityMbps: capacityBps / 1e6,
  }
}
