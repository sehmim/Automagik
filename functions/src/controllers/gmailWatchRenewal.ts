import { google } from 'googleapis';
import { getGoogleAuthClient, getFreshAccessTokenByEmail } from './onGmailUpdateHandler';
import { db } from '..';

export const renewGmailWatchHandler = async (req: any, res: any) => {
  try {
    const email = (req.query.email || '').toString().trim();
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const accessToken = await getFreshAccessTokenByEmail(email);
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: 'projects/automagic-949df/topics/gmail-push-topic',
        labelIds: ['INBOX'],
      },
    });

    const { historyId, expiration } = response.data;

    if (!historyId) {
      throw new Error('No historyId returned from Gmail. Watch setup may have failed.');
    }

    await db.collection('gmail_tokens').doc(email).update({
      lastHistoryId: historyId,
      watchExpiration: expiration || null,
      updatedAt: Date.now(),
    });

    console.log(`🔁 Gmail watch successfully refreshed for ${email}`, {
      historyId,
      expiration,
    });

    res.status(200).json({
      success: true,
      email,
      watch: response.data,
    });
  } catch (err: any) {
    console.error('❌ Failed to renew watch:', err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
