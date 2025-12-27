import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Ticket, Event, Transaction } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initiateSTKPush } from "@/lib/services/payment.service";
import { z } from "zod";

const initiatePaymentSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID is required"),
  phoneNumber: z.string().min(10, "Phone number is required"),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTH_TOKEN_INVALID",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { reservationId, phoneNumber } = initiatePaymentSchema.parse(body);

    // Find the reservation (first ticket in the group)
    const tickets = await Ticket.find({
      _id: reservationId,
      userId: session.user.id,
      status: "pending_payment",
    }).populate("eventId");

    if (tickets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Reservation not found or expired",
          code: "RESERVATION_EXPIRED",
        },
        { status: 404 }
      );
    }

    const firstTicket = tickets[0];
    const event = firstTicket.eventId as any;

    // Check if M-Pesa config exists
    if (!event.mpesaConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment method not configured for this event",
          code: "MPESA_CONFIG_MISSING",
        },
        { status: 400 }
      );
    }

    // Check reservation expiry
    if (firstTicket.reservedUntil && firstTicket.reservedUntil < new Date()) {
      // Release expired reservations
      await Ticket.updateMany(
        { _id: { $in: tickets.map(t => t._id) } },
        { status: "expired" }
      );

      return NextResponse.json(
        {
          success: false,
          error: "Reservation has expired",
          code: "RESERVATION_EXPIRED",
        },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = tickets.reduce((sum, ticket) => sum + ticket.price, 0);

    // Verify phone number matches user account (if not guest)
    if (session.user.phone && phoneNumber !== session.user.phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number must match your account",
          code: "PAYMENT_PHONE_MISMATCH",
        },
        { status: 400 }
      );
    }

    // Initiate M-Pesa STK Push
    const paymentResult = await initiateSTKPush(
      event,
      phoneNumber,
      totalAmount,
      reservationId
    );

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: paymentResult.error,
          code: paymentResult.code,
        },
        { status: 400 }
      );
    }

    // Create transaction record
    const transaction = await Transaction.create({
      ticketId: firstTicket._id,
      eventId: event._id,
      userId: session.user.id,
      amount: totalAmount,
      status: "pending",
      checkoutRequestID: paymentResult.data.CheckoutRequestID,
      merchantRequestID: paymentResult.data.MerchantRequestID,
      mpesaPhone: phoneNumber,
      transactionType: "purchase",
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestID: paymentResult.data.CheckoutRequestID,
        merchantRequestID: paymentResult.data.MerchantRequestID,
        message: paymentResult.data.ResponseDescription || "STK Push sent successfully",
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Payment initiation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initiate payment",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
