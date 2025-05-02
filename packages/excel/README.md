# Pulse: AI-Powered Text Analysis for Excel

Pulse is an Excel add-in powered by ResearchWise AI that brings advanced qualitative text analysis capabilities directly into your spreadsheets. With Pulse, you can analyze sentiment, generate themes, allocate themes to your data, and manage theme sets—all from within Excel.

## Key Features

 - **Analyze Sentiment**: Evaluate the tone of text entries (Positive, Negative, Neutral).
 - **Generate Themes**: Discover key topics and themes in your text data with AI-driven clustering.
 - **Allocate Themes**: Apply saved or newly generated theme sets to your dataset.
 - **Theme Set Management**: Save, rename, and delete theme sets for reuse.
 - **Authentication**: Secure OAuth2 sign-in to your ResearchWise AI account.
 - **Settings**: Configure API endpoints, default parameters, and sign out options.

## Getting Started

### Prerequisites

 - Microsoft Excel (Office 365, Excel 2016 or later) with Office Add-ins support.
 - Node.js v14+ and npm (for local development).

### Installation

 1. Clone the repository:
    ```bash
    git clone <repo-url>
    cd packages/excel
    npm install
    npm run build
    ```
 2. Sideload the add-in in Excel:
    - Open Excel.
    - Go to **Insert > Add-ins > My Add-ins > Upload My Add-in**.
    - Browse and select the `manifest.xml` file from the `packages/excel` folder.
    - The **Pulse** tab will appear in the Ribbon.
 3. (Optional) Publish to AppSource:
    - Follow Microsoft's guidelines to submit your add-in to the Office Store.
    - Users can install directly from the Office Store.

## Authentication

 - Click the **Pulse** tab in the Ribbon and open the **Settings** panel.
 - Sign in with your ResearchWise AI account using OAuth2.
 - Your credentials are securely stored locally.

## Usage

### Analyze Sentiment
 1. Select a range of cells containing text.
 2. Click **Analyze Sentiment** in the Pulse task pane.
 3. Sentiment labels will be inserted next to each selected cell.

### Generate Themes
 1. Select your text data range.
 2. Click **Generate Themes**.
 3. Review and save the generated theme set.

### Allocate Themes
 1. Select the range to tag.
 2. Click **Allocate Themes**.
 3. Choose an existing theme set or create a new one.
 4. Pulse assigns a theme to each entry.

### Manage Themes
 - Open **Manage Themes** to view saved theme sets.
 - Rename or delete theme sets.

### Settings
 - Change the API endpoint.
 - Configure default theme count and analysis parameters.
 - Sign out or clear stored credentials.

## Best Practices

 - Batch large datasets to avoid timeouts (e.g., process in segments).
 - Ensure consistent data formatting for accurate results.
 - Refine generated themes before allocating to maximize relevance.

## Support & Feedback

 - Documentation: https://researchwiseai.com/docs
 - Issues: https://github.com/your-org/pulse-excel-addon/issues
 - Contact: support@researchwiseai.com

## Contributing

 1. Fork the repository and create a feature branch.
 2. Submit a pull request with a detailed description of changes.
 3. Ensure coding style and (future) tests pass.