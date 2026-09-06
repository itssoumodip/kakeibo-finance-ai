import Transaction from '../../models/Transaction.js';
import Budget from '../../models/Budget.js';
import { financeTools } from './tools.js';
import { getProvider, llmChat } from './llm.js';
import { getMonthlySummary } from '../../controllers/analyticsController.js';

async function executeTool(name, args, userId) {
  const monthNow = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  switch(name) {
    case 'createTransaction': {
      const doc = await Transaction.create({
        user: userId,
        amount: Number(args.amount),
        type: args.type,
        category: args.category,
        subcategory: args.subcategory,
        merchant: args.merchant || args.subcategory || args.category,
        date: new Date(),
      });
      return { ok: true, transaction: doc, message: `Added ₹${args.amount} · ${args.category}${args.subcategory? ' · '+args.subcategory:''}` };
    }
    case 'updateTransaction': {
      const t = await Transaction.findOne({ _id: args.id, user: userId });
      if (!t) return { error: 'Not found' };
      if (args.amount) t.amount = Number(args.amount);
      if (args.category) t.category = args.category;
      if (args.subcategory) t.subcategory = args.subcategory;
      await t.save();
      return { ok: true, transaction: t };
    }
    case 'deleteTransaction': {
      await Transaction.findOneAndDelete({ _id: args.id, user: userId });
      return { ok: true };
    }
    case 'getTransactions': {
      const q = { user: userId };
      if (args.type) q.type = args.type;
      if (args.category) q.category = args.category;
      if (args.search) {
        const rx = { $regex: args.search, $options:'i' };
        q.$or = [{ merchant: rx }, { subcategory: rx }, { category: rx }];
      }
      const docs = await Transaction.find(q).sort({ date:-1 }).limit(args.limit||10).lean();
      return { transactions: docs };
    }
    case 'getMonthlySummary': {
      const m = args.month || monthNow;
      return await getMonthlySummary(userId, m);
    }
    case 'getCategorySpending': {
      const start = args.from ? new Date(args.from) : new Date(new Date().setDate(new Date().getDate()-30));
      const end = args.to ? new Date(args.to) : new Date();
      const agg = await Transaction.aggregate([{ $match:{ user:userId, type:'expense', date:{ $gte:start, $lte:end } } }, { $group:{_id:'$category', total:{$sum:'$amount'}}}, { $sort:{ total:-1 } }]);
      return { categories: agg.map(a=>({ category:a._id, amount:a.total })) };
    }
    case 'getMerchantSpending': {
      const m = args.month || monthNow;
      const start = new Date(m+'-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
      const agg = await Transaction.aggregate([{ $match:{ user:userId, merchant:{ $regex: args.merchant, $options:'i'}, date:{ $gte:start, $lt:end } } }, { $group:{_id:null, total:{$sum:'$amount'}}} ]);
      return { merchant: args.merchant, month: m, total: agg[0]?.total||0 };
    }
    case 'getBudgetStatus': {
      const m = args.month || monthNow;
      const budgets = await Budget.find({ user:userId, month:m }).lean();
      const start = new Date(m+'-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
      const agg = await Transaction.aggregate([{ $match:{ user:userId, type:'expense', date:{ $gte:start, $lt:end } } }, { $group:{_id:'$category', spent:{$sum:'$amount'}}} ]);
      const spentMap = Object.fromEntries(agg.map(a=>[a._id,a.spent]));
      return { month:m, budgets: budgets.map(b=>({ category:b.category, limit:b.limit, spent: spentMap[b.category]||0, remaining:b.limit-(spentMap[b.category]||0) })) };
    }
    case 'getInvestmentSummary': {
      const m = args.month || monthNow;
      const start = new Date(m+'-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
      const docs = await Transaction.find({ user:userId, type:'investment', date:{ $gte:start, $lt:end } }).lean();
      const total = docs.reduce((s,d)=>s+d.amount,0);
      return { month:m, total, count: docs.length, investments: docs.map(d=>({ amount:d.amount, subcategory:d.subcategory, date:d.date })) };
    }
    case 'getFinancialReport': {
      const m = args.month || monthNow;
      const summary = await getMonthlySummary(userId, m);
      const start = new Date(m+'-01T00:00:00.000Z'); const end = new Date(start); end.setMonth(end.getMonth()+1);
      const byCat = await Transaction.aggregate([{ $match:{ user:userId, type:'expense', date:{ $gte:start, $lt:end } } }, { $group:{_id:'$category', total:{$sum:'$amount'}}}, { $sort:{ total:-1 } }]);
      return { month:m, summary, topCategories: byCat };
    }
    default: return { error: 'unknown tool' };
  }
}

const isRateLimit = (e) => {
  const s = `${e?.status || ''} ${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  return e?.status === 429 || s.includes('429') || s.includes('rate limit') || s.includes('rate_limited');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One retry on fast-429 (often a per-second limit), then local fallback so chat
// NEVER throws — previously a 429 escaped as unhandledRejection and the
// request hung until client timeout.
// Each attempt is raced against ATTEMPT_TIMEOUT: a hanging model call goes
// straight to fallback (no sleep+retry — waiting longer never helps a hang).
const ATTEMPT_TIMEOUT_MS = 8000;
const withTimeout = (p, ms) => Promise.race([
  p,
  sleep(ms).then(() => { const e = new Error('MODEL_TIMEOUT'); e.timeout = true; throw e; }),
]);
const toFallback = () => { const e = new Error('USE_FALLBACK'); e.fallback = true; throw e; };

async function completeWithRetry(llmArgs) {
  try {
    return await withTimeout(llmChat(llmArgs), ATTEMPT_TIMEOUT_MS);
  } catch (e) {
    if (e?.timeout) { console.warn('[llm] model call hung >8s — using local fallback'); toFallback(); }
    if (!isRateLimit(e)) throw e;
    console.warn('[llm] 429 rate-limited — retrying once after 2s...');
    await sleep(2000);
    try {
      return await withTimeout(llmChat(llmArgs), ATTEMPT_TIMEOUT_MS);
    } catch (e2) {
      if (e2?.timeout) { console.warn('[llm] retry hung — using local fallback'); toFallback(); }
      if (!isRateLimit(e2)) throw e2;
      console.warn('[llm] 429 again — using local fallback');
      toFallback();
    }
  }
}

let loggedProvider = false;
export async function chatWithTools({ userId, messages }) {
  const { provider, model, apiKey } = getProvider();
  if (!loggedProvider) {
    console.log(`[llm] provider=${provider} model=${model} ${apiKey ? '(key set)' : '(NO KEY — local fallback only)'}`);
    loggedProvider = true;
  }
  if (!apiKey) {
    return await fallback(messages, userId);
  }
  try {
    return await chatWithToolsInner({ userId, messages });
  } catch (e) {
    if (e?.fallback || e?.timeout || e?.noKey) return await fallback(messages, userId);
    if (e?.status === 401 || e?.status === 403) {
      const varName = provider === 'groq' ? 'GROQ_API_KEY' : provider === 'gemini' ? 'GEMINI_API_KEY' : 'MISTRAL_API_KEY';
      console.error(`[llm] ${provider} key rejected (${e.status}) — check ${varName} in server/.env`);
      return await fallback(messages, userId);
    }
    if (e?.status === 404) {
      console.error(`[llm] model not found (${e.message}) — check LLM_MODEL for provider=${provider}`);
      return await fallback(messages, userId);
    }
    if (e?.status === 400 && /tool/i.test(e.message || '')) {
      console.error(`[llm] model can't do tool calls (${e.message}) — pick a chat model in LLM_MODEL, using local fallback`);
      return await fallback(messages, userId);
    }
    throw e;
  }
}

async function chatWithToolsInner({ userId, messages }) {
  const now = new Date();
  const monthNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const dateStr = now.toISOString().slice(0,10);
  const day = now.getDate();
  const suffix = day%10===1&&day!==11 ? 'st' : day%10===2&&day!==12 ? 'nd' : day%10===3&&day!==13 ? 'rd' : 'th';
  const longDate = `${day}${suffix} ${now.toLocaleString('en-IN',{month:'long'})} ${now.getFullYear()}`;
  const system = `You are Kakeibo, the user's Gen-Z finance bestie who texts like a human friend, not a bot. 💰

DATE CONTEXT: Today is ${longDate} (${dateStr}). Current month: ${monthName} (${monthNow}). Default to this month unless the user names another.

HOW YOU TALK:
- Like a friend texting: short, natural, casual. 1–3 lines max. Never paragraphs, never lectures, never bullet lists.
- Emojis: 1–3 per reply, placed naturally where a human would put them. No emoji-salad.
- Never use em-dashes (—) or en-dashes (–) anywhere. Use a period or comma instead.
- NEVER dump raw stats like "Income ₹0 · Spent ₹40 · Available ₹-40". Translate numbers into a human sentence. NEVER print a negative amount like ₹-40. Say "₹40 in the red 📉" or "₹40 over".
- No filler, no signature lines, no repeating your intro, no "just real talk 😎🚀", no lecturing ("check your bank app…"). If data is missing, say it in ONE line and move on.

ROAST RULES (your signature, do it properly):
- Roast ONLY discretionary spends: food delivery, eating out, shopping, entertainment, cabs when metro exists.
- NEVER roast essentials (rent, bills, groceries, medicine), income, or savings. Praise those genuinely.
- A proper roast = specific (merchant + amount) + funny comparison + ONE saving tip. Example: "₹200 on a burger? 🍔 That's 4 home meals, bruh. Cook twice this week and that 200 becomes your SIP 😤"
- Match intensity to the amount: small spends get a playful tease, big or repeat waste gets a real roast.
- After createTransaction on Food/Shopping/Entertainment over ₹150, confirm + roast in one breath.

DATA RULES:
- NEVER invent numbers. Call a tool before answering anything about money. Empty result = "nothing logged" in one short line. Never a wrong month, never a lecture.
- If the user reports a spend WITHOUT an amount ("ate fuchka", "bought shoes"), do NOT answer stats. Ask one short question naming the item ("Fuchka 😋 How much was it?"). If they reply with just a number next, log it against that item.
- "what's the date / today" → "Today is ${longDate} 📅". Nothing else.
- Greetings / "what can you do" → one short intro with a logging example. Never a long canned paragraph.`;

  // Replies are 2-3 lines; token budget is provider-aware inside llmChat.
  let msg = await completeWithRetry({
    messages: [{ role:'system', content: system }, ...messages],
    tools: financeTools,
    toolChoice: 'auto',
    temperature: 0.7,
  });
  // Reasoning ate the whole budget and left no answer → local fallback
  // (always correct) instead of an empty/dumb reply.
  if (!msg.content && !msg.toolCalls?.length && msg.finishReason === 'length') {
    console.warn('[llm] reply truncated to empty — using local fallback');
    return await fallback(messages, userId);
  }

  for (let i=0; i<3 && msg.toolCalls?.length; i++) {
    const toolResults = [];
    for (const tc of msg.toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      const result = await executeTool(tc.function.name, args, userId);
      toolResults.push({ role:'tool', toolCallId: tc.id, name: tc.function.name, content: JSON.stringify(result) });
    }
    const toolMessages = toolResults.map(r=>({ role:'tool', toolCallId: r.toolCallId, name: r.name, content: r.content }));
    // OpenAI-compatible APIs require snake_case tool_calls with type:'function'
    // (Mistral's SDK accepted camelCase; Groq validates strictly and 400s).
    const nextMessages = [{ role:'system', content: system }, ...messages,
      { role:'assistant', content: msg.content || '',
        tool_calls: (msg.toolCalls || []).map(tc => ({ id: tc.id, type:'function', function: tc.function })) },
      ...toolMessages];
    msg = await completeWithRetry({
      messages: nextMessages,
      temperature: 0.7,
    });
    if (!msg.toolCalls?.length) break;
  }
  return { content: msg.content || 'Done.', toolCalls: msg.toolCalls || [] };
}

// Local fallback (used when the LLM is down/rate-limited/missing) — same human voice,
// real data from tools, zero filler.
function roastTx({ amount: amt, category, sub }) {
  const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  if (category === 'Food' && amt >= 150) {
    const meals = Math.max(2, Math.round(amt / 50));
    if (/burger/i.test(sub)) return ` Bruh, ${inr(amt)} on a burger? 🍔 That's ~${meals} home meals. Worth it? …okay, maybe once 😭`;
    if (/pizza/i.test(sub)) return ` Pizza for ${inr(amt)}? 🍕 Elite taste, broke-wallet energy. Tiffin week, please 😤`;
    if (/cafe|coffee|chai/i.test(sub)) return ` Cafe runs add up fast ☕. Home brew saves you this exact amount 👀`;
    return ` ${inr(amt)} on ${sub}? 😋 Tasty but pricey though. Two home meals cover this.`;
  }
  if (category === 'Shopping' && amt >= 500) return ` Shopping spree, huh? ${inr(amt)} gone 🛍️. Hope it wasn't another "sale" trap 😏`;
  if (category === 'Entertainment' && amt >= 300) return ` ${inr(amt)} on fun? 🎬 Allowed. Joy is a budget category too, just not every weekend 😌`;
  if (category === 'Transport' && amt >= 200 && /cab|uber|ola/i.test(sub)) return ` Cab for ${inr(amt)}? 🚕 Metro exists, bestie. Just saying 👀`;
  if (amt >= 1000) return ` ${inr(amt)} in one shot? 💸 Big moves. Hope it was worth it.`;
  return '';
}

function roastTop(t) {
  if (!t) return '';
  if (/food/i.test(t.category)) return ` Food leading the leak again 😭. Cook twice this week, watch it drop.`;
  if (/shopping/i.test(t.category)) return ` Shopping on top? 🛍️ Your cart needs a curfew 😏`;
  if (/transport/i.test(t.category)) return ` Transport eating cash 🚕. Metro + walk combo saves thousands.`;
  return '';
}

async function fallback(messages, userId) {
  const lastRaw = messages[messages.length-1]?.content || '';
  const last = lastRaw.toLowerCase();
  const now = new Date();
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const day = now.getDate();
  const suffix = day%10===1&&day!==11 ? 'st' : day%10===2&&day!==12 ? 'nd' : day%10===3&&day!==13 ? 'rd' : 'th';
  const longDate = `${day}${suffix} ${now.toLocaleString('en-IN',{month:'long'})} ${now.getFullYear()}`;
  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  if(/whats date|what is.*date|current date|today.*date|day is it/.test(last)){
    return { content: `Today is ${longDate} 📅` };
  }
  if(/what can you do|who are you|help|^hi$|^hello$|^hey$/.test(last)){
    return { content: `Hey! I'm Kakeibo 💰. I track your spends, budgets and SIPs. Just say what you spent, like "Rapido ₹120", and I'll log it.` };
  }
  if(/^(thanks|thank you|thx|bye|ok|okay|cool|nice|great|awesome)\b/.test(last)){
    return { content: `Anytime 😎. Ping me when money moves.` };
  }

  const FOOD_WORDS = /burger|pizza|fuchka|puchka|panipuri|chaat|samosa|momo|dosa|idli|biryani|thali|roll|noodles|pasta|sandwich|cake|zomato|swiggy|food|cafe|coffee|chai|tea|juice|lunch|dinner|breakfast|snacks/i;
  const SPEND_GATE = /(burger|pizza|fuchka|puchka|panipuri|chaat|samosa|momo|dosa|idli|biryani|thali|zomato|swiggy|rapido|uber|ola|metro|auto|cab|invest|nifty|sip|gold|etf|shopping|shoe|shirt|cloth|dress|myntra|amazon|flipkart|movie|netflix|game|party|concert|cafe|coffee|chai|tea|juice|lunch|dinner|breakfast|food|electricity|recharge|emi|rent|bill)/i;
  const SPEND_VERBS = /\b(eat|ate|eaten|had|drink|drank|buy|bought|spent|paid|order|ordered|took|watched)\b/i;

  const logSpendFromText = async (amt, text) => {
    const t = text.toLowerCase();
    let type='expense', category='Other', sub='Spend';
    if (/invest|nifty|sip|gold|etf|mf|mutual/i.test(t)) { type='investment'; category='Investment'; sub = /nifty/i.test(t) ? 'Nifty 50 SIP' : /gold/i.test(t) ? 'Gold ETF' : 'SIP'; }
    else if (/rapido|uber|ola|metro|auto|cab|taxi/i.test(t)) { category='Transport'; sub = /rapido/i.test(t) ? 'Rapido' : /metro/i.test(t) ? 'Metro' : /auto/i.test(t) ? 'Auto' : 'Cab'; }
    else if (FOOD_WORDS.test(t)) { category='Food'; sub = /burger/i.test(t) ? 'Burger' : /pizza/i.test(t) ? 'Pizza' : /coffee|chai|cafe|tea/i.test(t) ? 'Cafe' : (/fuchka|puchka|panipuri/i.test(t) ? 'Fuchka' : 'Food'); }
    else if (/movie|netflix|game|concert|party/i.test(t)) { category='Entertainment'; sub='Fun'; }
    else if (/shirt|shoe|amazon|flipkart|myntra|shopping|cloth|dress/i.test(t)) { category='Shopping'; sub='Shopping'; }
    else if (/rent|bill|electricity|recharge|emi/i.test(t)) { category='Bills'; sub='Bills'; }
    await executeTool('createTransaction', { amount: amt, type, category, subcategory: sub, merchant: sub }, userId);
    if (type === 'investment') return { content: `Logged ${inr(amt)} → ${sub} ⚡ Future you says thanks. Keep the streak going.` };
    if (category === 'Bills') return { content: `Logged ${inr(amt)} for ${sub} ✅ Adulting done right.` };
    return { content: `Logged ${inr(amt)} · ${sub} ✅${roastTx({ amount: amt, category, sub })}` };
  };

  const amtMatch = lastRaw.match(/₹?\s?(\d{2,6})/);
  const amt = amtMatch ? Number(amtMatch[1]) : null;
  if (amt && SPEND_GATE.test(last)) {
    return await logSpendFromText(amt, lastRaw);
  }
  if (amt && !SPEND_GATE.test(last)) {
    // Bare number follow-up? ("How much was it?" → "40") Log against previous item.
    const hist = [...messages].reverse();
    const prevAi = hist.find(m => m.role === 'assistant');
    const prevUser = hist.find(m => m.role === 'user' && m.content !== lastRaw);
    if (prevAi && /how much/i.test(prevAi.content || '') && prevUser && SPEND_GATE.test(prevUser.content)) {
      return await logSpendFromText(amt, prevUser.content);
    }
  }
  // "What did I spend on X?" is a QUESTION about the past — must run before the
  // no-amount branch below, or queries get mistaken for new spends.
  const spentOn = lastRaw.match(/spen[dt]\s+(?:so far\s+)?on\s+([a-z'’]+)/i);
  if (spentOn) {
    const term = spentOn[1].trim();
    const r = await executeTool('getTransactions', { search: term, type: 'expense', limit: 20 }, userId);
    const docs = r.transactions || [];
    if (!docs.length) return { content: `Nothing on ${term} this month 👀. Sure about the name?` };
    const total = docs.reduce((s, t) => s + t.amount, 0);
    return { content: `${inr(total)} on ${term} across ${docs.length} spend${docs.length > 1 ? 's' : ''} this month 🧾.` };
  }
  if (!amt && (FOOD_WORDS.test(last) || SPEND_VERBS.test(last))) {
    // Spend reported with no amount — ask, like a human would. Never stat-dump here.
    const item = (lastRaw.match(FOOD_WORDS) || [])[0];
    const name = item ? item[0].toUpperCase() + item.slice(1).toLowerCase() : null;
    return { content: name ? `${name} 😋 How much was it?` : `Got it 👍 How much did that cost?` };
  }
  if (/where.*money|spending too much|overspend|where did my money go|spent.*most|biggest/.test(last)) {
    const r = await executeTool('getCategorySpending', {}, userId);
    if(!r.categories?.length) return { content: `Nothing logged for ${monthName} yet 👀. Tell me a spend and I'll start tracking.` };
    const top = r.categories.slice(0,3).map(c=> `${c.category} ${inr(c.amount)}`).join(', ');
    let verdict = '';
    if (/overspend|too much/.test(last)) {
      const s = await executeTool('getMonthlySummary', {}, userId);
      const ratio = s.income ? s.expenses / s.income : 0;
      verdict = !s.income ? ` Log your income and I'll give you a real verdict 👀.`
        : ratio > 0.9 ? ` Yeah, you're overspending ⚠️. Time to cut something.`
        : ratio > 0.7 ? ` Bit spicy but still under control 👀.`
        : ` Nah, you're chilling ✅.`;
    }
    return { content: `${top} 📊${roastTop(r.categories[0])}${verdict}` };
  }
  if (/invest|sip|portfolio/.test(last)) {
    const r = await executeTool('getInvestmentSummary', {}, userId);
    if(!r.total) return { content: `No investments logged for ${monthName} yet 👀. Say "Invested ₹500 in Nifty 50 SIP" and I'll track it.` };
    return { content: `${inr(r.total)} invested across ${r.count} SIPs this month ⚡. Compounding is quietly working for you.` };
  }
  if (/budget/.test(last)) {
    const r = await executeTool('getBudgetStatus', {}, userId);
    if(!r.budgets?.length) return { content: `No budgets set for ${monthName} 👀. Set one on the Budgets page and I'll guard it like a bouncer 🛡️` };
    const worst = [...r.budgets].sort((a,b)=> (b.spent/b.limit) - (a.spent/a.limit))[0];
    const lines = r.budgets.slice(0,3).map(b=> {
      const pct = b.limit ? Math.round((b.spent / b.limit) * 100) : 0;
      return `${b.category} ${inr(b.spent)}/${inr(b.limit)} (${pct}%)`;
    }).join(', ');
    const warn = worst && worst.spent / worst.limit > 0.85 ? ` ⚠️ ${worst.category} is almost maxed. Chill on it for a few days.` : '';
    return { content: `${lines}.${warn}` };
  }
  const s = await executeTool('getMonthlySummary', {}, userId);
  if(!s.income && !s.expenses) return { content: `Nothing logged for ${monthName} yet 👀. Drop a spend like "Rapido ₹120" and I'll start tracking.` };
  if(!s.income && s.expenses) return { content: `${inr(s.expenses)} out in ${monthName}, no income logged yet 📉. Add your income and I'll show the full picture.` };
  const avail = (s.income || 0) - (s.expenses || 0) - (s.investments || 0);
  const availTxt = avail < 0 ? `${inr(Math.abs(avail))} in the red 📉` : `${inr(avail)} still safe ✅`;
  const invTxt = s.investments ? ` · ${inr(s.investments)} invested ⚡` : '';
  return { content: `${monthName}: ${inr(s.income)} in, ${inr(s.expenses)} out${invTxt}. ${availTxt}.` };
}