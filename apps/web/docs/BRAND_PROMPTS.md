# Planevo Brand — Higgsfield Prompts

Student-life scenes and Bruno wave pose on the landing page use Higgsfield `marketing_studio_image` outputs in `public/landing/*.webp`.

## Student-life vignettes (4:3, palette: #FFFDF5 paper, #044337 forest, #6395EE ocean)

**Between classes** → `bruno-scene-between-classes.webp`
```
Premium editorial illustration for a student productivity app. Scene: outdoor campus bench between classes, golden afternoon light, student with notebook and coffee, warm cream (#FFFDF5) and honey tones, soft forest green (#044337) and ocean blue (#6395EE) accents. Friendly small brown bear mascot in green striped sweater as study companion. Calm aspirational mood, soft painterly editorial style, shallow depth of field, absolutely no text no words no letters no typography no logos.
```

**Late-night library** → `bruno-scene-library.webp`
```
Edit late-night library illustration: cozy mood, green desk lamp, dark wood table, bookshelves, arched windows, cinematic night lighting, cream and forest green palette. College-aged girl with brown hair reading at desk. SMALL cub-sized bear mascot in green and cream striped sweater — smaller than human, little companion also reading. Painterly editorial style. No text.
```

**Across campus** → `bruno-scene-campus.webp`
```
Premium editorial illustration for a student productivity app. Scene: walking across sunny college campus quad, trees and classic brick buildings blurred in background, student with backpack mid-stride, warm cream (#FFFDF5) sunlight, forest green (#044337) foliage and ocean blue (#6395EE) sky accents. Small friendly brown bear mascot in green striped sweater walking alongside. Optimistic energetic mood, editorial illustration, motion in composition, absolutely no text no words no letters no typography no logos.
```

## Bruno emotional poses (1:1)

**Wave** → `bruno-pose-wave.webp`
```
Character cutout illustration: friendly brown bear mascot Bruno wearing green and cream striped sweater, waving hello with one paw, warm cream background (#FFFDF5), soft shadow beneath feet, PostHog-style mascot energy, professional not childish, centered composition, absolutely no text no words no letters no typography.
```

Model: `marketing_studio_image` (2 credits/image). Compress with `sharp` to WebP q80 (~65–120KB). **Never embed titles in the image** — copy lives in the React overlay only.

## Auth hero (split-panel signup/login)

**Desktop** → `public/auth/auth-hero.png`  
**Mobile strip** → `public/auth/auth-hero-mobile.png`

```
Premium editorial illustration for a student planner app auth page. Cozy sunlit study nook: friendly brown bear mascot Bruno in green-and-cream striped sweater at a wooden desk with open planner, succulent, warm coffee, soft window light with autumn trees. Warm cream (#FFFFEB), forest green (#044337), ocean blue (#6395EE) accents. Painterly hand-drawn editorial style, immersive full-height composition, shallow depth, aspirational calm productivity mood. Absolutely no text, no words, no letters, no typography, no UI mockups.
```

Model: `marketing_studio_image` (3:4) when Higgsfield credits available; fallback: Cursor image generation with same prompt. **Higgsfield requires a paid workspace** — preflight with `get_cost: true` before batch generation.
