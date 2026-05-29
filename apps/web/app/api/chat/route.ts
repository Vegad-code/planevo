import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request payload: messages array required.', { status: 400 });
    }

    const result = streamText({
      model: openai('gpt-4o'), 
      messages,
      system: 'You are an advanced, accurate, and deeply helpful AI assistant.',
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Fatal API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
