/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global console, document, Excel, Office */
import { setupExcelPKCEAuth } from "./pkceAuth";
import { signIn, getAccessToken } from "pulse-common/auth";
import { configureClient } from "pulse-common/api";

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
 * Handles user sign-in and API client configuration using PKCE.
 */
export async function connect() {
  try {
    // TODO: replace with your actual Auth0 / OIDC settings
    const domain = "wise-dev.eu.auth0.com";       // e.g. 'your-tenant.auth0.com'
    const clientId = "SC5e4aoZKvcfH1MoPTxzMaA1d5LnxV4W";
    // Redirect URI must match your Auth0 app and maps to auth-callback.html
    const redirectUri = `${window.location.origin}/auth-callback.html`;
    const scope = "openid profile email offline_access";
    const apiBase = "https://dev.core.researchwiseai.com/pulse/v1";
    const email = (document.getElementById("email-input") as HTMLInputElement).value;

    // Configure the PKCE AuthProvider
    setupExcelPKCEAuth({ domain, clientId, email, redirectUri, scope });
    // Perform interactive sign-in
    await signIn();

    // Initialize the Pulse API client
    configureClient({ baseUrl: apiBase, getAccessToken });

    console.log("✅ Connected and authenticated");
  } catch (err) {
    console.error("Authentication failed", err);
  }
}
