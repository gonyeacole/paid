#!/usr/bin/env node
// One-time helper to get a Google Ads OAuth refresh token.
//
// Run this on a machine with a real browser you can use interactively —
// it starts a local server to catch the OAuth redirect, so it won't work
// inside a headless/remote session with no browser of its own.
//
//   node scripts/get-refresh-token.mjs
//
// Reads GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET from the environment
// if set (e.g. already in .env.local), otherwise prompts for them.

import http from "node:http";
import https from "node:https";
import readline from "node:readline";
import { URL } from "node:url";

const PORT = 43567;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/adwords";

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function postForm(url, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json;
          try {
            json = JSON.parse(data);
          } catch {
            reject(new Error(`Unexpected response: ${data}`));
            return;
          }
          if (res.statusCode >= 400) reject(new Error(JSON.stringify(json)));
          else resolve(json);
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function waitForAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, REDIRECT_URI);
      const error = reqUrl.searchParams.get("error");
      const code = reqUrl.searchParams.get("code");
      res.setHeader("Content-Type", "text/html");

      if (error) {
        res.end(`<p>Authorization failed: ${error}. You can close this tab.</p>`);
        server.close();
        reject(new Error(error));
        return;
      }
      if (code) {
        res.end("<p>Authorized — you can close this tab and return to the terminal.</p>");
        server.close();
        resolve(code);
        return;
      }
      res.end("<p>Waiting for authorization...</p>");
    });
    server.listen(PORT, "127.0.0.1");
  });
}

const clientId = process.env.GOOGLE_ADS_CLIENT_ID || (await prompt("Google Ads OAuth Client ID: "));
const clientSecret =
  process.env.GOOGLE_ADS_CLIENT_SECRET || (await prompt("Google Ads OAuth Client Secret: "));

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\n1. Open this URL in a browser, signed in to the Google account with access to your Ads MCC:\n");
console.log(authUrl.toString());
console.log(`\n2. Approve access. This script is listening on ${REDIRECT_URI} and will catch the redirect.\n`);

try {
  const code = await waitForAuthCode();

  const tokenResponse = await postForm("https://oauth2.googleapis.com/token", {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  console.log("\nSuccess. Add these to .env.local:\n");
  console.log(`GOOGLE_ADS_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_ADS_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_ADS_REFRESH_TOKEN=${tokenResponse.refresh_token}`);
  console.log("");
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exitCode = 1;
}
