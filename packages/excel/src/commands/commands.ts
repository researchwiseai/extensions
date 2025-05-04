/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office */

Office.onReady(() => {
  // If needed, Office.js is ready to be called.
});

/**
 * Shows a notification when the add-in command is executed.
 * @param event
 */
function action(event: Office.AddinCommands.Event) {
  const message: Office.NotificationMessageDetails = {
    type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
    message: "Performed action.",
    icon: "Icon.80x80",
    persistent: true,
  };

  // Show a notification message.
  Office.context.mailbox.item.notificationMessages.replaceAsync(
    "ActionPerformanceNotification",
    message
  );

  // Be sure to indicate when the add-in command function is complete.
  event.completed();
}

// Register the existing command with Office.
Office.actions.associate("action", action);

/**
 * Stub for Analyze Sentiment command.
 * @param event - The event object from the button click.
 */
function analyzeSentiment(event: Office.AddinCommands.Event) {
  console.log("Analyze Sentiment button clicked");
  // TODO: Implement sentiment analysis functionality
  event.completed();
}

// Register the analyzeSentiment function with Office.
Office.actions.associate("analyzeSentiment", analyzeSentiment);
