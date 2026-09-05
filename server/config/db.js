import mongoose from 'mongoose';

// NOTE: don't override process-wide DNS (dns.setServers broke SRV/TXT
// resolution on some networks). Node's default resolver handles Atlas SRV fine.

const MAX_CONNECT_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hintFor(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('closed') || msg.includes('econnreset') || msg.includes('timed out') || msg.includes('serverselection'))
    return '→ TCP connects but handshake drops: almost always Atlas Network Access (IP Access List) blocking your IP. In Atlas: Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0) for testing, or add your current public IP.';
  if (msg.includes('bad auth') || msg.includes('authentication failed'))
    return '→ Wrong DB username/password or user lacks readWrite on the database. Check Atlas: Database Access → user exists, correct password, right role.';
  if (msg.includes('enotfound') || msg.includes('querySrv'))
    return '→ DNS SRV lookup failed. Check internet/DNS, VPN, or firewall blocking port 53.';
  return '';
}

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
        serverSelectionTimeoutMS: 10000,
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
      const hint = hintFor(error);
      if (hint) console.error(`[mongo] ${hint}`);
      await mongoose.disconnect().catch(() => {});
      if (attempt < MAX_CONNECT_ATTEMPTS) {
        console.warn(`Retrying in ${RETRY_DELAY_MS/1000}s...`);
        await wait(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
};