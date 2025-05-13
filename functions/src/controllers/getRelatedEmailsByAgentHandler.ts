import * as cors from "cors";
import { db } from "..";

// CORS setup for localhost
const corsHandler = cors({
  origin: "http://localhost:8080",
  methods: ["POST"],
  optionsSuccessStatus: 200,
});

export const getRelatedEmailsByAgentHandler = async (req: any, res: any) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Only POST requests are allowed." });
      return;
    }

    const { agentName, user } = req.body;

    if (!agentName || !user) {
      res.status(400).json({ error: "Missing agentName or user in request body." });
      return;
    }

    try {
      const snapshot = await db.collection("relatedEmails")
        .where("agent", "==", agentName)
        .where("user", "==", user)
        .get();

      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.status(200).json({ data });
    } catch (error) {
      console.error("❌ Error fetching related emails:", error);
      res.status(500).json({ error: "Failed to fetch related emails." });
    }
  });
};

