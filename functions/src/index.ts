import { https } from "firebase-functions/v2";
import { getAuthUrlHandler } from "./controllers/authController";
import { exchangeCodeForTokenHandler } from "./controllers/tokenController";
// import { getEmailsHandler } from "./controllers/getEmailsHandler";
import * as admin from 'firebase-admin';
import { googleSignInHandler } from "./controllers/googleSignInHandler";
// import { syncEmailsController } from "./controllers/syncEmailsController";
import { onMessagePublished } from "firebase-functions/pubsub";
import { getOpenRouterClient, onGmailUpdateController } from "./controllers/onGmailUpdateHandler";
import { getRelatedEmailsByAgentHandler } from "./controllers/getRelatedEmailsByAgentHandler";

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

export const onGmailUpdate = onMessagePublished("gmail-push-topic", onGmailUpdateController);

export const testOpenAI = https.onRequest(async (req: any, res: any) => {
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Only POST is allowed.' });
    return;
  }

    const { email } = req.body;


  try {
    const client = getOpenRouterClient();
    const test = await client.categorizeEmail(email);


    res.status(200).json({ status: 'success', test: test });
  } catch (error: any) {
    console.error('❌ OpenAI test failed:', error);
    res.status(500).json({ status: 'error', error: error.message || 'Unknown error' });
  }
});