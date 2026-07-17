import OpenAI from "openai";

const apiKey = process.env.POLZA_AI_API_KEY;
const baseURL = process.env.POLZA_AI_BASE_URL || "https://api.polza.ai/v1";
const model = process.env.POLZA_AI_MODEL || "gpt-4o-mini";
const embeddingModel = process.env.POLZA_AI_EMBEDDING_MODEL || "text-embedding-3-small";

if (!apiKey) {
  throw new Error("POLZA_AI_API_KEY is not set");
}

export const ai = new OpenAI({ apiKey, baseURL, timeout: 180 * 1000 });

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: OpenAI.ChatCompletionCreateParams["response_format"];
};

export type GenerateResult = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
};

export async function generate(options: GenerateOptions, retries = 2): Promise<GenerateResult> {
  try {
    const response = await ai.chat.completions.create({
      model,
      messages: options.messages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4000,
      response_format: options.response_format,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No completion returned");
    }

    const content = typeof choice.message.content === "string" ? choice.message.content : "";

    return {
      content,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      model: response.model || model,
    };
  } catch (error: any) {
    if (retries > 0 && (error.status >= 500 || error.code === "ECONNRESET" || error.code === "ETIMEDOUT")) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return generate(options, retries - 1);
    }
    throw error;
  }
}

export async function createEmbedding(text: string, retries = 2): Promise<number[]> {
  try {
    const response = await ai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("No embedding returned");
    }

    return embedding;
  } catch (error: any) {
    if (retries > 0 && (error.status >= 500 || error.code === "ECONNRESET" || error.code === "ETIMEDOUT")) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return createEmbedding(text, retries - 1);
    }
    throw error;
  }
}
