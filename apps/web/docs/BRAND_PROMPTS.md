# Planevo brand art prompts (Higgsfield)

## Footer cinematic banner — SHIPPED (2026-07-06)

**Model:** `marketing_studio_image`, aspect `21:9`

**Winner:** Variant A (golden cream horizon) → `public/landing/bg/footer-cinematic.webp` (~38KB)

**Alternates kept for review:** `footer-cinematic-b.webp` (abstract gradient), `footer-cinematic-c.webp` (blurred desk)

**Winning prompt:**

```
Cinematic ultra-wide marketing banner, extreme motion blur and soft gaussian haze like wisprflow.ai footer photography, open meadow and sky at warm golden hour, dominant warm cream (#FFFFEB) and soft honey tones, subtle cornflower blue (#6395EE) horizon glow, deep forest green (#044337) tree silhouettes in lower third, dreamy long-exposure feel, heavy directional blur, no people, no text, no watermark, generous negative space center for headline overlay
```

---

## Forest footer band — BLOCKED

**Status:** BLOCKED — Higgsfield MCP `generate_image` preflight was rejected at runtime (2026-07-06). `models_explore` recommended `nano_banana_pro` (16.5 credits available). Re-run Task 16 Step 1–5 when MCP generation is approved.

**Model:** `nano_banana_pro` (recommended for flat editorial illustration, 21:9)

**Prompt (winning candidate — not yet generated):**

```
Minimal editorial flat illustration of a misty forest horizon at dawn, soft layered pine silhouettes in deep forest greens (#2F7958, #1B4835) fading into a warm cream sky (#FFFDF5), gentle honey-amber (#D08741) light glow low on the horizon, tiny silhouette of a small friendly bear standing on a hill in the lower third, generous negative space in the sky, grainy paper texture, no text, no watermark, calm and quiet mood, in the style of modern minimal brand illustration
```

**Post-processing (after generation):**

1. Pick best of 3: palette match, bear readable at 200px tall, sky ≥50% of frame
2. `outpaint_image` horizontally if needed; `upscale_image` to 4K
3. Install: `curl -L -o /tmp/forest-raw.png "<rawUrl>"` then `npx --yes sharp-cli -i /tmp/forest-raw.png -o apps/web/public/landing/bg/forest.webp --format webp --quality 82 resize 2560`
4. Update `FooterBrandBand.tsx` → `src="/landing/bg/forest.webp"`; target ≤300KB
5. Remove `apps/web/public/landing/bg/forest.png`

**Interim asset:** `public/landing/bg/forest.png` (stock photo, 1.9MB) remains until illustrated art ships.
