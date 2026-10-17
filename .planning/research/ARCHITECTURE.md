# Architecture Research

**Domain:** Small single-event web app (Secret Santa / "amigo invisible") for football-jersey gifting — React SPA + Firebase Firestore, no trusted backend
**Researched:** 2026-10-17
**Confidence:** MEDIUM (Firebase official docs facts cross-checked across ≥2 independent sources; the low-level privacy conclusion is a *derived* correctness argument, not something any doc states verbatim — it is marked DERIVED below)

> **Confidence model used in this document.** `[DOC]` = stated in Firebase/Google official documentation (cross-checked). `[COMMUNITY]` = widely-repeated practitioner pattern (blog/Stack Overflow, not normative). `[DERIVED]` = my own reasoning from documented primitives; verify in the Emulator Suite before relying on it. Nothing here reached HIGH confidence because no source was verified against a running system in this research pass.

---

## Executive Summary

The question the roadmap actually needs answered is **"where does the giver→recipient pairing live, and who can read it?"** Four facts decide the entire architecture:

1. **Firestore reads are document-level.** `[DOC]` *"Reads in Rules are performed at the document level. You either retrieve the full document, or you retrieve nothing... It is impossible using security rules alone to prevent users from reading specific fields within a document."* Field-level control exists for **writes only** (`request.resource.data.keys().hasOnly(...)`, `diff().affectedKeys()`). **Consequence: you can never hide a `recipientId` field by rule.** It must live in a document that the admin is not allowed to read, or it cannot be hidden at all.
2. **Without Firebase Auth, `request.auth` is `null`.** `[DOC]` *"When the user requesting access isn't signed in, the auth variable is null."* **Consequence: with literally no auth, security rules cannot distinguish the admin from anybody else — they provide zero per-user enforcement.** Any "two people can't read each other's pairing" story requires at least **Anonymous Auth** (no password, no OAuth, one silent call).
3. **The project owner bypasses rules entirely.** `[DOC]` *"The server client libraries bypass all Cloud Firestore Security Rules."* The Firebase Console renders raw Firestore data for anyone with project IAM access. **Consequence: a client-only app can never hide the pairing from the admin-as-project-owner.** This is a hard limit, not a bug to engineer around.
4. **So the honest split is:** rules + Anonymous Auth give *real* enforcement **between participants**; they give **nothing** against the project owner. For a friends-only app the mitigation is to (a) enforce between participants, (b) never persist the full mapping in a single document (limits accidental exposure and blast radius), and (c) accept the social trust contract — or add a Cloud Function later, which is the only true fix.

