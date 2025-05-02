 # Development Plan

 This document outlines an incremental plan to refactor shared logic into `pulse-common` and integrate it with the Excel and Sheets add-ins.

  ## Phase 1: Bootstrapping pulse-common
 1. Create the package skeleton:
    - Edit package.json:
      * name: "pulse-common"
      * version: "0.1.0"
      * main: "dist/index.js"
      * source: "src/index.ts"
      * Add placeholder runtime deps (e.g., "cross-fetch": "^3.1.5")
    - Run `bun install` to install dependencies.
 2. Configure TypeScript:
    - Create packages/common/tsconfig.json with appropriate compilerOptions (target ES2020, module ESNext, declaration, outDir dist, rootDir src, strict, esModuleInterop).
 3. Install dev dependencies:
    - bun add -d typescript jest @types/jest ts-jest eslint prettier
 4. Add build/test scripts to package.json:
    - "build": "tsc -b"
    - "test": "jest"
    - "lint": "eslint src --ext .ts"
    - "prepublishOnly": "bun run build"
 5. Scaffold source folder:
    - mkdir -p src
    - echo "export {}" > src/index.ts

 ## Phase 2: Extract API Client Logic

 1. Create `packages/common/src/apiClient.ts`:
    - Export async functions:
      * analyzeSentiment(inputs: string[], opts?): Promise<SentimentResult[]>
      * generateThemes(inputs: string[], opts?): Promise<ThemeSet>
      * allocateThemes(inputs: string[], themeSetId: string): Promise<AllocationResult[]>
      * pollJobStatus(jobId: string): Promise<JobStatus>
 2. Copy HTTP logic from `packages/excel/src`:
    - Use `fetch` and handle JSON parsing, errors, retries.
    - Parameterize base URL and auth token.
 3. Write unit tests with Jest in `packages/common/__tests__/apiClient.test.ts`.
 4. Import and use `apiClient` functions in Excel add-in:
    - Replace inline HTTP calls with `import { analyzeSentiment, ... } from 'pulse-common/apiClient'`.

 ## Phase 3: Extract Input Preprocessing

 1. Create `packages/common/src/input.ts`:
    - Export `extractInputs(data: any[][]): { inputs: string[]; positions: Pos[] }`.
    - Export `sampleInputs<T>(arr: T[], max: number): T[]` (random slice).
 2. Copy and adapt range-extraction logic from `packages/excel/src` into `input.ts`.
 3. Refactor Excel add-in to import and use `extractInputs` and `sampleInputs`.

 ## Phase 4: Extract Result Mapping & Writing

 1. Create `packages/common/src/output.ts`:
    - Define `type Pos = { row: number; col: number }`.
    - Export `mapResults<T>(results: T[], positions: Pos[], writer: (pos: Pos, value: T) => void): void`.
 2. Refactor Excel and Sheets add-ins to import `mapResults` and pass platform-specific writer implementations.

 ## Phase 5: Theme Set Management

 1. Create `packages/common/src/themes.ts`:
    - Export `getThemeSets()`, `saveThemeSet()`, `deleteThemeSet()`, `renameThemeSet()`, `saveManualThemeSet()`.
 2. Define `interface Storage { get<T>(key: string): Promise<T>; set<T>(key: string, value: T): Promise<void>; delete(key: string): Promise<void>; }`:
    - Implement `ExcelStorage` using OfficeRuntime.storage or localStorage.
    - Implement `SheetsStorage` using Apps Script PropertiesService.
 3. Refactor both add-ins to import and use `themes.ts` APIs instead of inline persistence logic.

 ## Phase 6: Authentication & Configuration

 1. Create `packages/common/src/auth.ts`:
    - Export `signIn(): Promise<void>`, `signOut(): Promise<void>`, `getAccessToken(): Promise<string>`.
 2. Move OAuth2 workflow and token storage from Excel add-in into `auth.ts`.
 3. Implement adapters:
    - `ExcelAuth` using OfficeRuntime.auth or pop-up UI.
    - `SheetsAuth` using Apps Script OAuth2 library.
 4. Update both add-ins to import and use `signIn`, `signOut`, and `getAccessToken` from `pulse-common/src/auth.ts`.

 ## Phase 7: Integration & Testing

 - Run `bun workspace run build` to compile all packages.
 - Run `bun workspace run test` to execute Jest tests in `pulse-common`.
 - Launch Excel add-in with `bun workspace run start --workspace=pulse-excel-addon`.
   * Verify Analyze Sentiment, Generate Themes, Allocate Themes, and Theme Management flows.
 - Debug issues, refine implementations, and iterate until end-to-end scenarios pass.

 ## Phase 8: Google Sheets Add-in Migration
 Repeat Phases 2–7 for `packages/sheets`, ensuring both add-ins consume `pulse-common`.

 ## Phase 9: Documentation & Release
 1. Update `packages/common/README.md` with API and usage examples.
 2. Document migration steps in root `README.md`.
 3. Bump versions and publish `pulse-common` to npm (if applicable).
 4. Release updated Excel and Sheets add-ins.

 ## Next Review & Iteration
 - Schedule a demo and collect feedback.
 - Iterate on abstractions based on real-world ad-in behavior.