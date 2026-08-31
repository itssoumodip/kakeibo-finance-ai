import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';
try { dns.setServers(['8.8.8.8','8.8.4.4','1.1.1.1']); } catch {}
const uri = process.env.MONGODB_URI;
console.log('Connecting to', uri.split('@')[1]?.split('/')[0] || 'atlas');
await mongoose.connect(uri);
console.log('Connected to', mongoose.connection.name);
const db = mongoose.connection.db;
const cols = ['transactions','budgets','recurrings','chatsessions','chatmessages'];
for (const c of cols) {
  const count = await db.collection(c).countDocuments();
  console.log(`- ${c}: ${count} docs`);
  if (count) {
    await db.collection(c).deleteMany({});
    console.log(`  → wiped ${c}`);
  }
}
console.log('\nRemaining:');
for (const c of cols) {
  console.log(` - ${c}: ${await db.collection(c).countDocuments()}`);
}
console.log(` - users: ${await db.collection('users').countDocuments()} (kept)`);
await mongoose.disconnect();
console.log('✅ moneyy is now clean — production empty state. Add real data via AI chat or Transactions → Add');
