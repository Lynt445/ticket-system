import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Ticket, Event, User } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const reserveTicketsSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  ticketType: z.string().min(1, "Ticket type is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").max(10, "Cannot reserve more than 10 tickets"),
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
    const { eventId, ticketType, quantity } = reserveTicketsSchema.parse(body);

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
          code: "EVENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if event is published and not completed/cancelled
    if (!["published", "ongoing"].includes(event.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Event is not available for ticket purchase",
          code: "EVENT_NOT_AVAILABLE",
        },
        { status: 400 }
      );
    }

    // Find the ticket type
    const ticketTypeData = event.ticketTypes.find((type: any) => type.name === ticketType);
    if (!ticketTypeData) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket type",
          code: "TICKET_TYPE_INVALID",
        },
        { status: 400 }
      );
    }

    // Check availability
    const availableTickets = ticketTypeData.capacity - ticketTypeData.sold;
    if (availableTickets < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Not enough tickets available",
          code: "TICKET_SOLD_OUT",
        },
        { status: 409 }
      );
    }

    // Create ticket reservations
    const tickets = [];
    const reservationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    for (let i = 0; i < quantity; i++) {
      const ticket = await Ticket.create({
        eventId,
        userId: session.user.id,
        originalUserId: session.user.id,
        ticketType,
        price: ticketTypeData.price,
        status: "pending_payment",
        reservedUntil: reservationExpiry,
        qrVersion: 1,
      });
      tickets.push(ticket);
    }

    // Update event sold count
    ticketTypeData.sold += quantity;
    await event.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          reservationId: tickets[0]._id.toString(), // Use first ticket ID as reservation ID
          tickets: tickets.map(t => t._id.toString()),
          totalAmount: ticketTypeData.price * quantity,
          expiresAt: reservationExpiry,
        },
        message: "Tickets reserved successfully",
      },
      { status: 201 }
    );
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

    console.error("Ticket reservation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reserve tickets",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}