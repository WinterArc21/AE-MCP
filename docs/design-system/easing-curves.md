# Easing Curves — AE-MCP Design Reference

## Core Rules
- **Entrances use ease-out** — start at full speed, decelerate into landing (backwards-J curve)
- **Exits use ease-in** — accelerate the entire way out, no soft ending
- **Never use default Easy Ease** — AE default = 33.33% influence. Professionals use 70–100%
- **Never use `ease` or `linear`** — robotic and cheap
- Exits should be **20–30% faster** than entrances

---

## Decision Table: Use Case → Curve

| I want to... | Cubic-bezier | AE influence |
|---|---|---|
| Element entering from off-screen | `(0.19, 1, 0.22, 1)` easeOutExpo | Out: 85–95% |
| Element exiting to off-screen | `(0.95, 0.05, 0.795, 0.035)` easeInExpo | In: 85–95% |
| Between two on-screen positions | `(0.645, 0.045, 0.355, 1)` easeInOutCubic | Both: 66–75% |
| Snappy, punchy pop | `(0.23, 1, 0.32, 1)` easeOutQuint | Out: 90% |
| Cinematic, weighted | `(0.445, 0.05, 0.55, 0.95)` easeInOutSine + long duration | Both: 50–60% |
| Spring / elastic feel | `(0.34, 1.56, 0.64, 1)` | Out: 95% (Y overshoots) |
| Anticipation before move | `(0.6, -0.28, 0.735, 0.045)` easeInBack | In: 70% |
| Bounce/overshoot on arrival | `(0.175, 0.885, 0.32, 1.275)` easeOutBack | Out: 80% |
| Material Design standard | `(0.2, 0.0, 0, 1.0)` | — |
| Material Design enter | `(0.05, 0.7, 0.1, 1.0)` | — |
| Material Design exit | `(0.3, 0.0, 0.8, 0.15)` | — |

---

## Professional Library by Use Case

### Entrance (off-screen → on-screen)
```
cubic-bezier(0.19, 1, 0.22, 1)      // easeOutExpo — snappy, most used
cubic-bezier(0.075, 0.82, 0.165, 1)  // easeOutCirc — energetic
cubic-bezier(0, 0, 0.58, 1)          // easeOut — soft/gentle version
```
Rule: NO easing on the outgoing side of the first keyframe. Full speed into the landing.

### Exit (on-screen → off-screen)
```
cubic-bezier(0.95, 0.05, 0.795, 0.035)  // easeInExpo — dramatic
cubic-bezier(0.6, 0.04, 0.98, 0.335)    // easeInCirc — punchy
cubic-bezier(0.42, 0, 1, 1)             // easeIn — standard
```
Rule: Accelerate the entire move. Never ease at the end of an exit.

### On-screen to On-screen (position changes)
```
cubic-bezier(0.645, 0.045, 0.355, 1)    // easeInOutCubic — professional standard
cubic-bezier(0.77, 0, 0.175, 1)         // easeInOutQuart — more aggressive
cubic-bezier(0.42, 0, 0.58, 1)          // ease-in-out — symmetric
```

### Snappy / Punchy
```
cubic-bezier(0.19, 1, 0.22, 1)   // easeOutExpo — fastest deceleration
cubic-bezier(0.23, 1, 0.32, 1)   // easeOutQuint — slightly softer
```
In AE Speed Graph: extremely tall spike at left that crashes to near-zero.

### Cinematic / Languid
```
cubic-bezier(0.445, 0.05, 0.55, 0.95)  // easeInOutSine — film-like
cubic-bezier(0.25, 0.1, 0.25, 1.0)     // ease — only acceptable if duration is 800ms+
```
Note: Cinematic feel = longer duration (600ms–1200ms), not a different curve.

### Bounce (single overshoot on arrival)
```
cubic-bezier(0.175, 0.885, 0.32, 1.275)  // easeOutBack — gentle single overshoot
cubic-bezier(0.34, 1.56, 0.64, 1)        // 56% Y overshoot — spring-like
```

### Elastic / Spring
```
cubic-bezier(0.34, 1.56, 0.64, 1)   // ~156% on Y axis — element overshoots target by 56%
```

---

## Full Easing Library (Math Families)

### Sine (gentlest)
| Name | Cubic-bezier |
|---|---|
| easeInSine | `(0.47, 0, 0.745, 0.715)` |
| easeOutSine | `(0.39, 0.575, 0.565, 1)` |
| easeInOutSine | `(0.445, 0.05, 0.55, 0.95)` |

