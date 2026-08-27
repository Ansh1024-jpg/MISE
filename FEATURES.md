# MISE — Feature Overview

**MISE** is a culinary decision engine for a restricted-pantry cooking competition. It walks a team from a blank brief to a finished, defensible dish — through concepts, a full recipe, a curveball constraint, a self-scored rubric, and a spoken pitch — while keeping the AI grounded in a fixed pantry and a real flavour-pairing model.

The name comes from *mise en place* ("everything in its place"): the app's job is to have every decision prepped and reasoned before you ever turn on a burner.

---

## At a Glance

- **Six-step guided workflow** from brief → concepts → recipe → twist → rubric → pitch.
- **Client-side flavour-pairing engine** that computes ingredient chemistry *before* the AI is called, so recommendations are grounded in facts rather than invented.
- **Server-side Gemini proxy** — the API key never reaches the browser.
- **Streaming recipe generation** with live token-by-token rendering.
- **Constraint / "twist" replanning** that shows an explicit before/after diff.
- **Self-scoring against a fixed 100-point competition rubric.**
- **Auto-generated 5-minute pitch script** plus a clean **Present Mode**.
- **Local session save/load** and a **transparent reasoning log**.

---

## The Six-Step Workflow

The whole app is a linear pipeline. Each step unlocks only once the previous one is complete, and the top navigation bar shows lock/complete status for every stage.

### Step 1 — The Brief
Set the constraints for the dish before anything is generated.

- **Pantry selector** — pick which ingredients are available, grouped into categories (Protein, Vegetables, Fruit, Starch, Fat/Dairy, Aromatics, Flavour, Wildcard, Free basics). Toggle individual items or **select/deselect a whole category** at once. Everything starts selected by default.
- **Course** — starter, main, or dessert.
- **Audience note** — free-text guidance (e.g. "judges prefer bold, spice-forward food").
- **Cook time and servings** — numeric constraints that flow through the rest of the pipeline.
- **Priority sliders** — Uniqueness, Visual Appeal, Health, and Sustainability, each 0–100. The **Uniqueness slider directly tunes the flavour engine's "surprise" weighting** (see below).

### Step 2 — Concepts
The engine generates **exactly three distinct dish concepts** to choose between. Each concept card shows:

- Name, one-line pitch, and course.
- **The pairing it is built on** (drawn from the precomputed flavour analysis).
- **Flavour logic** explaining why it works and how the top-weighted priority shaped it.
- An **"unexpected move"** — the one surprising, defensible idea.
- **Five scored axes** (uniqueness, feasibility in 60 min, visual impact, health, sustainability) — each with a written reason.
- **Risks at the station** — what could go wrong while cooking.
- Expandable "show full reasoning" view; pick one to advance.

### Step 3 — Recipe
Turns the chosen concept into a full, executable recipe, **streamed live** as it generates.

- **Scaled ingredient list** with quantities.
- **Numbered linear method.**
- **Parallelised 60-minute cook timeline** — an array of `{start, end, station, action}` designed for 2–3 people working simultaneously.
- **Plating specification** — composition, height, negative space, colour contrast, and garnish.
- **Rationale** — three sentences on why the dish answers the brief.
- **Pantry-violation guard** — flags any ingredient the recipe uses that isn't in the selected pantry.
- **Cook Mode** — a full-screen, high-contrast timeline view sized to read at arm's length in a kitchen.

### Step 4 — The Twist
Simulates a competition curveball.

- Apply a **surprise constraint** (e.g. "remove all dairy", "add a mystery ingredient").
- The engine **replans the dish** and returns an explicit **diff** — each change tagged `added` / `removed` / `modified` / `kept`, with a justification.
- Produces a fully updated recipe alongside the diff.
- **Skippable** — you can move past this step if no twist applies.

### Step 5 — Rubric
Scores the dish against a **fixed 100-point competition rubric**, judging only what's actually in the dish state (no assumed features):

| Category | Max |
|---|---|
| Culinary quality & taste | 25 |
| AI + vibe-coding innovation | 20 |
| Culinary creativity | 15 |
| Problem & product thinking | 15 |
| Response to constraints | 10 |
| User experience | 5 |
| Pitch & story | 10 |

Each row returns a score, **reasoning that cites something specific from the dish**, and the **single highest-leverage improvement**. A running total out of 100 is displayed.

