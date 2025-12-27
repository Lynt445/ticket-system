import mongoose, { Schema, Document } from "mongoose";

export interface ITransfer extends Document {
  ticketId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "cancelled";
  otpSent?: string;
  otpVerified?: boolean;
  oldQrCode?: string;
  newQrCode?: string;
  transferFee?: number;
  createdAt: Date;
  completedAt?: Date;
}

const TransferSchema: Schema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    otpSent: String,
    otpVerified: { type: Boolean, default: false },
    oldQrCode: String,
    newQrCode: String,
    transferFee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Add completedAt field when status changes to completed
TransferSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Indexes for performance
TransferSchema.index({ ticketId: 1 });
TransferSchema.index({ fromUserId: 1 });
TransferSchema.index({ toUserId: 1 });
TransferSchema.index({ status: 1 });

export default mongoose.models.Transfer ||
  mongoose.model<ITransfer>("Transfer", TransferSchema);
