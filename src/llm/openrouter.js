import fetch from 'node-fetch';

const API = 'https://openrouter.ai/api/v1/chat/completions';

export async function openrouterChat(messages, modelOverride = null) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: modelOverride || process.env.OPENROUTER_MODEL,
      messages,
      temperature: 0.2
    })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`OpenRouter error: ${JSON.stringify(json)}`);

  const text = json?.choices?.[0]?.message?.content ?? '';
  return text;
}
