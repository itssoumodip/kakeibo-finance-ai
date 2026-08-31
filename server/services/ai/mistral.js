import { Mistral } from '@mistralai/mistralai';
import Transaction from '../../models/Transaction.js';
import Budget from '../../models/Budget.js';
import { financeTools } from './tools.js';
import { getMonthlySummary } from '../../controllers/analyticsController.js';

let client = null;
function getClient() {
  const key = process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!client) client = new Mistral({ apiKey: key });
  return client;
}

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
      if (args.search) q.merchant = { $regex: args.search, $options:'i' };
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

export async function chatWithTools({ userId, messages }) {
  const mistral = getClient();
  if (!mistral) {
    return await fallback(messages, userId);
  }
  const now = new Date();
  const monthNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const dateStr = now.toISOString().slice(0,10);
  const day = now.getDate();
  const suffix = day%10===1&&day!==11 ? 'st' : day%10===2&&day!==12 ? 'nd' : day%10===3&&day!==13 ? 'rd' : 'th';
  const longDate = `${day}${suffix} ${now.toLocaleString('en-IN',{month:'long'})} ${now.getFullYear()}`;
  const system = `You are Moneyy — your Gen-Z finance buddy! 💰✨
Identity: ${dateStr} (${longDate}, current month: ${monthNow} / ${monthName}). You help track spends, investments, budgets — all in real ₹INR.
Rules:
- NEVER invent numbers. Always call a tool to get real data before answering about money. If tool returns 0/empty, say "No data for ${monthName}" (or the requested month) — NEVER say October 2024 or any other month unless user asked.
- Default to ${monthNow} / ${monthName} when user doesn't specify month. Current date is ${dateStr} (${longDate}).
- When user asks "whats date today", "what is today's date", "current date", answer exactly: "Today is ${longDate}." — no markdown ** around date, plain text only, add one emoji max.
- Be concise, friendly, Gen-Z tone, use INR ₹. Do NOT wrap dates in **.
- After createTransaction, confirm with category/merchant.
- For "what can you do" or greetings, reply exactly: "I’m Moneyy — your Gen-Z finance buddy! 💰✨ I help track spends, investments, budgets, and more — all in real ₹INR. Just say what you spent/invested, and I’ll log it live. No fake numbers, just real talk. 😎 Need a recap? Just ask! 🚀"
- For empty data, suggest: "Try checking your bank app or UPI history, or log via tools like 'Took Rapido for ₹120'."`;
  const model = process.env.MISTRAL_MODEL || process.env.OPENAI_MODEL || 'mistral-small-latest';

  let completion = await mistral.chat.complete({
    model,
    messages: [{ role:'system', content: system }, ...messages],
    tools: financeTools,
    toolChoice: 'auto',
    temperature: 0.3,
  });
  let msg = completion.choices[0].message;

  for (let i=0; i<3 && msg.toolCalls?.length; i++) {
    const toolResults = [];
    for (const tc of msg.toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      const result = await executeTool(tc.function.name, args, userId);
      toolResults.push({ role:'tool', toolCallId: tc.id, name: tc.function.name, content: JSON.stringify(result) });
    }
    const toolMessages = toolResults.map(r=>({ role:'tool', toolCallId: r.toolCallId, name: r.name, content: r.content }));
    const nextMessages = [{ role:'system', content: system }, ...messages, { role:'assistant', content: msg.content || '', toolCalls: msg.toolCalls }, ...toolMessages];
    completion = await mistral.chat.complete({
      model,
      messages: nextMessages,
      temperature: 0.3,
    });
    msg = completion.choices[0].message;
    if (!msg.toolCalls?.length) break;
  }
  return { content: msg.content || 'Done.', toolCalls: msg.toolCalls || msg.tool_calls || [] };
}

