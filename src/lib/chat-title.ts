import type { ChatMessage } from '@/types/ide';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Generate a concise 3-5 word title for a conversation using AI.
 * Falls back to truncation if the AI call fails.
 */
export async function generateChatTitle(messages: ChatMessage[]): Promise<string> {
  const firstUser = messages.find(m => m.role === 'user');
  const firstAssistant = messages.find(m => m.role === 'assistant' && m.id !== messages[0]?.id);
  if (!firstUser) return 'New Chat';

  const fallback = firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '');

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/started`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are a title generator. Given a conversation excerpt, return ONLY a concise 3-5 word title. No quotes, no punctuation, no explanation.',
          },
          {
            role: 'user',
            content: `User: ${firstUser.content.slice(0, 200)}${firstAssistant ? `\n\nAssistant: ${firstAssistant.content.slice(0, 200)}` : ''}`,
          },
        ],
        stream: false,
      }),
    });

    if (!resp.ok) return fallback;

    const data = await resp.json();
    const title = data.choices?.[0]?.message?.content?.trim();
    if (title && title.length > 0 && title.length < 60) {
      return title;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
