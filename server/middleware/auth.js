import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const decoded = verifyToken(token);
    if (decoded.purpose === 'reset') return res.status(401).json({ message: 'Invalid token type' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};