const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export async function askGroq(prompt, systemPrompt = 'You are NeuroChain AI, a swarm logistics expert.') {
  if (!GROQ_API_KEY) {
    console.warn('No Groq API key set');
    return null;
  }
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}
