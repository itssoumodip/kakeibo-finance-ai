import 'dotenv/config';
import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI;
console.log('URI DB:', (uri.match(/\/([^/?]+)\?/)||[])[1] || '(none, defaults to test)');
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
console.log('Connected to DB:', mongoose.connection.name);
const admin = mongoose.connection.db.admin();
const dbs = await admin.listDatabases();
console.log('\nAll databases in cluster:');
dbs.databases.forEach(d=> console.log(` - ${d.name} (${(d.sizeOnDisk/1024).toFixed(1)} KB) empty=${d.empty}`));
for (const dbInfo of dbs.databases) {
  const db = mongoose.connection.client.db(dbInfo.name);
  const cols = await db.listCollections().toArray();
  if (cols.length) console.log(`\n ${dbInfo.name} collections:`, cols.map(c=>c.name).join(', '));
}
console.log('\nCurrent DB collections:');
console.log((await mongoose.connection.db.listCollections().toArray()).map(c=>c.name).join(', ') || '(none)');
await mongoose.disconnect();
