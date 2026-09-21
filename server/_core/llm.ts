import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } };
export type ToolChoice = "none" | "auto" | "required" | { name: string } | { type: "function"; function: { name: string } };
export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat = { type: "text" } | { type: "json_object" } | { type: "json_schema"; json_schema: JsonSchema };
export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string | Array<TextContent | ImageContent | FileContent>; tool_calls?: unknown[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

function normalizeContent(content: MessageContent | MessageContent[]) {
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  return parts.map(part => {
    if (typeof part === "string") return part;
    if (part.type === "text") return part.text;
    return JSON.stringify(part);
  }).join("\n");
}

function normalizeMessage(message: Message) {
  return {
    role: message.role === "function" ? "assistant" : message.role,
    ...(message.name ? { name: message.name } : {}),
    ...(message.tool_call_id ? { tool_call_id: message.tool_call_id } : {}),
    content: normalizeContent(message.content),
  };
}

function normalizeResponseFormat(format?: ResponseFormat | OutputSchema) {
  if (!format) return undefined;
  if ("type" in format) return format;
  return {
    type: "json_schema" as const,
    json_schema: {
      name: format.name,
      schema: format.schema,
      ...(typeof format.strict === "boolean" ? { strict: format.strict } : {}),
    },
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured; using the built-in fallback summary.");
  }

  const baseUrl = ENV.openAiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: params.model || ENV.openAiModel,
      messages: params.messages.map(normalizeMessage),
      ...(params.tools?.length ? { tools: params.tools } : {}),
      ...(params.toolChoice || params.tool_choice ? { tool_choice: params.toolChoice || params.tool_choice } : {}),
      ...(params.maxTokens || params.max_tokens ? { max_tokens: params.maxTokens || params.max_tokens } : {}),
      ...(params.responseFormat || params.response_format || params.outputSchema || params.output_schema
        ? { response_format: normalizeResponseFormat(params.responseFormat || params.response_format || params.outputSchema || params.output_schema) }
        : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as InvokeResult;
}
