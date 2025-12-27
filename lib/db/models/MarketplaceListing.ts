import mongoose, { Schema, Document } from "mongoose";

export interface IMarketplaceListing extends Document {
  ticketId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  originalPrice: number;
  listingPrice: number;
  maxPrice?: number;
  status: "active" | "sold" | "cancelled";
  createdAt: Date;
  soldAt?: Date;
}

const MarketplaceListingSchema: Schema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalPrice: { type: Number, required: true },
    listingPrice: { type: Number, required: true },
    maxPrice: Number,
    status: {
      type: String,
      enum: ["active", "sold", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Add soldAt field when status changes to sold
MarketplaceListingSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "sold" && !this.soldAt) {
    this.soldAt = new Date();
  }
  next();
});

// Indexes for performance
MarketplaceListingSchema.index({ eventId: 1 });
MarketplaceListingSchema.index({ ticketId: 1 });
MarketplaceListingSchema.index({ sellerId: 1 });
MarketplaceListingSchema.index({ status: 1 });

export default mongoose.models.MarketplaceListing ||
  mongoose.model<IMarketplaceListing>("MarketplaceListing", MarketplaceListingSchema);
