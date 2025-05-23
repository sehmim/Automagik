import { google } from 'googleapis';
import { getGoogleAuthClient } from '../controllers/onGmailUpdateHandler';

export async function watchGmailInbox(accessToken: string) {
  const oauth2 = getGoogleAuthClient();
  oauth2.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      labelIds: ['INBOX'],
      topicName: 'projects/automagic-949df/topics/gmail-push-topic',
    },
  });

  // Optional logging
  console.log("📡 Gmail Watch Response:", res.data);

  // ✅ Return just what you care about
  return {
    historyId: res.data.historyId || null,
    expiration: res.data.expiration || null,
    fullResponse: res.data
  };
}
