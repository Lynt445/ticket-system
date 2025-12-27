import {config} from "dotenv";

import mongoose from "mongoose";

config();

async function setupIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Users indexes
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ role: 1 });

  // Tickets indexes
  await db.collection("tickets").createIndex({ qrCode: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ eventId: 1 });

  // Events indexes
  await db.collection("events").createIndex({ managerId: 1 });
  await db.collection("events").createIndex({ status: 1 });
  await db.collection("events").createIndex({ date: 1 });

  console.log("✅ Indexes created");
  await mongoose.disconnect();
}

setupIndexes();