**Recommended shape:** one `events/main` document (status + admin identity) with **three subcollections** — `participants/{uid}` (readable by all, this is the lobby), `assignments/{giverUid}` (readable **only** by its own giver, write-once, **never listed**), and `orders/{giverUid}` (readable by its giver or the admin). Draw = Fisher–Yates shuffle + offset-by-one (`shuffled[i] → shuffled[(i+1) % n]`), which is a **single-cycle permutation with zero fixed points by construction** and therefore cannot produce A↔B mutual pairs for n ≥ 3. The draw is persisted with a single `runTransaction` (read event → verify `status === 'lobby'` → write N assignment docs + flip status), which is atomic and idempotent under double-click contention. **The admin export path reads `participants` + `orders` and never touches `assignments`** — enforce that as a module boundary, not a convention.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ L4 · PRESENTATION (route pages, React Router data mode)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Join /  │ │  Lobby   │ │Preference│ │  Reveal  │ │   Admin   │  │
│  │ Landing  │ │  Page    │ │  Page    │ │ + Order  │ │  Export   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
├───────┴────────────┴────────────┴────────────┴─────────────┴────────┤
│ L3 · SHARED COMPONENTS (pure, no Firestore)                          │
│  ┌───────────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │SizeGuideModal │ │ PriceTable│ │JerseyOrderForm│ │ParticipantList│ │
│  │ (Fan/Player)  │ │ (11/16/15)│ │ (Fan/Player/  │ │ (name + state)│ │
│  │               │ │           │ │  Retro)       │ │              │  │
│  └───────────────┘ └───────────┘ └──────────────┘ └──────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│ L2 · COMPOSITION (hooks + contexts — the ONLY Firestore-aware layer) │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │SessionContext│ │ useEvent()   │ │useParticipants│ │ useMyAssig │  │
│  │(uid,name,    │ │ (onSnapshot  │ │  ()          │ │  nment()   │  │
│  │ isAdmin)     │ │  events/main)│ │ (lobby list) │ │ (get by ID)│  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ useMyOrder() │ │useOrdersAdmin│ │ useDerangement│                │
│  │              │ │  ()          │ │ (pure wrapper)│                │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
├──────────────────────────────────────────────────────────────────────┤
│ L1 · DOMAIN / PURE (no React, no Firestore — unit-testable)          │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│  │ buildDerangement() │ │ buildOrdersExport()│ │ sizeGuide /      │ │
│  │ n≥2, single cycle  │ │ (csv|txt) string   │ │ priceTable data  │ │
│  │ zero fixed points  │ │ NEVER takes mapping│ │ (static, typed)  │ │
│  └────────────────────┘ └────────────────────┘ └──────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ L0 · DATA ACCESS (thin adapters over the firebase/firestore SDK)      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ joinEvent()│ │ runDraw()  │ │ submitOrder│ │ exportOrders()   │  │
│  │ (TXN)      │ │ (TXN)      │ │ (setDoc)   │ │ (getDocs)        │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│ BACKEND · Cloud Firestore (security rules = the ONLY authorization)  │
│   events/main  +  participants/  assignments/  orders/               │
└──────────────────────────────────────────────────────────────────────┘
```

**Dependency direction is strictly downward.** L4 imports L3 and L2. L2 imports L1 and L0. L1 imports nothing but static data. **L1 must never import L0 and L0 must never import L2/L4** — that is what makes the draw and the export independently testable, and it is what keeps the mapping out of the export.

### Component Responsibilities

| Component | Layer | Responsibility (owns) | Does NOT do | Typical Implementation |
|-----------|-------|----------------------|-------------|------------------------|
| `SessionProvider` / `SessionContext` | L2 | uid, display name, `isAdmin`, persisted identity across reloads | Firestore subscriptions; any authorization decision | React context + `localStorage` mirror; value computed once |
| `useEvent(eventId)` | L2 | live `events/main` doc: `status`, `adminUid`, `drawnAt` | participant list; orders | `onSnapshot(doc(db,'events','main'))` + unsubscribing `useEffect` |
| `useParticipants()` | L2 | live lobby list, sorted, each with `orderSubmitted` flag | drawing; reading assignments | `onSnapshot(query(collection(...), orderBy('joinedAt')))` |
| `useMyAssignment()` | L2 | the caller's own `assignments/{uid}` doc | **never a `list` query** — single `get`/`onSnapshot` by doc ID | `onSnapshot(doc(db,'events','main','assignments',uid))` |
| `useMyOrder()` | L2 | live own `orders/{uid}` doc | other people's orders | doc listener by ID |
| `useOrdersAdmin()` | L2 | all orders + derived "who still hasn't submitted" | **must not read `assignments`** | `onSnapshot(collection(...,'orders'))`; mounted **only** on the admin route |
| `useDerangement()` | L2 | thin wrapper exposing `buildDerangement` + a "can draw?" predicate (n ≥ 2) | randomness policy in the UI | `useMemo` over the participant list |
| `buildDerangement(uids, rng)` | L1 | pure: UID[] → `{giverUid, recipientId}[]`, single cycle, zero fixed points | any I/O, any React | Fisher–Yates + offset-by-one; injected `rng` for deterministic tests |
| `buildOrdersExport(orders, participants)` | L1 | pure: order rows → CSV/TXT string **with no giver→recipient column** | Firestore reads; knowing the mapping at all | signature has no `assignment` parameter — a type-level guarantee |
| `sizeGuide`, `priceTable` | L1 | static typed tables (Fan/Player size rows; Fan 11 / Player 16 / Retro 15) | any fetch | plain TS modules, imported by components |
| `joinEvent(name)` | L0 | bootstrap-or-join in a transaction; sets `adminUid` on first write | routing; UI state | `runTransaction` + `setDoc(..., {merge:true})` |
| `runDraw(participantIds)` | L0 | the atomic draw: read event → guard `status` → write N assignments → flip status | computing the permutation (delegates to L1) | `runTransaction` |
| `submitOrder(payload)` | L0 | upsert own order | rendering | `setDoc(doc(...orders/uid), {...}, {merge:true})` |
| `exportOrders()` | L0 | read `orders` (+ `participants` for size labels) once | reading `assignments` | `getDocs` |
| `LobbyPage`, `DrawResultPage`, `AdminPage`, `JoinPage` | L4 | routing, layout, composition of the above | business logic; direct Firebase imports | route components in `createBrowserRouter` |

**The single most important boundary in this table:** `useOrdersAdmin` and `exportOrders` have no code path to `assignments`. If the export module's signature is `buildOrdersExport(orders, participants)` (no assignment argument), then a future contributor *cannot* leak the pairing into the export without deliberately changing the type signature. Make privacy a compile-time property where you can.

---

## The Privacy Question (read this before choosing a data model)

This is the crux of the whole product. Everything else in this document is downstream of it.

### The four hard facts

**F1 — Firestore reads are all-or-nothing per document.** `[DOC]`
> *"Reads in Rules are performed at the document level. You either retrieve the full document, or you retrieve nothing. There is no way to retrieve a partial document. It is impossible using security rules alone to prevent users from reading specific fields within a document."*
> — *Control access to specific fields*, Firestore docs

Field-level **write** control *does* exist (`request.resource.data.keys().hasOnly([...])`, `hasAny([...])`, `diff().affectedKeys()`). Field-level **read** control does not. So:

> **Corollary:** putting `recipientId` as a field on a document that the lobby already streams means every participant can read every pairing. There is no rule that saves you. **The pairing must be isolated by document, not by field.**

**F2 — With no Firebase Auth, rules cannot identify anyone.** `[DOC]`
> *"When the user requesting access isn't signed in, the auth variable is null."*
> — *Security Rules and Firebase Authentication*

`[DERIVED]` Therefore with zero auth, every rule is effectively `allow read, write: if true` — the documented anti-pattern that Firebase labels "NEVER use in production". For a friends-only app that is *survivable* (a stranger would need the project ID), but it means **rules enforce nothing** and the "privacy" is purely a UI-level convention. Nobody can be prevented from reading the whole database.

**F3 — The project owner bypasses rules.** `[DOC]`
> *"The server client libraries bypass all Cloud Firestore Security Rules and instead authenticate through Google Application Default Credentials."*
> — *Control access to specific fields*, Firestore docs

`[DERIVED]` The admin created the Firebase project, so the admin holds Owner/Editor IAM on it. Two bypasses are therefore always available to them regardless of any rule this app ships:
1. **The Firebase Console → Firestore Data tab**, which renders raw collection data with no rules applied.
2. **`gcloud firestore` / the Admin SDK / the Firestore REST API with an OAuth token** from their own Google account.

**No security rule, data-model trick, encryption-at-rest setting, or client obfuscation can prevent this.** It is the same authority that could read the data file off the server disk. Any architecture claiming otherwise is wrong.

**F4 — Anonymous Auth is the minimum viable identity.** `[DOC]` Anonymous sign-in gives a server-issued, unforgeable `uid` with `request.auth.token.firebase.sign_in_provider === 'anonymous'`. It requires **no password, no OAuth provider, no login UI** — one `signInAnonymously(auth)` call. The user experience stays exactly as PROJECT.md specifies (type a name, enter). Note that PROJECT.md's Out-of-Scope line is *"Autenticación con **contraseña** / **OAuth**"* — anonymous auth is neither, so it is compatible with the stated scope while being the thing that makes rules meaningful.

### What each approach buys you — the honest matrix

The four options in the research question, scored against the real threat model. "Attacker" is split because the answer differs fundamentally.

| Approach | Other participant reads pairing? | **Admin (project owner) reads pairing?** | Ops cost | Verdict |
|---|---|---|---|---|
| **(a) Roles + mapping inside one `events/main` doc** (embedded arrays/maps) | **Yes, trivially.** The lobby must stream this doc, and F1 says a doc-read has no field granularity. | Yes | Lowest | **Reject.** Structurally impossible to satisfy the core requirement. |
| **(b) Mapping in its own collection with a per-document access-intent field** (e.g. `readableBy: [uid]`) | **No — with anon auth.** Rule: `request.auth.uid in resource.data.readableBy`. | Yes (F3) | Low, but adds an ACL field that can drift | **Acceptable, but strictly worse than (c).** See caveat below. |
| **(c) Recipient stored only on the giver's own document** — `assignments/{giverUid}` + rule `request.auth.uid == giverUid` | **No — with anon auth.** Nobody else can `get` it, and a `list` is denied outright. | Yes (F3) | Lowest | **RECOMMEND.** Ownership is encoded in the **path**, so no ACL field exists to drift or be tampered with. |
| **(d) Same as (c) but with no auth at all** | **No, only by convention.** Rules can't check `uid`, so the rule is `allow read: if true` and any participant with the project config can read all pairings from DevTools. | Yes | Zero | **Reject if privacy matters at all.** Use (c) + anon auth. |

**Caveat on (b), the ACL-field variant.** A per-document `readableBy` array *does* work for `get`, and `array-contains` *can* make a `list` query provably safe. But it only works if the document is **write-once and immutable** — `allow update, delete: if false`. Otherwise a client can simply add themselves (or the admin) to `readableBy`. The path-encoded form (c) has no such failure mode: you cannot write `request.auth.uid` into a path segment you don't own. **Use (b) only where the authorised reader is not the document's natural owner** — the one place in this app is `orders/{giverUid}`, which needs to be readable by *both* its owner and the admin. There, express it as a rule predicate, not a stored field:

```
allow read: if request.auth.uid == giverUid || isAdmin();
```

**So the final model is (c) for the mapping and (b)-as-a-rule-predicate for orders.** No ACL fields exist in the schema at all.

### Where a client-only app cannot win, stated plainly

Put this in the roadmap as an accepted, documented limitation, not a defect:

| Adversary | Can they see the pairing? | Why | Realistic mitigation |
|---|---|---|---|
| A **participant** who opens DevTools and runs `collection('assignments').get()` | **No** (with anon auth) | `[DOC]` *"Cloud Firestore security rules evaluate each query against its potential result and fails the request if it could return a document that the client does not have permission to read."* Their uid ≠ any other giver's uid. | Ship rules + anon auth; test this exact query in the Rules Playground / Emulator and screenshot the denial as evidence. |
| A **participant** who guesses another participant's uid path | **No** (with anon auth) | Direct `get` on `assignments/{otherUid}` fails the `request.auth.uid == giverUid` predicate. | Same as above. |
| The **admin, in the app UI** | **No** | The UI never renders the mapping and the export module has no mapping parameter | Module boundary + code review. This is the *only* adversary the UI can actually defeat. |
| The **admin, reading Firestore directly** (Console / Admin SDK / REST) | **Yes, fully.** | **F3.** Project-owner IAM bypasses all rules. | **Nothing in a client-only design can stop this.** See the mitigation ladder below. |
| The **admin, watching the draw run in their own browser** | **Yes, fully.** | The admin triggers the draw, so the entire permutation is in their browser's memory for the duration of `buildDerangement()`. A DevTools breakpoint on that function reveals it. | Social, not technical: the admin is your friend and the requirement is that the app *not surface* it, not that it be cryptographically impossible. Do not add client-side obfuscation — it is theatre that costs maintenance. |

**Mitigation ladder for the "admin reads Firestore directly" row — pick the rung you can defend:**

1. **Do nothing technical; document the trust contract** (recommended for this milestone). The admin owns the Firebase project; the app's job is to make the pairing *unavailable by accident*. Add one line to the README: *"The app never displays the pairing to the admin. An admin who opens the Firebase Console can see raw data; by participating you accept that."* Cost: zero. Honest. Sufficient for a group of friends.
2. **Shrink the blast radius (cheap, do this too).** Never store the full mapping in one document, never store a draw *seed*, and make `assignments/*` write-once. Then even the Console shows the admin a list of opaque `{recipientId, recipientName}` docs they must *choose* to assemble into a graph. A leaked-by-overview accidental reveal becomes impossible; only a deliberate act reveals it. `[DERIVED]` but directly supported by F1.
3. **Don't persist the mapping at all (variant).** Draw in the admin's browser, then write each assignment straight to `assignments/{giverUid}` and never keep the array anywhere. This is already what the recommendation does — the point is that no intermediate "draw result" document ever exists. Reinforces rung 2.
4. **Add the minimum trusted component (the only real fix).** A single Cloud Function (`onCall`, admin SDK, bypasses rules by design) that owns the draw: it reads participants, draws, writes assignments, and returns **only the caller's own pair**. The admin's client never receives the permutation. This is a *real* solution and it is ~40 lines — but it requires the Blaze plan (Cloud Functions are not on Spark) and therefore a billing account, and PROJECT.md explicitly puts "Backend propio / API REST" out of scope. **Recommend: park this as a documented future upgrade path in the roadmap, not a milestone deliverable.** It is the correct answer to "how do we actually guarantee it", and the roadmap should say so out loud so the limitation is an informed choice rather than an oversight.

### The `size`-correlation side-channel `[DERIVED]`

Even with the recommended model there is a weak statistical leak worth knowing about: the lobby exposes each participant's **own declared size** (`participants/{uid}.size`), and each order exposes the size chosen **for the recipient**. Since an order's size *should* equal the recipient's declared size, and exactly one order exists per participant, an admin can correlate `order.size` against `participant.size` to *narrow* candidates.

Why it is not a practical problem at this scale:
- Size is a **6-value bucket** (S/M/L/XL/XXL/XXXL, plus Fan-letter aliases). Across ~6–12 friends, collisions are the norm, so most orders have several candidate recipients.
- The order document is keyed by the **giver**, not the recipient, and **must not contain `recipientId`**. Without that field the correlation is a heuristic, never a proof.
- Mitigation if you want it gone: make the admin export omit the giver's name (the seller does not need to know who placed the order — only the jersey specs). Then the admin's export surface carries no per-giver data at all and the correlation has nothing to attach to.

**Design rule that follows:** `orders/{giverUid}` = `{size, kitType, team, season, printName, number}` and **no** `recipientId`, **no** `recipientName`. The recipient's name lives only in `assignments/{giverUid}`. The jersey spec is the giver's *intent for* the recipient and is deliberately de-identified.

---

## Firestore Data Model

### Topology decision: single doc vs subcollections vs flat top-level

| Option | Shape | Pros | Cons | Verdict |
|---|---|---|---|---|
| **Single document** | `events/main` with embedded `participants[]`, `orders[]`, `assignments{}` | One listener streams everything; 1 read to render the whole app; impossible to get out of sync | **Fails the privacy requirement outright** (F1 — the lobby must read this doc, so the mapping in it is world-readable via the doc); every participant join re-sends the entire doc to every listener; approaches the 1 MiB document ceiling with long preference text | **Reject** |
| **Flat top-level + `eventId` field** | `participants`, `orders`, `assignments` all at root, each carrying `eventId` | Easy collection-group-free queries; multi-event ready; paths stay short | Multi-event is explicitly Out-of-Scope (`PROJECT.md`), so this buys nothing today; every query needs a `where('eventId','==',…)` composite index; you must remember the filter or you leak across events | **Reject as premature** |
| **Subcollections under `events/{eventId}`** | `events/main/participants/{uid}`, `…/assignments/{giverUid}`, `…/orders/{giverUid}` | The lobby listener subscribes to *only* `participants`, so it structurally never reads `assignments`; each subcollection gets its own independent rule; co-location makes "one event" self-evident with no repeated `eventId` field; natural 1-1 join by identical document ID across subcollections | `[DOC]` rules do **not** inherit into subcollections — each needs its own `match` block; `[DOC]` deleting a parent doc does not delete subcollections (irrelevant: this event is never deleted) | **RECOMMENDED** |

**Why subcollections win here, in one sentence:** the privacy boundary in this app is *"the lobby stream and the export path must never touch the pairing collection"*, and putting the pairing in a sibling subcollection makes that boundary expressible as a **subscription you simply never open** — not as a filter you must remember to add.

### Recommended schema (concrete)

```
events/{eventId}                       # eventId is the fixed literal "main" (single-event app)
  ├── participants/{uid}               # lobby; readable by everyone with a session
  ├── assignments/{giverUid}           # THE SECRET. readable only by its own giver. write-once.
  └── orders/{giverUid}                # readable by its giver OR the admin. contains NO recipient.
```

Using a fixed `"main"` document ID is deliberate: it removes every "which event am I in?" question, keeps rules fully static, and makes the whole database one predictable URL. It also means the bootstrap race (two people joining at once) is trivially arbitrated on a single known document.

#### `events/main`

| Field | Type | Notes |
|---|---|---|
| `adminUid` | `string` | **Write-once.** The authorization source of truth. Set by the first writer only. |
| `status` | `'lobby' \| 'drawn' \| 'closed'` | Gates the draw. `lobby` → `drawn` happens exactly once, inside the draw transaction. |
| `name` | `string` (optional) | Cosmetic label, e.g. "Amigo Invisible 2026". |
| `createdAt` | `Timestamp` | `serverTimestamp()`. |
| `drawnAt` | `Timestamp \| null` | Set with `status:'drawn'`. Shown in the lobby as "sorteo realizado el …". |
| `drawVersion` | `number` | Monotonic counter starting at 0, incremented in the draw transaction. **Keep it — it is a UI convenience, not a privacy leak** (it says *that* a draw happened, never *who* got whom). |

**Explicitly absent: no `assignments` map, no `seed`, no `permutation`, no `drawResult`.** If a `seed` existed, anyone could recompute the mapping from it — storing the seed to make the draw "verifiable/auditable" directly destroys the product's core value. Do not add it.

```jsonc
// events/main
{
  "adminUid":  "aB3x…",          // the first person who opened the app and joined
  "status":    "drawn",
  "name":      "Amigo Invisible 2026",
  "createdAt": "2026-11-01T19:04:11Z",   // Timestamp
  "drawnAt":   "2026-11-08T21:37:02Z",   // Timestamp
  "drawVersion": 1
}
```

#### `events/main/participants/{uid}` — the lobby, readable by all

Document ID = the participant's Auth `uid`. This is what makes the lobby a one-liner and what makes "which participant am I?" a lookup rather than a search.

| Field | Type | Notes |
|---|---|---|
| `uid` | `string` | Redundant with the doc ID; keep it so `onSnapshot` mapping is uniform across collections. |
| `name` | `string` | The only identity the user types. `trim()` before write; enforce `size() > 0 && size() <= 40` in rules. |
| `size` | `'S'\|'M'\|'L'\|'XL'\|'XXL'\|'XXXL'` | The participant's **own** size. Must NOT be a Fan/Player alias (`P`,`G`,`GG`,…) — normalise at the form boundary. |
| `likes` | `string` | Free text. `size() <= 300` in rules. |
| `bans` | `string` | Free text, same limit. |
| `joinedAt` | `Timestamp` | `serverTimestamp()`; the lobby sort key. |
| `orderSubmitted` | `boolean` | Denormalised flag so the admin sees progress **without reading `orders`**. See the extra-reads note below. |

```jsonc
// events/main/participants/aB3x…
{
  "uid": "aB3x…",
  "name": "Marta",
  "size": "M",
  "likes": "Real Madrid, selección argentina",
  "bans": "Barcelona",
  "joinedAt": "2026-11-01T19:04:11Z",
  "orderSubmitted": true
}
```

> **`orderSubmitted` is a deliberate denormalisation.** It exists so the lobby and the admin progress view do not have to read `orders`. Cost: two writes must be kept consistent (the order write and the flag). Because the flag is set by the same user who owns the order and it carries no private information, a stale flag can only mis-report progress — it cannot leak anything. **Alternative if you prefer a single source of truth:** the admin's progress view computes `participants.length` vs `orders.length` from the two listeners it already holds. Both are fine; the flag is cheaper, the computed version is drift-free. Pick one in the plan and do not do both.

#### `events/main/assignments/{giverUid}` — **the secret**

Document ID = the **giver's** uid. That single choice is the whole privacy mechanism: it makes the rule `request.auth.uid == giverUid` and it makes a `list` inherently impossible to authorise.

| Field | Type | Why it's there |
|---|---|---|
| `giverUid` | `string` | Redundant with doc ID (uniform mapping + rule self-documentation). |
| `recipientId` | `string` | The **only** place the pairing exists. |
| `recipientName` | `string` | Denormalised so the reveal screen renders from one read, and so the giver never needs a `participants` lookup to see who they got. `[COMMUNITY]` guidance for Firestore is to denormalise when it saves a read; the cost is a rename becoming stale, which is acceptable in a single-session event and can be mitigated by copying the name at draw time. |
| `drawnAt` | `Timestamp` | Audit/UI. |

```jsonc
// events/main/assignments/aB3x…     (Marta is the giver)
{
  "giverUid":      "aB3x…",
  "recipientId":   "kR9m…",
  "recipientName": "Iván",
  "drawnAt":       "2026-11-08T21:37:02Z"
}
```

**Write-once by rule** (`allow update, delete: if false`). Nothing in the app ever edits an assignment after the draw. This is what makes it safe that no ACL field gates who may read it.

#### `events/main/orders/{giverUid}` — the export payload

Document ID = the **giver's** uid (one order per person — the requirement is "each participant places one order").

| Field | Type | Notes |
|---|---|---|
| `giverUid` | `string` | Who placed the order. Used only for the admin's "who's missing" view. |
| `giverName` | `string` | Denormalised for the admin list. **Omit this field from the CSV/TXT export** (see the size-correlation side-channel above). |
| `size` | `'S'\|'M'\|'L'\|'XL'\|'XXL'\|'XXXL'` | The size chosen **for the recipient**. |
| `kitType` | `'Fan'\|'Player'\|'Retro'` | Drives the reference price lookup at render time — do **not** store a computed price (it would duplicate the static table and go stale). |
| `team` | `string` | e.g. "Real Madrid". |
| `season` | `string` | Free text (e.g. "2025/26"). Player/Retro seasons matter more; keep it a string rather than an enum — vintage years are open-ended. |
| `printName` | `string` | Name to be printed. Allow empty. Max ~20 chars (real shirt-lettering limits). |
| `number` | `number` | Shirt number. **Validate 0–99.** Store as a **number**, not a string — and handle the leading-zero problem in the *export serialiser*, not in the schema. |
| `updatedAt` | `Timestamp` | `serverTimestamp()` on every save. |

```jsonc
// events/main/orders/aB3x…     (Marta's order, for whoever she got)
{
  "giverUid":  "aB3x…",
  "giverName": "Marta",
  "size":      "L",
  "kitType":   "Player",
  "team":      "Real Madrid",
  "season":    "2025/26",
  "printName": "IVÁN",
  "number":    7,
  "updatedAt": "2026-11-08T22:10:44Z"
}
```

**`number` and the leading-zero trap** `[DOC]`/`[COMMUNITY]`: Excel strips leading zeros and converts long numerics to scientific notation when it opens a CSV. If you store the number as a number and emit it bare, `07` becomes `7`. Two clean options: (1) pad in the serialiser (`String(number).padStart(2,'0')`) — usually the right call for shirt numbers; or (2) emit the Excel-safe form `="07"`. Prefer (1): it is plain-text-friendly and the `.txt` variant stays readable. **Also emit a UTF-8 BOM (`\uFEFF`) as the first character of the blob** — `[DOC]` without a BOM, Excel on Windows reads UTF-8 as the legacy Windows-1252 code page and destroys accents (which matters here: `IVÁN`, `Málaga`, `São Paulo`).

### Role representation: `role` field vs separate role collection vs derived

| Option | Where admin lives | Rule shape | Problem |
|---|---|---|---|
| Role field on participant | `participants/{uid}.role === 'admin'` | `resource.data.role == 'admin'` | **Dangerous.** The participant doc is client-writable. If any rule authorises on `role`, a client can `setDoc` themselves to `'admin'`. Rules cannot prevent this without a `get()` into the event doc — at which point you may as well read the real source. |
| Separate `role`/`admins` collection | `/admins/{uid}` exists ⇒ admin | `exists(/databases/$(db)/documents/admins/$(uid))` | This is the pattern in Firebase's own docs, and it is fine — but it costs a **billable read on every rule evaluation** `[DOC]` (*"reads embedded in your rules are billed operations"*), and it creates a **bootstrap problem**: the rule that creates the first admin can't require an existing admin, so you need an open-create window or a manual Console step. |
| **Derived from `events/main.adminUid`** | `events/main.adminUid === request.auth.uid` | `get(/databases/$(db)/documents/events/main).data.adminUid == request.auth.uid` | **RECOMMENDED.** One `get` of the document the app already subscribes to; the call is **cached within a request and does not count twice** `[DOC]`; and `adminUid` is write-once so it cannot be hijacked. |

**Recommendation: authorise on `events/main.adminUid` only. Keep a redundant `role` field on the participant document for *rendering* ("how should the lobby badge me?") but never reference it in a rule.**

> **Architectural invariant, worth writing into the plan's constraints: `request.resource.data` and `resource.data` on a client-writable document are *data*, never *authority*. The only document whose fields may authorise anything is one that rules make write-once.**

### The bootstrap race — "first user becomes admin"

`PROJECT.md` decides that the first user to create the event becomes the admin. The naive implementation (`get` → `if (!exists) set`) has a **read-modify-write race**: `[DOC]` *"Without a transaction, if the entity does not exist and two users attempt to create it, the second overwrites the first without knowing that it happened."* Two people tapping "Entrar" simultaneously at the same moment would silently swap admin.

**Fix: bootstrap inside a transaction, and make the participant write idempotent.**

```ts
// src/lib/firestore/joinEvent.ts            (L0 — no React, no UI)
import { doc, runTransaction, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const EVENT_REF = doc(db, 'events', 'main');

export async function joinEvent(args: {
  uid: string;
  name: string;
  size: Size;
  likes: string;
  bans: string;
}) {
  // 1. Claim-or-join atomically. A concurrent second caller retries, re-reads,
  //    sees the doc now exists, and becomes a member instead of the admin.
  const adminUid = await runTransaction(db, async (tx) => {
    const snap = await tx.get(EVENT_REF);              // reads MUST precede writes [DOC]
    if (snap.exists()) {
      return snap.data().adminUid as string;           // someone already claimed it
    }
    tx.set(EVENT_REF, {
      adminUid: args.uid,
      status: 'lobby',
      createdAt: serverTimestamp(),
      drawnAt: null,
      drawVersion: 0,
    });
    return args.uid;
  });

  // 2. Idempotent participant upsert — safe to re-run if the user reloads and
  //    rejoins. merge:true means a re-join never wipes their preferences.
  await setDoc(
    doc(db, 'events', 'main', 'participants', args.uid),
    {
      uid: args.uid,
      name: args.name.trim(),
      size: args.size,
      likes: args.likes,
      bans: args.bans,
      joinedAt: serverTimestamp(),
      orderSubmitted: false,
    },
    { merge: true },
  );

  return { adminUid, isAdmin: adminUid === args.uid };
}
```

**Two documented transaction constraints that shape this code** `[DOC]`:
- *"Read operations must be executed before write operations."* → read `EVENT_REF` first, then `tx.set`. Never interleave.
- *"Transaction functions should not directly modify application state."* → do **not** call `setIsAdmin(...)` inside the callback. It may run more than once on contention; return the value and update state after `await` resolves. Violating this produces a state that flickers or, worse, lands on the value from a discarded retry.

---

## Security Rules Sketch (and exactly what they do not protect)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── helpers ──────────────────────────────────────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }
    // One get(); cached per request, so calling this from many allow
    // expressions costs ONE document read, not one per call. [DOC]
    function eventDoc() {
      return get(/databases/$(database)/documents/events/main).data;
    }
    function isAdmin() {
      return isSignedIn() && eventDoc().adminUid == request.auth.uid;
    }
    function inLobby() {
      // Guard the draw: assignments may only be created while status == 'lobby'
      return eventDoc().status == 'lobby';
    }
    function isDrawn() {
      return eventDoc().status == 'drawn';
    }

    match /events/main {
      // Everyone with a session reads the event (status, adminUid, drawnAt).
      // Nothing secret lives here — that is the whole point of the schema.
      allow read: if isSignedIn();

      // BOOTSTRAP: any signed-in user may create it, but ONLY naming himself
      // admin. This is what makes "first user becomes admin" work.
      allow create: if isSignedIn()
                    && request.resource.data.adminUid == request.auth.uid
                    && request.resource.data.status == 'lobby'
                    && request.resource.data.drawVersion == 0;

      // adminUid is IMMUTABLE — otherwise the admin claim could be hijacked
      // and this whole ruleset collapses. [DERIVED, but load-bearing]
      allow update: if isAdmin()
                    && request.resource.data.adminUid == resource.data.adminUid
                    && request.resource.data.status in ['drawn', 'closed']
                    && request.resource.data.drawVersion >= resource.data.drawVersion;

      allow delete: if false;
    }

    match /events/main/participants/{uid} {
      // The lobby. Readable by every participant — by design. It contains
      // each person's OWN preferences, never anybody's pairing.
      allow read: if isSignedIn();

      // You may only write your own participant document.
      allow create, update: if isSignedIn()
                            && request.auth.uid == uid
                            && request.resource.data.uid == uid
                            && request.resource.data.name is string
                            && request.resource.data.name.size() > 0
                            && request.resource.data.name.size() <= 40
                            && request.resource.data.size in ['S','M','L','XL','XXL','XXXL']
                            && request.resource.data.likes.size() <= 300
                            && request.resource.data.bans.size() <= 300;

      allow delete: if false;   // a participant leaving is out of scope
    }

    match /events/main/assignments/{giverUid} {
      // ╔══════════════════════════════════════════════════════════════════╗
      // ║ THE PRIVACY BOUNDARY. `get` is allowed only for your own doc, and ║
      // ║ `list` is denied implicitly: Firestore evaluates a query against  ║
      // ║ its potential result and rejects it if it could return a doc the  ║
      // ║ client may not read. An unfiltered collection('assignments')      ║
      // ║ therefore FAILS for everyone, including the admin, at the SDK     ║
      // ║ level. [DOC]                                                      ║
      // ╚══════════════════════════════════════════════════════════════════╝
      allow get: if isSignedIn() && request.auth.uid == giverUid;

      // Only the admin, only while the event is still in the lobby, and the
      // field shapes must match what runDraw() writes.
      allow create: if isAdmin()
                    && inLobby()
                    && request.resource.data.giverUid == giverUid
                    && request.resource.data.recipientId is string
                    && request.resource.data.recipientId != giverUid   // belt-and-braces:
                                                                       // nobody gifts himself
                    && request.resource.data.recipientName is string;

      // WRITE-ONCE. Also blocks the admin from rewriting the pairing after
      // the draw is published.
      allow update, delete: if false;
    }

    match /events/main/orders/{giverUid} {
      // Your own order, or the admin's export/progress view.
      allow get, list: if isSignedIn()
                       && (request.auth.uid == giverUid || isAdmin());

      allow create, update: if isSignedIn()
                            && request.auth.uid == giverUid
                            && isDrawn()                       // no ordering before the draw
                            && request.resource.data.giverUid == giverUid
                            && request.resource.data.size in ['S','M','L','XL','XXL','XXXL']
                            && request.resource.data.kitType in ['Fan','Player','Retro']
                            && request.resource.data.team is string
                            && request.resource.data.team.size() <= 60
                            && request.resource.data.season.size() <= 20
                            && request.resource.data.printName.size() <= 20
                            && request.resource.data.number is int
                            && request.resource.data.number >= 0
                            && request.resource.data.number <= 99;

      allow delete: if false;
    }

    // Deny everything not matched above (explicit, so a future
    // collection is closed by default).
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Rules facts that shaped this file (all `[DOC]`)

| Fact | Consequence here |
|---|---|
| Rules are combined as **OR**, not AND. A broad grant cannot be narrowed by a more specific one. | The trailing `match /{document=**}` deny is deliberately last and deliberately narrow. **Never add a `match /{document=**}` allow** — it would open every collection including `assignments`. The compiler warns on overlapping paths. |
| `[DOC]` *"Match blocks do NOT inherit into subcollections."* Only `{document=**}` recursive wildcards propagate. | `events/main`, `participants`, `assignments` and `orders` each need their own explicit `match` block. This is a feature here — it is what lets `assignments` have an entirely different rule from `participants`. |
| Rules v2 `{document=**}` matches **zero or more** path items; v1 matches one or more. | `rules_version = '2';` is on line 1. Required anyway for collection-group queries. |
| Max `exists()`/`get()`/`getAfter()` calls per request: **10** single-doc/query, **20** multi-doc reads / transactions / batched writes; same-document calls are cached and don't recount. | The `runDraw` transaction writes N assignment docs and calls `eventDoc()`/`isAdmin()` across all of them → many *expressions*, but **one cached read of `events/main`**. Comfortably inside the limit for N ≤ ~20. Re-verify if N balloons. |
| Rules **functions may not recurse**; call-stack depth ≤ 10. | The helpers above are all single-level. Do not write `isAdmin() → isMemberOfGroup() → isAdmin()`. |
| `[DOC]` *"Allowing read access only for specific fields… impossible using security rules alone."* | Why `recipientId` is in its own collection rather than a field of `participants`. |
| `[DOC]` A query must be *provably* safe against the rule or the whole request is denied. | The client must use `get`-by-document-ID for `assignments`. **Do not write `getDocs(collection(...,'assignments'))` anywhere in the app.** It will throw `permission-denied` — and that throw is your regression test. |
| `[DOC]` *"The server client libraries bypass all Cloud Firestore Security Rules."* | The admin's Console/Admin-SDK access is outside this file's reach. Documented limitation, see the privacy section. |

### Verify these rules against the Emulator before trusting them `[DERIVED]`

The rules above are my design, not copied from a doc. Two of them encode assumptions worth a real test:

1. **Anonymous Auth gives a `request.auth.uid`** and the participant rule binds to it. (Straightforward; assert it.)
2. **`assignments` list is genuinely denied for the admin.** Assert `getDocs(collection(db,'events','main','assignments'))` fails with `permission-denied` *as the admin*. This is the single most valuable test in the project — it is the executable form of the product requirement. The Emulator Suite / Rules Playground is the documented way to do it, and it costs nothing.

```ts
// rules test sketch — assertions in prose, framework choice is the planner's
// as ANON user X:   getDoc(assignments/X)      -> ALLOWED
// as ANON user X:   getDoc(assignments/Y)      -> DENIED
// as ANON user X:   getDocs(assignments)       -> DENIED   (the critical one)
// as ADMIN:         getDocs(assignments)       -> DENIED   (the critical one)
// as ADMIN:         getDoc(assignments/X)      -> DENIED   (admin has no special read here)
// as ADMIN:         getDocs(orders)            -> ALLOWED
// as ANON user X:   getDocs(orders)            -> DENIED
// as ANON user X:   setDoc(participants/X)     -> ALLOWED
// as ANON user X:   setDoc(participants/Y)     -> DENIED
// as ANY user:      update(events/main, {adminUid: self}) -> DENIED
```

### Cost note: the admin's `get()` rule is a billable read `[DOC]`

`isAdmin()` performs a `get(events/main)` on every rule evaluation that calls it. `[DOC]` *"reads embedded in your rules are billed operations"* — cached per request, but still one read per write request. With ~10 participants this is irrelevant against the 50,000 reads/day free tier. The practical rule: **do not mount `useOrdersAdmin()` on the lobby route.** If the lobby subscribed to `orders` for everyone, every participant would incur an admin-check read plus N order reads on every render of the lobby. Mount it only on the admin route, behind `isAdmin`.

---

## The Draw: Algorithm and Atomic Write

### Algorithm — shuffle-then-offset, not rejection sampling

Two candidate algorithms. Only one of them satisfies `PROJECT.md`'s "sorteo **circular**" constraint:

| Algorithm | Result | Fixed points? | Mutual pairs (A↔B)? | Single cycle? |
|---|---|---|---|---|
| Rejection sampling: shuffle, reject if any `p[i] === i`, repeat | Uniform over **derangements** | None | **Possible** for n ≥ 4 | **Not guaranteed** — can produce e.g. `{A→B, B→A, C→D, D→E, E→C}` |
| **Shuffle + offset-by-one**: shuffle the list, then `shuffled[i] → shuffled[(i+1) % n]` | Uniform over **cyclic permutations** (`(n−1)!` of them) | **None, by construction** | **Impossible for n ≥ 3** (a 2-cycle cannot exist inside a single n-cycle) | **Yes, always exactly one cycle** |

`[DOC/COMMUNITY]` The rejection approach is what the well-known Stack Overflow answer describes (*"The fraction of all permutations which are derangements approaches 1/e ≈ 36.8%"*) — it is the classic answer to "how do I avoid self-assignment", and it is the **wrong** answer for this product. `PROJECT.md` says *"debe ser un ciclo circular (derangement en ciclo) — nadie se regala a sí mismo y todos regalan y son regalados exactamente una vez"*. The offset form gives that **structurally**, with no retry loop, no unbounded iteration, and O(n).

```ts
// src/domain/derangement.ts        (L1 — pure, no Firestore, no React)
export type DrawPair = { giverUid: string; recipientId: string };

/**
 * Build a single-cycle Secret Santa assignment.
 *
 * Property: for every pair, giverUid !== recipientId.
 * Property: the resulting mapping is ONE cycle of length n.
 * Property: for n >= 3 there can be no mutual (A gives B AND B gives A) pair.
 *
 * Requires n >= 2. For n === 2 the result is necessarily the 2-cycle A<->B.
 */
