# FarmVista Grain Operations

This directory is the single application boundary for Grain Hauling Jobs, Grain Contracts, Grain Tickets, allocation, and future Settlement.

## Rules
- `core/` owns business rules and validation. UI files must not duplicate them.
- `data/grain-store.js` is the centralized Firestore read gateway.
- `data/grain-writes.js` is the centralized Firestore write gateway. UI files must not write directly to Firestore.
- `hauling/`, `contracts/`, and `tickets/` build read models from the same central state.
- `drag-drop/` decides whether and how allocations may move. Persistence is delegated to `data/`.
- `ui/` renders and handles browser interaction only.
- `settlements/` remains a placeholder until settlement functionality is designed.

## Hauling allocation invariant
A physical ticket remains one ticket. Bushels may be allocated in portions. Compatible active hauling jobs are filled oldest-first. Overflow rolls into the next compatible active job. Spot is used only when no compatible active capacity remains. Genuine Spot remains visible against its source job as operational overhaul.

## Migration
The legacy Grain Contracts/Hauling page remains untouched until this centralized workspace is functionally ready for user testing. Do not import legacy hauling/contracts modules into this directory. Recreate required behavior through the central store, rules, models, write gateway, and UI.
