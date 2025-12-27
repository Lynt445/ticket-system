import {Schema} from "node:inspector";

export interface ITicket extends Document {
    eventId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    originalUserId: mongoose.Types.ObjectId;
    ticketType: string;
    price: number;
    status: 'pendingpayment' | 'paid' | 'active' | 'transferred' | 'used' | 'expired' | 'cancelled';
    qrCode: string;
    qrVersion: number;
    transactionId: mongoose.Types.ObjectId;
    transferCount: number;
    reservedUntil?: Date;
    scannedAt?: Date;
    scannedBy?: mongoose.Types.ObjectId;
}

const TicketSchema: Schema = new Schema({
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketType: String,
    price: Number,
    status: {
        type: String,
        enum: ['pendingpayment', 'paid', 'active', 'transferred', 'used', 'expired', 'cancelled'],
        default: 'pendingpayment'
    },
    qrCode: { type: String, unique: true },
    qrVersion: { type: Number, default: 1 },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    transferCount: { type: Number, default: 0 },
    reservedUntil: Date,
    scannedAt: Date,
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);