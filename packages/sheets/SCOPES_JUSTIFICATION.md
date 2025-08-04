# OAuth Scopes Justification

This document provides a detailed explanation of why Pulse requires each of the OAuth scopes declared in its Apps Script manifest.

| Scope URL                                                                                  | Why we need it                                                                                                                                                                                                                                                                         |
|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **https://www.googleapis.com/auth/spreadsheets.currentonly**                               | **Read and write the user’s active sheet only.**
Pulse is a Google Sheets add‑on that annotates and modifies the *currently open* spreadsheet with AI‑driven text‑analysis results (sentiment tags, theme assignments, user‑saved theme sets, etc.).
Restricting our access to “currentonly” ensures we cannot see or touch any other spreadsheets in the user’s Drive. |
| **https://www.googleapis.com/auth/script.container.ui**                                    | **Render in‑sheet UI (cards, dialogs, menus).**
Pulse uses the Apps Script Card Service to build context menus and prompt dialogs directly inside the Sheets container. This scope is required so that our code can display and manage the interactive UI components of the add‑on.                                            |
| **https://www.googleapis.com/auth/script.external_request**                                | **Make outbound HTTP calls to our AI back‑end.**
Pulse submits text data from the spreadsheet to ResearchWise AI’s REST APIs (for sentiment analysis, theme generation, allocation, etc.) and retrieves the results. This scope authorizes those external fetch requests from Apps Script.                                                   |
| **https://www.googleapis.com/auth/script.storage**                                        | **Persist user settings and saved theme‑sets.**
Pulse stores user preferences (API endpoints, default model parameters) and the user’s custom theme‑sets in the script’s PropertiesService (the Apps Script “storage” area). This allows state to be retained between sessions without requiring a separate database.             |

## Apps Script manifest excerpt

```json
// src/appsscript.json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.storage"
  ]
}
```
