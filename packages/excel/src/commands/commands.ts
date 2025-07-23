/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office, Excel */
import { promptRange } from '../services/promptRange';
import { analyzeSentiment as analyzeSentimentLogic } from '../analyzeSentiment';

/**
 * Handler for Analyze Sentiment ribbon button.
 * @param event - The event object from the button click.
 */
async function analyzeSentiment(event: Office.AddinCommands.Event) {
  try {
    await Excel.run(async (context) => {
      // Get selected range and confirm with user
      const selected = context.workbook.getSelectedRange();
      selected.load('address');
      await context.sync();
      const defaultRange = selected.address;
      // Prompt user to confirm or change range
      let confirmedRange: string | null;
      let hasHeader = false;
      try {
        ({ range: confirmedRange, hasHeader } = await promptRange(defaultRange));
      } catch (err) {
        console.error('Range selection dialog error:', err);
        return;
      }
      if (!confirmedRange) {
        // User cancelled
        return;
      }
      // Perform sentiment analysis
      await analyzeSentimentLogic(context, confirmedRange, hasHeader);
    });
  } catch (err) {
    console.error('Analyze Sentiment error:', err);
  } finally {
    event.completed();
  }
}

// Register the Analyze Sentiment command handler
Office.actions.associate('analyzeSentiment', analyzeSentiment);
