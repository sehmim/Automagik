import { oauth2Client } from "../services/googleClient";
import { corsHandler } from "../util/cors";

// Initialize CORS middleware to allow everything

export const syncEmailsController = (req: any, res: any) => {
  corsHandler(req, res, async () => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract Bearer token
    // const { pageToken } = req.body;
    const { userId } = req.body;

    if (!token) {
      res.status(400).json({ error: "Access token is required." });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: "userId is required." });
      return;
    }

    

    try {
      // Validate the access token
      const tokenInfo = await oauth2Client.getTokenInfo(token);

      if (!tokenInfo) {
        res.status(401).json({ error: "Invalid or expired access token." });
        return;
      }
    } catch (err) {
      console.error("Invalid access token:", err);
      res.status(401).json({ error: "Access token validation failed." });
      return;
    }

    // oauth2Client.setCredentials({ access_token: token });

    // const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    try {
      // const jobKeywords = [
      //   "job application submitted",
      //   "your application for",
      //   "applied for the position",
      //   "application confirmation",
      //   "application received",
      //   "job offer",
      //   "invitation to interview",
      //   "schedule your interview",
      //   "interview details",
      //   "position at",
      //   "recruiter contact",
      //   "hiring process",
      //   "shortlisted for",
      //   "final interview",
      //   "offer letter",
      //   "career opportunity",
      //   "your application status",
      //   "job posting for",
      // ];

      // const query = jobKeywords.map((keyword) => `subject:"${keyword}"`).join(" OR ");

      // const listResponse = await gmail.users.messages.list({
      //   userId: "me",
      //   maxResults: 50,
      //   pageToken: pageToken || undefined,
      //   q: query,
      // });

      // const messages = listResponse.data.messages || [];

      // const rawMessages = [];
      // for (const message of messages) {
      //   const messageResponse = await gmail.users.messages.get({
      //     userId: "me",
      //     id: message.id!,
      //   });

      //   const fromHeader = messageResponse.data.payload?.headers?.find(
      //     (header) => header.name === "From"
      //   )?.value || "Unknown Sender";
      //   const domain = fromHeader.includes("@") ? fromHeader.split("@")[1] : fromHeader;

      //   const subject = messageResponse.data.payload?.headers?.find(
      //     (header) => header.name === "Subject"
      //   )?.value || "Unknown Subject";

      //   const date = messageResponse.data.payload?.headers?.find(
      //     (header) => header.name === "Date"
      //   )?.value || "Unknown Date";

      //   const snippet = messageResponse.data.snippet || "No description provided";

      //   const messageDetails = {
      //     id: message.id!,
      //     threadId: message.threadId!,
      //     snippet,
      //     subject,
      //     from: fromHeader,
      //     date,
      //     domain,
      //   };

      //   rawMessages.push(messageDetails);
      // }

      // const categorizedMessages = JobCatecorizer.toJobObjects(rawMessages);

      // TODO: DIFFING

      // await GmailApiService.saveEmailsToFirestore({ userId, emails: categorizedMessages });

      // res.json({
      //   messages: categorizedMessages,
      // });
    } catch (error) {
      console.error("Error fetching and categorizing emails:", error);
      res.status(500).json({
        error: "Failed to fetch and categorize emails.",
        details: error,
      });
    }
  });
};