export function buildDerangement(
  uids: readonly string[],
  rng: () => number = secureRandom,
): DrawPair[] {
  const n = uids.length;
  if (n < 2) throw new Error('Se necesitan al menos 2 participantes para el sorteo.');
  if (new Set(uids).size !== n) throw new Error('UIDs duplicados en el sorteo.');

  // Fisher–Yates on a copy. Unbiased, O(n).
  const order = [...uids];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // Offset by one around the shuffled ring: index i gives to index i+1.
  // Because we never map i -> i, nobody gifts themselves — with no retries.
  return order.map((giverUid, i) => ({
    giverUid,
    recipientId: order[(i + 1) % n],
  }));
}

// crypto.getRandomValues beats Math.random for one extra line, and removes
// any doubt about predictability. Not strictly necessary for a gift draw.
function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;   // [0, 1)
}
```

**Injecting `rng` is not over-engineering.** It is what lets you write the three assertions above as ordinary unit tests with a seeded generator — including the embarrassing-case test that `order[i] !== order[(i+1)%n]` for all i, which is the actual product requirement.

**Why not store the seed for "auditability":** a stored seed lets anyone recompute the whole permutation. Auditability and secrecy are in direct conflict here, and secrecy is the product. Do not add a seed field.

### Atomic write — `runTransaction`, not `writeBatch`

Both are atomic (`[DOC]` *"In a set of atomic operations, either all of the operations succeed, or none of them are applied"*). The difference is the **guard**:

- `writeBatch` is write-only — it cannot read, so it **cannot check `status === 'lobby'`**. Two admins (or one double-click, or a reload mid-draw) could run the draw twice.
- `runTransaction` can read first, then write. It **retries on contention** and would re-read `status === 'drawn'` on the second attempt and abort.

For the draw, `runTransaction` is the correct primitive:

```ts
// src/lib/firestore/runDraw.ts          (L0 — thin adapter)
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { buildDerangement } from '../../domain/derangement';

