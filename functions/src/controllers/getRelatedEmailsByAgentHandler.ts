import { db } from "..";
import { corsHandler } from "../util/cors";

export const getRelatedEmailsByAgentHandler = async (req: any, res: any) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Only POST requests are allowed." });
      return;
    }

    const { user, agentId } = req.body;

    console.log("agentId -->", agentId);
    console.log("user -->", user);


    if (!user || !agentId) {
      res.status(400).json({ error: "Missing agentName or user in request body." });
      return;
    }

    try {
        const collectionName = agentId === "mim" ? "relatedJobEmails" : "relatedEmails";

      const snapshot = await db.collection(collectionName)
        .where("agent", "==", agentId)
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

