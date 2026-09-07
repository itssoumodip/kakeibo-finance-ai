// Chat quality loop-test: seeds a TEMP user, asks a battery of questions through
// chatWithTools (Mistral if quota allows, else local fallback), auto-flags
// robotic tells, then wipes all temp data. Run: node chat-loop-test.mjs
import 'dotenv/config';
import mongoose from 'mongoose';
import { chatWithTools } from './services/ai/mistral.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import Budget from './models/Budget.js';
import { connectDB } from './config/db.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUESTIONS = [
  'hi',
  'what can you do',
  "what's today's date",
  'Took Rapido for ₹120',
  'Had a burger for ₹200',
  'Bought shoes for ₹2500',
  'Invested ₹1000 in Nifty 50 SIP',
  'Paid electricity bill ₹850',
  'Where did my money go?',
  'Am I overspending?',
  'Show my investments',
  "How's my budget?",
  'What did I spend on pizza?',
  'thanks',
  'i eat fuchka',
  { history: [
    { role: 'user', content: 'i eat fuchka' },
    { role: 'assistant', content: 'Fuchka 😋 How much was it?' },
    { role: 'user', content: '40' },
  ]},
  'i buy chocholates for my mami cost me around 120 then i eat chips around 40 and then for travel it cost me around 90 in bike, and also i watched the new relese movie tht cost me around 190 and i buy shirt 700 and another shirt 700 and then one formal pant 700 and then one tshirt 700 and then two half pants around 200 each total 400 and mislanious add 500',
];

// Automated robotic-tell flags (heuristics, not verdicts)
function flagsFor(text) {
  const f = [];
  if (/—/.test(text)) f.push('EM-DASH');
  if (/–/.test(text)) f.push('EN-DASH');
  if (text.length > 320) f.push(`LONG(${text.length})`);
  if (/bank app|UPI history|just real talk|fake numbers/i.test(text)) f.push('FILLER');
  if (/₹-\d/.test(text)) f.push('NEG-AMOUNT');
  if (/october 2024/i.test(text)) f.push('WRONG-MONTH');
  if ((text.match(/😎|🚀|✨/g) || []).length > 1) f.push('EMOJI-SALAD?');
  return f;
}

await connectDB();

const email = `looptest-${Date.now()}@test.local`;
const user = await User.create({ name: 'Loop Test', email, password: 'test12345' });
const uid = user._id;
const now = new Date();
const mm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const d = (day, h = 12) => new Date(now.getFullYear(), now.getMonth(), day, h, 0, 0);

await Transaction.insertMany([
  { user: uid, amount: 45000, type: 'income', category: 'Income', subcategory: 'Salary', merchant: 'Salary', date: d(1, 9) },
  { user: uid, amount: 120, type: 'expense', category: 'Transport', subcategory: 'Rapido', merchant: 'Rapido', date: d(3, 10) },
  { user: uid, amount: 550, type: 'expense', category: 'Food', subcategory: 'Pizza', merchant: "Domino's", date: d(2, 20) },
  { user: uid, amount: 2499, type: 'expense', category: 'Shopping', subcategory: 'Shoes', merchant: 'Myntra', date: d(4, 14) },
  { user: uid, amount: 1000, type: 'investment', category: 'Investment', subcategory: 'Nifty 50 SIP', merchant: 'Nifty 50 SIP', date: d(5, 10) },
]);
await Budget.insertMany([
  { user: uid, category: 'Food', limit: 3000, month: mm },
  { user: uid, category: 'Transport', limit: 2000, month: mm },
]);
console.log(`\n=== LOOP 1: ${QUESTIONS.length} questions, temp user ${email} ===\n`);

let flagCount = 0;
for (const q of QUESTIONS) {
  const msgs = typeof q === 'string' ? [{ role: 'user', content: q }] : q.history;
  const label = typeof q === 'string' ? q : q.history.map(m => `${m.role}: ${m.content}`).join(' → ');
  try {
    const r = await chatWithTools({ userId: uid, messages: msgs });
    const flags = flagsFor(r.content || '');
    if (flags.length) flagCount += flags.length;
    console.log(`Q: ${label}\nA: ${r.content}\n${flags.length ? '⚠️ FLAGS: ' + flags.join(', ') : '✅ clean'}\n---`);
  } catch (e) {
    console.log(`Q: ${label}\n💥 THREW: ${e?.message}\n---`);
    flagCount += 1;
  }
  await sleep(1500);
}

console.log(`\n=== DONE: ${flagCount} flags ===\n`);

// wipe temp data
await Transaction.deleteMany({ user: uid });
await Budget.deleteMany({ user: uid });
await User.deleteOne({ _id: uid });
console.log('temp data wiped');
await mongoose.disconnect();