const EVENT_REF = doc(db, 'events', 'main');

export async function runDraw(participantIds: readonly string[], adminUid: string) {
  // Compute the permutation OUTSIDE the transaction. It is pure and may be
  // expensive-ish; recomputing it on every contention retry would be wasteful
  // and would silently vary the result between retries.
  const pairs = buildDerangement(participantIds);

  // NOTE: transaction functions may run MORE THAN ONCE. Keep the callback free
  // of side effects; return a value and let the caller setState afterwards. [DOC]
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(EVENT_REF);        // reads before writes [DOC]
    if (!snap.exists()) throw new Error('El evento no existe.');

    const ev = snap.data();
    if (ev.adminUid !== adminUid) throw new Error('Solo el admin puede hacer el sorteo.');
    if (ev.status !== 'lobby') {
      // Idempotent under a double-click / two-tab race: the second attempt
      // aborts cleanly instead of reshuffling everybody's gift.
      return { alreadyDrawn: true as const, version: ev.drawVersion as number };
    }

    for (const { giverUid, recipientId } of pairs) {
      const recipientName =
        /* resolved by the caller from the participants listener, or re-read here */
        '';
      tx.set(doc(db, 'events', 'main', 'assignments', giverUid), {
        giverUid,
        recipientId,
        recipientName,
        drawnAt: serverTimestamp(),
      });
    }

    tx.update(EVENT_REF, {
      status: 'drawn',
      drawnAt: serverTimestamp(),
      drawVersion: (ev.drawVersion ?? 0) + 1,
    });

    return { alreadyDrawn: false as const, version: (ev.drawVersion ?? 0) + 1 };
  });

  // Only now is it safe to touch React state.
  return result;
}
```

**Transaction facts that constrain this code** `[DOC]`:

| Fact | Handling |
|---|---|
| *"Read operations must be executed before write operations."* | `tx.get(EVENT_REF)` is the first statement in the callback. Never a read after the first `tx.set`. |
| *"a transaction function might run more than once if a concurrent edit affects a document that the transaction reads."* | `buildDerangement` is called **outside** the callback so the permutation is stable across retries, and the callback is side-effect free. |
| *"Transaction functions should not directly modify application state."* | No `setState`, no `router.navigate`, no toasts inside the callback. Return, then act. |
| *"Transactions will fail when the client is offline."* | The `runDraw` call site must surface an error and let the admin retry. Do not silently swallow it. |
| *"Time limit for a transaction: 270 seconds with a 60-second idle expiration."* | Irrelevant at this size; note it so nobody wraps a `prompt()` inside the callback. |
| Max field transformations per commit / transaction: **500**. | Writing N assignments + 1 event update = N+1 ≪ 500. Fine to ~400 participants. Not a real constraint here. |
| `[DOC]` Firestore resolves data contention by retrying, then failing with `ABORTED: Too much contention on these documents.` | Show a real error message, not a silent no-op. Contention here is one admin, so it should never fire — but a read-modify-write on `events/main` from the *lobby* would. Hence: **never write `events/main` on join except inside the bootstrap transaction.** |

**Why the guard matters even though `writeBatch` would produce a *consistent* result.** `[DERIVED]` A batched write of N assignments is all-or-nothing, so a double-draw would not leave a corrupt half-mapping — the second commit would simply overwrite every assignment consistently. But it *would* silently re-roll everybody's gift after the reveal screen had already shown them their recipient, which is a product bug, not a data bug. The `runTransaction` status guard is what prevents it, and it does so atomically.

### What the admin's reveal screen must NOT do

- **Do not** render or log the full `pairs` array. The admin's component receives `buildDerangement`'s output only transiently to hand it to `runDraw`; it must never be stored in React state, never `console.log`ged, never put in a context, and never written to a "draw result" document.
- **Do not** subscribe to `assignments` "just to show a count". A count is `participants.filter(p => p.orderSubmitted).length`.
- **Do not** add a "ver resumen del sorteo" admin feature. It is not in the requirements and it cannot be implemented without violating the core value.

---

## Recommended Project Structure

```
src/
├── main.tsx                    # createRoot; mounts <RouterProvider />
├── router.tsx                  # createBrowserRouter route table + guards
├── firebase.ts                 # initializeApp + getFirestore, from import.meta.env.VITE_*
├── index.css                   # Tailwind entry (@tailwind base/components/utilities)
│
├── domain/                     # L1 — PURE. no React, no firebase imports. unit-tested.
│   ├── derangement.ts          # buildDerangement()
│   ├── derangement.test.ts
│   ├── ordersExport.ts         # buildOrdersExport() -> { filename, mimeType, content }
│   ├── ordersExport.test.ts
│   ├── types.ts                # Size, KitType, Participant, Order, Assignment, EventDoc
│   ├── sizeGuide.ts            # Fan + Player rows, VERBATIM from PROJECT.md
│   └── prices.ts               # { Fan: 11, Player: 16, Retro: 15 }
│
├── lib/
│   └── firestore/              # L0 — thin adapters. the only place SDK verbs appear.
│       ├── joinEvent.ts        # runs the bootstrap-or-join transaction
│       ├── runDraw.ts          # runs the guarded draw transaction
│       ├── submitOrder.ts
│       ├── exportOrders.ts
│       ├── paths.ts            # doc(db,'events','main',…) helpers — single source of paths
│       └── download.ts         # Blob + <a download> + UTF-8 BOM prepend
│
├── session/
│   ├── SessionContext.tsx      # { uid, name, isAdmin, ready } + sign-in-once effect
│   └── useSession.ts           # useContext wrapper; throws if used outside provider
│
├── hooks/                      # L2 — the ONLY subscription layer
│   ├── useEvent.ts             # events/main
│   ├── useParticipants.ts      # lobby list, sorted by joinedAt
│   ├── useMyAssignment.ts      # GET BY DOC ID ONLY
│   ├── useMyOrder.ts
│   ├── useOrdersAdmin.ts       # mounted only on the admin route
│   └── useAsyncState.ts        # shared { data, loading, error } reducer + typing
│
├── components/                 # L3 — presentational, no firebase imports
│   ├── size-guide/
│   │   ├── SizeGuideModal.tsx  # focus trap, Esc to close, two tabs
│   │   └── SizeGuideTable.tsx  # renders one SizeGuideTable from sizeGuide.ts
│   ├── pricing/
│   │   └── PriceTable.tsx      # reads prices.ts
│   ├── orders/
│   │   ├── JerseyOrderForm.tsx # controlled form; validates; calls onSubmit(payload)
│   │   └── JerseyOrderSummary.tsx
│   ├── lobby/
│   │   ├── ParticipantList.tsx
│   │   └── ParticipantRow.tsx
│   └── ui/                     # Button, Input, Select, Modal, Badge, Spinner, ErrorState
│
├── pages/                      # L4 — route targets
│   ├── JoinPage.tsx            # name + preferences + SizeGuideModal  (or two steps)
│   ├── LobbyPage.tsx           # ParticipantList + admin "Empezar Sorteo"
│   ├── RevealPage.tsx          # "Te ha tocado regalar a X" + prefs + JerseyOrderForm + PriceTable
│   └── AdminPage.tsx           # progress + "Descargar Pedidos"
│
└── data/                       # (optional) if you prefer data/ over domain/ for statics
```

### Structure rationale

- **`domain/` is a hard boundary, not a convention.** `buildDerangement` and `buildOrdersExport` are the two functions that encode the product's two non-negotiable rules (single cycle; no pairing in the export). Keeping them free of Firestore and React means they can be unit-tested in milliseconds and — crucially — `buildOrdersExport(orders, participants)` has a signature that **cannot express** the mapping. Privacy becomes a type error, not a code-review catch.
- **`lib/firestore/` is the only place `firebase/firestore` is imported (besides `firebase.ts` and the hooks).** Component files importing `getDocs` is the anti-pattern that eventually puts a `collection('assignments').get()` into a render path.
- **`hooks/` is the only place `onSnapshot` appears.** Each hook owns exactly one subscription and returns `{ data, loading, error }`. This makes the "which components re-render on a Firestore change?" question answerable by reading one folder.
- **`pages/` vs `components/`:** a page is *what a route renders*; a component is *what something is made of*. Only pages know about routing. Only pages decide which hooks to mount. If a component needs `useParams`, it is a page.
- **`SessionContext` over a global store.** The session is the single piece of state that is genuinely app-wide and not streamable from Firestore. Everything else is either Firestore-owned (so the hook is the source of truth) or form-local (`useState`).

---

## Architectural Patterns

### Pattern 1: Real-time subscription with guaranteed teardown

**What:** Every Firestore read is an `onSnapshot` inside a custom hook, with the returned `Unsubscribe` function returned from the hook's `useEffect` cleanup.
**When to use:** Always, for anything the lobby, reveal, or admin screens display. Firestore is the source of truth; the hook is a projection of it.
**Trade-offs:** Costs a live listener per mount and re-reads on every change; eliminates all cache-invalidation and "refresh" logic. For ~10 docs this is free.

```ts
// src/hooks/useParticipants.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { paths } from '../lib/firestore/paths';
import type { Participant } from '../domain/types';

