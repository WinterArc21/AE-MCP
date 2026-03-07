# Color Palettes — AE-MCP Design Reference

## Critical Rules
- **Never use pure black `#000000`** — use `#0B0B0F` (cool cast, reduces harshness)
- **Never use pure white `#FFFFFF` on dark** — use `#F9FAFB` or `#E5E7EB` (warmer)
- Near-black for neon: `#0A0A0F` — subtle cool cast amplifies neon vibrancy
- Contrast minimum: **4.5:1 AA** for normal text, **7:1 AAA** for critical text
- Gradient magic angle: **135°** (most dynamic, most used in UI/motion)
- Accent color: occupies **10–15% of screen area** maximum

---

## Palette 1: Corporate Dark

### Standard Corporate Dark Stack
| Role | Hex | Notes |
|---|---|---|
| Background | `#0B0B0F` | Near-black, cool blue cast |
| Surface (cards) | `#111827` | Slightly lifted |
| Surface elevated | `#1E293B` | Modals, hover |
| Border / Divider | `#2D3748` | Subtle separators |
| Primary text | `#F9FAFB` | Warm white |
| Secondary text | `#94A3B8` | Muted cool gray |
| Accent blue | `#3B82F6` | Standard tech blue |
| Accent indigo | `#6366F1` | Modern SaaS |

### Tech Dark + Electric Accent (high energy)
| Role | Hex |
|---|---|
| Background | `#020617` |
| Surface | `#111827` |
| Accent gradient | `#1E40AF` → `#38BDF8` |
| Highlight | `#F9FAFB` |

### Corporate Slate Orchid (modern SaaS 2024–2026)
| Role | Hex |
|---|---|
| Base | `#0F172A` / `#1E293B` |
| Deep violet accent | `#4C1D95` |
| Indigo pop | `#6366F1` |
| Text | `#E5E7EB` |

---

## Palette 2: Warm / Cinematic

### Golden Hour (optimistic, cinematic)
| Role | Hex |
|---|---|
| Deep shadow | `#9A3E2E` |
| Midtone warm | `#E76F51` |
| Golden highlight | `#F4A261` |
| Bright key | `#FFD166` |
| Background fill | `#FFF7E6` |

### Saffron Sunset (festival, dramatic)
`#FFB000` / `#FF7A00` / `#E84A27` / `#8C1D40` / `#FFF1D6`

### Copper Velvet Luxe (luxury, cinematic trailers)
`#F7E2D2` → `#E2B89A` → `#C8845F` → `#9C5A3C` → `#4B2A23`

### Ember Spice (bold, album cover level)
`#9B2226` / `#BB3E03` / `#CA6702` / `#EE9B00` / `#FFF3B0`

### Cinnamon Noir Contrast (moody, fashion)
| Role | Hex |
|---|---|
| Highlight | `#F4D2B2` |
| Midtone | `#D98C6A` |
| Shadow warm | `#B35B46` |
| Deep | `#7B2F34` |
| Near-black | `#141018` |

---

## Palette 3: Neon / Cyberpunk

**Rule:** Background must stay `#0A0A0F`–`#111111`. Never above `#1A1A1A` for neon palettes.

### Cyber Pop (music, gaming, events)
| Role | Hex |
|---|---|
| Base | `#0A0A0F` |
| Neon Magenta | `#FF2DAA` |
| Electric Violet | `#7B2CFF` |
| Cyan | `#00A3FF` |
| Mint | `#00FFD5` |

### Laser Lagoon (sci-fi, app onboarding)
| Role | Hex |
|---|---|
| Base | `#0B1020` |
| Cyan | `#00FFD5` |
| Blue | `#00A3FF` |
| Neon Lime | `#39FF14` |
| Violet | `#B026FF` |

### Ultraviolet Punch (nightlife, EDM)
`#B026FF` / `#FF2DAA` / `#00FFD5` / `#FFF200` / `#111111`

### Neon Galaxy Pulse (deep space tech)
`#140F2D` / `#2A1B5F` / `#5A1BBF` / `#3F51FF` / `#00E5FF`

### Cyberpunk Classic
`#CC11F0` / `#6300FF` / `#FF008D` / `#D14EEA` / `#F96363`

**Neon rules:**
1. One primary neon (headlines/CTA), one secondary neon (accents)
2. Off-white text `#F5F5F5` — prevents harsh contrast against neon
3. Use bold/black font weights — neon backgrounds reduce thin type legibility

---

## Palette 4: Pastel / Soft

### Pastel Rainbow (social, lifestyle, beauty)
`#92CCDD` / `#C7EFF0` / `#F5D5FD` / `#FDC4EC` / `#FFC2CB`

### Soft Pastel Gradient
`#FFFAB6` → `#FCECC0` → `#FADECB` → `#F7D0D5` → `#F4C2DF`

