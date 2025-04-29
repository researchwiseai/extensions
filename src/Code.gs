const API_BASE = 'https://dev.core.researchwiseai.com/pulse/v1';
const API_KEY  = 'YOUR_API_KEY_HERE';  // <- set your key here!

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Pulse')
    .addItem('Analyze Sentiment…','')
    .addItem('Generate Themes…', '')
    .addToUi();
}