async function fallback(messages, userId) {
  const last = messages[messages.length-1]?.content?.toLowerCase() || '';
  const now = new Date();
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const monthNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const day = now.getDate();
  const suffix = day%10===1&&day!==11 ? 'st' : day%10===2&&day!==12 ? 'nd' : day%10===3&&day!==13 ? 'rd' : 'th';
  const longDate = `${day}${suffix} ${now.toLocaleString('en-IN',{month:'long'})} ${now.getFullYear()}`;

  if(/whats date|what is.*date|current date|today.*date/.test(last)){
    return { content: `Today is ${longDate}.` };
  }
  if(/what can you do|who are you|help|^hi$|^hello$/.test(last)){
    return { content: `I’m Moneyy — your Gen-Z finance buddy! 💰✨ I help track spends, investments, budgets, and more — all in real ₹INR. Just say what you spent/invested, and I’ll log it live. No fake numbers, just real talk. 😎 Need a recap? Just ask! 🚀` };
  }

  const amtMatch = messages[messages.length-1]?.content?.match(/₹?\s?(\d{2,6})/);
  const amt = amtMatch ? Number(amtMatch[1]) : null;
  if (amt && /(rapido|uber|pizza|zomato|swiggy|invest|nifty|sip|shopping|bills)/i.test(last)) {
    let type='expense', category='Other', sub=last.slice(0,30);
    if (/invest|nifty|sip|gold|etf/i.test(last)) { type='investment'; category='Investment'; sub='SIP'; }
    else if (/rapido|uber|metro|auto/i.test(last)) { category='Transport'; sub= /rapido.*bike/i.test(last)?'Rapido Bike': /auto/i.test(last)?'Auto':'Transport'; }
    else if (/pizza|zomato|swiggy|food|cafe|lunch/i.test(last)) { category='Food'; sub='Food'; }
    const result = await executeTool('createTransaction', { amount: amt, type, category, subcategory: sub, merchant: sub }, userId);
    return { content: `Added ₹${amt} · ${category}${sub? ' · '+sub:''}\n${result.message || ''}`.trim() };
  }
  if (/where.*money|spending too much|overspend|where did my money go/.test(last)) {
    const r = await executeTool('getCategorySpending', {}, userId);
    if(!r.categories?.length) return { content: `Oops! No data for ${monthName} (${monthNow}). Did you track your spends this month? 😅 Try checking your bank app or UPI history. Or if you used my tools before, lemme know—I’ll dig deeper! 💸✨` };
    const top = r.categories.slice(0,3).map(c=> `${c.category} — ₹${c.amount}`).join('\n');
    return { content: `👀 Your biggest spending categories for ${monthName}:\n${top}` };
  }
  if (/no spends|where.*money|october/.test(last)) {
    return { content: `Oops! No spends recorded for ${monthName} (${monthNow}) 😬 Did you pay via cash, another bank, or forgot to log? I’m Moneyy — your Gen-Z finance buddy! 💰✨ Just say what you spent/invested, and I’ll log it live in real ₹INR. 🚀` };
  }
  if (/invest/i.test(last)) {
    const r = await executeTool('getInvestmentSummary', {}, userId);
    if(!r.total) return { content: `No investments for ${monthName} yet. Try “Invested ₹500 in Nifty 50 SIP” and I’ll log it live. I’m Moneyy 💰✨` };
    return { content: `💰 You invested ₹${r.total} this month across ${r.count} transactions for ${monthName}.` };
  }
  const s = await executeTool('getMonthlySummary', {}, userId);
  if(!s.income && !s.expenses) return { content: `Oops! No data for ${monthName} (${monthNow}). Did you track your spends this month? 😅 I’m Moneyy — your Gen-Z finance buddy! 💰✨ Just say what you spent/invested, and I’ll log it live in real ₹INR. 🚀` };
  return { content: `Income ₹${s.income} · Spent ₹${s.expenses} · Invested ₹${s.investments} · Available ₹${s.available} for ${monthName}. Ask me to add a transaction like "Took Rapido for ₹120".` };
}