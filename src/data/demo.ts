import { Utensils, Car, ShoppingBag, Zap, Film, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
export const summary = { income: 20000, expenses: 8420, investments: 2000, available: 9580, savingsRate: 47.9 };
export const categories = [
  { name: 'Food', amount: 2350, icon: Utensils, color: '#6b5b7a', light: '#ede8f5' },
  { name: 'Transport', amount: 1840, icon: Car, color: '#2c6956', light: '#d1f0e3' },
  { name: 'Shopping', amount: 1500, icon: ShoppingBag, color: '#5f5b77', light: '#e8e2ff' },
  { name: 'Bills', amount: 980, icon: Zap, color: '#356574', light: '#dff0ff' },
  { name: 'Entertainment', amount: 650, icon: Film, color: '#c97b84', light: '#ffe4de' },
  { name: 'Other', amount: 1100, icon: Wallet, color: '#9ca3af', light: '#f3f4f6' },
];
export const spendingData = [
  { name: '1 Aug', v: 200 }, { name: '5 Aug', v: 900 }, { name: '10 Aug', v: 1800 },
  { name: '15 Aug', v: 3200 }, { name: '20 Aug', v: 5200 }, { name: '25 Aug', v: 7100 }, { name: '30 Aug', v: 8420 },
];
export const sixMonth = [
  { name: 'Mar', v: 4500 }, { name: 'Apr', v: 5100 }, { name: 'May', v: 5800 }, { name: 'Jun', v: 6500 }, { name: 'Jul', v: 7200 }, { name: 'Aug', v: 8420 },
];
export const investments = [
  { label: 'Nifty 50 SIP', amount: 500, sub: 'Equity' },
  { label: 'Midcap SIP', amount: 500, sub: 'Equity' },
  { label: 'Gold ETF', amount: 500, sub: 'Commodity' },
  { label: 'Other', amount: 500, sub: 'Mixed' },
];
export const transactions = [
  { id: '1', name: 'Rapido', cat: 'Transport', sub: 'Rapido Bike', amount: -120, date: 'Today, 10:42 AM', icon: Car, bg: '#dff0ff', plus: false },
  { id: '2', name: "Domino's Pizza", cat: 'Food', sub: 'Pizza', amount: -550, date: 'Yesterday, 8:15 PM', icon: Utensils, bg: '#e8e2ff', plus: false },
  { id: '3', name: 'Salary', cat: 'Income', sub: 'Salary', amount: 20000, date: 'Aug 1, 9:00 AM', icon: PiggyBank, bg: '#d1f0e3', plus: true },
  { id: '4', name: 'Uber', cat: 'Transport', sub: 'Uber', amount: -250, date: 'Aug 15, 6:30 PM', icon: Car, bg: '#dff0ff', plus: false },
  { id: '5', name: 'Shirt', cat: 'Shopping', sub: 'Apparel', amount: -1200, date: 'Aug 12, 2:00 PM', icon: ShoppingBag, bg: '#ffe4de', plus: false },
  { id: '6', name: 'Electricity', cat: 'Bills', sub: 'Utilities', amount: -850, date: 'Aug 10, 11:00 AM', icon: Zap, bg: '#dff0ff', plus: false },
  { id: '7', name: 'Nifty 50 SIP', cat: 'Investment', sub: 'SIP', amount: -500, date: 'Aug 5, 10:00 AM', icon: TrendingUp, bg: '#d1f0e3', plus: false },
];
