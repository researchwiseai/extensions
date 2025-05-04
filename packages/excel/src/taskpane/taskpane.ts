/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global console, document, Excel, Office */

// The initialize function must be run each time a new page is loaded
Office.onReady(() => {
  document.getElementById("sideload-msg").style.display = "none";
  document.getElementById("app-body").style.display = "flex";
  const connectButton = document.getElementById("connect");
  if (connectButton) {
    connectButton.onclick = connect;
  }
});

export async function run() {
  try {
    await Excel.run(async (context) => {
      /**
       * Insert your Excel code here
       */
      const range = context.workbook.getSelectedRange();

      // Read the range address
      range.load("address");

      // Update the fill color
      range.format.fill.color = "yellow";

      await context.sync();
      console.log(`The range address was ${range.address}.`);
    });
  } catch (error) {
    console.error(error);
  }
}
/**
 * Handles user connection via email input.
 */
export async function connect() {
  const emailInput = document.getElementById("email-input") as HTMLInputElement;
  const email = emailInput ? emailInput.value : "";
  console.log(`Connect with email: ${email}`);
  // TODO: implement connection/sign-in logic here
}
