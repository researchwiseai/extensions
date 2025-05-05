import { extractInputs } from "pulse-common/input";
import { analyzeSentiment as analyzeSentimentApi } from "pulse-common/api";

export async function analyzeSentiment(context: Excel.RequestContext, range: string) {
  const parts = range.split("!");
  const sheetName = parts[0];
  const rangeNotation = parts.slice(1).join("!");
  const sheet = context.workbook.worksheets.getItem(sheetName);
  const target = sheet.getRange(rangeNotation);
  target.load(["values", "rowIndex", "columnIndex"]);

  await context.sync();

  const values = target.values;
  const { inputs, positions } = extractInputs(values, {
    rowOffset: target.rowIndex + 1,
    colOffset: target.columnIndex + 1,
  });

  if (inputs.length === 0) {
    console.warn("No text found in selected data range for sentiment analysis.");
    return;
  }

  const result = await analyzeSentimentApi(inputs, { fast: false, onProgress: (message) => {
    console.log(message);
  }
});
  positions.forEach((pos, i) => {
    const sentiment = result.results[i].sentiment;
    const cell = sheet.getCell(pos.row - 1, pos.col);
    cell.values = [[sentiment]];
  });
  await context.sync();
}
