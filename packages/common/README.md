# Pulse Common

Shared utilities for Pulse Excel and Google Sheets add‑ins. This package exposes
lightweight modules for calling the Pulse API, processing sheet data, and managing
authentication and theme sets. It is written in TypeScript and published as
ES modules so it can run both in a browser (Apps Script) and in Node environments.

## Modules

### `apiClient`
Client for the Pulse REST API. Configure it with a base URL and a function that
returns an access token:

```ts
import { configureClient, analyzeSentiment } from 'pulse-common/api';
import { signIn, getAccessToken } from 'pulse-common/auth';

configureClient({
  baseUrl: 'https://api.example.com',
  getAccessToken,
});

await signIn();
const { results } = await analyzeSentiment(['Great product!']);
```

### `input`
Helpers for extracting inputs from spreadsheet ranges and batching large sets.

```ts
import { extractInputs, createBatches } from 'pulse-common/input';

const { inputs, positions } = extractInputs(values);
const batches = createBatches(inputs, 100);
```

### `output`
Map API results back to spreadsheet positions using any writer function.

```ts
import { mapResults } from 'pulse-common/output';

mapResults(results, positions, (pos, value) => {
  sheet.getRange(pos.row + 1, pos.col + 2).setValue(value);
});
```

### `themes`
Utilities for working with theme sets, including allocation and persistence.

```ts
import { allocateThemes, saveThemeSet } from 'pulse-common/themes';

const allocations = await allocateThemes(inputs, themes);
await saveThemeSet('Survey Themes', themes);
```

### `auth`
Pluggable authentication helpers. Provide an `AuthProvider` that implements
`signIn`, `signOut`, and `getAccessToken`.

```ts
import { configureAuth, createAuth0Provider } from 'pulse-common/auth';

configureAuth(createAuth0Provider({
  domain: 'tenant.auth0.com',
  clientId: '...',
  clientSecret: '...',
  audience: 'https://api.example.com',
}));
```

### Other utilities
- `pkce` – generate PKCE codes and build OAuth URLs.
- `storage` – simple key/value interface used by the add-ins.
- `dataUtils` – conversions between sheet rows and theme objects.
- `saveThemesToSheet` – helper to create a "Themes" sheet.
- `jobs` – in-memory job feed for progress updates.
- `org` – look up organization IDs by email.
- `similarity` – helpers for similarity matrices.

## Usage in Excel (Office Add‑in)

```ts
import { signIn } from 'pulse-common/auth';
import { analyzeSentiment } from 'pulse-common/api';

await signIn();
const { results } = await analyzeSentiment(['Hello']);
```

## Usage in Google Sheets (Apps Script)

```ts
import { configureFetch } from 'pulse-common/api';
import { fetch as gasFetch } from './gasFetch';

configureFetch(gasFetch);
```

The rest of the API is the same; see the modules above for details.

