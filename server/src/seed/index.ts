import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Batch, Doubt, Material, Message, Notification, User } from '../models/index.js';

async function seed() {
  console.log('===========================================');
  console.log('[seed] WIPING the database and re-seeding.');
  console.log('[seed] Any data you created via the UI will be lost.');
  console.log('===========================================');
  await connectDB();
  console.log('[seed] clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Batch.deleteMany({}),
    Material.deleteMany({}),
    Doubt.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // 1 admin
  const admin = await User.create({
    email: 'admin@pulse.dev',
    fullName: 'Ada Adminson',
    role: 'admin',
  });

  // 2 coordinators
  const [coord1, coord2] = await User.create([
    { email: 'maria@pulse.dev', fullName: 'Maria Chen', role: 'coordinator' },
    { email: 'kenji@pulse.dev', fullName: 'Kenji Ito', role: 'coordinator' },
  ]);

  // 2 batches
  const [batchA, batchB] = await Batch.create([
    {
      name: 'Fullstack Engineering — Cohort 7',
      description: 'MERN, system design, and modern web fundamentals.',
      coordinatorId: coord1!._id,
    },
    {
      name: 'Data Science — Cohort 4',
      description: 'Python, statistics, ML foundations, and applied projects.',
      coordinatorId: coord2!._id,
    },
  ]);

  // students (4 in A, 3 in B)
  const students = await User.create([
    { email: 'leo@pulse.dev', fullName: 'Leo Park', role: 'student', batchId: batchA!._id },
    { email: 'mei@pulse.dev', fullName: 'Mei Tanaka', role: 'student', batchId: batchA!._id },
    { email: 'aria@pulse.dev', fullName: 'Aria Singh', role: 'student', batchId: batchA!._id },
    { email: 'jonas@pulse.dev', fullName: 'Jonas Weber', role: 'student', batchId: batchA!._id },
    { email: 'noor@pulse.dev', fullName: 'Noor Hassan', role: 'student', batchId: batchB!._id },
    { email: 'zara@pulse.dev', fullName: 'Zara Khan', role: 'student', batchId: batchB!._id },
    { email: 'theo@pulse.dev', fullName: 'Theo Martin', role: 'student', batchId: batchB!._id },
  ]);

  // materials
  const materials = await Material.create([
    {
      batchId: batchA!._id,
      type: 'document',
      title: 'Course Syllabus & Week 1 Reading',
      description: 'Roadmap, expectations, and the first set of readings.',
      filePath: '',
      externalUrl: 'https://example.com/syllabus.pdf',
      uploadedBy: coord1!._id,
    },
    {
      batchId: batchA!._id,
      type: 'video',
      title: 'Intro to React Hooks (recording)',
      description: 'Lecture recording — Week 1.',
      externalUrl: 'https://www.youtube.com/watch?v=dpw9EHDh2bM',
      uploadedBy: coord1!._id,
    },
    {
      batchId: batchA!._id,
      type: 'link',
      title: 'TanStack Query docs',
      externalUrl: 'https://tanstack.com/query/latest',
      uploadedBy: coord1!._id,
    },
    {
      batchId: batchB!._id,
      type: 'document',
      title: 'Statistics Primer',
      externalUrl: 'https://example.com/stats.pdf',
      uploadedBy: coord2!._id,
    },
    {
      batchId: batchB!._id,
      type: 'video',
      title: 'Pandas in 30 minutes',
      externalUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg',
      uploadedBy: coord2!._id,
    },
  ]);

  // doubts (open)
  await Doubt.create([
    {
      batchId: batchA!._id,
      studentId: students[0]!._id,
      materialId: materials[1]!._id,
      title: 'Confusion about useEffect cleanup',
      description: 'When exactly does the cleanup run between renders?',
      status: 'open',
    },
    {
      batchId: batchB!._id,
      studentId: students[4]!._id,
      title: 'Difference between mean and median in skewed data',
      description: 'I keep mixing these up — when do we prefer one?',
      status: 'open',
    },
  ]);

  // messages (a couple between batchA students)
  await Message.create([
    {
      batchId: batchA!._id,
      senderId: students[0]!._id,
      recipientId: students[1]!._id,
      body: 'Hey Mei — did you start the Week 1 exercise yet?',
    },
    {
      batchId: batchA!._id,
      senderId: students[1]!._id,
      recipientId: students[0]!._id,
      body: 'Just started! Stuck on the second one.',
    },
    {
      batchId: batchA!._id,
      senderId: students[0]!._id,
      recipientId: coord1!._id,
      body: 'Quick question about the optional reading?',
    },
  ]);

  console.log('[seed] done.');
  console.log(`  admin:        ${admin.email}`);
  console.log(`  coordinators: ${coord1!.email}, ${coord2!.email}`);
  console.log(`  students:     ${students.map((s) => s.email).join(', ')}`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
