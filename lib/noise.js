/**
 * Noise figure, noise factor and noise temperature, including the Friis
 * cascade for a receive chain.
 *
 * Stage order matters: the first stage dominates, which is why a low-noise
 * amplifier sits before the mixer.
 */

function requireFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`)
  }
}

/** Reference temperature used to convert between noise figure and temperature. */
export const T0_KELVIN = 290

/** Noise factor F -> noise figure NF = 10·log10(F). */
export function noiseFigureDb(noiseFactor) {
  if (!(noiseFactor > 0)) throw new Error('noiseFactor must be greater than 0')
  return 10 * Math.log10(noiseFactor)
}

/** Noise figure NF -> noise factor F = 10^(NF/10). */
export function noiseFactor(noiseFigure) {
  requireFinite(noiseFigure, 'noiseFigure')
  return 10 ** (noiseFigure / 10)
}

/** Equivalent noise temperature: Te = T0·(F - 1). */
export function noiseTemperatureK(noiseFigure) {
  return T0_KELVIN * (noiseFactor(noiseFigure) - 1)
}

/**
 * Friis cascade:
 * F = F1 + (F2-1)/G1 + (F3-1)/(G1·G2) + …
 *
 * @param {Array<{gainDb: number, noiseFigureDb: number}>} stages - in signal order.
 */
export function cascadeNoiseFigure(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('stages must be a non-empty array')
  }

  let totalFactor = 0
  let gainSoFar = 1

  stages.forEach((stage, index) => {
    const { gainDb = 0, noiseFigureDb: stageNoiseFigureDb } = stage
    requireFinite(gainDb, `stages[${index}].gainDb`)
    requireFinite(stageNoiseFigureDb, `stages[${index}].noiseFigureDb`)

    const stageFactor = noiseFactor(stageNoiseFigureDb)
    if (index === 0) {
      totalFactor += stageFactor
    } else {
      totalFactor += (stageFactor - 1) / gainSoFar
    }
    gainSoFar *= 10 ** (gainDb / 10)
  })

  const totalGainDb = stages.reduce((sum, stage) => sum + (stage.gainDb ?? 0), 0)
  return {
    noiseFactor: totalFactor,
    noiseFigureDb: noiseFigureDb(totalFactor),
    noiseTemperatureK: T0_KELVIN * (totalFactor - 1),
    totalGainDb,
  }
}
