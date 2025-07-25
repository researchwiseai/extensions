# Pulse: AI-Powered Text Analysis for Google Sheets

Pulse is a Google Sheets add-on powered by ResearchWise AI that brings advanced qualitative text analysis capabilities directly into your spreadsheets. With Pulse, you can analyze sentiment, generate themes, allocate themes to your data, and manage theme sets—all from within Google Sheets.

## Key Features

-   **Analyze Sentiment**: Evaluate the tone of text entries (Positive, Negative, Neutral).
-   **Generate Themes**: Discover key topics and themes in your text data with AI-driven clustering.
-   **Allocate Themes**: Apply saved or newly generated theme sets to your dataset.
-   **Theme Set Management**: Save, rename, and delete theme sets for reuse.
-   **Authentication**: Secure OAuth2 sign-in to your ResearchWise AI account.
-   **Settings & Feed**: Configure API endpoints, default parameters, view system messages, and sign out.

## Prerequisites

-   Node.js v14+ and [Bun](https://bun.sh/) (for workspace dependencies).
-   [Google Apps Script CLI (clasp)](https://github.com/google/clasp) installed globally.
-   A Google account with access to Google Sheets.

## Initial Setup

1. Clone the repository and install workspace dependencies from the root:
    ```bash
    git clone <repo-url>
    cd <repo-root>
    bun install
    ```
2. Navigate to the Sheets add-on package:
    ```bash
    cd packages/sheets
    ```
3. Ensure `.clasp.json` is configured to point at your development spreadsheet and Apps Script project.

## Local Development

Authenticate and open the Apps Script editor for rapid iteration:

```bash
# Sign in with your Google account
clasp login

# Open the bound Apps Script project in your browser
clasp open-script

# Build & push updates to the script project
bun run push
```

Then refresh your development spreadsheet in Google Sheets to load the latest code.

## Pushing Test Versions (Dev Deployment)

Pulse supports a dedicated development deployment for previewing changes without affecting production:

```bash
bun run deploy:dev
```

This will create or update the "dev" deployment in Apps Script.

## Deploying for Release (Production)

When you are ready to publish a production release:

1. Create a production deployment via clasp (if you haven’t already):
    ```bash
    clasp deployments
    # Copy the deployment ID for the new production deployment
    ```
2. Edit the `deploy:prod` script in `package.json` and replace `[YOUR_PROD_DEPLOYMENT_ID]` with the actual deployment ID.
3. Run the production deploy:
    ```bash
    bun run deploy:prod
    ```

## Install & Usage

After pushing or deploying, open your spreadsheet and go to **Extensions > Add-ons > Pulse**. Use the generated **Pulse** menu to access:

-   **Feed**: View system messages and onboarding.
-   **Settings**: Configure API endpoint and sign in/out.
-   **Analyze Sentiment**: Tag text data with sentiment labels.
-   **Themes > Generate/Allocate/Manage**: Create and apply theme sets.
-   **Advanced**: Split sentences, split tokens, count words, matrix allocations, similarity matrices.

## Support & Feedback

-   Documentation: https://researchwiseai.com/docs
-   Issues: https://github.com/your-org/pulse-sheets-addon/issues
-   Contact: support@researchwiseai.com

## Contributing

1. Fork the repository and create a feature branch.
2. Submit a pull request detailing your changes.
3. Ensure linting (`bun run --filter=pulse-sheets-addon lint`) and formatting (`bun run --filter=pulse-sheets-addon format`) pass.
