import { google } from "googleapis";
// import { MappedJobObjects } from "../mappers/JobCatecorizer";

export class GmailApiService {

  // Method to query Gmail with just the access token
  static async queryGmailWithAccessToken(accessToken: string, pageLimit: number = 50, pageToken?: string) {
    try {
      if (!accessToken) {
        throw new Error("Access token is required.");
      }

      // Create a new OAuth2 client and set the access token directly
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken, // Use the provided access token
      });

      // Initialize the Gmail API client with the OAuth2 client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Define the query string for Gmail (e.g., job-related keywords)
      const jobKeywords = [
        "job application submitted",
        "your application for",
        "applied for the position",
        "application confirmation",
        "application received",
        "job offer",
        "invitation to interview",
        "schedule your interview",
        "interview details",
        "position at",
        "recruiter contact",
        "hiring process",
        "shortlisted for",
        "final interview",
        "offer letter",
        "career opportunity",
        "your application status",
        "job posting for",
      ];
      
      const query = jobKeywords.map((keyword) => `subject:"${keyword}"`).join(" OR ");

      // Query Gmail for the user's messages
      const res = await gmail.users.messages.list({
        userId: 'me', // 'me' represents the authenticated user
        q: query, // Use the constructed query with job-related keywords
        maxResults: pageLimit, // Limit the number of results
        pageToken: pageToken || undefined, // Allow pagination if needed
      });

      // Output the list of messages
      console.log('Messages:', res.data.messages);
      return res.data.messages;

    } catch (error) {
      console.error('Error querying Gmail API:', error);
      throw new Error(`Failed to query Gmail API: ${error}`);
    }
  }

  static async getEmailDetails(messageId: string, accessToken: string, gmailApiService: GmailApiService) {
    try {
      // Fetch the email details using the Gmail API service
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken, // Use the provided access token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get the email details using the messageId
      const res = await gmail.users.messages.get({
        userId: 'me',  // 'me' represents the authenticated user
        id: messageId, // Pass the messageId to get specific message details
      });

      const headers = res.data.payload?.headers || [];

      const fromHeader = headers.find((header) => header.name === 'From')?.value || 'Unknown Sender';
      const subject = headers.find((header) => header.name === 'Subject')?.value || 'Unknown Subject';
      const date = headers.find((header) => header.name === 'Date')?.value || 'Unknown Date';
      const snippet = res.data.snippet || 'No description provided';

      const domain = fromHeader.includes('@') ? fromHeader.split('@')[1] : fromHeader;

      // Return the detailed email information
      return {
        id: messageId,
        subject,
        from: fromHeader,
        date,
        snippet,
        domain,
      };
    } catch (error) {
      console.error('Error fetching email details:', error);
      throw error;
    }
  }

  // static async saveEmailsToFirestore({ userId, emails }: { userId: string; emails: MappedJobObjects[] }): Promise<void> {
  //   try {
  //     const emailsCollection = db.collection("emails");

  //     const documentData = {
  //       createdAt: new Date(),
  //       userId,
  //       emails: emails.map(email => ({
  //         id: email.id,
  //         company: email.company || "Unknown Company",
  //         position: email.position || "Unknown Position",
  //         date: email.date || "Unknown Date",
  //         status: email.status || "Unknown Status",
  //         description: email.description || "No description provided",
  //         threadId: email.threadId || ""
  //       })),
  //     };

  //     await emailsCollection.add(documentData);
  //   } catch (error) {
  //     console.error("Error saving emails to Firestore:", error);
  //     throw error;
  //   }
  // }
}
