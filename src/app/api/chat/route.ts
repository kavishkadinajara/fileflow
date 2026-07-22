import { convertToModelMessages, streamText } from "ai";
import { getModel } from "@/lib/ai/provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/chatPrompt";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getModel("chat"),
    system: CHAT_SYSTEM_PROMPT,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
