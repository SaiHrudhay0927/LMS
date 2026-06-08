import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

// Some networks block SRV DNS lookups on the system resolver — Atlas relies on
// SRV records, so override Node's resolver with public DNS servers as a workaround.
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log('[db] connected:', mongoose.connection.name);
}