export function useParticipants() {
  const [data, setData] = useState<Participant[] | null>(null);   // null = loading
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, paths.participants()), orderBy('joinedAt', 'asc'));
    // onSnapshot returns the unsubscribe fn directly — no wrapper needed.
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        // Read from the snapshot argument, NEVER from closure state.
        setData(snap.docs.map((d) => d.data() as Participant));
        setError(null);
      },
      (err) => setError(err),      // a listener auto-detaches on error; re-attach to retry
    );
    return unsubscribe;            // ← MANDATORY. Omitting this leaks a listener per mount.
  }, []);                          // [] because the query is static; add deps if it becomes dynamic

  return { participants: data, loading: data === null && error === null, error };
}
```

**Two documented traps this avoids** `[COMMUNITY]`/`[DOC]`:
- **Omitting the cleanup.** *"Forgetting to unsubscribe is one of the most common sources of memory leaks in Firestore apps."* Under `React.StrictMode`, `useEffect` is deliberately **double-invoked in development** (mount → cleanup → mount), so a missing cleanup instantly shows up as **two** live listeners — which is exactly the dev-time signal you want. If you see doubled reads in the console, the cleanup is broken; do not "fix" it by removing StrictMode.
- **Reading state inside the callback.** The classic Stack Overflow bug is `setMessages([...snap.docs, ...messages])` inside the listener, where `messages` is always the stale `null` from the enclosing closure. `[COMMUNITY]` `querySnapshot` **always contains all documents matching the query**, not just the changed ones, so the correct handler is the one-liner `setData(snap.docs.map(...))`. Never accumulate.
- **Error callback required.** A listener that hits `permission-denied` is **automatically detached** and receives no further updates. Swallowing the error callback means the UI silently freezes with stale data. Always pass the second argument.

### Pattern 2: Route-level guard over session readiness (not over auth)

**What:** `createBrowserRouter` in data mode, with a single pathless layout route that renders `<SessionGate>` — which blocks on the session being `ready` and redirects to `/` if there is no identity.

```tsx
// src/router.tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useSession } from './session/useSession';

function SessionGate() {
  const { ready, uid } = useSession();
  if (!ready) return <FullScreenSpinner />;   // ← do NOT redirect while resolving
  if (!uid) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AdminGate() {
  const { isAdmin, ready } = useSession();
  if (!ready) return <FullScreenSpinner />;
  if (!isAdmin) return <Navigate to="/lobby" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/',        element: <LandingPage /> },                 // name entry + "create event"
  { path: '/join',    element: <JoinPage /> },                    // free-text name entry
  {
    element: <SessionGate />,                                     // pathless layout
    children: [
      { path: '/lobby',   element: <LobbyPage /> },
      { path: '/reveal',  element: <RevealPage /> },              // redirects to /lobby if not drawn
      { element: <AdminGate />, children: [
        { path: '/admin', element: <AdminPage /> },
      ]},
      { path: '*', element: <NotFoundPage /> },                   // catch-all; must be LAST
    ],
  },
]);
```

**Why a guard *component* rather than a router `loader`:** loaders run outside React context, so a loader cannot read `SessionContext`. You can read `localStorage` in a loader, but then the session has two sources of truth. Guard components are the pragmatic choice for a data-mode SPA whose data comes from listeners rather than loaders. **Do not mix the two** — if you use listener hooks, do not also use loaders for the same data.

**`ready` is not optional.** The classic freeze reported on Stack Overflow (`onAuthStateChanged` called in the render body instead of an effect) is the same class of bug: rendering a redirect before identity resolves bounces every reload back to the landing page. Always model three states — `pending`, `none`, `present` — never a boolean.

**Firebase Hosting note** `[COMMUNITY]`: with a SPA rewrite (`"source": "**" → "/index.html"`), Hosting cannot know which routes are valid, so the client needs the `path: '*'` catch-all route or users hitting a typo get a blank page.

### Pattern 3: Static reference data as typed modules, not Firestore documents

**What:** The size guide and the price list live in `domain/sizeGuide.ts` and `domain/prices.ts` as `const` typed exports. The modal and the price table render from them.
**When to use:** Always, for this project. `PROJECT.md` states these are fixed reference data.
**Trade-offs:** Changing a price requires a redeploy. Acceptable — and strictly better than the alternatives, which are (a) a Firestore collection nobody can access offline and which burns read quota, or (b) hard-coded JSX duplicated across the modal and the form.

```ts
// src/domain/prices.ts
export const PRICES = { Fan: 11, Player: 16, Retro: 15 } as const;
export type KitType = keyof typeof PRICES;      // 'Fan' | 'Player' | 'Retro'

// src/domain/sizeGuide.ts
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

export type SizeRow = {
  size: Size;
  alias?: string;        // Player only: the letter printed on the shirt
  length: string; width?: string; height: string; weight: string;
};

export const FAN_SIZES: readonly SizeRow[] = [
  // size  alias   length      height        weight        ← VERBATIM from PROJECT.md
  { size: 'S',   alias: 'P',   length: '69-71', height: '162-170', weight: '50-62'  },
  { size: 'M',   alias: 'M',   length: '71-73', height: '170-176', weight: '62-78'  },
  { size: 'L',   alias: 'G',   length: '73-75', height: '176-182', weight: '78-83'  },
  { size: 'XL',  alias: 'GG',  length: '75-78', height: '182-190', weight: '83-90'  },
  { size: 'XXL', alias: 'XG',  length: '78-81', height: '190-195', weight: '90-97'  },
  { size: 'XXXL',alias: '2XG', length: '81-83', height: '192-197', weight: '97-104' },
] as const;

export const PLAYER_SIZES: readonly SizeRow[] = [
  { size: 'S',   length: '67-69', width: '45-48', height: '165-172', weight: '60-70'  },
  { size: 'M',   length: '69-71', width: '48-51', height: '172-178', weight: '70-78'  },
  { size: 'L',   length: '71-73', width: '51-54', height: '178-184', weight: '70-78'  },
  { size: 'XL',  length: '73-75', width: '54-57', height: '184-190', weight: '78-86'  },
  { size: 'XXL', length: '75-77', width: '57-60', height: '190-198', weight: '94-104' },
] as const;
```

**Two data-quality issues the schema must absorb, or they will surface as UI bugs:**

| Issue | Consequence | Handling |
|---|---|---|
| **Player has no `XXXL` and uses `XXL` only** (Player tops out at 2XL; Fan goes to XXXL/2XG). | A participant whose `size` is `'XXXL'` has no Player row. `PLAYER_SIZES.find(r => r.size === size)` returns `undefined` → a crash or a blank row on the order screen. | Render the row with an explicit fallback ("No disponible en versión Player") and **warn in the order form when `kitType === 'Player' && size === 'XXXL'`**. Decide with the user whether to block it or warn. |
| **The Fan and Player tables use different letter systems** (Fan maps `S→P`, `L→G`; Player's `S/M/L` are the shirt's own letters). | If the size `Select` is shared between the preference form and the order form, users will not know whether "L" means the Fan `G` or the Player `L`. | The `SizeRow.alias` field exists for exactly this. The `Select` in the **preference form** is the canonical `Size` enum; the **table** is what disambiguates. Add a one-line note above the table: *"En versión Fan, tu talla europea es la columna «alias»."* |
| **The Player table repeats `70-78` as the weight range for both `M` and `L`.** | Looks like a transcription error. | Render it verbatim (the source data is authoritative) and flag it to the user as a probable typo in the source rather than silently "fixing" it. |
| `PROJECT.md` lists Player sizes as "S, M, L, XL, **2XL**" while Fan is "S…**XXXL**". | Two different enums. | Keep one `Size` enum (`S|M|L|XL|XXL|XXXL`) as the app-level vocabulary and let `alias` carry the Player letter. **Do not** create two enums — it would force a conversion at every boundary. |

### Pattern 4: Export as a pure serialiser behind a download shim

**What:** `buildOrdersExport(orders, participants)` returns `{ filename, mimeType, content }`. `download.ts` handles the DOM (Blob, object URL, `<a download>`, revoke).
**When to use:** Any "generate a file" feature.
**Trade-offs:** The pure half is testable (assert the CSV has N+1 lines, assert no giver→recipient column exists); the impure half is 10 lines you never have to think about.

```ts
// src/domain/ordersExport.ts        (L1 — pure)
import { PRICES, type KitType } from './prices';
import type { Order } from './types';

const HEADERS = ['Talla', 'Tipo', 'Equipo', 'Temporada', 'Serigrafía', 'Dorsal', 'Precio'];

