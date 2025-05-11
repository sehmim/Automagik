// ✅ THIS IS CORRECT
import { google } from 'googleapis';

export async function watchGmailInbox(accessToken: string) {
  const auth = new google.auth.OAuth2(); // use OAuth2Client
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth }); // use the client

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      labelIds: ['INBOX'],
      topicName: 'projects/automagic-949df/topics/gmail-push-topic',
    },
  });

  return res.data;
}
