import { SYSTEM_PROMPT } from "./system_prompt_mim";

type ApplicationStatusType = "submitted" | "interviewing" | "offer" | "ghosted" | "rejected" | "other";

export class OpenRouterClient {
  private apiKey: string;
  private systemPrompt: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.systemPrompt = SYSTEM_PROMPT;
    this.baseUrl = "https://openrouter.ai/api/v1";
  }

  async categorizeEmail(
    messageDetails: {
      id: string;
      threadId: string;
      snippet: string;
      subject?: string;
      from?: string;
      date?: string;
      recipient?: string;
    },
    model: string = "openai/gpt-3.5-turbo"
  ): Promise<{
    company: string;
    title: string;
    status: ApplicationStatusType;
  }> {
    try {
      const prompt = `
        Based on the following email content, extract job application metadata in JSON format.

        Return the following fields:
        - company: the name of the company
        - title: the job title
        - status: one of ["submitted", "interviewing", "offer", "ghosted", "rejected", "other"]

        If unsure, set status to "other".

        Subject: ${messageDetails.subject}
        Snippet: ${messageDetails.snippet}
        From: ${messageDetails.from || "Unknown Sender"}
      `.trim();

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://infoshark.pro/",
          "X-Title": "AutoMagic Email Agent"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.5
        })
      });

      const data = await response.json();
      const rawOutput = data.choices?.[0]?.message?.content || "";
      console.log("📨 OpenRouter raw response:", rawOutput);

      const parsed = this.parseJsonFromString(rawOutput);

      const parsedStatus = parsed.status?.toLowerCase?.() ?? "other";

      return {
        company: parsed.company || "Unknown",
        title: parsed.title || "Unknown",
        status: this.isValidStatus(parsedStatus) ? parsedStatus : "other"
      };
    } catch (error) {
      console.error("❌ Error using OpenRouter:", error);
      throw new Error("Failed to extract job info from email.");
    }
  }

  private isValidStatus(status: string): status is ApplicationStatusType {
    return ["submitted", "interviewing", "offer", "ghosted", "rejected", "other"].includes(status);
  }

  private parseJsonFromString(input: string): {
    company: string;
    title: string;
    status: string;
  } {
    try {
      const clean = input.trim();
      const match = clean.match(/```json[\n\r]+([\s\S]*?)```/i);
      const jsonString = match ? match[1] : clean;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("❌ Failed to parse JSON:", error);
      throw new Error("Invalid model response. Could not parse JSON.");
    }
  }

  async testConnection(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            { role: "user", content: "Say hello" }
          ],
          max_tokens: 20
        })
      });

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content || "No response";
      console.log("✅ OpenRouter test response:", message);
      return message;
    } catch (error) {
      console.error("❌ OpenRouter test connection failed:", error);
      throw new Error("OpenRouter test connection failed");
    }
  }
}
