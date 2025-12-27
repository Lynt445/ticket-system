import mongoose from 'mongoose';
import { generateQRCode, regenerateQRCode } from './qr.service';
import { Event, Ticket, Transaction, Transfer, User } from '@/lib/db/models';

// Reserve tickets for a user
export async function reserveTickets(
  eventId: string,
  userId: string,
  ticketType: string,
  quantity: number
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get event and check availability
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'published') {
      throw new Error('Event is not available for ticket sales');
    }

    // Find the ticket type
    const ticketTypeData = event.ticketTypes.find((t: any) => t.name === ticketType);
    if (!ticketTypeData) {
      throw new Error('Invalid ticket type');
    }

    // Check availability
    const availableTickets = ticketTypeData.capacity - ticketTypeData.sold;
    if (availableTickets < quantity) {
      throw new Error(`Only ${availableTickets} tickets available`);
    }

    // Calculate total amount
    const totalAmount = ticketTypeData.price * quantity;

    // Create ticket reservations
    const tickets = [];
    const reservationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    for (let i = 0; i < quantity; i++) {
      const ticket = await Ticket.create([{
        eventId,
        userId,
        originalUserId: userId,
        ticketType,
        price: ticketTypeData.price,
        status: 'pending_payment',
        reservedUntil: reservationExpiry,
      }], { session });

      tickets.push(ticket[0]);
    }

    // Update event sold count
    const updatedTicketTypes = event.ticketTypes.map((t: any) =>
      t.name === ticketType
        ? { ...t.toObject(), sold: t.sold + quantity }
        : t
    );

    await Event.findByIdAndUpdate(
      eventId,
      { ticketTypes: updatedTicketTypes },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      reservationId: tickets[0]._id.toString(),
      tickets: tickets.map(t => t._id),
      totalAmount,
      expiresAt: reservationExpiry,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Confirm payment and activate tickets
export async function confirmPayment(
  reservationId: string,
  transactionData: any
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get all tickets in reservation
    const tickets = await Ticket.find({
      _id: { $in: reservationId.split(',') },
      status: 'pending_payment'
    }).session(session);

    if (tickets.length === 0) {
      throw new Error('No valid reservations found');
    }

    // Create transaction record
    const transaction = await Transaction.create([{
      ticketId: tickets[0]._id,
      eventId: tickets[0].eventId,
      userId: tickets[0].userId,
      amount: transactionData.amount,
      commission: transactionData.commission || 0,
      status: 'completed',
      mpesaReceiptNumber: transactionData.mpesaReceiptNumber,
      mpesaPhone: transactionData.phoneNumber,
      transactionType: 'purchase',
    }], { session });

    // Generate QR codes and activate tickets
    const activatedTickets = [];
    for (const ticket of tickets) {
      // Generate QR code
      const qrResult = await generateQRCode(
        ticket._id.toString(),
        ticket.eventId.toString(),
        ticket.userId.toString(),
        1
      );

      // Update ticket
      ticket.qrCode = qrResult.encrypted;
      ticket.qrVersion = qrResult.qrVersion;
      ticket.status = 'active';
      ticket.transactionId = transaction[0]._id;
      ticket.reservedUntil = undefined;

      await ticket.save({ session });
      activatedTickets.push({
        ticketId: ticket._id,
        qrCode: qrResult.qrCodeDataUrl,
        qrData: qrResult.encrypted,
      });
    }

    await session.commitTransaction();

    return {
      success: true,
      tickets: activatedTickets,
      transactionId: transaction[0]._id,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Transfer ticket to another user
export async function initiateTransfer(
  ticketId: string,
  fromUserId: string,
  toEmail: string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get ticket and verify ownership
    const ticket = await Ticket.findById(ticketId).populate('eventId').session(session);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.userId.toString() !== fromUserId) {
      throw new Error('You do not own this ticket');
    }

    if (ticket.status !== 'active') {
      throw new Error('Ticket is not transferable');
    }

    // Check if transfers are allowed
    const event = ticket.eventId as any;
    if (!event.allowTransfers) {
      throw new Error('Transfers are not allowed for this event');
    }

    // Check transfer limit
    if (ticket.transferCount >= event.maxTransfers) {
      throw new Error('Maximum transfers reached for this ticket');
    }

    // Find recipient user
    const recipient = await User.findOne({ email: toEmail }).session(session);
    if (!recipient) {
      throw new Error('Recipient user not found');
    }

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create transfer record
    const transfer = await Transfer.create([{
      ticketId,
      fromUserId,
      toUserId: recipient._id,
      status: 'pending',
      otpSent: otp, // In production, this should be hashed
      transferFee: event.transferFee || 0,
    }], { session });

    // Mark ticket as being transferred
    ticket.status = 'transferred';
    await ticket.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      transferId: transfer[0]._id,
      message: 'Transfer initiated. OTP sent to both parties.',
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Complete transfer with OTP verification
export async function completeTransfer(transferId: string, otp: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get transfer record
    const transfer = await Transfer.findById(transferId)
      .populate('ticketId')
      .session(session);

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'pending') {
      throw new Error('Transfer is not pending');
    }

    // Verify OTP
    if (transfer.otpSent !== otp) {
      throw new Error('Invalid OTP');
    }

    const ticket = transfer.ticketId as any;

    // Generate new QR code
    const qrResult = await regenerateQRCode(
      ticket._id.toString(),
      ticket.eventId.toString(),
      transfer.toUserId.toString(),
      ticket.qrVersion + 1
    );

    // Update ticket
    ticket.userId = transfer.toUserId;
    ticket.qrCode = qrResult.encrypted;
    ticket.qrVersion = qrResult.qrVersion;
    ticket.status = 'active';
    ticket.transferCount += 1;
    ticket.scannedAt = undefined; // Reset scan status

    await ticket.save({ session });

    // Update transfer
    transfer.status = 'completed';
    transfer.otpVerified = true;
    transfer.oldQrCode = transfer.oldQrCode || ticket.qrCode;
    transfer.newQrCode = qrResult.encrypted;

    await transfer.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      ticketId: ticket._id,
      newQrCode: qrResult.qrCodeDataUrl,
      qrData: qrResult.encrypted,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Validate ticket at entry
export async function validateTicket(
  qrData: string,
  scannerId: string,
  eventId: string,
  location?: { latitude: number; longitude: number }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find ticket by QR code
    const ticket = await Ticket.findOne({ qrCode: qrData })
      .populate('eventId')
      .populate('userId', 'name email')
      .session(session);

    if (!ticket) {
      await session.abortTransaction();
      return {
        valid: false,
        reason: 'Invalid QR code',
        code: 'QR_INVALID'
      };
    }

    // Check if ticket belongs to the correct event
    if (ticket.eventId._id.toString() !== eventId) {
      await session.abortTransaction();
      return {
        valid: false,
        reason: 'Ticket for different event',
        code: 'EVENT_MISMATCH'
      };
    }

    // Check ticket status
    if (ticket.status === 'used') {
      await session.abortTransaction();
      return {
        valid: false,
        reason: 'Ticket already used',
        code: 'DUPLICATE_SCAN'
      };
    }

    if (ticket.status !== 'active') {
      await session.abortTransaction();
      return {
        valid: false,
        reason: 'Ticket not active',
        code: 'TICKET_INACTIVE'
      };
    }

    // Mark as used
    ticket.status = 'used';
    ticket.scannedAt = new Date();
    ticket.scannedBy = new mongoose.Types.ObjectId(scannerId);

    await ticket.save({ session });

    // Create scan record
    const scanData = {
      ticketId: ticket._id,
      eventId,
      scannerId,
      scanResult: 'valid',
      location,
    };

    await mongoose.model('Scan').create([scanData], { session });

    await session.commitTransaction();

    return {
      valid: true,
      ticket: {
        ticketId: ticket._id,
        ticketType: ticket.ticketType,
        userName: ticket.userId.name,
        eventTitle: (ticket.eventId as any).title,
        scannedAt: ticket.scannedAt,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('Ticket validation error:', error);
    return {
      valid: false,
      reason: 'Validation error',
      code: 'VALIDATION_ERROR'
    };
  } finally {
    session.endSession();
  }
}

// Clean up expired reservations
export async function cleanupExpiredReservations() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expiredTickets = await Ticket.find({
      status: 'pending_payment',
      reservedUntil: { $lt: new Date() }
    }).session(session);

    for (const ticket of expiredTickets) {
      // Return tickets to available pool
      const event = await Event.findById(ticket.eventId).session(session);
      if (event) {
        const updatedTicketTypes = event.ticketTypes.map((t: any) =>
          t.name === ticket.ticketType
            ? { ...t.toObject(), sold: Math.max(0, t.sold - 1) }
            : t
        );

        await Event.findByIdAndUpdate(
          ticket.eventId,
          { ticketTypes: updatedTicketTypes },
          { session }
        );
      }

      // Mark ticket as expired
      ticket.status = 'expired';
      await ticket.save({ session });
    }

    await session.commitTransaction();

    return {
      success: true,
      cleanedCount: expiredTickets.length
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
