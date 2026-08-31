import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Recurring from '../models/Recurring.js';
import { signToken, signResetToken, verifyToken } from '../utils/token.js';

const sanitizeUser = (u) => ({ id: u._id, name: u.name, email: u.email, avatar: u.avatar, createdAt: u.createdAt });

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  if (password.length < 6) return res.status(400).json({ message: 'Password too short' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email: email.toLowerCase(), password });
  // production: no demo seed — user starts empty (was seedDemo)
  const token = signToken(user._id);
  res.status(201).json({ token, user: sanitizeUser(user) });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken(user._id);
  res.json({ token, user: sanitizeUser(user) });
};

export const me = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};

export const updateMe = async (req, res) => {
  const { name } = req.body;
  if (name) req.user.name = name;
  await req.user.save();
  res.json({ user: sanitizeUser(req.user) });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) return res.status(401).json({ message: 'Current password incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
};

// Forgot: in production send email. Here we return resetToken directly (dev-friendly) and also log it.
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });
  const resetToken = signResetToken(user._id);
  // TODO: send email with resetToken. For now return it in non-production or log.
  console.log(`[RESET] ${user.email} token: ${resetToken}`);
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({ message: 'Reset token generated (check server logs / email)', ...(isDev && { resetToken }) });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });
  try {
    const decoded = verifyToken(token);
    if (decoded.purpose !== 'reset') throw new Error();
    const user = await User.findById(decoded.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};

async function seedDemo(userId) {
  const hasTx = await Transaction.countDocuments({ user: userId });
  if (hasTx) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const d = (day, h=12) => new Date(y, m, day, h, 0, 0);
  await Transaction.insertMany([
    { user: userId, amount: 20000, type: 'income', category: 'Income', subcategory: 'Salary', merchant: 'Salary', date: d(1,9) },
    { user: userId, amount: 120, type: 'expense', category: 'Transport', subcategory: 'Rapido Bike', merchant: 'Rapido', date: d(28,10) },
    { user: userId, amount: 550, type: 'expense', category: 'Food', subcategory: 'Pizza', merchant: "Domino's Pizza", date: d(27,20) },
    { user: userId, amount: 1200, type: 'expense', category: 'Shopping', subcategory: 'Apparel', merchant: 'Shopping', date: d(22,14) },
    { user: userId, amount: 850, type: 'expense', category: 'Bills', subcategory: 'Electricity', merchant: 'Electricity', date: d(18,11) },
    { user: userId, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Nifty 50 SIP', merchant: 'Nifty 50 SIP', date: d(5,10) },
    { user: userId, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Midcap SIP', merchant: 'Midcap SIP', date: d(6,10) },
    { user: userId, amount: 500, type: 'investment', category: 'Investment', subcategory: 'Gold ETF', merchant: 'Gold ETF', date: d(7,10) },
  ]);
  const mm = `${y}-${String(m+1).padStart(2,'0')}`;
  await Budget.insertMany([
    { user: userId, category: 'Food', limit: 3000, month: mm },
    { user: userId, category: 'Transport', limit: 2000, month: mm },
    { user: userId, category: 'Shopping', limit: 2500, month: mm },
    { user: userId, category: 'Bills', limit: 1500, month: mm },
    { user: userId, category: 'Entertainment', limit: 1000, month: mm },
  ]);
  await Recurring.insertMany([
    { user: userId, name: 'Netflix', amount: 649, type: 'expense', category: 'Entertainment', frequency: 'monthly', active: true },
    { user: userId, name: 'Nifty 50 SIP', amount: 500, type: 'investment', category: 'Investment', frequency: 'monthly', active: true },
  ]);
}