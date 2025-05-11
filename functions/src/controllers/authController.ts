import { REDIRECT_URI } from "../config";
import { oauth2Client } from "../services/googleClient";
import * as cors from "cors";

// Initialize CORS middleware to allow everything
const corsHandler = cors({ origin: true });

export const getAuthUrlHandler = (req: any, res: any) => {
  corsHandler(req, res, () => {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      redirect_uri: REDIRECT_URI
    });

    console.log("scopes:", scopes);
    console.log("OAuth URL:", authUrl);

    res.json({ authUrl });
  });
};
