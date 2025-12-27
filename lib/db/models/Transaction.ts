import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  ticketId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  commission: number;
  status: "pending" | "completed" | "failed" | "refunded";
  mpesaReceiptNumber?: string;
  mpesaPhone?: string;
  checkoutRequestID?: string;
  merchantRequestID?: string;
  transactionType: "purchase" | "resale" | "transfer_fee";
  createdAt: Date;
  completedAt?: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    mpesaReceiptNumber: String,
    mpesaPhone: String,
    checkoutRequestID: String,
    merchantRequestID: String,
    transactionType: {
      type: String,
      enum: ["purchase", "resale", "transfer_fee"],
      required: true,
    },
  },
  { timestamps: true }
);

// Add completedAt field when status changes to completed
TransactionSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Indexes for performance
TransactionSchema.index({ ticketId: 1 });
TransactionSchema.index({ eventId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ mpesaReceiptNumber: 1 });

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
