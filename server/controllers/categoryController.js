import Transaction from '../models/Transaction.js';

// Static defaults + dynamic from user's transactions
const DEFAULTS = [
  { name: 'Food', icon: 'utensils', color: '#6b5b7a' },
  { name: 'Transport', icon: 'car', color: '#2c6956' },
  { name: 'Shopping', icon: 'bag', color: '#5f5b77' },
  { name: 'Bills', icon: 'zap', color: '#356574' },
  { name: 'Entertainment', icon: 'film', color: '#c97b84' },
  { name: 'Investment', icon: 'trending-up', color: '#2c6956' },
  { name: 'Income', icon: 'wallet', color: '#2c6956' },
  { name: 'Other', icon: 'wallet', color: '#9ca3af' },
];

export const listCategories = async (req, res) => {
  const custom = await Transaction.distinct('category', { user: req.user._id });
  const merged = [...new Set([...DEFAULTS.map(d=>d.name), ...custom])];
  const categories = merged.map(name => DEFAULTS.find(d=>d.name===name) || { name, icon:'wallet', color:'#9ca3af' });
  res.json({ categories });
};

export const createCategory = async (req, res) => {
  // Categories are implicit from transactions; this is a placeholder for explicit custom categories (future)
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });
  res.status(201).json({ name, icon: 'wallet', color: '#9ca3af' });
};