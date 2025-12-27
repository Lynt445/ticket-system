import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalUserId: mongoose.Types.ObjectId;
  ticketType: string;
  price: number;
  status: 'pending_payment' | 'paid' | 'active' | 'transferred' | 'used' | 'expired' | 'cancelled';
  qrCode: string;
  qrVersion: number;
  transactionId: mongoose.Types.ObjectId;
  transferCount: number;
  reservedUntil?: Date;
  scannedAt?: Date;
  scannedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema: Schema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketType: String,
    price: Number,
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "active",
        "transferred",
        "used",
        "expired",
        "cancelled",
      ],
      default: "pending_payment",
    },
    qrCode: { type: String, unique: true },
    qrVersion: { type: Number, default: 1 },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    transferCount: { type: Number, default: 0 },
    reservedUntil: Date,
    scannedAt: Date,
    scannedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for performance
TicketSchema.index({ eventId: 1 });
TicketSchema.index({ userId: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ qrCode: 1 }, { unique: true });
TicketSchema.index({ reservedUntil: 1 });

export default mongoose.models.Ticket ||
  mongoose.model<ITicket>("Ticket", TicketSchema);