### Quad (moderate)
| Name | Cubic-bezier |
|---|---|
| easeInQuad | `(0.55, 0.085, 0.68, 0.53)` |
| easeOutQuad | `(0.25, 0.46, 0.45, 0.94)` |
| easeInOutQuad | `(0.455, 0.03, 0.515, 0.955)` |

### Cubic (most used by professionals)
| Name | Cubic-bezier |
|---|---|
| easeInCubic | `(0.55, 0.055, 0.675, 0.19)` |
| easeOutCubic | `(0.215, 0.61, 0.355, 1)` |
| easeInOutCubic | `(0.645, 0.045, 0.355, 1)` |

### Quart (aggressive)
| Name | Cubic-bezier |
|---|---|
| easeInQuart | `(0.895, 0.03, 0.685, 0.22)` |
| easeOutQuart | `(0.165, 0.84, 0.44, 1)` |
| easeInOutQuart | `(0.77, 0, 0.175, 1)` |

### Quint (very aggressive)
| Name | Cubic-bezier |
|---|---|
| easeInQuint | `(0.755, 0.05, 0.855, 0.06)` |
| easeOutQuint | `(0.23, 1, 0.32, 1)` |
| easeInOutQuint | `(0.86, 0, 0.07, 1)` |

### Expo (extreme — snappy/punchy motion design)
| Name | Cubic-bezier |
|---|---|
| easeInExpo | `(0.95, 0.05, 0.795, 0.035)` |
| easeOutExpo | `(0.19, 1, 0.22, 1)` |
| easeInOutExpo | `(1, 0, 0, 1)` |

### Circ (circular velocity)
| Name | Cubic-bezier |
|---|---|
| easeInCirc | `(0.6, 0.04, 0.98, 0.335)` |
| easeOutCirc | `(0.075, 0.82, 0.165, 1)` |
| easeInOutCirc | `(0.785, 0.135, 0.15, 0.86)` |

### Back (overshoot built in — key pro technique)
| Name | Cubic-bezier | Use |
|---|---|---|
| easeInBack | `(0.6, -0.28, 0.735, 0.045)` | Anticipation before exit |
| easeOutBack | `(0.175, 0.885, 0.32, 1.275)` | Overshoot on arrival |
| easeInOutBack | `(0.175, 0.885, 0.32, 1.275)` | Both anticipation + overshoot |

---

## Material Design M3 Tokens
| Token | Cubic-bezier | Use |
|---|---|---|
| Standard | `(0.2, 0.0, 0, 1.0)` | Default all-purpose transition |
| Emphasized decel (M3 Enter) | `(0.05, 0.7, 0.1, 1.0)` | Elements entering screen |
| Emphasized accel (M3 Exit) | `(0.3, 0.0, 0.8, 0.15)` | Elements leaving screen |
| Standard M2 | `(0.4, 0.0, 0.2, 1.0)` | Legacy standard |
| Decelerate M2 | `(0.0, 0.0, 0.2, 1.0)` | Legacy enter |
| Accelerate M2 | `(0.4, 0.0, 1.0, 1.0)` | Legacy exit |

M3 philosophy: "Snappy take offs and very soft landings." `(0.05, 0.7, 0.1, 1.0)` starts nearly vertical, coasts gently to rest.

---

## AE Graph Editor Translation

**Influence percentages vs. cubic-bezier curves:**
| Feel | AE Speed Graph influence (outgoing) | Equivalent cubic-bezier family |
|---|---|---|
| Default (bad) | 33% | Raw `ease` |
| Professional baseline | 66–75% | Cubic |
| Strong/snappy | 85–95% | Expo/Quint |
| Maximum | ~100% | easeOutExpo |

**Pro technique — "The Strong Out":**
1. Apply Easy Ease (F9) to all keyframes
2. Open Speed Graph
3. Select outgoing handle of first keyframe
4. Drag to 85–95% influence (almost touching incoming handle of the next keyframe)
5. Result: takes off fast, coasts in — equivalent to `easeOutExpo`

**Value Graph overshoot:**
- Pull incoming handle ABOVE the target value line on the arrival keyframe
- Creates a brief spike past target before settling
- The spike frame should occur WHILE approaching, not after arriving

---

## Key Professional Principles
1. Easing IS the design — same timing, different easing = completely different feel
2. The 80/20 rule: objects spend 80% of animation at near-peak velocity, 20% easing
3. Snappy = peak speed in first 20% of duration
4. Weighted = peak speed after 40–50% of duration
5. Multiple simultaneous animations: one leads, others follow at different speeds — never equal
