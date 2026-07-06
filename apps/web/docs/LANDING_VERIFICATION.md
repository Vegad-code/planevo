# Landing Premium — Founder Verification Questionnaire

Complete after Phase 5 gate. Answer each question with **Yes / No / Needs tweak** and attach evidence (screenshot URL, Lighthouse score, or file path).

## 1. Slogan consistency

Is **"A plan that adapts."** verbatim in `<title>`, OG image, hero `h1` (with sr-only `adapts.`), and Final CTA — with RotatingWord cycling `adapts` / `bends` / `listens` / `keeps up` at 3.2s fixed width?

**Evidence:** View source + OG preview + hero screenshot.

## 2. Omission discipline (Littlebird)

Does the nav show **exactly 4 links** (How it works, Bruno, Pricing, FAQ) plus Sign in / Start free — with no logo strip, no fake social proof, and **≤2 visible "free" mentions** outside pricing (hero badge + pricing section only)?

**Evidence:** `rg -i '\bfree\b' apps/web/components/landing-v2` + nav screenshot.

## 3. Demo-as-hero stillness (Amie)

Does the hero demo play **capture → board once**, show a **Replay** pill, and remain **still after ~10s idle** (no infinite loops, no perpetual motion)?

**Evidence:** `e2e/landing-a11y.spec.ts` stillness test + 15s screen recording.

## 4. Three-deep narrative + bento (SaaSFrame)

Is the page order: Hero → ProofStrip → **3 deep rows** (capture, board, plan) → **2×2 bento** → FoundersNote → Bruno → Pricing → FAQ → FinalCta → Footer + forest band?

**Evidence:** Full-page screenshot at 1440px.

## 5. Bruno placement (Routine)

Does Bruno appear **only** in BrunoSection and the footer forest silhouette — **never** in hero, proof strip, or pricing — at ≤15% visual attention?

**Evidence:** Section crop screenshots.

## 6. Accessibility gate (Playbook §10)

- Lighthouse accessibility **≥ 95**
- CLS **< 0.05**
- axe **zero critical** violations (`landing-a11y.spec.ts`)
- Keyboard focus reaches nav + primary CTA
- JS-disabled page still shows warm cream palette

**Evidence:** Lighthouse JSON + Playwright CI green.

## 7. Pricing honesty (Sunsama + SaaSFrame)

Annual toggle shows **"2 months free"**; `.edu` line is first-class on Pro card; no dark patterns or countdown timers?

**Evidence:** Pricing section screenshot (monthly + annual states).

## 8. Craft tokens (Godly)

Fraunces serif (not Cormorant), warm paper `#FFFDF5`, single honey accent, no nature-scene card backgrounds, no stock photography except removed?

**Evidence:** Computed styles on `h1` + palette swatch screenshot.

---

**Sign-off**

| Role | Name | Date | Decision |
|------|------|------|----------|
| Founder | | | Ship / Iterate |
