import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system_prompt";

export class OpenAIClient {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    const configuration = { apiKey };
    console.log("🧠 Initializing OpenAI client...");
    this.openai = new OpenAI(configuration);
    this.systemPrompt = SYSTEM_PROMPT;
  }

  /**
   * Categorize an email using OpenAI's API and return category with metadata.
   * @param messageDetails - The email details object to categorize.
   * @param model - The model to use (e.g., gpt-4).
   * @returns An object containing category and message metadata.
   */
  async categorizeEmail(
    messageDetails: {
      id: string;
      threadId: string;
      snippet: string;
      subject: string | undefined;
      from: string | undefined;
      date: string | undefined;
    },
    model: string = "gpt-4"
  ): Promise<{ category: string; }> {
    try {
      console.log("✉️ Email Details:", messageDetails);
      const prompt = `
        Subject: ${messageDetails.subject}
        Snippet: ${messageDetails.snippet}
        From: ${messageDetails.from || "Unknown Sender"}
      `.trim();
      console.log("📝 Sending prompt to OpenAI:", prompt);

      const response = await this.openai.chat.completions.create({
        model: model,
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
        temperature: 0.7,
      });

      const choices = response.choices;
      const rawOutput = choices[0].message?.content || "";
      console.log("📨 OpenAI raw response:", rawOutput);

      const parsed = this.parseJsonFromString(rawOutput);
      console.log("✅ Parsed response:", parsed);

      return { category: parsed?.category || "Uncategorized" };
    } catch (error) {
      console.error("❌ Error categorizing email:", error);
      throw new Error("Failed to categorize email.");
    }
  }

  parseJsonFromString(input: string): { category: string } {
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
      return parsed;
    } catch (error) {
      console.error("❌ Failed to parse JSON:", error);
      throw new Error("Failed to parse JSON: " + error);
    }
  }
}
