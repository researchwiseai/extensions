# Pulse Extensions Monorepo

This repository hosts multiple packages that provide AI-powered text analysis tools for Microsoft Excel and Google Sheets. All packages are managed with **Bun workspaces** and share common utilities.

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| **pulse-excel-addon** | `packages/excel` | Excel add-in that integrates ResearchWise AI into Excel. Users can analyze sentiment, generate themes, and allocate themes directly in spreadsheets. |
| **pulse-sheets-addon** | `packages/sheets` | Google Sheets add-on providing similar functionality to the Excel add-in. Built with Apps Script and deployed using `clasp`. |
| **pulse-common** | `packages/common` | Shared TypeScript library containing API client logic, authentication helpers, and utilities used by both add-ins. |

## Setup

1. Install [Bun](https://bun.sh/) version 1.0 or higher.
2. From the repository root, install all workspace dependencies:

   ```bash
   bun install
   ```

## Development Scripts

Run these commands from the repository root:

- **Lint all packages**
  ```bash
  bun run lint
  ```
- **Run tests**
  ```bash
  bun run test
  ```
- **Build packages**
  ```bash
  bun run build
  ```

### Optional

- **Excel add-in dev server**
  ```bash
  bun run --filter=pulse-excel-addon dev-server
  ```
- **Sheets add-on build and push**
  ```bash
  bun run --filter=pulse-sheets-addon push
  ```

These optional scripts help during local development and deployment of each add-in.

