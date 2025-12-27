import mongoose, { Schema, Document } from "mongoose";

export interface IScan extends Document {
  ticketId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  scannerId: mongoose.Types.ObjectId;
  scanResult: "valid" | "duplicate" | "invalid" | "expired" | "transferred";
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
  timestamp: Date;
  syncedAt?: Date;
}

const ScanSchema: Schema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    scannerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scanResult: {
      type: String,
      enum: ["valid", "duplicate", "invalid", "expired", "transferred"],
      required: true,
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    deviceInfo: String,
    timestamp: { type: Date, default: Date.now },
    syncedAt: Date,
  },
  { timestamps: true }
);

// Indexes for performance
ScanSchema.index({ ticketId: 1 });
ScanSchema.index({ eventId: 1 });
ScanSchema.index({ scannerId: 1 });
ScanSchema.index({ timestamp: 1 });

export default mongoose.models.Scan ||
  mongoose.model<IScan>("Scan", ScanSchema);
