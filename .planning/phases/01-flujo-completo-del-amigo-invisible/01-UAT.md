---
status: testing
phase: 01-flujo-completo-del-amigo-invisible
source: [01-VERIFICATION.md]
started: 2026-10-19T15:55:00Z
updated: 2026-10-19T15:55:00Z
---

## Current Test

number: 1
name: Reload identity — enter your name, join, then reload the browser
expected: |
  You remain the same person and land back in the lobby (or reveal, once drawn);
  no re-entry is requested.
awaiting: user response

## Tests

### 1. Reload identity — enter your name, join, then reload the browser
expected: You remain the same person and land back in the lobby (or reveal, once drawn); no re-entry is requested.
result: [pending]

### 2. Duplicate name from an incognito tab (WINDOWS #3)
expected: Actionable duplicate notice with focus in the input, no duplicate participant; joining with blank team fields persists likedTeams/forbiddenTeams as empty strings (never null).
result: [pending]

### 3. Two-client Admin gating — first user vs second user in /lobby
expected: First user gets the Admin badge and is the only one seeing «Empezar Sorteo»; the second sees the participant list updating on its own without the button.
result: [pending]

### 4. Size guide at ~360px (WINDOWS #3)
expected: One card per size, no horizontal scroll, three amber notes present, including the Player 2XL row and the Retro-uses-Fan note.
result: [pending]

### 5. Draw idempotence — double-click «Empezar Sorteo» / a second runDraw on a 'drawn' event (WINDOWS #4)
expected: No second assignment document is written; the assignment set is unchanged.
result: [pending]

### 6. Reveal + order — headline wrap at 320px and dorsal round-trip (WINDOWS #6)
expected: Headline wraps; recipient preferences shown; save → recap with «Guardado»; dorsal «09» round-trips as a string; no re-submit affordance; prices Fan 11$ / Player 16$ / Retro 15$.
result: [pending]

### 7. Lobby roster at 320px (WINDOWS #5)
expected: Name plus (tú)/Admin/Pendiente badges wrap with no horizontal scroll.
result: [pending]

### 8. Admin panel behaviour (WINDOWS #8)
expected: Fraction, bar and missing list match stored data; the fraction rises live without reload when another tab saves an order; «Descargar Pedidos» opens with BOM, ';' separator, exactly seven columns and no pairing column.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
