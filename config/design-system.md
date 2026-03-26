# Design System Strategy: The Curated Resonance

## 1. Overview & Creative North Star
The core philosophy of this design system is **"The Digital Curator."** In the high-end event equipment space, trust isn't built through loud marketing, but through precision, silence, and structural integrity. We are moving away from the "standard marketplace" look. Instead, we are building a digital gallery where high-fidelity audio equipment is treated like fine art.

### The Editorial Edge
To achieve a premium, KOVA-inspired aesthetic, we utilize **intentional asymmetry**. Do not center-align everything. Use the 1200px grid to anchor primary information to the left, while allowing high-resolution product photography to "bleed" or overlap container boundaries. This creates a sense of depth and cinematic motion, moving the user through the experience like a high-end magazine.

---

## 2. Colors & Surface Philosophy
The palette is grounded in a sophisticated warmth. We use neutral foundations to let the hardware (the products) and the "Accent Orange" provide the energy.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Structural separation must be achieved through background shifts.
*   Use `surface-container-low` (#f8f3ee) for large secondary sections.
*   Use `inverse-surface` (#32302d) for high-impact callouts or footers.
*   Transitioning from a `surface` background to a `surface-container` section is the only "line" required.

### Surface Hierarchy & Nesting
Treat the UI as physical layers.
*   **Base:** `background` (#fef8f3)
*   **Layer 1:** `surface-container-low` (#f8f3ee) for content grouping.
*   **Layer 2 (The Lift):** `surface-container-lowest` (#ffffff) for cards or interactive modules.
By nesting a white card on a soft cream background, we create "Soft Minimalism" that feels expensive and tactile.

### The "Glass & Gradient" Rule
To avoid a flat, "templated" feel:
*   **Glassmorphism:** Use for floating navigation bars or equipment spec overlays. Use `surface_container_lowest` at 80% opacity with a `24px` backdrop blur.
*   **Signature Textures:** For primary CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#9d4300) to `primary_container` (#e27431) at a 135-degree angle. This adds a "metallic" luster appropriate for premium audio gear.

---

## 3. Typography: The Editorial Voice
We use Inter for its clinical precision. The hierarchy is designed to feel authoritative yet breathable.

*   **Display-LG (Hero Heading):** 3.5rem (approx 56px). Weight: 800. Letter-spacing: -0.02em. Line-height: 1.1. This is your "Statement" font.
*   **Headline-LG (Section Headings):** 2rem. Weight: 700. This defines the start of a new "chapter" in the user journey.
*   **Title-MD (Subheadings):** 1.125rem. Weight: 600. Used for product names and category titles.
*   **Body-LG:** 1rem (16px). Weight: 400. Line-height: 1.6. Always use `on-surface-variant` (#564239) for long-form text to reduce harsh contrast and increase "premium" feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "software-like." We use **Ambient Shadows** and **Tonal Lift**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-highest` card (#e7e2dd) sitting on a `surface` background provides all the "elevation" needed for a professional look.
*   **Ambient Shadows:** If a card must float (e.g., a checkout modal), use: `box-shadow: 0 24px 48px -12px rgba(29, 27, 25, 0.08);`. The shadow is a tinted version of the `on-surface` color, not pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#ddc1b4) at 15% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons (The Interaction Points)
*   **Primary:** Gradient fill (`primary` to `primary_container`), 0.25rem (sm) corner radius. Label: `label-md` (All Caps, 0.05em tracking).
*   **Secondary:** Ghost style. No fill. `Ghost Border` (15% opacity `outline-variant`).
*   **Hover State:** Shift to `accent_orange_hover` (#C95F20) with a 2px vertical lift.

### Cards & Lists
*   **The Card Rule:** No dividers. Use `Spacing 16` (5.5rem) to separate content blocks. 
*   **Product Cards:** Use `surface-container-lowest` (#ffffff). The product image should be the hero, using a slight 1:1 or 4:5 aspect ratio for an editorial look.

### Input Fields
*   **Style:** Minimalist. Only a bottom border using `outline-variant` (#ddc1b4). On focus, the border transitions to `primary` (#9d4300) with a 2px thickness. 
*   **Labels:** Use `label-sm` floating above the line in `secondary` (#5f5e5e).

### Signature Component: The "Spec-Sheet" Overlays
For high-end speakers or consoles, use a semi-transparent `surface_container` overlay that slides over the product image on hover, displaying technical specs in `body-sm` typography. This mimics luxury watch or automotive digital showrooms.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme vertical whitespace (`Spacing 20` or `Spacing 24`) between sections. Space = Luxury.
*   **Do** use high-quality imagery with consistent art direction (low-key lighting, moody shadows).
*   **Do** align text-heavy blocks to a 7-column width within the 12-column grid to create intentional white space on the right.

### Don't:
*   **Don't** use 100% black (#000000). Use `on-background` (#1d1b19) for all "black" text to maintain tonal warmth.
*   **Don't** use standard "Success Green" or "Warning Yellow" excessively. Use subtle icons in `secondary` tones to maintain the high-end aesthetic.
*   **Don't** use sharp 90-degree corners. Always use the `sm` (0.25rem) or `md` (0.375rem) roundedness scale to soften the industrial feel of the audio equipment.

### Accessibility Note:
While we utilize soft contrasts for aesthetics, ensure all functional text (Body-LG and Labels) maintains a 4.5:1 contrast ratio against their respective surface containers. Use `on-surface` for all critical instructional text.

---

## Implémentation (codebase)

Les **tokens CSS** sont définis dans `app/globals.css` sous le préfixe `--ds-*`.  
Les **classes Tailwind** correspondantes utilisent le préfixe `ds-*` (ex. `bg-ds-background`, `text-ds-on-surface-variant`).

Utilitaires globaux :

| Classe | Usage |
|--------|--------|
| `bg-ds-primary-gradient` | CTA primaire (dégradé 135°) |
| `shadow-ds-ambient` | Élévation type modal / carte flottante |
| `border-ds-ghost` | Bordure fantôme (outline-variant ~15 % opacité) |
| `backdrop-blur-ds-glass` + `bg-ds-glass` | Barre de navigation flottante |

Typo éditoriale : utiliser `font-ds-display-lg`, `font-ds-headline-lg`, `font-ds-title-md`, `font-ds-body-lg` (voir `@layer utilities` dans `globals.css`).
