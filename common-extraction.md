# Common Extraction Candidates

This document lists potential pieces of business logic in the Google Sheets add-on (`packages/sheets`) that can be refactored into the `pulse-common` package for reuse across both Google Sheets and Excel add-ins.

## 1. API Client Logic

- Endpoint configuration and base URL handling (`API_BASE`, `WEB_BASE`, `AUTH_DOMAIN`, `API_AUD` properties).
- HTTP request construction for:
  - Sentiment analysis (`POST ${API_BASE}/sentiment?fast=false`).
  - Theme generation (`POST ${API_BASE}/themes`).
  - Similarity/allocation (`POST ${API_BASE}/similarity`).
  - Job status polling (`GET ${API_BASE}/jobs?jobId=...`).
- Common error handling and JSON parsing of responses.
- Async job polling loop (sleep, retry, status check, result fetch).

## 2. Input Extraction & Preprocessing

- Functions to read a selected spreadsheet range and flatten into:
  - `inputs`: array of non-empty text strings.
  - `positions`: array of `{ row, col }` mappings for writing back results.
  - Example in `analyzeSentiment()`, `generateThemes()`, `allocateAndSaveThemeSet()`, etc.
- Sampling utility for large datasets (shuffle & slice to max 1000 inputs).

## 3. Results Mapping & Writing

- Writing sentiment labels adjacent to original cells (mapping `results[i]` to `positions[i]`).
- Writing theme allocations to cells next to data.
- Exporting full theme lists to a dedicated sheet (headers + rows).

## 4. Theme Set Management

- Persistent storage of named theme sets:
  - `getThemeSets()`, `saveThemeSet()`, `deleteThemeSet()`, `renameThemeSet()`, `saveManualThemeSet()`.
- JSON serialization to user properties (or equivalent storage in Excel).

## 5. Utility Functions

- Range helpers:
  - `getActiveRangeA1Notation()` (sheet-qualified A1 strings).
  - Parsing and validating A1 notation strings.
- Dialog flow helpers (range selection, mode dialogs) — may need UI-specific adaptation.

## 6. Authentication & Configuration

- OAuth2 service setup (`getOAuthService()`), callback handling, token storage.
- Organization lookup (`findOrganization(email)`) via unauthenticated endpoint.
- Settings retrieval (`getSettings()`) and disconnect (`disconnect()`).

## Next Steps

1. Extract core HTTP client and polling logic into `pulse-common/src/apiClient.js`.
2. Move input preprocessing and sampling utilities into `pulse-common/src/utils/input.js`.
3. Centralize theme-set persistence APIs under `pulse-common/src/themes.js` (abstract storage interface).
4. Define interfaces in `pulse-common` for result mapping and output formatting.
5. Adapt storage/use of user properties to a cross-platform abstraction (e.g., Office Storage API vs. Apps Script Properties).
6. Update both add-ins to import and consume these shared modules.