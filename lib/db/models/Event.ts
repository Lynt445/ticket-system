
import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketType {
  name: string;
  price: number;
  capacity: number;
  sold: number;
  description?: string;
}

export interface IMpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
}

export interface IEvent extends Document {
  managerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    coordinates?: [number, number];
  };
  images: string[];
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  ticketTypes: ITicketType[];
  totalCapacity: number;
  allowTransfers: boolean;
  allowResale: boolean;
  maxTransfers: number;
  ticketTemplate?: string;
  termsAndConditions?: string;
  mpesaConfig: IMpesaConfig;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
  managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  venue: {
    name: String,
    address: String,
    city: String,
    coordinates: [Number]
  },
  images: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  ticketTypes: [{
    name: String,
    price: Number,
    capacity: Number,
    sold: { type: Number, default: 0 },
    description: String
  }],
  totalCapacity: Number,
  allowTransfers: { type: Boolean, default: false },
  allowResale: { type: Boolean, default: false },
  maxTransfers: { type: Number, default: 3 },
  ticketTemplate: String,
  termsAndConditions: String,
  mpesaConfig: {
    consumerKey: String,
    consumerSecret: String,
    shortCode: String,
    passkey: String
  }
}, { timestamps: true });

// Indexes for performance
EventSchema.index({ managerId: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ date: 1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
