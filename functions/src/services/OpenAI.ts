import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system_prompt_mim";


type ApplicationStatusType = "submitted" | "interviewing" | "offer" | "ghosted" | "rejected" | "other";

export class OpenAIClient {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    const configuration = { apiKey };
    console.log("🧠 Initializing OpenAI client...");
    this.openai = new OpenAI(configuration);
    this.systemPrompt = SYSTEM_PROMPT;
  }

  async categorizeEmail(
    messageDetails: {
      id: string;
      threadId: string;
      snippet: string;
      subject: string | undefined;
      from: string | undefined;
      date: string | undefined;
      recipient: string | undefined;
    },
    model: string = "gpt-4"
  ): Promise<{
    company: string;
    title: string;
    status: ApplicationStatusType
  }> {
    try {
      console.log("✉️ Email Details:", messageDetails);

      const prompt = `
        Based on the following email content, extract job application metadata in JSON format.

        Return the following fields:
        - company: the name of the company
        - title: the job title
        - status: one of ["submitted", "interviewing", "offer", "ghosted", "rejected", "other"]

        If unsure, infer based on common hiring patterns.

        Subject: ${messageDetails.subject}
        Snippet: ${messageDetails.snippet}
        From: ${messageDetails.from || "Unknown Sender"}
      `.trim();

      console.log("📝 Sending prompt to OpenAI:", prompt);

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: this.systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.5
      });

      const rawOutput = response.choices?.[0]?.message?.content || "";
      console.log("📨 OpenAI raw response:", rawOutput);

      const parsed = this.parseJsonFromString(rawOutput);

      return {
        company: parsed.company || "Unknown",
        title: parsed.title || "Unknown",
        status: parsed.status as ApplicationStatusType
      };
    } catch (error) {
      console.error("❌ Error categorizing email:", error);
      throw new Error("Failed to extract job info from email.");
    }
  }


  parseJsonFromString(input: string): {
    company: string;
    title: string;
    status: string;
  } 
  {
    try {
      console.log("📦 Attempting to parse model output:", input);
      const clean = input.trim();

      let jsonString = "";
      const markdownMatch = clean.match(/```json[\n\r]+([\s\S]*?)```/i);
      if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1];
        console.log("📤 Extracted JSON block from markdown:", jsonString);
      } else {
        jsonString = clean;
        console.log("📤 Using raw string as fallback:", jsonString);
      }

      const parsed = JSON.parse(jsonString);
      console.log("🧾 JSON parsed successfully:", parsed);

      return {
        company: parsed.company,
        title: parsed.title,
        status: parsed.status
      };
    } catch (error) {
      console.error("❌ Failed to parse JSON:", error);
      throw new Error("Failed to parse JSON: " + error);
    }
  }
    async testConnection(): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // ✅ Change this
        messages: [
          {
            role: "user",
            content: "Say hello"
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const message = response.choices?.[0]?.message?.content || "No response";
      console.log("✅ OpenAI test response:", message);
      return message;
    } catch (error) {
      console.error("❌ OpenAI test connection failed:", error);
      throw new Error("OpenAI test connection failed");
    }
  }
}
