# Theming & i18n

## Theming
CSS variables in `:root`, overridden under `@media (prefers-color-scheme: dark)`.
`ThemeMode` setting (SYSTEM/LIGHT/DARK) sets `data-theme="light|dark"` on
`<html>`. Rewrite adds a `useTheme()` hook:
- Listens to `prefers-color-scheme` when `SYSTEM`.
- Writes `data-theme` attribute so CSS can override variables.

```css
:root[data-theme="dark"] { /* dark vars */ }
```

Token names stay: `--bg`, `--surface`, `--fg`, `--muted`, `--border`,
`--primary`, `--primary-weak`, `--danger`, `--warn`, `--ok`, `--radius`.

## Child colour palette
Fixed 8 colours (`ChildColor`). Hex map lives in `domain/enums.ts` (fine
there — it's intrinsic to the type). Also published as CSS custom props
(`--color-red`, `--color-blue`, …) so CSS can tint without JS.

## i18n

- Current `lib/i18n.ts` covers day-of-week labels and "every day" for EN/HE.
- Rewrite formalises a tiny string bag:
  ```
  lib/i18n/
    en.ts   ← all UI strings as a flat object
    he.ts
    index.ts  ← t(key, lang) + getDayLabels / getDayOrder helpers
  ```
- **Full Hebrew coverage is NOT a rewrite goal** — just make the plumbing
  correct so adding Hebrew strings later is a no-code change.
- `language === SYSTEM` → pick from `navigator.language` at boot, fallback EN.
- RTL: when HE, set `dir="rtl"` on `<html>`. Month/week headers already
  respect `getDayLabels(language)`.

## Date / time formatting
`lib/format.ts` stays. `Intl.DateTimeFormat` honours the browser locale,
which is good enough for now. If we later want to pin formats to the
`language` setting, add a `fmt(ms, language)` overload.

## No icon library
Emojis in the tab bar and empty states. Good for low bundle size, not great
for a polished look. The rewrite keeps this as-is; we can swap in an SVG
set later without changing components (just swap inside `TabBar`).
