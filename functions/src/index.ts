import { https } from "firebase-functions/v2";
import { getAuthUrlHandler } from "./controllers/authController";
import { exchangeCodeForTokenHandler } from "./controllers/tokenController";
// import { getEmailsHandler } from "./controllers/getEmailsHandler";
import * as admin from 'firebase-admin';
import { googleSignInHandler } from "./controllers/googleSignInHandler";
// import { syncEmailsController } from "./controllers/syncEmailsController";
import { onMessagePublished } from "firebase-functions/pubsub";
import { onGmailUpdateController } from "./controllers/onGmailUpdateHandler";
import { getRelatedEmailsByAgentHandler } from "./controllers/getRelatedEmailsByAgentHandler";
// import { google } from "googleapis";
import { getEmailDetailsHandler } from "./controllers/getEmailDetailsHandler";
import { renewGmailWatchHandler } from "./controllers/gmailWatchRenewal";


admin.initializeApp();
// Example Firestore usage
export const db = admin.firestore();

// Convert callable functions to HTTP endpoints
export const getAuthUrl = https.onRequest(getAuthUrlHandler);
export const exchangeCodeForToken = https.onRequest(exchangeCodeForTokenHandler);
// export const getEmails = https.onRequest(getEmailsHandler);
export const googleSignIn = https.onRequest(googleSignInHandler);
// export const syncEmails = https.onRequest(syncEmailsController);

export const getRelatedEmailsByAgent = https.onRequest(getRelatedEmailsByAgentHandler);
export const getEmailDetails = https.onRequest(getEmailDetailsHandler);

export const onGmailUpdate = onMessagePublished("gmail-push-topic", onGmailUpdateController);
export const renewGmailWatch = https.onRequest(renewGmailWatchHandler);

// export const testOpenAI = https.onRequest(async (req: any, res: any) => {
//   if (req.method !== 'POST') {
//     res.status(405).send({ error: 'Only POST is allowed.' });
//     return;
//   }

//   const { email, messageId } = req.body;

//   if (!email || !messageId) {
//     res.status(400).json({ error: 'Missing required fields: email or messageId' });
//     return;
//   }

//   try {
//     const accessToken = await getFreshAccessTokenByEmail(email);
//     const oauth2Client = getGoogleAuthClient();
//     oauth2Client.setCredentials({ access_token: accessToken });

//     const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

//     console.log(`📨 Fetching message with ID: ${messageId}`);

//     const message = await gmail.users.messages.get({
//       userId: 'me',
//       id: messageId,
//       format: 'full', // or 'metadata', 'raw' or 'minimal' if you want less data
//     });

//     const payload = message.data.payload;
//     const snippet = message.data.snippet;
//     const headers = payload?.headers || [];

//     const subjectHeader = headers.find(h => h.name === 'Subject')?.value;
//     const fromHeader = headers.find(h => h.name === 'From')?.value;
//     const toHeader = headers.find(h => h.name === 'To')?.value;
//     const dateHeader = headers.find(h => h.name === 'Date')?.value;

//     res.status(200).json({
//       status: 'success',
//       messageId,
//       snippet,
//       subject: subjectHeader,
//       from: fromHeader,
//       to: toHeader,
//       date: dateHeader,
//       rawHeaders: headers,
//     });
//   } catch (error: any) {
//     console.error('❌ Failed to fetch Gmail message:', error);
//     res.status(500).json({ status: 'error', error: error.message || 'Unknown error' });
//   }
// });