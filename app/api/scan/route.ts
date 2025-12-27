import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Ticket, Scan } from "@/lib/db/models";
import { validateQRCode } from "@/lib/services/qr.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const validateQRSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "scanner") {
      return NextResponse.json(
        {
          success: false,
          error: "Scanner authentication required",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { qrCode, eventId } = validateQRSchema.parse(body);

    // Find ticket by QR code
    const ticket = await Ticket.findOne({ qrCode }).populate("eventId").populate("userId", "name email");

    if (!ticket) {
      // Log invalid scan attempt
      await Scan.create({
        ticketId: null,
        eventId,
        scannerId: session.user.id,
        scanResult: "invalid",
        deviceInfo: req.headers.get("user-agent") || "Unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid ticket",
          code: "QR_INVALID",
        },
        { status: 400 }
      );
    }

    // Check if ticket belongs to the correct event
    if (ticket.eventId._id.toString() !== eventId) {
      await Scan.create({
        ticketId: ticket._id,
        eventId,
        scannerId: session.user.id,
        scanResult: "invalid",
        deviceInfo: req.headers.get("user-agent") || "Unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Ticket not for this event",
          code: "EVENT_MISMATCH",
        },
        { status: 400 }
      );
    }

    // Check ticket status
    if (ticket.status === "used") {
      await Scan.create({
        ticketId: ticket._id,
        eventId,
        scannerId: session.user.id,
        scanResult: "duplicate",
        deviceInfo: req.headers.get("user-agent") || "Unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Ticket already used",
          code: "DUPLICATE_SCAN",
        },
        { status: 400 }
      );
    }

    if (ticket.status !== "active") {
      await Scan.create({
        ticketId: ticket._id,
        eventId,
        scannerId: session.user.id,
        scanResult: "invalid",
        deviceInfo: req.headers.get("user-agent") || "Unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: `Ticket status: ${ticket.status}`,
          code: "TICKET_INVALID_STATUS",
        },
        { status: 400 }
      );
    }

    // Validate QR code
    const qrValidation = validateQRCode(qrCode, ticket.qrVersion);
    if (!qrValidation.valid) {
      await Scan.create({
        ticketId: ticket._id,
        eventId,
        scannerId: session.user.id,
        scanResult: "invalid",
        deviceInfo: req.headers.get("user-agent") || "Unknown",
      });

      return NextResponse.json(
        {
          success: false,
          error: qrValidation.reason,
          code: "QR_INVALID",
        },
        { status: 400 }
      );
    }

    // Mark ticket as used and record scan
    ticket.status = "used";
    ticket.scannedAt = new Date();
    ticket.scannedBy = session.user.id;
    await ticket.save();

    await Scan.create({
      ticketId: ticket._id,
      eventId,
      scannerId: session.user.id,
      scanResult: "valid",
      deviceInfo: req.headers.get("user-agent") || "Unknown",
    });

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        ticket: {
          ticketType: ticket.ticketType,
          userName: ticket.userId.name,
          eventTitle: ticket.eventId.title,
          scannedAt: ticket.scannedAt,
        },
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

    console.error("Scan validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate ticket",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
