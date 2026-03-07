# Typography — AE-MCP Design Reference

## Core Rules
- Use **1–2 font families** maximum per project — more creates visual noise
- Title weight should be minimum **2 weights heavier** than body (e.g., Black + Regular)
- All-caps requires **+100 to +200 tracking** minimum — never default
- Title-to-body scale ratio: **3:1 minimum**, ideally 3:1–4:1
- Reserve serifs for emotional, editorial, or luxury contexts; sans-serifs for tech/corporate

---

## Fonts Used by Professional Studios

### Workhorse Sans-Serifs (most common in broadcast/corporate motion)
| Font | Foundry | Character | Best use |
|---|---|---|---|
| **Neue Haas Grotesk** | Commercial Type | Authoritative, Helvetica heritage | Corporate, tech, broadcast |
| **Aktiv Grotesk** | Dalton Maag | Neutral authority, 24 styles | Global brand, multi-language |
| **GT Walsheim** | Grilli Type | Geometric, friendly-precise | Modern branding, SaaS |
| **Söhne** | Klim Type Foundry | NYC subway-influenced, confident | Editorial, documentary |
| **Druk** | Commercial Type | Ultra-condensed/wide, extreme impact | Sports, impact titles |
| **Proxima Nova** | Mark Simonson | Versatile, cross-platform | Multi-use commercial |
| **Graphik** | Commercial Type | Subtle, contemporary | Corporate, tech |

### Display / Title (impactful moments)
| Font | Use |
|---|---|
| **Druk Wide Super** | Maximum headline impact, sports graphics |
| **Champion Gothic** | Condensed title weight, editorial |
| **Canela** | High-contrast serif, luxury/editorial |

### Free / Accessible Equivalents
| Font | Notes |
|---|---|
| **Inter** | Designed for screens, excellent in motion |
| **DM Sans** | Clean, highly legible at small sizes |
| **Space Grotesk** | Slightly quirky, tech-forward character |
| **Outfit** | Geometric, versatile weights |

---

## Font Pairing Rules

### Proven Patterns
1. **Same family, different weights** — Gotham Black + Gotham Light — most foolproof
2. **Geometric sans + humanist serif** — GT Walsheim Bold + Canela Light — warm/cool tension
3. **Condensed + regular width** — Druk Wide + Neue Haas Grotesk Text — scale + width contrast
4. **Weight contrast rule** — min 2 weights apart (Black + Regular, Bold + Thin)

### What studios actually do
- Vary weight dramatically within one family: Black vs. Ultralight (not Bold vs. Regular)
- Avoid Bold vs. SemiBold — no hierarchy is created

---

## Size Scale Tables

### 1080p (1920×1080)
| Element | Size (px) | Weight | Notes |
|---|---|---|---|
| Hero / main title | 80–160px | Black / ExtraBold | Full-screen statement |
| Primary title | 60–90px | Bold | Standard scene title |
| Secondary title | 36–54px | Medium / SemiBold | Sub-section titles |
| Lower third — name | 32–42px | Bold | Primary name line |
| Lower third — role | 20–28px | Regular / Light | Secondary descriptor |
| Body / supporting | 18–26px | Regular | Legible minimum for HD |
| Caption / fine print | 16–20px | Light | Absolute minimum legible |

### 4K (3840×2160)
Simply **2× all 1080p values**. A 60px title at 1080p = 120px at 4K.

### 9:16 Vertical (1080×1920 — social/mobile)
Scale up **30–40%** from 1080p values. Mobile text competes with more visual noise.

| Element | Size (px) |
|---|---|
| Hero title | 104–224px |
| Primary title | 78–126px |
| Secondary title | 47–76px |
| Body | 23–36px |
| Caption | 21–28px |

### Golden Ratio Type Scale (harmonious relationships)
Base: 16px, scale ratio ×1.618:
`16 → 26 → 42 → 68 → 110 → 178px`

---

## Tracking (Letter Spacing) Values

Measured in 1/1000 em units in AE. Positive = open, negative = tight.

| Context | Tracking value | Notes |
|---|---|---|
| Large display titles (100px+) | `-20` to `0` | Large type is optically too loose at default |
| Title at 60–80px | `0` to `+20` | Neutral to slightly open |
| Subtitle / secondary (40–60px) | `+20` to `+50` | Opens nicely at this size |
| Small labels / captions (18–30px) | `+75` to `+150` | Needs air to breathe |
| **All-caps titles (any size)** | **+100 to +200** | **Non-negotiable minimum** |
| All-caps over 80px | **+150 minimum** | Below this reads cheap |
| Body copy / extended text | `0` to `+30` | Optical, not too wide |

**Critical:** Never set all-caps text with default tracking. It looks amateurish. +100 minimum on all-caps motion titles.

---

## Line Height (Leading) Ratios

| Context | Line height ratio | AE leading value (at 60px) |
|---|---|---|
| Single-word hero title | 1.0–1.1× | 60–66px |
| Multi-line display heading | 1.1–1.2× | 66–72px |
| Subtitle / secondary text | 1.3–1.4× | 78–84px |
| Body copy | 1.4–1.6× | 84–96px |
| Mobile / small screen | 1.5–1.6× | 90–96px |

---

## Weight Contrast Rules

| Hierarchy level | Weight | Example (Neue Haas / similar) |
|---|---|---|
| Hero / primary | Black (900) | "Neue Haas Grotesk Black" |
| Secondary | Medium or Regular (400–500) | "Neue Haas Grotesk Regular" |
| Tertiary | Light or Thin (100–300) | "Neue Haas Grotesk Light" |

**The gap rule:** Primary 72px / Secondary 60px = no hierarchy (they fight). Primary 72px / Secondary 28px = clear hierarchy. The gap IS the hierarchy.

**Scale multipliers for hierarchy:**
| Level | Scale multiplier | Example at 1080p |
|---|---|---|
| Hero / primary | 1.0× base | 80px |
| Secondary | 0.35–0.45× | 28–36px |
| Supporting | 0.20–0.28× | 16–22px |
| Fine detail | 0.12–0.18× | 10–14px |

---

## Kinetic Typography Notes

- Ultra-bold / Black (900) weights read at any animation speed — required for kinetic work
- Thin / Light (100–300) works only for slow, deliberate reveals
- Variable fonts ideal for weight-animated reveals (Thin → Black as an animatable property)
- Use tabular / monospaced number variants for counting-up animations (prevents jumping)
- Fonts for data numerics: Neue Haas Grotesk, Aktiv Grotesk, IBM Plex Mono
