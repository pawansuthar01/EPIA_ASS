function getProviderLabel() {
  const provider = (process.env.AI_PROVIDER || 'AWS_BEDROCK').trim().toUpperCase();
  return provider === 'GEMINI' ? 'Gemini' : provider === 'AWS_BEDROCK' ? 'AWS Bedrock' : 'AI provider';
}

function getProvider() {
  const provider = (process.env.AI_PROVIDER || 'AWS_BEDROCK').trim().toUpperCase();
  if (provider !== 'AWS_BEDROCK' && provider !== 'GEMINI') {
    const error = new Error('AI_PROVIDER must be AWS_BEDROCK or GEMINI.');
    error.statusCode = 503;
    throw error;
  }
  return provider;
}

async function generateText(messages, maxTokens = 180) {
  const provider = getProvider();
  const model = provider === 'GEMINI'
    ? process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    : process.env.AWS_BEDROCK_MODEL || 'zai.glm-5';
  const key = provider === 'GEMINI'
    ? process.env.GEMINI_API_KEY || process.env.GEMINI_KEY
    : process.env.AWS_BEDROCK_KEY;
  if (!key) {
    const error = new Error(`Set ${provider === 'GEMINI' ? 'GEMINI_API_KEY' : 'AWS_BEDROCK_KEY'} in .env.`);
    error.statusCode = 503;
    throw error;
  }

  let url;
  let headers;
  let body;
  if (provider === 'GEMINI') {
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n\n');
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
    body = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.filter((message) => message.role !== 'system').map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    };
  } else {
    const region = process.env.AWS_BEDROCK_REGION || 'us-east-1';
    url = `https://bedrock-mantle.${region}.api.aws/v1/chat/completions`;
    headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    body = { model, messages, max_tokens: maxTokens, temperature: 0.4 };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.message || `${provider} returned HTTP ${response.status}`);
  const text = provider === 'GEMINI'
    ? data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought).map((part) => part.text || '').join('').trim()
    : data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${provider} returned an empty response.`);
  return text;
}

module.exports = { generateText, getProvider, getProviderLabel };
