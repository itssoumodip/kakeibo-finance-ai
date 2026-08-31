import jwt from 'jsonwebtoken';

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const signResetToken = (userId) =>
  jwt.sign({ id: userId, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);