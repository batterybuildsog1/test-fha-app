import OpenAI from "openai";
import { safeParseJson } from "./json";
import { getEnvKey } from "./env";

const client = new OpenAI({
  apiKey: getEnvKey("KIMI_API_KEY"),
  baseURL: "https://api.moonshot.ai/v1",
});

export async function callKimi(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    jsonSchema?: any;
    maxRetries?: number;
  } = {}
): Promise<any> {
  const defaults = {
    model: options.model ?? "moonshot-v1-32k", // Upgraded from moonshot-v1-8k for better performance
    maxTokens: options.maxTokens ?? 2048, // Increased from 1024 for more detailed responses
    temperature: options.temperature ?? 0.1, // Reduced from 0.3 for more deterministic outputs
    maxRetries: options.maxRetries ?? 2, // Increased from 1 for better reliability
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= defaults.maxRetries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: defaults.model,
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant that extracts structured data from web pages. You will be given a URL and instructions. You must follow the instructions precisely and return only a single, valid JSON object in the specified format." 
          },
          { role: "user", content: prompt }
        ],
        temperature: defaults.temperature,
        max_tokens: defaults.maxTokens,
      });

      const raw = (completion.choices[0].message.content || "").trim();
      // Kimi sometimes wraps the JSON in markdown, so we need to extract it.
      const jsonMatch = raw.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : raw;
      
      return safeParseJson(jsonString, { error: "parse failed" }, options.jsonSchema);

    } catch (error) {
      lastError = error as Error;
      console.warn(`Kimi API attempt ${attempt + 1} failed: ${lastError.message}`);
      
      if (attempt < defaults.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Kimi fetch failed after ${defaults.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}