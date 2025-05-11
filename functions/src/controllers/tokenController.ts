import { https } from "firebase-functions";
import { oauth2Client } from "../services/googleClient";
import * as cors from "cors";
import { watchGmailInbox } from "../services/watchGmailInbox";
import { REDIRECT_URI } from "../config";
import { db } from "..";

// Allow all origins for local dev
const corsHandler = cors({ origin: true });

export const exchangeCodeForTokenHandler = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log("Request Method:", req.method);
    console.log("Request Body:", req.body);

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST instead." });
      return;
    }

    const code = req.body?.code;
    if (!code) {
      res.status(400).json({ error: "Code is required in the request body." });
      return;
    }

    try {
      // Step 1: Exchange auth code for tokens
      const { tokens } = await oauth2Client.getToken({ code, redirect_uri: REDIRECT_URI });
      console.log("🔑 Tokens received:", tokens);

      oauth2Client.setCredentials(tokens);

      // Step 2: Get user info
      const userInfoResponse = await oauth2Client.request({
        url: "https://openidconnect.googleapis.com/v1/userinfo",
      });


      const userInfo: any = userInfoResponse?.data;
      console.log("🙋‍♂️ UserInfo received:", userInfo);


      const username = userInfo?.name;
      if (!username) throw new Error("Username found in user info.");

      // Step 3: Save tokens
      await db.collection("gmail_tokens").doc(username).set({
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        expiresIn: tokens.expiry_date,
        userInfo,
        createdAt: Date.now(),
      });


      console.log("💾 Tokens saved for:", username);

      // Step 4: Enable Gmail watcher
      const accessToken = tokens.access_token!;
      const gmailWatcher = await watchGmailInbox(accessToken);
      console.log("📡 Gmail watcher enabled:", gmailWatcher);

      // Final response
      res.json({ tokens, userInfo, gmailWatcher });
    } catch (error) {
      console.error("❌ Error during token exchange or watcher registration:", error);
      res.status(500).json({
        error: "Failed to exchange code or enable Gmail watcher.",
        details: error,
      });
    }
  });
});
