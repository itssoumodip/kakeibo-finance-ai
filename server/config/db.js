import mongoose from 'mongoose';
import dns from 'node:dns';
try { dns.setServers(['8.8.8.8','8.8.4.4','1.1.1.1']); } catch {}

const MAX_CONNECT_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  if (uri.includes('<db_password>')) throw new Error('MONGODB_URI still has <db_password> placeholder - replace with real password');

  // prevent crash on transient network errors
  mongoose.connection.on('error', (err) => console.error('[mongo] connection error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[mongo] disconnected — will auto-reconnect'));
  mongoose.connection.on('reconnected', () => console.log('[mongo] reconnected'));
  mongoose.connection.on('close', () => console.log('[mongo] connection closed'));

  let lastError;
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        w: 'majority',
      });
      console.log('MongoDB connected');
      return;
    } catch (error) {
      lastError = error;
      console.error(`[mongo] attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed:`, error.message);
      await mongoose.disconnect().catch(() => {});
      if (attempt < MAX_CONNECT_ATTEMPTS) {
        console.warn(`Retrying in ${RETRY_DELAY_MS/1000}s...`);
        await wait(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
};