### Twilight Cotton Clouds (dreamy cinematic)
`#F4ECFF` / `#D2C6FF` / `#A7B5FF` / `#7E8DFF` / `#4852B8`

### Blush Sunset Whisper (romantic, wedding)
`#FFE2DD` / `#FFC1C0` / `#FF9B9B` / `#F48F82` / `#C46B6F`

### Peach Glow Serenade (lifestyle, cozy)
`#FFE7D1` / `#FFC59A` / `#FF9E73` / `#F47B5F` / `#D85A4B`

**Pastel rule:** Always anchor with one neutral — cream `#FFF8F0`, soft gray `#F3F4F6`, or charcoal `#1A1A2E` — to prevent washed-out look.

---

## Palette 5: Monochromatic

### Monochromatic Minimalism (professional base)
| Role | Hex |
|---|---|
| Background | `#121212` |
| Primary text | `#E0E0E0` |
| Secondary text | `#B0B0B0` |
| Borders | `#444444` |
| Accent | `#888888` |

### Monochromatic + Single Accent (high-end)
Deep navy: `#0A1628` → `#0D2149` → `#1E3A6E` → `#2563EB` → `#93C5FD`
Pop accent: `#F97316` (warm orange) or `#84CC16` (acid green) — max 10–15% screen area

### Deep Jewel Tones (luxury, premium)
| Role | Hex |
|---|---|
| Background | `#1A1A1A` |
| Text | `#F0F0F0` |
| Emerald accent | `#004D61` |
| Ruby accent | `#822659` |
| Forest button | `#3E5641` |

---

## Gradient Angle Guide

| Angle | Emotion | Best use |
|---|---|---|
| 45° | Optimism, growth | Tech brand headers |
| 90° | Stability, strength | Vertical splits |
| **135°** | **Dynamism, energy** | **Most used in UI/motion** |
| 180° | Skies, depth | Background fades |

---

## 2024–2026 Gradient Trends

### Vivid Linear (still dominant)
| Gradient | Colors | Angle |
|---|---|---|
| Indigo Wave | `#667EEA` → `#764BA2` | 135° |
| Sunset Pink | `#F093FB` → `#F5576C` | 135° |
| Electric Sky | `#4FACFE` → `#00F2FE` | 135° |
| Mint Glow | `#43E97B` → `#38F9D7` | 135° |

### Key Color Pair Gradients
| Name | Hex range |
|---|---|
| Midnight Orchid | `#1F0F2E` → `#0A2342` → `#2D2A7A` |
| Tech Blueprint | `#020617` → `#1E40AF` → `#38BDF8` |
| Golden Hour | `#FFD166` → `#F4A261` → `#E76F51` |
| Nebula | `#2A0F3A` → `#0B1D3A` → `#5F4DB8` → `#22D3EE` |

### Aurora / Mesh Gradients (dominant 2025–2026)
Multiple radial color points blurred together → organic, holographic surfaces (Apple liquid glass aesthetic).

**Color stops for aurora mesh:**
| Point | Hex | Role |
|---|---|---|
| Base | `#0B1020` | Dark foundation |
| Point 1 | `#7B2CFF` | Violet node |
| Point 2 | `#00A3FF` | Blue node |
| Point 3 | `#FF2DAA` | Pink node |
| Point 4 | `#00FFD5` | Mint/cyan node |

**Aurora in AE:** 4–6 solids with Gaussian Blur 200–400px, Screen/Add blend mode, 50–80% opacity, `wiggle(0.3, 50)` slow drift.

---

## Contrast Requirements

| Standard | Ratio | Applies to |
|---|---|---|
| WCAG AA normal | **4.5:1** | Body text (<18pt regular) |
| WCAG AA large | **3:1** | Large text (≥18pt regular) |
| WCAG AAA normal | **7:1** | Critical text |
| WCAG AAA large | **4.5:1** | Large critical text |
| Non-text UI | **3:1** | Icons, borders |

**Cinematic sweet spot:** 7:1 to 12:1 — high enough for hierarchy, not so harsh it feels flat.

### Practical pairs
- White `#FFFFFF` on `#1E293B`: ~15.7:1 (very high)
- `#E5E7EB` on `#0F172A`: ~14:1 (premium, slightly softer)
- Warm white `#FFF7F0` on `#1C1917`: ~12:1 (cinematic warmth)

---

## Near-Black Rule
| Context | Use | Avoid |
|---|---|---|
| Dark theme background | `#0B0B0F` | `#000000` |
| Neon palette background | `#0A0A0F` | `#000000` |
| Cinematic blacks | `#141018` or `#0C0A07` | `#000000` |

Pure black `#000000` creates harsh contrast and causes eye strain. Near-blacks with a subtle hue cast read as more intentional and cinematic.
