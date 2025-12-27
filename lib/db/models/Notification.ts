import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  type: "ticket_delivery" | "payment_failed" | "event_reminder" | "transfer_confirmation";
  channel: "email" | "whatsapp" | "both";
  status: "pending" | "sent" | "failed" | "bounced";
  emailId?: string;
  whatsappId?: string;
  content: {
    subject?: string;
    body: string;
    attachments?: string[];
  };
  retryCount: number;
  createdAt: Date;
  sentAt?: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket" },
    type: {
      type: String,
      enum: ["ticket_delivery", "payment_failed", "event_reminder", "transfer_confirmation"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "whatsapp", "both"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "bounced"],
      default: "pending",
    },
    emailId: String,
    whatsappId: String,
    content: {
      subject: String,
      body: { type: String, required: true },
      attachments: [String],
    },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Add sentAt field when status changes to sent
NotificationSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "sent" && !this.sentAt) {
    this.sentAt = new Date();
  }
  next();
});

// Indexes for performance
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ eventId: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdAt: 1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
