/**
 * dsh-rf-toolkit — RF and link-budget calculators exposed as DSH tools.
 *
 * Every tool is a thin wrapper over the pure functions in `lib/`, which are
 * covered by the test suite. Units are never guessed: powers are dBm, gains
 * and losses are dB, frequencies are Hz, distances are metres.
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { convertLevel } from './lib/levels.js'
import { linkBudget, maxRangeM } from './lib/link.js'
import { cascadeNoiseFigure } from './lib/noise.js'
import { matchSummary } from './lib/match.js'
import { shannonCapacity } from './lib/capacity.js'

export const name = 'rf-toolkit'
export const inject = ['tools']

const format = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : String(value)

function renderLines(title, entries) {
  return [{ type: 'text', text: [title, ...entries.map(([label, value]) => `  ${label}: ${value}`)].join('\n') }]
}

export function apply(ctx) {
  ctx.tools.register(
    defineTool({
      name: 'rf_convert_level',
      description:
        'Convert an RF power level between dBm, dBW, W, mW and dBµV. dBµV depends on the reference resistance, so pass impedanceOhms when the system is not 50 Ω. Use this instead of doing the arithmetic yourself, especially for dBµV.',
      parameters: {
        value: { type: 'number', required: true, description: 'Numeric value in the source unit.' },
        from: {
          type: 'string',
          required: true,
          description: 'Source unit: dBm, dBW, W, mW or dBuV.',
        },
        impedanceOhms: {
          type: 'number',
          description: 'Reference resistance for dBµV conversions. Defaults to 50.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            dBm: { type: 'number', required: true },
            dBW: { type: 'number', required: true },
            W: { type: 'number', required: true },
            mW: { type: 'number', required: true },
            dBuV: { type: 'number', required: true },
          },
        },
        render: (_args, value) =>
          renderLines('RF level', [
            ['dBm', format(value.dBm)],
            ['dBW', format(value.dBW)],
            ['W', format(value.W, 6)],
            ['mW', format(value.mW, 4)],
            ['dBµV', format(value.dBuV)],
          ]),
      },
      async execute(args) {
        return convertLevel(args.value, args.from, args.impedanceOhms ?? 50)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rf_link_budget',
      description:
        'One-way link budget: EIRP, free-space path loss, received power, thermal noise floor, SNR and link margin. Supply bandwidthHz to get the noise floor and SNR, and rxSensitivityDbm to get the margin. Distances are metres and frequencies are Hz, so convert MHz and km before calling.',
      parameters: {
        txPowerDbm: { type: 'number', required: true, description: 'Transmitter output power in dBm.' },
        txAntennaGainDbi: { type: 'number', description: 'Transmit antenna gain in dBi. Defaults to 0.' },
        cableLossDb: { type: 'number', description: 'Cable and connector loss between transmitter and antenna, in dB. Defaults to 0.' },
        frequencyHz: { type: 'number', required: true, description: 'Carrier frequency in Hz (2.4 GHz = 2.4e9).' },
        distanceM: { type: 'number', required: true, description: 'Link distance in metres.' },
        rxAntennaGainDbi: { type: 'number', description: 'Receive antenna gain in dBi. Defaults to 0.' },
        additionalLossDb: { type: 'number', description: 'Extra path loss such as rain, foliage or body loss, in dB. Defaults to 0.' },
        bandwidthHz: { type: 'number', description: 'Receiver noise bandwidth in Hz. Enables the noise floor and SNR outputs.' },
        noiseFigureDb: { type: 'number', description: 'Receiver noise figure in dB. Defaults to 0 (noiseless).' },
        rxSensitivityDbm: { type: 'number', description: 'Receiver sensitivity in dBm. Enables the link margin output.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            eirpDbm: { type: 'number', required: true },
            pathLossDb: { type: 'number', required: true },
            receivedPowerDbm: { type: 'number', required: true },
            noiseFloorDbm: { type: 'number' },
            snrDb: { type: 'number' },
            linkMarginDb: { type: 'number' },
          },
        },
        render: (_args, value) => {
          const entries = [
            ['EIRP', `${format(value.eirpDbm)} dBm`],
            ['Path loss', `${format(value.pathLossDb)} dB`],
            ['Received', `${format(value.receivedPowerDbm)} dBm`],
          ]
          if (value.noiseFloorDbm !== undefined) entries.push(['Noise floor', `${format(value.noiseFloorDbm)} dBm`])
          if (value.snrDb !== undefined) entries.push(['SNR', `${format(value.snrDb)} dB`])
          if (value.linkMarginDb !== undefined) entries.push(['Margin', `${format(value.linkMarginDb)} dB`])
          return renderLines('Link budget', entries)
        },
      },
      async execute(args) {
        return linkBudget(args)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rf_max_range',
      description:
        'Maximum free-space range for a given EIRP and a target received power. Useful for answering how far a link reaches before the signal drops below sensitivity. Returns metres; divide by 1000 for kilometres.',
      parameters: {
        eirpDbm: { type: 'number', required: true, description: 'EIRP in dBm.' },
        rxPowerDbm: { type: 'number', required: true, description: 'Target received power in dBm, usually the receiver sensitivity.' },
        frequencyHz: { type: 'number', required: true, description: 'Carrier frequency in Hz.' },
        rxAntennaGainDbi: { type: 'number', description: 'Receive antenna gain in dBi. Defaults to 0.' },
        additionalLossDb: { type: 'number', description: 'Extra loss in dB. Defaults to 0.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            distanceM: { type: 'number', required: true },
            distanceKm: { type: 'number', required: true },
          },
        },
        render: (_args, value) =>
          renderLines('Maximum range', [
            ['Distance', `${format(value.distanceKm, 3)} km`],
            ['Distance', `${format(value.distanceM, 1)} m`],
          ]),
      },
      async execute(args) {
        const distanceM = maxRangeM(args)
        return { distanceM, distanceKm: distanceM / 1000 }
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rf_cascade_noise',
      description:
        'Cascaded noise figure of a receive chain using the Friis formula, plus total gain and equivalent noise temperature. Stages must be ordered from the antenna input towards the demodulator, because the first stage dominates the result.',
      parameters: {
        stages: {
          type: 'array',
          required: true,
          description: 'Receive chain stages in signal order.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              gainDb: { type: 'number', required: true, description: 'Stage gain in dB; negative for a loss such as a filter or cable.' },
              noiseFigureDb: { type: 'number', required: true, description: 'Stage noise figure in dB.' },
            },
          },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            noiseFigureDb: { type: 'number', required: true },
            noiseFactor: { type: 'number', required: true },
            noiseTemperatureK: { type: 'number', required: true },
            totalGainDb: { type: 'number', required: true },
          },
        },
        render: (_args, value) =>
          renderLines('Cascaded noise', [
            ['Noise figure', `${format(value.noiseFigureDb)} dB`],
            ['Noise factor', format(value.noiseFactor, 4)],
            ['Noise temperature', `${format(value.noiseTemperatureK, 1)} K`],
            ['Total gain', `${format(value.totalGainDb)} dB`],
          ]),
      },
      async execute(args) {
        return cascadeNoiseFigure(args.stages)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rf_shannon_capacity',
      description:
        'Shannon channel capacity C = B·log2(1 + SNR) for a bandwidth and an SNR in dB, with the spectral efficiency. This is an upper bound for an ideal AWGN channel, not a prediction of a real modem throughput.',
      parameters: {
        bandwidthHz: { type: 'number', required: true, description: 'Channel bandwidth in Hz.' },
        snrDb: { type: 'number', required: true, description: 'Signal-to-noise ratio in dB.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            capacityBps: { type: 'number', required: true },
            capacityMbps: { type: 'number', required: true },
            spectralEfficiencyBpsHz: { type: 'number', required: true },
            snrLinear: { type: 'number', required: true },
          },
        },
        render: (_args, value) =>
          renderLines('Shannon capacity', [
            ['Capacity', `${format(value.capacityMbps, 3)} Mbit/s`],
            ['Spectral efficiency', `${format(value.spectralEfficiencyBpsHz, 3)} bit/s/Hz`],
            ['SNR (linear)', format(value.snrLinear, 4)],
          ]),
      },
      async execute(args) {
        return shannonCapacity(args.bandwidthHz, args.snrDb)
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'rf_match',
      description:
        'Convert between VSWR, return loss, reflection coefficient and mismatch loss. Supply exactly one of vswr, returnLossDb or reflectionCoefficient. A perfect match is reported as 1000 dB return loss because the true value is infinite.',
      parameters: {
        vswr: { type: 'number', description: 'Voltage standing wave ratio, 1 or greater.' },
        returnLossDb: { type: 'number', description: 'Return loss in dB, 0 or greater.' },
        reflectionCoefficient: { type: 'number', description: 'Magnitude of the reflection coefficient, in the range [0, 1).' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            vswr: { type: 'number', required: true },
            returnLossDb: { type: 'number', required: true },
            reflectionCoefficient: { type: 'number', required: true },
            mismatchLossDb: { type: 'number', required: true },
          },
        },
        render: (_args, value) =>
          renderLines('Impedance match', [
            ['VSWR', format(value.vswr, 4)],
            ['Return loss', `${format(value.returnLossDb, 2)} dB`],
            ['Reflection coefficient', format(value.reflectionCoefficient, 4)],
            ['Mismatch loss', `${format(value.mismatchLossDb, 4)} dB`],
          ]),
      },
      async execute(args) {
        return matchSummary({
          vswr: args.vswr,
          returnLossDb: args.returnLossDb,
          reflectionCoefficient: args.reflectionCoefficient,
        })
      },
    }),
  )
}
