import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";
import { OpenAIClient } from "../services/OpenAI";
import { db } from "..";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, OPENAI_API_KEY } from "../config";

dotenv.config();

// Gmail API setup
type GmailUserContext = { accessToken: string };

let cachedGoogleAuthClient: OAuth2Client | null = null;
function getGoogleAuthClient(): OAuth2Client {
  if (!cachedGoogleAuthClient) {
    console.log("🔐 Initializing new OAuth2Client...");
    cachedGoogleAuthClient = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
  }
  return cachedGoogleAuthClient;
}

let cachedOpenAIClient: OpenAIClient | null = null;
function getOpenAIClient() {
  if (!cachedOpenAIClient) {
    console.log("🧠 Initializing OpenAI client...");
    cachedOpenAIClient = new OpenAIClient(OPENAI_API_KEY!);
  }
  return cachedOpenAIClient;
}

const getEmailMetadata = async (
  messageId: string,
  auth: GmailUserContext
): Promise<{
  id: string;
  threadId: string;
  snippet: string;
  subject: string | undefined;
  from: string | undefined;
  date: string | undefined;
}> => {
  console.log("📬 Fetching email metadata for message ID:", messageId);
  const oauth2Client = getGoogleAuthClient();
  oauth2Client.setCredentials({ access_token: auth.accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const message = await gmail.users.messages.get({ userId: "me", id: messageId });
  console.log("📨 Gmail message payload fetched");

  const headers = message.data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const metadata = {
    id: messageId,
    threadId: message.data.threadId || "",
    snippet: message.data.snippet || "",
    subject: getHeader("Subject") || undefined,
    from: getHeader("From") || undefined,
    date: getHeader("Date") || undefined,
  };
  console.log("📝 Parsed Email Metadata:", metadata);

  return metadata;
};

async function getFreshAccessTokenByEmail(email: string): Promise<string> {
  console.log("🔄 Fetching refresh token for:", email);
  const doc = await db.collection("gmail_tokens").doc(email).get();
  if (!doc.exists) throw new Error("No token found for user: " + email);

  const data = doc.data();
  const oauth2 = getGoogleAuthClient();
  oauth2.setCredentials({ refresh_token: data?.refreshToken });

  console.log("🔐 Refreshing access token...");
  const { credentials } = await oauth2.refreshAccessToken();

  await doc.ref.update({ updatedAt: Date.now() });
  console.log("✅ Access token refreshed successfully");

  return credentials.access_token!;
}

export const onGmailUpdateController = async (event: any) => {
  try {
    const rawData = event.data?.message?.data;
    const decoded = rawData ? Buffer.from(rawData, "base64").toString() : "";
    console.log("📥 Raw Pub/Sub payload:", decoded);

    const historyPayload = JSON.parse(decoded);
    const userEmail = historyPayload.emailAddress;
    console.log("📧 Incoming Gmail push notification from:", userEmail);

    if (!userEmail) throw new Error("Missing emailAddress in Gmail push notification");

    const accessToken = await getFreshAccessTokenByEmail(userEmail);
    const gmailAuth: GmailUserContext = { accessToken };

    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    console.log("📬 Checking for latest unread messages...");
    const recentMessages = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1,
      q: "is:unread",
    });

    const latestId = recentMessages.data.messages?.[0]?.id;
    if (!latestId) {
      console.log("⚠️ No new unread messages found.");
      return;
    }
    console.log("📨 Latest unread message ID:", latestId);

    const emailMetadata = await getEmailMetadata(latestId, gmailAuth);
    const client = getOpenAIClient();
    console.log("🧠 Sending email to OpenAI for categorization...");
    const categorization = await client.categorizeEmail({ ...emailMetadata });

    const record = {
      email: emailMetadata,
      category: categorization.category,
      user: userEmail,
      createdAt: Date.now(),
    };

    await db.collection("relatedEmails").add(record);
    console.log("✅ Categorized email saved to Firestore:", record);
  } catch (err) {
    console.error("❌ Error in onGmailUpdate:", err);
  }
};
