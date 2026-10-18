/**
 * Level conversions for RF work: dBm, dBW, W, mW and dBµV.
 *
 * Voltage levels are referenced to a resistance (50 Ω by default), so the
 * dBµV conversion is only meaningful together with that impedance.
 */

export const LEVEL_UNITS = ['dBm', 'dBW', 'W', 'mW', 'dBuV']

/** Database of unit aliases the model may pass instead of the canonical name. */
const UNIT_ALIASES = new Map([
  ['dbm', 'dBm'],
  ['dbw', 'dBW'],
  ['w', 'W'],
  ['watt', 'W'],
  ['watts', 'W'],
  ['mw', 'mW'],
  ['dbuv', 'dBuV'],
  ['dbµv', 'dBuV'],
  ['dbμv', 'dBuV'],
])

export function normalizeUnit(unit) {
  const normalized = UNIT_ALIASES.get(String(unit).trim().toLowerCase())
  if (!normalized) {
    throw new Error(`unknown level unit "${unit}"; use one of ${LEVEL_UNITS.join(', ')}`)
  }
  return normalized
}

function requirePositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite number greater than 0`)
  }
}

/** dBm -> W. */
export function dbmToWatts(dbm) {
  return 10 ** ((dbm - 30) / 10)
}

/** W -> dBm. */
export function wattsToDbm(watts) {
  requirePositive(watts, 'watts')
  return 10 * Math.log10(watts) + 30
}

/**
 * dBm -> dBµV: dBµV = dBm + 90 + 10·log10(R).
 * At 50 Ω this is the familiar +106.99 dB offset.
 */
export function dbmToDbuV(dbm, ohms = 50) {
  requirePositive(ohms, 'ohms')
  return dbm + 90 + 10 * Math.log10(ohms)
}

/** dBµV -> dBm, the inverse of `dbmToDbuV`. */
export function dbuVToDbm(dbuV, ohms = 50) {
  requirePositive(ohms, 'ohms')
  return dbuV - 90 - 10 * Math.log10(ohms)
}

/**
 * Convert one level into every supported unit.
 * @param {number} value - numeric value in the source unit.
 * @param {string} from - source unit; see `LEVEL_UNITS`.
 * @param {number} [ohms=50] - reference resistance for dBµV.
 */
export function convertLevel(value, from, ohms = 50) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('value must be a finite number')
  }
  requirePositive(ohms, 'ohms')

  const unit = normalizeUnit(from)
  let dbm
  switch (unit) {
    case 'dBm':
      dbm = value
      break
    case 'dBW':
      dbm = value + 30
      break
    case 'W':
      dbm = wattsToDbm(value)
      break
    case 'mW':
      requirePositive(value, 'value in mW')
      dbm = 10 * Math.log10(value)
      break
    case 'dBuV':
      dbm = dbuVToDbm(value, ohms)
      break
    default:
      throw new Error(`unsupported unit: ${unit}`)
  }

  const watts = dbmToWatts(dbm)
  return {
    dBm: dbm,
    dBW: dbm - 30,
    W: watts,
    mW: watts * 1000,
    dBuV: dbmToDbuV(dbm, ohms),
  }
}
