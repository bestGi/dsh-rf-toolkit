/**
 * Impedance match conversions: VSWR, return loss, reflection coefficient and
 * mismatch loss all describe the same reflection, so any one determines the rest.
 */

/** Reflection coefficient magnitude from a return loss in dB. */
export function gammaFromReturnLoss(returnLossDb) {
  if (typeof returnLossDb !== 'number' || !Number.isFinite(returnLossDb) || returnLossDb < 0) {
    throw new Error('returnLossDb must be a finite number greater than or equal to 0')
  }
  return 10 ** (-returnLossDb / 20)
}

/** VSWR from a return loss: VSWR = (1+|Γ|)/(1-|Γ|). */
export function vswrFromReturnLoss(returnLossDb) {
  const gamma = gammaFromReturnLoss(returnLossDb)
  return (1 + gamma) / (1 - gamma)
}

/** Return loss in dB from a VSWR. A perfect match (VSWR = 1) is reported as 1000 dB. */
export function returnLossFromVswr(vswr) {
  if (typeof vswr !== 'number' || !Number.isFinite(vswr) || vswr < 1) {
    throw new Error('vswr must be a finite number greater than or equal to 1')
  }
  if (vswr === 1) return 1000

  const gamma = (vswr - 1) / (vswr + 1)
  return -20 * Math.log10(gamma)
}

/** Fraction of power lost to mismatch: -10·log10(1 - |Γ|²), in dB. */
export function mismatchLossDb(vswr) {
  if (typeof vswr !== 'number' || !Number.isFinite(vswr) || vswr < 1) {
    throw new Error('vswr must be a finite number greater than or equal to 1')
  }
  const gamma = (vswr - 1) / (vswr + 1)
  return -10 * Math.log10(1 - gamma ** 2)
}

/**
 * Describe one impedance match from whichever value the caller has.
 * Supply exactly one of `vswr`, `returnLossDb` or `reflectionCoefficient`.
 */
export function matchSummary({ vswr, returnLossDb, reflectionCoefficient }) {
  const supplied = [vswr, returnLossDb, reflectionCoefficient].filter((value) => value !== undefined)
  if (supplied.length !== 1) {
    throw new Error('supply exactly one of vswr, returnLossDb or reflectionCoefficient')
  }

  let gamma
  if (vswr !== undefined) {
    if (typeof vswr !== 'number' || !Number.isFinite(vswr) || vswr < 1) {
      throw new Error('vswr must be a finite number greater than or equal to 1')
    }
    gamma = (vswr - 1) / (vswr + 1)
  } else if (returnLossDb !== undefined) {
    gamma = gammaFromReturnLoss(returnLossDb)
  } else {
    if (typeof reflectionCoefficient !== 'number' || !Number.isFinite(reflectionCoefficient)) {
      throw new Error('reflectionCoefficient must be a finite number')
    }
    if (reflectionCoefficient < 0 || reflectionCoefficient >= 1) {
      throw new Error('reflectionCoefficient must be in the range [0, 1)')
    }
    gamma = reflectionCoefficient
  }

  return {
    reflectionCoefficient: gamma,
    vswr: (1 + gamma) / (1 - gamma),
    // |Γ| = 0 means a perfect match; the exact return loss is infinite.
    returnLossDb: gamma === 0 ? 1000 : -20 * Math.log10(gamma),
    mismatchLossDb: -10 * Math.log10(1 - gamma ** 2),
  }
}
