/**
 * Free-space path loss, EIRP and the received-power chain.
 *
 * All powers are dBm, all gains and losses are dB, frequencies are Hz and
 * distances are metres. Power in dB is only additive when every term uses the
 * same reference, which is why the functions below never guess units.
 */

export const SPEED_OF_LIGHT = 299_792_458

/** Noise floor reference: k·T0 at 290 K expressed in dBm/Hz. */
export const THERMAL_NOISE_DBM_PER_HZ = -173.98

function requirePositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than 0`)
  }
}

function requireFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`)
  }
}

/**
 * Free-space path loss in dB: 20·log10(4·π·d·f / c).
 * Independent of antenna gain; the gains belong to EIRP and the receiver.
 */
export function pathLossDb(frequencyHz, distanceM) {
  requirePositive(frequencyHz, 'frequencyHz')
  requirePositive(distanceM, 'distanceM')
  return 20 * Math.log10((4 * Math.PI * distanceM * frequencyHz) / SPEED_OF_LIGHT)
}

/** Effective isotropic radiated power: P + G - cable loss. */
export function eirpDbm({ txPowerDbm, txAntennaGainDbi = 0, cableLossDb = 0 }) {
  requireFinite(txPowerDbm, 'txPowerDbm')
  requireFinite(txAntennaGainDbi, 'txAntennaGainDbi')
  requireFinite(cableLossDb, 'cableLossDb')
  return txPowerDbm + txAntennaGainDbi - cableLossDb
}

/** Thermal noise power in a bandwidth: -173.98 dBm/Hz + 10·log10(B) + NF. */
export function noiseFloorDbm(bandwidthHz, noiseFigureDb = 0) {
  requirePositive(bandwidthHz, 'bandwidthHz')
  requireFinite(noiseFigureDb, 'noiseFigureDb')
  return THERMAL_NOISE_DBM_PER_HZ + 10 * Math.log10(bandwidthHz) + noiseFigureDb
}

/**
 * Complete one-way link budget.
 * Noise-derived fields are only returned when `bandwidthHz` is supplied, and
 * the link margin only when `rxSensitivityDbm` is supplied.
 */
export function linkBudget(input) {
  const {
    txPowerDbm,
    txAntennaGainDbi = 0,
    cableLossDb = 0,
    frequencyHz,
    distanceM,
    rxAntennaGainDbi = 0,
    additionalLossDb = 0,
    bandwidthHz,
    noiseFigureDb = 0,
    rxSensitivityDbm,
  } = input

  const eirp = eirpDbm({ txPowerDbm, txAntennaGainDbi, cableLossDb })
  const pathLoss = pathLossDb(frequencyHz, distanceM)
  const receivedPowerDbm = eirp + rxAntennaGainDbi - pathLoss - additionalLossDb

  const result = {
    eirpDbm: eirp,
    pathLossDb: pathLoss,
    receivedPowerDbm,
  }

  if (bandwidthHz !== undefined) {
    const noiseFloor = noiseFloorDbm(bandwidthHz, noiseFigureDb)
    result.noiseFloorDbm = noiseFloor
    result.snrDb = receivedPowerDbm - noiseFloor
  }

  if (rxSensitivityDbm !== undefined) {
    requireFinite(rxSensitivityDbm, 'rxSensitivityDbm')
    result.linkMarginDb = receivedPowerDbm - rxSensitivityDbm
  }

  return result
}

/**
 * Distance at which the received power equals a target level, from
 * FSPL = EIRP + G_rx - L_extra - P_rx and d = c/(4·π·f) · 10^(FSPL/20).
 */
export function maxRangeM({ eirpDbm, rxPowerDbm, frequencyHz, rxAntennaGainDbi = 0, additionalLossDb = 0 }) {
  requireFinite(eirpDbm, 'eirpDbm')
  requireFinite(rxPowerDbm, 'rxPowerDbm')
  requirePositive(frequencyHz, 'frequencyHz')

  const allowedPathLoss = eirpDbm + rxAntennaGainDbi - additionalLossDb - rxPowerDbm
  return (SPEED_OF_LIGHT / (4 * Math.PI * frequencyHz)) * 10 ** (allowedPathLoss / 20)
}
