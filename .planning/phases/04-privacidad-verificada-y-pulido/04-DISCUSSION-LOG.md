# Phase 4: Privacidad verificada y pulido - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 4-Privacidad verificada y pulido (Fase 2 del Roadmap)
**Areas discussed:** Test Framework, Fixture Exportación, UI States Audit, SizeGuideModal Móvil, README Trust Contract

---

## Test Framework

| Option | Description | Selected |
|--------|-------------|----------|
| A) Vitest + Emulador real | Conecta a Firestore Emulator en localhost:8080. Tests más realistas, prueba reglas reales, requiere emulador corriendo. Ideal para CI con firebase emulators:exec. | ✓ |
| B) @firebase/rules-unit-testing | Librería oficial que simula reglas en memoria sin emulador. Tests ultra-rápidos, aislados, but menos realistas (no prueba indexes, triggers, etc.). | |
| C) Ambos: unitarios con rules-unit-testing + integración con emulador | Tests rápidos de reglas en unitarios; tests E2E críticos contra emulador. Máxima cobertura pero doble mantenimiento. | |

**User's choice:** A) Vitest + Emulador real (recomendado)
**Notes:** Usuario prefiere tests realistas contra emulador real. Acepta que requiera emulador corriendo.

---

## Fixture Exportación

| Option | Description | Selected |
|--------|-------------|----------|
| A) 4 participantes con casos edge variados | Nombres: José, María, Juan Pérez, O'Connor. Equipos: Real Madrid, Atlético de Madrid, Barça, Team SA. Dorsales: 9, 100, 09, 007. Tallas: S, M, L, XXL. Tipos: Fan, Player, Retro, Fan. | ✓ |
| B) 6 participantes (mínimo para derangement válido) | Más realista para el flujo completo. Mismos casos edge + 2 más. Verifica que exportación escala bien. | |
| C) Datos parametrizados generados en test | Test genera datos aleatorios con casos edge asegurados. Menos determinista pero más flexible. Fixture hardcodeado es mejor para regression testing. | |

**User's choice:** A) 4 participantes con casos edge variados
**Notes:** Usuario quiere fixture determinista con casos edge explícitos. 4 participantes suficiente (el test no ejecuta derangement, solo exportación).

---

## UI States Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, auditoría completa + fixes | Reviso cada ruta (/ /preferences /lobby /reveal /admin /admin/setup /admin/login), documento gaps, creo plan para añadir estados faltantes (skeleton loaders, empty states, error notices con S8 copy). | ✓ |
| Solo rutas críticas: /reveal (assignment loading) y /preferences (join loading) | Las otras rutas ya tienen estados decentes. Enfoque en las que más impacto tienen en UX. | |
| No auditoría, solo asegurar deep-links sobreviven recarga | Verificar que rewrite catch-all en firebase.json funciona. Ya debería estar (SPA hosting). | |

**User's choice:** Sí, auditoría completa + fixes (recomendado)
**Notes:** Auditoría completa de 7 rutas con fixes de skeleton loaders, empty states, error notices S8.

---

## SizeGuideModal Móvil

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, breakpoint sm + max-h-[80vh] overflow-auto | Estándar Tailwind. En móvil cada talla = card con sus medidas; en desktop tabla completa. Dialog nativo <dialog> con altura máxima y scroll interno. | ✓ |
| Breakpoint md (768px) para tabla | Tabla solo en ≥md. En móvil/sm cards. Más espacio para tabla. | |
| Solo tabla responsive (horizontal scroll en móvil) | Tabla siempre, en móvil overflow-x-auto. Menos trabajo, pero peor UX en móvil estrecho. | |

**User's choice:** Sí, breakpoint sm + max-h-[80vh] overflow-auto (recomendado)
**Notes:** Breakpoint sm (640px), cards apiladas en móvil, tabla en desktop. Dialog con altura acotada y scroll interno.

---

## README Trust Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Redacta sección completa ahora | Escribo la sección 'Contrato de Confianza / Privacidad' en README.md con: qué garantiza la app, qué NO garantiza (dueño Firebase), por qué emparejamiento no en doc único, cómo verificar (rules + export test). Listo para commit. | ✓ |
| Solo estructura/outline | Defino headings y bullets; tú rellenas el copy final después. | |

**User's choice:** Redacta sección completa ahora (recomendado)
**Notes:** Sección completa lista para commit en README.md.

---

## the agent's Discretion

- Estructura exacta de test files y helpers de emulador (src/lib/__tests__/rules.test.ts, src/domain/__tests__/exportOrders.fixture.test.ts)
- Nombres de test cases descriptivos (ej. "Admin cannot list assignments collection")
- Copy exacta de README trust section
- Ubicación exacta de fixes de UI states (componentes vs hooks vs pages)
- Breakpoint exacto sm (640px) y CSS para SizeGuideModal responsive

## Deferred Ideas

- Playwright E2E tests contra emulador — v2 (para flujo completo usuario real)
- Regla participantCount no negativo en transacción — validar en rules
- Rate limiting en tests de reglas (emulador tiene límites)
- Tests de performance (bundle size, LCP) — v2