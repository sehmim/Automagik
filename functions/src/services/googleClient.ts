import { google } from "googleapis";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from "../config";

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
