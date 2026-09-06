const DEFAULT_MODELS = {
  groq: 'openai/gpt-oss-120b',
  gemini: 'gemini-2.0-flash',
  mistral: 'mistral-small-latest',
};

export function getProvider() {
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  const model = process.env.LLM_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS.groq;
  const keys = {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    mistral: process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY,
  };
  return { provider, model, apiKey: keys[provider] || null };
}

// Backstop: models love em-dashes, humans texting don't. Collapse them to ", ".
// (Word-internal non-breaking hyphens like home‑cooked are a different codepoint, untouched.)
const deDash = (s) => String(s || '').replace(/\s*([—–])\s*/g, ', ');

function httpError(status, bodyText) {
  const e = new Error(`LLM ${status}: ${(bodyText || '').slice(0, 200)}`);
  e.status = status;
  return e;
}

async function postJson(url, headers, body, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) throw httpError(res.status, text);
    try { return JSON.parse(text); } catch { throw new Error('LLM bad JSON response'); }
  } finally { clearTimeout(t); }
}

function toOpenAiMessages(messages) {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'tool', content: m.content, tool_call_id: m.tool_call_id || m.toolCallId };
    }
    const tcs = m.toolCalls || m.tool_calls;
    if (m.role === 'assistant' && tcs?.length) {
      return {
        role: 'assistant',
        content: m.content || '',
        tool_calls: tcs.map((tc) => ({ id: tc.id, type: 'function', function: tc.function })),
      };
    }
    return m;
  });
}

async function openAiChat({ baseUrl, apiKey, model, messages, tools, toolChoice, temperature, maxTokens }) {
  const body = { model, messages: toOpenAiMessages(messages), temperature, max_tokens: maxTokens };
  if (tools?.length) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }
  const data = await postJson(
    `${baseUrl}/chat/completions`,
    { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body
  );
  const choice = data?.choices?.[0] || {};
  const msg = choice.message || {};
  return {
    content: deDash(msg.content || ''),
    finishReason: choice.finish_reason,
    toolCalls: (msg.tool_calls || []).map((tc, i) => ({
      id: tc.id || `call_${Date.now()}_${i}`,
      function: { name: tc.function?.name, arguments: tc.function?.arguments || '{}' },
    })),
  };
}

// ---------- Gemini ----------
function toGeminiContents(messages) {
  const systemTexts = [];
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') { if (m.content) systemTexts.push(m.content); continue; }
    if (m.role === 'tool') {
      let resp;
      try { resp = JSON.parse(m.content); } catch { resp = { result: String(m.content ?? '') }; }
      contents.push({ role: 'function', parts: [{ functionResponse: { name: m.name || 'tool', response: resp } }] });
      continue;
    }
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    if (m.content) parts.push({ text: m.content });
    for (const tc of (m.toolCalls || m.tool_calls || [])) {
      let args = {};
      try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
      parts.push({ functionCall: { name: tc.function?.name, args } });
    }
    if (parts.length) contents.push({ role, parts });
  }
  return { systemTexts, contents };
}

async function geminiChat({ apiKey, model, messages, tools, temperature, maxTokens }) {
  const { systemTexts, contents } = toGeminiContents(messages);
  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemTexts.length) body.systemInstruction = { parts: [{ text: systemTexts.join('\n') }] };
  if (tools?.length) {
    body.tools = [{
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }];
    body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }
  const data = await postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { 'Content-Type': 'application/json' },
    body
  );
  if (data?.promptFeedback?.blockReason && !data?.candidates?.length) {
    throw new Error(`LLM blocked: ${data.promptFeedback.blockReason}`);
  }
  const candidate = data?.candidates?.[0] || {};
  const parts = candidate.content?.parts || [];
  let text = '';
  const toolCalls = [];
  parts.forEach((p, i) => {
    if (typeof p.text === 'string') text += p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${i}`,
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) },
      });
    }
  });
  return { content: deDash(text), finishReason: candidate.finishReason, toolCalls };
}

export async function llmChat({ messages, tools, toolChoice, temperature = 0.7, maxTokens }) {
  const { provider, model, apiKey } = getProvider();
  if (!apiKey) {
    const e = new Error('NO_KEY');
    e.noKey = true;
    throw e;
  }
  
  const budget = maxTokens ?? (provider === 'groq' ? 512 : 300);
  if (provider === 'gemini') return geminiChat({ apiKey, model, messages, tools, temperature, maxTokens: budget });
  const baseUrl = provider === 'mistral' ? 'https://api.mistral.ai/v1' : 'https://api.groq.com/openai/v1';
  return openAiChat({ baseUrl, apiKey, model, messages, tools, toolChoice, temperature, maxTokens: budget });
}
