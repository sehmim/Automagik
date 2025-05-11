import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

export class OpenAIClient {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    const configuration = { apiKey };
    this.openai = new OpenAI(configuration);
    this.systemPrompt = fs.readFileSync(
      path.resolve(__dirname, "./system_prompt.txt"),
      "utf-8"
    );
  }

  /**
   * Categorize an email using OpenAI's API.
   * @param messageDetails - The email details object to categorize.
   * @param model - The model to use (e.g., gpt-4).
   * @param endpoint - The OpenAI API endpoint to use.
   * @returns An object containing the original message details and the category.
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
    model: string = "gpt-4",
  ): Promise<{
    messageDetails: typeof messageDetails;
    status: string; 
    company: string; 
    position: string;
  }> {
    try {
      // Construct the prompt for categorization
      const prompt = `return a proper json format based on the following info: emailSnippet:${messageDetails.snippet}, subject:${messageDetails.subject}`;

      // Call OpenAI's API
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

      // Parse the response
      const choices = response.choices;
      const apiResponse = this.parseJsonFromString(choices[0].message?.content || "{}");

      // Return the categorized email;
      return {
        messageDetails,
        status: apiResponse?.status || "Uncategorized",
        company: apiResponse?.company || "Unknown Company",
        position: apiResponse?.position || "Unknown Position",
      };
    } catch (error) {
      console.error("Error categorizing email:", error);
      throw new Error("Failed to categorize email.");
    }
  }

  parseJsonFromString(input: string): { status: string; company: string; position: string } {
    try {
      // Adjusted regex to work without /s flag
      const jsonMatch = input.match(/```json\\n([\s\S]*?)\\n```/);
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Invalid input format");
      }

      // Parse the JSON string
      const jsonString = jsonMatch[1];
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Failed to parse JSON: " + error);
    }
  }
}