### Step 6 — The Pitch
Generates a **5-minute pitch script** written to be spoken aloud, following five labelled beats: **The Problem → The App (MISE) → The Dish → The Twist → The Sell.** It names the actual dish, ingredients, and constraint (no placeholders) and leans on the rubric rows that scored highest.

---

## The Flavour Engine (the core differentiator)

Before any AI call in Step 1, MISE runs a **client-side flavour model over the fixed pantry** and injects the conclusions into the prompt as authoritative facts. This is what stops the app from being "just a prompt wrapper" — the model reasons *from* computed pairings rather than inventing them.

The engine scores ingredient combinations on four dimensions:

1. **Compound overlap** — shared volatile-aroma families (the classic "bridge" signal).
2. **Functional balance** — whether a set covers fat / acid / sweet / umami / body across eight taste axes.
3. **Curated affinity** — hand-authored pairings that culinary traditions already proved (with tasting notes).
4. **Familiarity penalty** — how tired a pairing is; novelty is rewarded so the engine surfaces **high-affinity, low-familiarity** combinations ("defensible surprise").

It outputs to the prompt:

- **Top surprise-adjusted pairs** to build a concept around.
- **Over-familiar / cliché pairs** present in the pantry, flagged so the team avoids leaning on them.
- **Balanced trios** that close taste-axis gaps, with coverage/gap analysis.
- **Technique "unlocks"** — non-obvious ways to prepare each ingredient.
- **Bridge finder** — suggests a third ingredient to connect two that share nothing directly.

> Design note (built into the code): the pantry leans Indian and Southeast Asian, where — unlike Western cuisine — good pairings often *don't* share aroma compounds. The engine accounts for this instead of blindly maximising overlap. Compound tags are curated approximations, stated honestly as such.

The **Uniqueness slider** from the brief feeds the engine's `surprise` weight, so turning up uniqueness literally shifts which pairs the AI is told to prefer.

---

## Cross-Cutting Features

### Session management
- **Auto-save** — the current session persists to `localStorage` on every change and restores on reload.
- **Save named sessions** to a history list in the sidebar.
- **Load or delete** any past session (with confirm/cancel on delete).
- **Reset session** to start fresh.

### Present Mode
A clean, slide-style read-only view that walks through the whole journey — brief, selected concept, recipe rationale + method, twist diff, total rubric score, and full pitch script — formatted for showing to judges or an audience.

### Reasoning Log
A collapsible footer panel that records **every AI call**: the step name, timestamp, latency in milliseconds, and the **exact prompt** that was sent (including the precomputed flavour analysis). Makes the whole reasoning chain transparent and auditable.

### Grounded, stateless AI calls
- Every model call is **stateless** — the app rebuilds a full "current dish state" context block for each step, so later steps (rubric, pitch) reason about the *actual* dish rather than a hallucinated one.
- **Structured JSON output** — calls use response schemas so results are typed and predictable.
- **Temperature is tuned per step** — lower for recipes (precision), higher for concepts and pitch (creativity).

---

## Technical Features

- **Server-side key protection** — the browser posts to `/api/gemini`; the Express server holds `GEMINI_API_KEY` in its own environment and calls Gemini. The key is never shipped to the client.
- **SSE streaming endpoint** — recipe generation streams token-by-token, with headers set to defeat reverse-proxy buffering (Render, Koyeb, nginx-style CDNs).
- **Per-IP rate limiting** — configurable cap on `/api/gemini` (default 60 requests/hour) to protect the billed key on a public URL.
- **Model swappable via env** — `GEMINI_MODEL` changes the model with no code change (defaults to `gemini-3.6-flash`).
- **Health check** at `/healthz` for uptime monitoring and platform probes.
- **Single-process dev + prod** — Vite middleware in development, static-file serving in production, from one Express server.
- **One-command deploy** — includes `render.yaml` and a `Dockerfile`, so it runs on Render, Railway, Fly.io, Koyeb, or Cloud Run with only `GEMINI_API_KEY` set.

### Stack
React 19 + TypeScript + Vite · Tailwind CSS v4 · Express · `@google/genai` · Framer Motion · Lucide icons.

---

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | Server-side Gemini auth (process exits if unset). |
| `PORT` | no | 3000 | Injected by most hosts. |
| `GEMINI_MODEL` | no | `gemini-3.6-flash` | Swap models without a code change. |
| `RATE_LIMIT_PER_HOUR` | no | 60 | Per-IP cap on `/api/gemini`. |
</content>
</invoke>
