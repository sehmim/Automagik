import * as admin from "firebase-admin";
import { corsHandler } from "../util/cors";


export const getEmailsHandler = (req: any, res: any) => {
  corsHandler(req, res, async () => {
    const { userId } = req.body;
    const authorizationHeader = req.headers.authorization;

    if (!userId || !authorizationHeader) {
      res.status(400).json({ error: "userId and Authorization header are required." });
      return;
    }

    const accessToken = authorizationHeader.split(" ")[1]; // Extract token from "Bearer <token>"

    if (!accessToken) {
      res.status(400).json({ error: "Authorization token is required." });
      return;
    }

    try {
      // Verify the access token with Firebase Auth
      const decodedToken = await admin.auth().verifyIdToken(accessToken);

      if (!decodedToken || decodedToken.uid !== userId) {
        res.status(401).json({ error: "Unauthorized: Invalid access token." });
        return;
      }

      // Fetch emails from Firestore
      const db = admin.firestore();
      const emailsCollection = db.collection("emails");
      const querySnapshot = await emailsCollection.where("userId", "==", userId).get();

      if (querySnapshot.empty) {
        res.status(404).json({ message: "No emails found for this user." });
        return;
      }

      const emailsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


      // const unifiedEmails = emailsData.map(({ emails })=> {
        
      // })

      res.status(200).json({ emails: emailsData });
    } catch (error) {
      console.error("Error retrieving emails:", error);
      res.status(500).json({ error: "Failed to retrieve emails." });
    }
  });
};