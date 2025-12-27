import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Transfer } from "@/lib/db/models";
import { initiateTransfer, completeTransfer } from "@/lib/services/ticket.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const initiateTransferSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  toEmail: z.string().email("Valid email address required"),
});

const verifyTransferSchema = z.object({
  transferId: z.string().min(1, "Transfer ID is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "initiate") {
      const body = await req.json();
      const { ticketId, toEmail } = initiateTransferSchema.parse(body);

      const result = await initiateTransfer(ticketId, session.user.id, toEmail);

      return NextResponse.json({
        success: true,
        data: result,
        message: "Transfer initiated successfully",
      });
    } else if (action === "verify") {
      const body = await req.json();
      const { transferId, otp } = verifyTransferSchema.parse(body);

      const result = await completeTransfer(transferId, otp);

      return NextResponse.json({
        success: true,
        data: result,
        message: "Transfer completed successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action",
          code: "INVALID_ACTION",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
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

    console.error("Transfer error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process transfer",
        code: error.message?.includes("not found") ? "RESOURCE_NOT_FOUND" :
             error.message?.includes("not allowed") ? "TRANSFER_NOT_ALLOWED" :
             error.message?.includes("limit") ? "TRANSFER_LIMIT_EXCEEDED" :
             error.message?.includes("OTP") ? "TRANSFER_OTP_INVALID" :
             "INTERNAL_ERROR",
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Get transfer history for a ticket
    const transfers = await Transfer.find({
      ticketId,
      $or: [
        { fromUserId: session.user.id },
        { toUserId: session.user.id }
      ]
    })
      .populate("fromUserId", "name email")
      .populate("toUserId", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error("Get transfers error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transfers",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}


