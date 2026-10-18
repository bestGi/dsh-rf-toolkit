# dsh-rf-toolkit

RF and link-budget calculators for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), exposed as six tools the agent can call.

Language models are unreliable at RF arithmetic: they mix up dB and linear
units, forget the 30 dB between dBW and dBm, and rarely convert dBµV correctly.
This plugin moves those calculations into tested code, so the model only has to
choose the right tool and supply the numbers.

## Tools

| Tool | Computes |
|---|---|
| `rf_convert_level` | dBm ↔ dBW ↔ W ↔ mW ↔ dBµV, with the reference impedance for voltage levels |
| `rf_link_budget` | EIRP, free-space path loss, received power, noise floor, SNR and link margin |
| `rf_max_range` | Maximum free-space range for a given EIRP and target received power |
| `rf_cascade_noise` | Cascaded noise figure (Friis), total gain and equivalent noise temperature |
| `rf_shannon_capacity` | Shannon capacity and spectral efficiency for a bandwidth and SNR |
| `rf_match` | VSWR ↔ return loss ↔ reflection coefficient ↔ mismatch loss |

Units are never guessed. Powers are dBm, gains and losses are dB, frequencies
are Hz, distances are metres, and bandwidths are Hz.

## Install

### Plugin Manager (recommended)

Open DSH, go to the plugin manager, choose to install a local bundle, and pick
this directory. The manager installs the package and selects the bundle, which
applies `cordis.patch.yml`. The tools appear in the next session in that
profile.

### Command line

```powershell
dsh plugin --profile desktop add link:C:\path\to\dsh-rf-toolkit
```

This adds the dependency to the profile. The bundle still has to be selected:
add `dsh-rf-toolkit` to `dsh.profile.bundles` in
`~/.dsh/profiles/<profile>/package.json`, then restart DSH.

## Example prompts

- `Convert -73 dBm to dBµV at 50 ohms.`
- `2.4 GHz link, 1 km, 20 dBm transmitter, 6 dBi antenna, 1 dB cable loss,
  20 MHz bandwidth, 3 dB noise figure, -90 dBm sensitivity. What is the margin?`
- `A 20 MHz channel at 10 dB SNR: what is the Shannon limit?`
- `LNA 20 dB gain with 2 dB noise figure, then a mixer with 6 dB noise figure.
  What is the cascaded noise figure?`

## Formulas

- Path loss: `20·log10(4πdf / c)`, with `c = 299 792 458 m/s`.
- EIRP: `P_tx + G_tx − L_cable`.
- Received power: `EIRP + G_rx − L_path − L_extra`.
- Thermal noise: `−173.98 dBm/Hz + 10·log10(B) + NF`, from `k·T₀` at 290 K.
- Friis cascade: `F = F₁ + (F₂−1)/G₁ + (F₃−1)/(G₁G₂) + …`.
- Shannon: `C = B·log2(1 + SNR)`.
- dBµV: `dBµV = dBm + 90 + 10·log10(R)`; at 50 Ω that is `+106.99 dB`.
- VSWR: `(1+|Γ|)/(1−|Γ|)`; return loss `−20·log10|Γ|`; mismatch loss
  `−10·log10(1−|Γ|²)`.

All results are closed-form ideal values. A real link also sees multipath,
interference, antenna efficiency and cable loss that varies with frequency, so
treat the numbers as a starting point, not a measurement.

## Development

No dependencies and no build step:

```sh
node --test
```

Layout:

- `lib/` — pure functions, one module per topic, covered by `test/`.
- `index.js` — the six `defineTool` registrations and their output rendering.
- `cordis.patch.yml` — the bundle patch that inserts the plugin row.

## 中文说明

这是一个 DSH 插件，把射频常用计算做成模型可调用的工具：电平换算、链路预算、
最大通信距离、级联噪声系数、香农容量、阻抗匹配。公式都在 `lib/` 里，`test/`
覆盖了 26 个用例。安装后在插件管理器里启用，然后在对话里直接让它算即可。

## License

MIT
