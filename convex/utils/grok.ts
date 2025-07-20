import axios from "axios";
import { safeParseJson } from "./json";
import { getEnvKey } from "./env";

export async function callGrok(
  prompt: string,
  options: {
    model?: string;
    search?: "on" | "off";
    maxTokens?: number;
    temperature?: number;
    jsonSchema?: any; // Optional schema hint for validation
    maxRetries?: number; // Number of retries (default: 2)
  } = {}
): Promise<any> {
  const apiKey = getEnvKey("XAI_API_KEY");
  const defaults = {
    model: options.model ?? "grok-3-beta",
    search: options.search ?? "on",
    maxTokens: options.maxTokens ?? 400,
    temperature: options.temperature ?? 0,
    maxRetries: options.maxRetries ?? 2,
  };

  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= defaults.maxRetries; attempt++) {
    try {
      const res = await axios.post(
        "https://api.x.ai/v1/chat/completions",
        {
          model: defaults.model,
          stream: false,
          messages: [{ role: "user", content: prompt }],
          search_parameters: { mode: defaults.search },
          max_tokens: defaults.maxTokens,
          temperature: defaults.temperature,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: 45000, // Reduced from 60s to allow for retries
        }
      );

      const raw = (res.data.choices[0].message.content || "").trim();
      return safeParseJson(raw, { error: "parse failed" }, options.jsonSchema);
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication or client errors (4xx except 429)
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw new Error(`Grok API error (${status}): ${error.response?.data?.error?.message || error.message}`);
        }
      }
      
      // If this was our last attempt, throw the error
      if (attempt === defaults.maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
      console.warn(`Grok API attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Grok fetch failed after ${defaults.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}