import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";
import { db } from "..";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, OPENAI_API_KEY, OPEN_ROUTER_APIKEY } from "../config";
import { OpenAIClient } from "../services/OpenAI";
import { OpenRouterClient } from "../services/OpenRouter";
// import { OpenAIClientRita } from "../services/OpenAIbk";



dotenv.config();

// Gmail API setup
export type GmailUserContext = { accessToken: string };
export interface FireStoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  agents: any[];        
  connections: any[]; 
  createdAt: string;
}

let cachedGoogleAuthClient: OAuth2Client | null = null;
export function getGoogleAuthClient(): OAuth2Client {
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
export function getOpenAIClient() {
  if (!cachedOpenAIClient) {
    console.log("🧠 Initializing OpenAI client...");
    cachedOpenAIClient = new OpenAIClient(OPENAI_API_KEY!);
  }
  return cachedOpenAIClient;
}

let cachedRouterClient: OpenRouterClient | null = null;
export function getOpenRouterClient() {
  if (!cachedRouterClient) {
    console.log("🧠 Initializing OpenAI client...");
    cachedRouterClient = new OpenRouterClient(OPEN_ROUTER_APIKEY!);
  }
  return cachedRouterClient;
}


const getEmailMetadata = async (
  messageId: string,
  auth: GmailUserContext
): Promise<{
  id: string;
  threadId: string;
  snippet: string;
  recipient: string | undefined;
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
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const metadata = {
    id: messageId,
    threadId: message.data.threadId || "",
    snippet: message.data.snippet || "",
    subject: getHeader("Subject") || undefined,
    from: getHeader("From") || undefined,
    date: getHeader("Date") || undefined,
    recipient:
      getHeader("Delivered-To") || getHeader("To") || undefined,
  };

  console.log("📝 Parsed Email Metadata:", metadata);
  return metadata;
};

export async function getFreshAccessTokenByEmail(email: string): Promise<string> {
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

async function getUserInfoByEmail(userEmail: string): Promise<FireStoreUser> {
  console.log("🔍 Fetching user info for:", userEmail);
  
  const snapshot = await db
    .collection("users")
    .where("email", "==", userEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("No user found with email: " + userEmail);
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  console.log("👤 User found:", data);

  return {
    ...data
  } as FireStoreUser;
}

export const onGmailUpdateController = async (event: any) => {
  try {
    const rawData = event.data?.message?.data;
    const decoded = rawData ? Buffer.from(rawData, "base64").toString() : "";
    const historyPayload = JSON.parse(decoded);
    const userEmail = historyPayload.emailAddress;

    if (!userEmail) throw new Error("Missing emailAddress");

    const accessToken = await getFreshAccessTokenByEmail(userEmail);
    const gmailAuth: GmailUserContext = { accessToken };
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const userDoc = await db.collection("gmail_tokens").doc(userEmail).get();
    const lastHistoryId = userDoc.data()?.lastHistoryId;

    if (!lastHistoryId) {
      console.log("⚠️ No lastHistoryId stored. Skipping history fetch.");
      return;
    }

    const history = await gmail.users.history.list({
      userId: "me",
      startHistoryId: lastHistoryId,
      historyTypes: ['messageAdded'],
    });

    const changes = history.data.history || [];
    if (changes.length === 0) {
      console.log("📭 No new message history changes.");
      return;
    }

    console.log(`📨 Found ${changes.length} history changes.`);

    const client = getOpenRouterClient();
    const userInfo = await getUserInfoByEmail(userEmail);

    for (const change of changes) {
      const messages = change.messages || [];
      for (const msg of messages) {
        const metadata = await getEmailMetadata(msg.id!, gmailAuth);

        if (Array.isArray(userInfo?.agents) && userInfo.agents.some(agent => agent?.id === "mim")) {
          const categorization = await client.categorizeEmail({ ...metadata });
          if (categorization.status === "other") {
            console.log("⏩ Skipping email with status 'other':", metadata.id);
            continue;
          }

          const record = {
            agent: "mim",
            from: metadata.from,
            threadId: metadata.threadId,
            messageId: metadata.id,
            categorization,
            user: userEmail,
            emailDate: metadata.date,
          };

          await db.collection("relatedJobEmails").add(record);
          console.log("✅ Email saved:", record);
        }
      }
    }

    const latestHistoryId = history.data.historyId;
    if (latestHistoryId) {
      await userDoc.ref.update({ lastHistoryId: latestHistoryId, updatedAt: Date.now() });
      console.log("📌 Updated lastHistoryId to:", latestHistoryId);
    }

  } catch (err) {
    console.error("❌ Error in onGmailUpdate:", err);
  }
};
