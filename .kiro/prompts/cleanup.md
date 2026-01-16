Here is a **stronger, more explicit, step-by-step prompt** that tightly controls *how* the analysis is done, what to focus on, and how safety is verified. This is suitable for a serious production cleanup.

---

You are a senior staff-level engineer and codebase auditor. Your task is to prepare a **safe, verified cleanup plan** for this project.

### Scope rules (very important)

* **Analyze only code files** (frontend, backend, scripts, configs that affect runtime).
* **Ignore documentation files** (README, markdown docs, notes, specs).
* Do **not** make any changes yet.
* The goal is to prepare for cleanup, not to execute it.

---

### Step 1: Full codebase analysis

Scan the entire repository and build a complete understanding of how the app currently runs end-to-end. Identify entry points, runtime paths, build steps, and execution flow for both frontend and backend.

Map:

* Project structure and responsibilities of each folder
* Runtime-executed files vs non-executed files
* Frontend and backend boundaries
* Shared or cross-cutting code

---

### Step 2: Usage verification (no assumptions)

For every code file, module, and major export, **verify whether it is actually used** by:

* Checking imports and references
* Tracing execution paths
* Confirming it is reachable from a real entry point
* Distinguishing between “currently unused” vs “intended but inactive”

Do **not** mark anything as unused unless it is provably unreachable or unreferenced.

---

### Step 3: Identify cleanup candidates

Systematically identify:

* Unused or unreachable files
* Duplicate logic or utilities
* Multiple implementations of the same idea
* Legacy or abandoned approaches
* Dead configuration, flags, or environment variables
* Unused dependencies or build tooling
* Files that should be merged, split, renamed, or relocated

For each finding, explain **why** it appears unused or redundant and **how confident** that assessment is.

---

### Step 4: Safety classification

Classify every cleanup candidate into:

* **Safe to delete**
* **Likely safe but requires manual confirmation**
* **In use but should be refactored**
* **In use and should be kept**

Include risk level and potential side effects for each item.

---

### Step 5: App integrity verification plan

For each proposed cleanup action, define **how to verify the app still works**, including:

* What must still compile
* What must still start successfully
* What runtime paths should be smoke-tested
* What failures would indicate a rollback is needed

Assume the app must remain functional at all times.

---

### Step 6: Produce the cleanup plan

Output a **single, comprehensive Markdown report** that includes:

* Current codebase structure overview
* Verified unused and redundant code inventory
* Duplication analysis
* Dependency cleanup opportunities
* Risk-aware cleanup recommendations
* A **step-by-step, ordered cleanup plan** designed to minimize breakage
* Clear instructions on how to validate the app after each cleanup step

Do **not** perform any cleanup yet.
Wait for explicit confirmation before making changes.

The final output must be a polished Markdown file suitable for saving as **`CLEANUP_PLAN.md`**.
