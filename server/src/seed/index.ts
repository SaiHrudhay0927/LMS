import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { env } from '../config/env.js';

// Idempotent: ensures the single admin account exists. Does NOT wipe other data.
// To fully reset, pass --reset, which clears users/batches/materials/doubts/messages/notifications.
async function seed() {
  const reset = process.argv.includes('--reset');
  console.log('===========================================');
  if (reset) {
    console.log('[seed] --reset: WIPING all collections.');
  } else {
    console.log('[seed] Ensuring the admin account exists.');
    console.log('[seed] (pass --reset to wipe all data)');
  }
  console.log('===========================================');

  await connectDB();

  if (reset) {
    const { Batch, Material, Doubt, Message, Notification } = await import('../models/index.js');
    await Promise.all([
      User.deleteMany({}),
      Batch.deleteMany({}),
      Material.deleteMany({}),
      Doubt.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[seed] cleared.');
  }

  const adminEmail = env.ADMIN_EMAIL;
  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $setOnInsert: {
        email: adminEmail,
        fullName: 'Sai Hrudhay (Admin)',
        role: 'admin',
        isActive: true,
      },
    },
    { upsert: true, new: true },
  );
  console.log(`[seed] admin ready: ${admin.email}`);
  console.log('[seed] done. Sign in with Google as this email to access admin.');

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
