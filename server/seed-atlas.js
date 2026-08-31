import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'node:dns';
try { dns.setServers(['8.8.8.8','8.8.4.4','1.1.1.1']); } catch {}

const uri = process.env.MONGODB_URI;
console.log('Connecting to', uri.replace(/:([^@]+)@/, ':***@'));
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
console.log('✅ MongoDB connected');

const userSchema = new mongoose.Schema({ name:String, email:String, password:String, avatar:String }, { timestamps:true });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const txSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, amount:Number, type:String, category:String, subcategory:String, merchant:String, paymentMethod:String, date:Date, notes:String }, { timestamps:true });
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', txSchema);
const budgetSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, category:String, limit:Number, month:String }, { timestamps:true });
const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
const recSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, name:String, amount:Number, type:String, category:String, frequency:String, active:Boolean }, { timestamps:true });
const Recurring = mongoose.models.Recurring || mongoose.model('Recurring', recSchema);

let user = await User.findOne({ email: 'demo@moneyy.app' });
if (!user) {
  const hash = await bcrypt.hash('demo123', 10);
  user = await User.create({ name: 'Demo User', email: 'demo@moneyy.app', password: hash });
  console.log('👤 Created demo user:', user.email, '/ demo123');
} else {
  console.log('👤 Found existing user:', user.email);
}

const txCount = await Transaction.countDocuments({ user: user._id });
if (txCount === 0) {
  const now = new Date(); const y=now.getFullYear(), m=now.getMonth();
  const d=(day,h=12)=> new Date(y,m,day,h,0,0);
  await Transaction.insertMany([
    { user: user._id, amount: 20000, type: 'income', category: 'Income', subcategory: 'Salary', merchant: 'Salary', date: d(1,9) },
    { user: user._id, amount: 120, type: 'expense', category: 'Transport', subcategory: 'Rapido Bike', merchant: 'Rapido', date: d(28,10) },
    { user: user._id, amount: 550, type: 'expense', category: 'Food', subcategory: 'Pizza', merchant: "Domino's Pizza", date: d(27,20) },
    { user: user._id, amount: 1200, type: 'expense', category: 'Shopping', subcategory: 'Apparel', merchant: 'Shopping', date: d(22,14) },
    { user: user._id, amount: 850, type: 'expense', category: 'Bills', subcategory: 'Electricity', merchant: 'Electricity', date: d(18,11) },
    { user: user._id, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Nifty 50 SIP', merchant: 'Nifty 50 SIP', date: d(5,10) },
    { user: user._id, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Midcap SIP', merchant: 'Midcap SIP', date: d(6,10) },
    { user: user._id, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Gold ETF', merchant: 'Gold ETF', date: d(7,10) },
  ]);
  console.log('💸 Inserted 8 transactions');
} else console.log(`💸 Transactions already exist: ${txCount}`);

const mm = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
if (await Budget.countDocuments({ user: user._id, month: mm })===0) {
  await Budget.insertMany([
    { user: user._id, category: 'Food', limit: 3000, month: mm },
    { user: user._id, category: 'Transport', limit: 2000, month: mm },
    { user: user._id, category: 'Shopping', limit: 2500, month: mm },
    { user: user._id, category: 'Bills', limit: 1500, month: mm },
    { user: user._id, category: 'Entertainment', limit: 1000, month: mm },
  ]);
  console.log('📊 Inserted 5 budgets for', mm);
}
if (await Recurring.countDocuments({ user: user._id })===0) {
  await Recurring.insertMany([
    { user: user._id, name: 'Netflix', amount: 649, type: 'expense', category: 'Entertainment', frequency: 'monthly', active: true },
    { user: user._id, name: 'Nifty 50 SIP', amount: 500, type: 'investment', category: 'Investment', frequency: 'monthly', active: true },
  ]);
  console.log('🔁 Inserted 2 recurring');
}

const cols = await mongoose.connection.db.listCollections().toArray();
console.log('📚 Collections in moneyy:', cols.map(c=>c.name).join(', '));
const counts = await Promise.all(cols.map(async c=> ({ name:c.name, count: await mongoose.connection.db.collection(c.name).countDocuments() })));
console.log(counts);

await mongoose.disconnect();
console.log('✅ Done — now check Atlas → Database → Browse Collections → moneyy');
console.log('🔑 Login with demo@moneyy.app / demo123  or Register new user (also seeds)');
