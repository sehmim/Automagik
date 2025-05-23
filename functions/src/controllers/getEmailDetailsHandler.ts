import { google } from "googleapis";
import { getFreshAccessTokenByEmail, getGoogleAuthClient } from "./onGmailUpdateHandler";
import { corsHandler } from "../util/cors";

export const getEmailDetailsHandler = async (req: any, res: any) => {
      corsHandler(req, res, async () => {

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Only POST is allowed.' });
    return;
  }

  const { email, messageId } = req.body;

  if (!email || !messageId) {
    res.status(400).json({ error: 'Missing required fields: email or messageId' });
    return;
  }

  try {
    const accessToken = await getFreshAccessTokenByEmail(email);
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    console.log(`📨 Fetching message with ID: ${messageId}`);

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const payload = message.data.payload;
    const snippet = message.data.snippet;
    const headers = payload?.headers || [];

    const subjectHeader = headers.find(h => h.name === 'Subject')?.value;
    const fromHeader = headers.find(h => h.name === 'From')?.value;
    const toHeader = headers.find(h => h.name === 'To')?.value;
    const dateHeader = headers.find(h => h.name === 'Date')?.value;

    res.status(200).json({
      status: 'success',
      messageId,
      snippet,
      subject: subjectHeader,
      from: fromHeader,
      to: toHeader,
      date: dateHeader
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch Gmail message:', error);
    res.status(500).json({ status: 'error', error: error.message || 'Unknown error' });
  }
})
};