export function buildOrdersExport(orders: readonly Order[]): {
  filename: string; mimeType: string; content: string;
} {
  const rows = orders.map((o) => [
    o.size,
    o.kitType,
    o.team,
    o.season,
    o.printName || '',
    String(o.number).padStart(2, '0'),      // ← the leading-zero fix lives HERE
    PRICES[o.kitType as KitType].toString(),
  ]);

  // RFC-4180-ish escaping: quote every field, double any inner quote.
  const csv = [HEADERS, ...rows]
    .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');                          // CRLF: Excel-friendly

  return {
    filename: 'pedidos-amigo-invisible.csv',
    mimeType: 'text/csv;charset=utf-8',
    content: csv,                            // BOM is prepended in download.ts
  };
}
```

```ts
// src/lib/firestore/download.ts     (impure — the only DOM/file code)
export function downloadText({ filename, mimeType, content }: {
  filename: string; mimeType: string; content: string;
}) {
  // \uFEFF = U+FEFF BOM. Without it, Excel-on-Windows reads the UTF-8 bytes as
  // Windows-1252 and mangles every accent (IVÁN -> IVÃN). [DOC]
  const blob = new Blob(['\uFEFF', content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);                  // ← do not leak the object URL
}
```

Notice `buildOrdersExport` **has no parameter that could carry the mapping**. That is the design. If a future requirement says "add the recipient's name to the export", the change would require altering this signature — a deliberate act, visible in review.

### Pattern 5: `get`-by-ID for secrets, `list` only for non-secrets

**What:** `useMyAssignment` uses `doc(db, paths.assignment(uid))`, never a collection query.
**When to use:** Any collection whose rule is `request.auth.uid == something`.
**Trade-offs:** You cannot render "how many people have seen their assignment" — which is not a requirement and would be a privacy leak anyway.

```ts
// src/hooks/useMyAssignment.ts
import { doc, onSnapshot } from 'firebase/firestore';

export function useMyAssignment(uid: string | null) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;                              // no identity -> no listener
    const ref = doc(db, 'events', 'main', 'assignments', uid);   // ← BY ID, always
    return onSnapshot(ref, (s) => setAssignment(s.exists() ? (s.data() as Assignment) : null),
                      (e) => setError(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return { assignment, loading: assignment === null && error === null, error };
}
```

Doing the same thing with `query(collection(db,'…assignments'), where('giverUid','==',uid))` *looks* equivalent and is not: it depends on Firestore proving the query safe against the rule, which is a subtler contract to reason about and a much worse error message when it breaks. **`get` by ID is unambiguous.** `[DERIVED]`

---

## Data Flow

Direction is written explicitly: `→` means data moves in that direction. Where a step crosses a trust boundary it is marked with 🔒.

### Flow 1 — Join (name → participant document)

```
User types name, hits "Entrar"
    ↓
JoinPage (L4)  → validates name non-empty, size ∈ Size enum
    ↓
SessionContext (L2) → signInAnonymously(auth) ─→ Firebase Auth  (uid issued, no UI, no password)
    ↓
lib/firestore/joinEvent.ts (L0)  → runTransaction(db):
        tx.get(events/main)
          ├─ !exists → tx.set(events/main, { adminUid: uid, status:'lobby', … })   ← FIRST USER = ADMIN
          └─ exists  → return existing adminUid                                     ← IDEMPOTENT
    ↓
setDoc(participants/{uid}, {…}, {merge:true})     ← idempotent re-join keeps preferences
    ↓
SessionContext ← { uid, name, isAdmin: adminUid === uid }
    ↓
router (L4) → navigate('/lobby')
                                │
events/main ⇢ onSnapshot ───────┘  (all clients re-render: new participant appears in every lobby)
```

**Contract at the boundary:** L4 never calls `signInAnonymously` directly — the provider does, once. L4 never writes to Firestore — it calls L0. The Direction is strictly `Page → Context/L0 → Firestore → onSnapshot → Hook → Page`.

### Flow 2 — Lobby (who's in, and the admin's draw trigger)

```
Firestore: events/main/participants/*    ──onSnapshot──▶  useParticipants (L2)
                                                              ↓
                                                    LobbyPage (L4)
                                                              ↓
                                          ParticipantList (L3) ──▶ ParticipantRow × N

Firestore: events/main                  ──onSnapshot──▶  useEvent (L2) ──▶ LobbyPage
                                                                              ↓ status === 'lobby' && isAdmin
                                                                    [ "Empezar Sorteo" ] button
                                                                              ↓ user clicks
                                                              runDraw(participantIds, adminUid)  (L0)
                                                                              ↓ see Flow 3
```

**Subscription discipline:** the lobby mounts `useEvent` + `useParticipants` and **nothing else**. It does not mount `useOrdersAdmin` (cost: 1 admin-check rule-read per request plus N order reads, per client, for no benefit) and it never mounts anything over `assignments`.

### Flow 3 — Draw 🔒 (the only step that sees the full mapping)

```
Admin clicks "Empezar Sorteo"
    ↓
LobbyPage collects participantIds from the useParticipants listener it already has
    ↓
buildDerangement(participantIds)   (L1, PURE)     🔒 permutation exists here, in memory, once
    ↓
runTransaction(db):                                (L0)
    1. tx.get(events/main)                    ← read BEFORE write  [DOC]
    2. adminUid !== me          → throw
    3. status !== 'lobby'       → return { alreadyDrawn: true }   ← idempotent double-click guard
    4. for each pair: tx.set(assignments/{giverUid}, { recipientId, recipientName, drawnAt })
    5. tx.update(events/main, { status:'drawn', drawnAt, drawVersion+1 })
    6. return { alreadyDrawn:false }              ← side-effect-free callback  [DOC]
    ↓
batch commits atomically (all N+1 writes, or none)
    ↓
🔒 the pairs array is dropped. NOT stored in state, NOT logged, NOT in a context.
    ↓
events/main status='drawn'  ⇢ onSnapshot ⇢ every client re-renders
    ↓
each client's useMyAssignment(uid) fires → get(assignments/{ownUid}) 🔒 allowed only for self
    ↓
router → RevealPage
```

**Direction of the secrecy:** the mapping flows **one way, once** — from the pure function into the transaction into N separate documents. It never flows back out as a whole. No subscriber anywhere in the app receives more than one row of it.

### Flow 4 — Order (reveal → order document)

```
RevealPage (L4)
  ← useMyAssignment(uid)      → { recipientId, recipientName }        🔒 my row only
  ← useParticipants()         → find(recipientId) → { size, likes, bans }
        ↓
  Renders: "Te ha tocado regalar a {recipientName}" + their preferences
  Renders: <SizeGuideModal />  ← static FAN_SIZES / PLAYER_SIZES
  Renders: <PriceTable />      ← static PRICES
  Renders: <JerseyOrderForm onSubmit={…} />
        ↓ user submits
lib/firestore/submitOrder.ts (L0)
  setDoc(orders/{uid}, { giverUid: uid, giverName, size, kitType, team, season,
                         printName, number, updatedAt: serverTimestamp() },
         { merge: true })                       ← NO recipientId. Ever.
  + setDoc(participants/{uid}, { orderSubmitted: true }, { merge: true })
        ↓
Firestore ⇢ onSnapshot ⇢ useMyOrder (own form: edit)  and  useOrdersAdmin (admin page only)
```

**Direction of de-identification:** the giver's identity and the recipient's identity are separated at this boundary. `orders/{uid}` is keyed by the **giver** but describes the **recipient's** jersey and stores **no** recipient field. `assignments/{uid}` stores **only** the recipient link. Neither document alone reconstructs the pairing; only the join of the two does — and the app performs that join in exactly one place (the reveal screen, for one row).

### Flow 5 — Export 🔒 (admin → file, with the mapping deliberately unreachable)

```
AdminPage (L4)   [ route guarded by AdminGate → isAdmin ]
  ← useOrdersAdmin()   → onSnapshot(collection(orders))       ← NO assignments read
  ← useParticipants()  → count + "who's missing" (orderSubmitted flag)
        ↓
  Renders progress: "7 / 9 pedidos recibidos"
        ↓ user clicks "Descargar Pedidos"
lib/firestore/exportOrders.ts (L0)
  getDocs(collection(events/main/orders))     ← reads orders ONLY
        ↓
buildOrdersExport(orders, participants)  (L1, PURE)
  ⚠ signature cannot accept an assignment. The mapping is not a parameter.
        ↓
{ filename, mimeType, content }
        ↓
downloadText({ content: '\uFEFF' + content, … })   (L0)
        ↓
Browser downloads pedidos-amigo-invisible.csv  → goes to the seller
```

**The one-line summary of the whole architecture:** *the export path has no assignment parameter.* Every other privacy mechanism in this document is defence in depth; that one is structural.

---

## State Management

### The decision: three tiers, no global store

| Tier | What goes there | Mechanism | Why not the others |
|---|---|---|---|
| **App-wide, non-server** | `uid`, `name`, `isAdmin`, `ready` | `SessionContext` + `localStorage` mirror | Genuinely app-wide, changes ~never, is not streamable from Firestore (it comes from Auth). Playing it through a store would add indirection for four fields. |
| **Server state** | event, participants, my assignment, my order, all orders | one custom hook per subscription (`useEvent`, `useParticipants`, …) each with local `useState` | **Firestore is the source of truth.** Mirroring it into a store creates a second source that can desync, requires you to write reducers that duplicate `onSnapshot`'s semantics, and buys nothing. |
| **Ephemeral UI** | form fields, modal open/closed, active tab, validation errors | `useState` local to the nearest component | Things that die with the component must not outlive it. A modal's open state in a global store is how you get "the modal is open on a different route". |

**Explicitly rejected:**

| Option | Verdict | Reason |
|---|---|---|
| **Redux / Redux Toolkit** | Reject | ~5 server collections and 4 session fields. Redux would add 3 files of boilerplate per resource to solve a problem this app does not have. |
| **Zustand / Jotai / Valtio** | Reject (but harmless) | Would be a thin wrapper over the same hooks. The only defensible use is `useMyOrder`'s form draft if you want it to survive navigation — in which case `sessionStorage` in the form's own hook is simpler. |
| **React Query / TanStack Query** | Reject | Designed for request/response caching and invalidation. `onSnapshot` already *is* the cache and *is* the invalidation. Wrapping a real-time listener in a query cache is a common source of double-fetch and stale-write bugs. |
| **A `FirestoreContext` holding all collections** | **Reject firmly** | This is the specific anti-pattern that would break the privacy design: one context would subscribe to `assignments` app-wide and hand the mapping to every consumer. Keep one hook per collection precisely so that *mounting* a subscription is a deliberate, visible act. |

### State ownership table

| State | Owner | Lifetime | Persisted? |
|---|---|---|---|
| `uid` | Firebase Auth | browser profile | yes (Auth-managed) |
| `name`, `size`, `likes`, `bans` | `participants/{uid}` | event | yes (Firestore) — `SessionContext` holds a copy of `name` for headers only |
| `isAdmin` | **derived**, `events/main.adminUid === uid` | event | no — recomputed |
| `event.status`, `drawVersion` | `events/main` | event | yes |
| the pairing 🔒 | `assignments/{uid}` — **one row per reader** | event | yes, but never as a whole |
| order in progress | `JerseyOrderForm` `useState` | component | no (optionally `sessionStorage`) |
| submitted order | `orders/{uid}` | event | yes |
| modal open, tabs, form errors | component `useState` | component | no |

**`isAdmin` must be derived, never stored.** Storing it in `localStorage` would mean a stale flag could grant the admin button after an admin switch, and — worse — it invites someone to *trust* that flag. Derive it from `events/main`, which only rules can verify.

---

## Scaling Considerations

This app will have 6–15 participants for an afternoon. The honest scaling section is: *nothing here is a scaling problem, and pretending otherwise would produce worse code.* The realistic numbers, for the record:

| Scale | What changes |
|---|---|
| **2–20 participants (the actual target)** | Nothing. N+1 writes in one transaction ≪ the 500-op limit. Lobby listener re-reads ≤ 20 docs per change. Total event cost: a few hundred reads against a 50,000/day free tier `[DOC]`. |
| **~100 participants** | Still fine, but: (a) the lobby re-renders 100 rows on every join — add `React.memo` on `ParticipantRow`; (b) `events/main` becomes a write hotspot *only if* you write to it on join — you must not, beyond the bootstrap; (c) `participants` gains a compound index for the `joinedAt` sort. |
| **~1,000+** | The design would need to change: the single-cycle requirement makes the draw a single synchronous pure function over all uids (already fine), but the transaction writing 1000 assignment docs would exceed the 500-op limit and must be chunked into ordered `writeBatch` calls with a two-phase status (`drawing` → `drawn`) so clients don't read a half-drawn state. **This is explicitly not needed. Do not build it.** |

**What "breaks first" in reality** — in order:
1. **Free-tier write quota, if you poll.** Not with listeners — but a naive `setInterval(() => getDocs(...), 1000)` "refresh" would. Use `onSnapshot`; never poll.
2. **Rules `get()` read cost.** `[DOC]` admin checks are billable reads. Mitigated by mounting admin listeners only on the admin route.
3. **`onSnapshot` listeners leaking under StrictMode.** Not a scale problem but the likeliest real bug; the cleanup pattern in Pattern 1 prevents it.

---

## Anti-Patterns

### Anti-Pattern 1: Putting the pairing in the lobby document 🔒

**What people do:** model the draw as a map or array on the event doc — `events/main.assignments = { uid1: uid2, … }` — because it is "one document, one write, so much simpler".
**Why it's wrong:** `[DOC]` **reads are document-level.** The lobby must stream the event document to show the status, so *every participant* and the admin can read the entire pairing from their own browser. This is not a hardening gap; it is structurally impossible to fix with rules. It fails the project's core value on day one.
**Do this instead:** `assignments/{giverUid}` as a sibling subcollection, one document per giver, readable only by its own giver.

### Anti-Pattern 2: Storing the draw seed or result for "auditability" 🔒

**What people do:** persist `seed` or the whole `permutation` on the event doc "so the draw can be verified later / re-run identically".
**Why it's wrong:** anyone holding the seed can recompute the full mapping. Auditability and secrecy are in direct conflict, and secrecy is the product. It also creates a single document whose leak destroys everything.
**Do this instead:** do not store either. If a defence against "the admin rigged it" is ever needed, the answer is a Cloud Function holding the randomness server-side — not a stored seed.

### Anti-Pattern 3: Authorising off a client-writable field

**What people do:** `allow write: if resource.data.role == 'admin'` on the participant document, with `role` set by the client.
**Why it's wrong:** the client writes that document. A participant can `setDoc(..., { role: 'admin' })` and grant themselves admin. Rules that trust client-written data are not rules.
**Do this instead:** authorise on a write-once field — `events/main.adminUid` — and make it immutable with `allow update: if request.resource.data.adminUid == resource.data.adminUid`. Keep `role` on the participant doc for **rendering only** and never reference it in a rule.

### Anti-Pattern 4: `getDocs(collection(..., 'assignments'))` for a count or a check 🔒

**What people do:** list the assignments collection to show "X de Y han visto su amigo" or to sanity-check the draw.
**Why it's wrong:** two failure modes at once. If the rules are correct, the call throws `permission-denied` for everyone including the admin `[DOC]` — a confusing runtime error that will be "fixed" by loosening the rule. If someone loosens the rule to make it work, the admin's client is now reading the mapping, which defeats the entire design.
**Do this instead:** never list `assignments`. Derive any progress metric from `participants` / `orders`. Treat a `permission-denied` on that path as the intended behaviour and as a regression test.

### Anti-Pattern 5: Omitting the `onSnapshot` unsubscribe

**What people do:** `useEffect(() => { onSnapshot(ref, cb); }, [])` — no cleanup returned.
**Why it's wrong:** `[COMMUNITY]` *"Forgetting to unsubscribe is one of the most common sources of memory leaks in Firestore apps."* Listeners also cost reads on every change and keep firing after unmount. `[DOC]` React's StrictMode deliberately double-invokes effects in development, so this shows as duplicated listeners and doubled reads.
**Do this instead:** `return onSnapshot(ref, cb, errCb);` — `onSnapshot` returns the unsubscribe function directly, so the effect body is a one-liner. And always pass the **error callback**: a listener that hits `permission-denied` auto-detaches and stops updating silently.

### Anti-Pattern 6: Accumulating inside the snapshot handler

**What people do:** `setMessages([...snap.docs, ...messages])` — reading closure state inside the listener.
**Why it's wrong:** `[COMMUNITY]` the closure captures the state from the render in which the effect ran, so `messages` is permanently the initial value (`null`) and the accumulator silently drops everything. `[DOC]` `QuerySnapshot` already contains **all** documents matching the query, not only the changed ones — so there is nothing to accumulate.
**Do this instead:** `setData(snap.docs.map(d => d.data()))`. Replace, never append.

### Anti-Pattern 7: Side effects inside a transaction callback

**What people do:** `setIsAdmin(true)` / `navigate()` / a toast inside `runTransaction`'s callback.
**Why it's wrong:** `[DOC]` *"a transaction function might run more than once"* and *"Transaction functions should not directly modify application state."* The callback may execute on attempt 1, be discarded due to contention, and execute again — producing duplicated navigations, flickering state, or the value from a discarded attempt.
**Do this instead:** return the computed value from the callback and act on it after the promise resolves.

### Anti-Pattern 8: Fetching the size guide or the prices from Firestore

**What people do:** model `sizeGuide` and `prices` as Firestore collections because "it's the backend".
**Why it's wrong:** `PROJECT.md` declares them fixed reference data. Firestore makes them async — so the Size Guide modal has a loading state, a failure state, and a read cost, for six static rows. Worse, the modal — one of the most-used UI affordances — would go blank if the network hiccups.
**Do this instead:** typed `const` modules (`domain/sizeGuide.ts`, `domain/prices.ts`). Include the Player table's missing `XXXL` fallback explicitly.

### Anti-Pattern 9: Relying on the admin button's absence for authorization

**What people do:** hide the export button for non-admins and treat that as "protected".
**Why it's wrong:** the button is cosmetic; the Firestore SDK is the real surface, and any participant can open DevTools and call `getDocs(collection(...,'orders'))` directly. If `orders` was granted `allow read: if true`, hiding a button secured nothing.
**Do this instead:** the button's visibility is UX; the rule `request.auth.uid == giverUid || isAdmin()` is the security. Write both, and test the rule.

---

## Integration Points

### External Services

| Service | Integration Pattern | Gotchas |
|---|---|---|
| **Firebase App / Firestore** | `initializeApp({...})` + `getFirestore(app)` in `src/firebase.ts`, values from `import.meta.env.VITE_FIREBASE_*` | `[DOC]` Vite **inlines `VITE_*` into the client bundle**, so these are public by definition. That is fine and correct — the Firebase Web API key is a *project identifier*, not a secret; all real authorization is in rules. **Never** put a service-account JSON, an Admin SDK credential, or any "secret" behind a `VITE_` prefix: `[DOC]` Vite's own security policy calls that a *"project-level configuration mistake, not a Vite vulnerability"*. Also: `.env.local` in `.gitignore`, and a committed `.env.example` with empty values. Restart the dev server after editing `.env`. |
| **Firebase Anonymous Auth** *(recommended — see F4)* | one `signInAnonymously(auth)` at app boot inside `SessionProvider`; store the resulting `uid` nowhere (Auth persists it) | An anonymous account is **tied to the browser profile**. Clearing site data → new uid → the user looks like a new participant and their old `participants/{oldUid}` becomes an orphan. Mitigation: keep the sign-in in one place, surface "tu identidad se guarda en este navegador" on the join screen, and make `joinEvent` idempotent so a re-join with a *new* uid simply creates a second participant (accept it, or let the admin clean it up). **Do not** try to key participants by name — names collide and are not identities. |
| **Firebase Hosting** (deploy) | `firebase.json` with `"rewrites": [{ "source": "**", "destination": "/index.html" }]` | `[COMMUNITY]` Hosting cannot know which client routes exist, so a typo'd URL renders the SPA shell → you need the `path:'*'` catch-all **or the user sees a blank page**. Rules deploy from `firestore.rules` via `firebase deploy --only firestore:rules`; `[DOC]` CLI-deployed rules **overwrite** anything edited in the Console. |
| **Firestore Emulator** (dev + rules tests) | `firebase emulators:start --only firestore,auth`; connect the SDK with `connectFirestoreEmulator` / `connectAuthEmulator` under `import.meta.env.DEV` | `[DOC]` the Rules Playground / Emulator Suite is the documented way to validate rules. This is where the "admin cannot list assignments" test must run. Without it, the most important requirement in the project is unverified. |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `pages/*` → `hooks/*` | hook call, returns `{data, loading, error}` | Pages never import `firebase/firestore`. If a page needs a new query, a new hook is the change. |
| `pages/*` → `components/*` | props only (data down, callbacks up) | Components are pure and have no Firebase import. This is what makes `<SizeGuideModal>` and `<PriceTable>` trivially previewable and reusable on both the preference screen and the order screen. |
| `pages/*` / `hooks/*` → `lib/firestore/*` | async function call, returns plain data or throws | Adapters return domain types, not `DocumentSnapshot`s. Keeps the SDK's shape out of the UI. |
| `lib/firestore/*` → `domain/*` | pure function call | `runDraw` calls `buildDerangement`; `exportOrders` calls `buildOrdersExport`. The domain layer never calls back up. |
| `SessionContext` → `hooks/*` | `useSession()` read | Hooks need `uid` to build document paths. They must **not** need `isAdmin` — the admin check belongs in the rule, and the UI check belongs in `AdminGate`. |
| **`orders` ↔ `assignments`** 🔒 | **no code path** | They are joined in exactly one place: the reveal screen, for one row, via `useMyAssignment` + a `find` over `participants`. There is deliberately no "join service". |

---

## Suggested Build Order

Ordered by **dependency**, with the two riskiest pieces pulled forward so they are proven before anything depends on them.

| # | Phase | Builds | Depends on | Why here |
|---|---|---|---|---|
| **1** | **Foundations & static data** | Vite + React + Tailwind + `createBrowserRouter` shell; `firebase.ts` from `VITE_*`; `domain/types.ts`; `domain/sizeGuide.ts`; `domain/prices.ts`; `components/ui/*`; `SizeGuideModal` + `SizeGuideTable` + `PriceTable` | — | Zero backend, zero risk, and it forces the size-guide data model (the Player-`XXXL` gap, the Fan/Player alias split) to be resolved **before** any form depends on it. Doing this last would mean rewriting every form. |
| **2** | **Identity & data model** 🔒 | `SessionProvider` (+ anon auth decision); `lib/firestore/paths.ts`; `joinEvent` transaction; `useEvent`; `useParticipants`; `JoinPage`; `LobbyPage` + `ParticipantList` | 1 | The schema decision (`events/main` + 4 subcollections) is the load-bearing one; it must exist before anything writes. Also proves the bootstrap race handling. **Ship `firestore.rules` here, not at the end** — rules written after the fact almost always get loosened to match the code. |
| **3** | **Preferences** | Preference form fields (size / likes / bans) on `JoinPage` or a second step; size validation shared with `domain` | 2 | The preference document is the input to the draw *and* the thing the recipient's giver must read on the reveal screen. It has to be correct and complete before the draw can be tested with realistic data. |
| **4** | **The draw** 🔒 | `domain/derangement.ts` + its unit tests (**pure, test first**); `lib/firestore/runDraw.ts`; admin trigger on `LobbyPage`; status → `drawn`; `useMyAssignment`; `RevealPage` skeleton | 2, 3 | **Highest-risk item.** Split it: the pure function is testable in isolation with a seeded `rng` (single cycle, no fixed points, no mutual pairs, n=2 edge, n<2 throws) *before* the Firestore transaction exists. Then the transaction is a thin, boring adapter. Building the transaction first means debugging an algorithm and a concurrency bug at the same time. |
| **5** | **Orders** | `JerseyOrderForm` (kitType/team/season/printName/number); `PriceTable` wiring; `submitOrder`; `useMyOrder`; `orderSubmitted` flag | 4 | Requires a recipient to exist (needs 4) and the static price table (needs 1). The form is the largest single UI surface — it belongs after the flow it lives in works end-to-end. |
| **6** | **Admin export** 🔒 | `useOrdersAdmin`; progress view; `domain/ordersExport.ts` + unit tests (**pure, test first**); `exportOrders`; `download.ts`; UTF-8 BOM | 5 | Cannot be built meaningfully until orders exist. The serialiser is pure, so write its test first — including an assertion that **no column carries giver identity into the seller-facing output**. |
| **7** | **Privacy hardening & verification** 🔒 | Rules Emulator tests (the assertion table above); explicit `permission-denied` on `assignments` list, as admin *and* as participant; stale-listener audit; error/empty states on every hook consumer; README's trust-contract paragraph | 2–6 | Not "polish" — this is the phase that proves the core value. It can only run once every read path exists, which is why it is last. Treat its tests as the project's acceptance criteria. |

### Ordering rationale

- **The two pure modules (4 and 6) are separated from their Firestore adapters.** Both encode a product rule that is easy to break and cheap to test (`nobody self-assigns`; `the export carries no pairing`). Test-first on the pure half, then a thin adapter. This is the single highest-leverage structural choice in the build order.
- **Rules ship in phase 2, not phase 7.** Rules written at the end get written to fit whatever the code happens to do. Rules written with the schema become a constraint the code is written against. Phase 7 *verifies* them; phase 2 *authors* them.
- **The reveal screen (4) precedes the order form (5) even though the order form is bigger.** The order form's fields are all determined by the reveal screen's context (you order *for* the person you were assigned). Building the form first means building it against a mock recipient, then discovering the real data shape differs.
- **`SizeGuideModal` and `PriceTable` come first (phase 1) even though they are "just" static UI.** They are used on *two* screens each and they force the Fan/Player size-vocabulary decision. Discovering in phase 5 that the Player table has no `XXXL` means retrofitting a fallback into a shipped form.
- **Phase 7 cannot be merged into earlier phases** because the `permission-denied` assertions require the real rule set and the real read paths. It is genuinely a verification phase, and it is where the roadmap should place its security/UAT gate.

---

## Open Questions for the Roadmap

1. **Anonymous Auth — adopt or not?** This is a genuine fork with a scope implication. Adopting it is one dependency-free call and one line in the join flow, and it is the **only** way rules enforce anything between participants (F2/F4). Not adopting it means the privacy story is UI-only and should be described that way to the users. **Recommendation: adopt.** It does not add a password or an OAuth provider, so it does not contradict PROJECT.md's Out-of-Scope line. But it *is* a new Firebase product in the stack and the roadmap should record it as an explicit decision rather than smuggling it in.
2. **CSV or TXT for the export?** `PROJECT.md` says ".txt/.csv". The serialiser above targets CSV. TXT is friendlier to paste into WhatsApp (the realistic delivery channel to a seller); CSV is friendlier to a spreadsheet. **Recommendation: CSV as the primary** (it is strictly more useful and the seller can open it anywhere), with the `buildOrdersExport` return type making a TXT variant a 5-line sibling function if wanted.
3. **Is the admin also a participant?** Almost certainly yes (the first user is a friend who also wants a gift). This is fine and the model supports it, but it means the admin's browser *does* hold one row of the mapping (their own) plus, transiently, the whole permutation during the draw. Worth stating explicitly so nobody "fixes" it later.
4. **What happens if someone joins after the draw?** `PROJECT.md` does not say. Options: block joins when `status === 'drawn'` (cleanest, one rule clause), or allow the join with no assignment and no order (a confused participant). **Recommendation: block joins after `drawn`** — it keeps the single-cycle invariant true, and the admin can reset the event during development by deleting `events/main` in the Console.
5. **The Player `XXXL` gap** — warn or block? Flagged in Pattern 3. Needs a one-line product decision before phase 5.

---

## Sources

All sources were reached via web search (the `websearch` provider); no source was verified against a running system in this pass, which caps confidence at **MEDIUM** per the confidence seam. `[DOC]` marks official Google/Firebase documentation.

**Firebase — security rules (the load-bearing sources)**
- *Control access to specific fields* — the "reads are document-level / impossible to restrict fields" statement; field-level write rules via `keys().hasOnly()` and `diff().affectedKeys()`. `[DOC]` https://firebase.google.com/docs/firestore/security/rules-fields
- *Security Rules and Firebase Authentication* — `request.auth` is `null` for unauthenticated callers; `auth.uid`, custom claims, the `get()`-based admin pattern. `[DOC]` https://firebase.google.com/docs/rules/rules-and-auth
- *How Security Rules work* — rules combine as **OR**; a broad grant cannot be narrowed; recursive wildcard v1 vs v2 semantics; `exists()`/`get()` limits (10 single-doc / 20 multi-doc); functions may not recurse, stack depth 10. `[DOC]` https://firebase.google.com/docs/rules/rules-behavior
- *Writing conditions for Cloud Firestore Security Rules* — `get()`/`exists()` path syntax with `$(var)`; queries evaluated against their potential result and denied if they could return an unreadable document. `[DOC]` https://firebase.google.com/docs/firestore/security/rules-conditions
- *Get started with Cloud Firestore Security Rules* — locked mode vs test mode; rules evaluated before any read/write; denied paths fail the whole request; Rules Playground and Emulator Suite. `[DOC]` https://firebase.google.com/docs/firestore/security/get-started
- *Avoid insecure rules* — *"If you're not authenticating users and configuring security rules, then anyone who guesses your project ID can steal, modify, or delete the data."* `[DOC]` https://firebase.google.com/docs/rules/insecure-rules
- *Basic Security Rules* — the content-owner-only and attribute-based (`admin` field) patterns. `[DOC]` https://firebase.google.com/docs/rules/basics
- *Firestore Security Rules: Deny by Default, Then Open the Narrowest Hole* — subcollections need their own match block; rules are OR'd; `get()` role lookups are billable reads but cached per request. `[COMMUNITY]` https://dev.to/devshakib/firestore-security-rules-deny-by-default-then-open-the-narrowest-hole-4nnf
- *Firestore security rules: owner checks, not signed-in-only* — `resource.data` (existing) vs `request.resource.data` (after write); "a query cannot hide Bob's notes". `[COMMUNITY]` https://www.securecoding.com/blog/cloud-firestore-security-policy

**Firebase — transactions and atomicity**
- *Transactions and batched writes* — all-or-none semantics; transactions vs batched writes; reads must precede writes; transaction functions may run more than once; must not modify app state; fail when offline; the server SDK bypasses rules. `[DOC]` https://firebase.google.com/docs/firestore/manage-data/transactions
- *Quotas and limits* — 500 field transformations per commit/transaction; 270 s transaction limit with 60 s idle expiry; 1 MiB document size; 100-level subcollection depth. `[DOC]` https://firebase.google.com/docs/firestore/quotas
- *Transaction serializability and isolation / data contention* — retry-then-`ABORTED: Too much contention on these documents`. `[DOC]` https://firebase.google.com/docs/firestore/transaction-data-contention
- *Transactions (Datastore mode)* — the create-if-not-exists race: *"Without a transaction, if the entity does not exist and two users attempt to create it, the second overwrites the first without knowing that it happened."* `[DOC]` https://docs.cloud.google.com/datastore/docs/concepts/transactions

**Firebase — data modelling**
- *Cloud Firestore data model* — collections/documents/subcollections; 1 MiB docs; deleting a parent does not delete subcollections. `[DOC]` https://firebase.google.com/docs/firestore/data-model
- *Structure data* — nested data vs subcollections vs root-level collections, with the trade-offs for each. `[DOC]` https://cloud.google.com/firestore/docs/concepts/structure-data
- *Best practices for Cloud Firestore* — index fanout, single-document write-rate limits. `[DOC]` https://firebase.google.com/docs/firestore/best-practices
- *Firestore Data Modeling Guide: Embedded Documents vs Referencing* — the 1-1 "same document ID in a separate collection to separate public from sensitive data" pattern (`users/{uid}` + `privateProfiles/{uid}`), which generalises to `participants/{uid}` + `assignments/{uid}`. `[COMMUNITY]` https://www.freecodecamp.org/news/firestore-data-modeling-guide-embedded-documents-vs-referencing-with-a-blog-case-study

**Firebase — realtime listeners and React**
- *@firebase/firestore API reference* — `onSnapshot` returns an `Unsubscribe` function; declarative doc/query listener signatures. `[DOC]` https://firebase.google.com/docs/reference/js/firestore
- *React `useState` and Firebase `onSnapshot`* (Stack Overflow) — the closure-staleness bug and the correct "replace, don't accumulate" handler; `QuerySnapshot` always contains all matching docs. `[COMMUNITY]` https://stackoverflow.com/questions/70214878/react-usestate-and-firebase-onsnapshot
- *How to Set Up Real-Time Listeners for Live Data Updates in Firestore* — cleanup in `useEffect`; listeners auto-detach on error; the `permission-denied` case. `[COMMUNITY]` https://test.oneuptime.com/blog/post/2026-02-17-how-to-set-up-real-time-listeners-for-live-data-updates-in-firestore/view
- *Unsubscribe from Firestore Listener* — *"Forgetting to unsubscribe is one of the most common sources of memory leaks in Firestore apps."* `[COMMUNITY]` https://www.rapidevelopers.com/firebase-tutorial/how-to-unsubscribe-from-firestore-snapshot-listener
- *useEffect — React* — StrictMode runs an extra development-only setup+cleanup cycle. `[DOC]` https://react.dev/reference/react/useEffect

**Draw algorithm**
- *Secret Santa, Generating 'valid' permutations* (Stack Overflow) — the rejection-sampling derangement approach and the ≈1/e acceptance rate; **contrasted** with the shuffle+offset cyclic form chosen here. `[COMMUNITY]` https://stackoverflow.com/questions/8609644/secret-santa-generating-valid-permutations
- *derangement* — NIST Dictionary of Algorithms and Data Structures, definition. `[DOC]` https://xlinux.nist.gov/dads/HTML/derangement.html
- *DLMF §26.13 Permutations: Cycle Notation* — derangement number `d(n)`; cycle structure of permutations (basis for the "single cycle" property). `[DOC]` https://dlmf.nist.gov/26.13
- *Secret Santa, Generalized* (Donnelly) and *"Secret Santa" and the Combined Length of Spanned Cycles in a Random Permutation* (Gonczarowski, arXiv:1307.4322) — cycle-structure treatment of the problem. `[COMMUNITY/academic]` https://arxiv.org/abs/1307.4322

**Environment, export, routing**
- *Env Variables and Modes* — *"Variables prefixed with `VITE_` will be exposed in client-side source code after Vite bundling."* `[DOC]` https://vite.dev/guide/env-and-mode
- *Vite security policy* — secrets shipped via `VITE_` are *"a project-level configuration mistake, not a Vite vulnerability"*. `[DOC]` https://github.com/vitejs/vite/security/policy
- *Opening CSV UTF-8 files correctly in Excel* — the BOM requirement. `[DOC]` https://support.microsoft.com/en-us/excel/opening-csv-utf-8-files-correctly-in-excel
- *Javascript export CSV encoding utf-8 issue* (Stack Overflow) — `\uFEFF` BOM prefix; the locale-delimiter caveat. `[COMMUNITY]` https://stackoverflow.com/questions/42462764/javascript-export-csv-encoding-utf-8-issue
- *Converting CSV to Excel: solutions for common issues* — leading zeros stripped, scientific notation, the import-as-Text and `="007"` workarounds. `[COMMUNITY]` https://www.ablebits.com/office-addins-blog/converting-csv-excel-issues
- *Error Boundaries / SPA mode / Routing* — React Router data mode, `createBrowserRouter`, `ErrorBoundary`, SPA fallback. `[DOC]` https://reactrouter.com/how-to/error-boundary , https://reactrouter.com/how-to/spa
- *How do I serve a 404 page using Firebase Hosting for a React SPA?* — the `**` rewrite plus client-side catch-all requirement. `[COMMUNITY]` https://stackoverflow.com/questions/38818265/how-do-i-serve-a-404-page-using-firebase-hosting-for-a-react-spa
- *Firestore free tier / pricing* — 50,000 reads, 20,000 writes, 20,000 deletes per day; 1 GiB stored. `[DOC]` https://firebase.google.com/docs/firestore/pricing

---

## Confidence Assessment

| Area | Confidence | Basis |
|---|---|---|
| **Privacy limits of a client-only design** | **MEDIUM-HIGH** | The three governing facts are quoted verbatim from Firebase docs (document-level reads; `request.auth` null without auth; server SDKs bypass rules). The *conclusion* that the admin-as-project-owner can always read the data is DERIVED but follows directly and is uncontroversial. This is the most solid section of the document. |
| **Firestore schema (collections, fields, paths)** | **MEDIUM** | Built from documented primitives (subcollections, doc-ID joins, 1 MiB limit) plus the community-sanctioned "same ID, separate collection" pattern. Not yet exercised against an emulator. Field-level choices (e.g. `orderSubmitted` denormalisation) are judgement calls, flagged as such. |
| **Security rules sketch** | **MEDIUM-LOW** | Syntactically patterned on official examples, but the specific predicate set is mine and **two assumptions are unverified**: that the `assignments` `list` is genuinely denied for the admin, and that the `isAdmin()` `get()` caching behaves as expected under a multi-doc transaction. **Must be tested in the Emulator Suite in phase 2/7 before being trusted.** |
| **Draw algorithm** | **MEDIUM-HIGH** | The shuffle+offset construction is mathematically standard and its three properties (no fixed points, single cycle, no mutual pairs for n≥3) are provable from cycle structure, not empirical. The `rng`-injected unit tests are the verification. Low residual risk. |
| **Component boundaries / project structure** | **MEDIUM** | Conventional React/feature-folder practice; no source contradicts it, but it is design rather than documentation. The load-bearing claim — that keeping `domain/` free of Firestore lets privacy be enforced by a function signature — is DERIVED and is a design argument, not a measured result. |
| **State management choice** | **MEDIUM** | The "don't mirror Firestore into a store" position is well-supported by the listener docs (`onSnapshot` is already the cache) and by the observed anti-patterns. The rejection of Redux/Zustand/React Query is a proportionality argument specific to ~10 participants and 4 collections. |
| **CSV/Excel export details** | **MEDIUM** | BOM requirement is documented by Microsoft; leading-zero behaviour is documented across several sources. Straightforward to verify with one manual test. |
| **Build order** | **MEDIUM** | Rationale is dependency-driven and the pure-first split is defensible, but ordering is inherently judgement. The one strong recommendation — *author rules in phase 2, verify in phase 7* — is a process claim, not a documented fact. |

**What would raise this to HIGH:** run the rules assertion table in the Emulator Suite (one afternoon, closes the biggest gap), and exercise `buildDerangement` with its unit tests plus a real 8-person draw. Both are cheap and both are already placed in the build order.

---

*Architecture research for: SecretKit — a football-jersey Secret Santa SPA on React + Firestore*
*Researched: 2026-10-17*
*Consumed by: roadmap creation. Phases 2, 4, 6 and 7 carry the privacy-critical decisions; phase 7 is the verification gate.*
