# Agent Guidelines

This repository contains multiple packages managed with **Bun workspaces**. Follow these steps when contributing or running AI development workflows.

## Initial setup
1. Install Bun (>=1.0) locally.
2. Install workspace dependencies from the repository root:
   ```bash
   bun install
   ```

## Common tasks
- **Lint all packages**:
  ```bash
  bun run lint
  ```
- **Type check all packages**:
  ```bash
  bun run typecheck
  ```
- **Run tests**:
  ```bash
  bun run test
  ```
- **Build packages**:
  ```bash
  bun run build
  ```
- **Excel add-in dev server** (optional):
  ```bash
  bun run --filter=pulse-excel-addon dev-server
  ```
- **Sheets add-on build & push** (optional):
  ```bash
  bun run --filter=pulse-sheets-addon push
  ```

## Contribution rules
- Use Bun for all installs and script execution.
- Do **not** commit `dist/`, `node_modules/`, or `.git/` directories.
- Ensure linting, type checks, tests, and builds succeed before opening a pull request.


