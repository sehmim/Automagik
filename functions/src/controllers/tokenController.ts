import { https } from "firebase-functions";
import { oauth2Client } from "../services/googleClient";
import { watchGmailInbox } from "../services/watchGmailInbox";
import { REDIRECT_URI } from "../config";
import { db } from "..";
import { corsHandler } from "../util/cors";

export const exchangeCodeForTokenHandler = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log("🔐 Received OAuth token exchange request");

    if (req.method !== "POST") {
      console.warn("❌ Invalid method:", req.method);
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const code = req.body?.code;
    if (!code) {
      console.warn("❌ Missing 'code' in request body");
      return res.status(400).json({ error: "Missing 'code' in request body." });
    }

    try {
      // 🔁 1. Exchange code for token
      console.log("🔄 Exchanging code for tokens...");
      const { tokens } = await oauth2Client.getToken({ code, redirect_uri: REDIRECT_URI });
      if (!tokens?.access_token) throw new Error("No access token returned.");
      oauth2Client.setCredentials(tokens);
      console.log("✅ Tokens obtained:", { accessToken: tokens.access_token, refreshToken: tokens.refresh_token });

      // 👤 2. Get user info
      const userInfoResponse = await oauth2Client.request({
        url: "https://openidconnect.googleapis.com/v1/userinfo",
      });
      const userInfo: any = userInfoResponse?.data;
      const userEmail = userInfo?.email?.toLowerCase()?.trim();
      if (!userEmail) throw new Error("User email not found from userinfo response.");

      console.log("🙋‍♂️ User Info:", { email: userEmail, name: userInfo.name });

      // 💾 3. Store credentials
      const now = Date.now();
      const tokenDoc: Record<string, any> = {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        expiresIn: tokens.expiry_date,
        userInfo,
        createdAt: now,
        updatedAt: now,
      };

      // 📡 4. Watch Gmail Inbox
      console.log("📡 Setting up Gmail watch...");
      const gmailWatcher = await watchGmailInbox(tokens.access_token!);
      if (!gmailWatcher?.historyId) {
        throw new Error("Gmail watch did not return a historyId.");
      }

      tokenDoc["lastHistoryId"] = gmailWatcher.historyId;
      tokenDoc["watchExpiration"] = gmailWatcher.expiration || null;

      // 📝 5. Save to Firestore
      await db.collection("gmail_tokens").doc(userEmail).set(tokenDoc);
      console.log("✅ Gmail token & watch info saved for:", userEmail);

      // 🎉 Done
      return res.status(200).json({
        success: true,
        userInfo,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
        },
        watch: gmailWatcher,
      });

    } catch (error: any) {
      console.error("❌ OAuth token exchange failed:", error.message || error);
      return res.status(500).json({
        error: "Token exchange or Gmail watch failed.",
        details: error.message || error,
      });
    }
  });
});
