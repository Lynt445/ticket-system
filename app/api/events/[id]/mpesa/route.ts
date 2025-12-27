import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";
import { z } from "zod";
import CryptoJS from "crypto-js";

const mpesaConfigSchema = z.object({
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
  shortCode: z.string().min(1, "Short code is required"),
  passkey: z.string().min(1, "Passkey is required"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const event = await Event.findById(params.id);

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

    // Check permissions: event manager can only update their own events, super admin can update any
    if (!hasRole(session.user.role, "superadmin") && event.managerId.toString() !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = mpesaConfigSchema.parse(body);

    // Encrypt M-Pesa credentials before storing
    const encryptionKey = process.env.MPESA_ENCRYPTION_KEY || "default-mpesa-key";
    const encryptedConfig = CryptoJS.AES.encrypt(
      JSON.stringify(validatedData),
      encryptionKey
    ).toString();

    event.mpesaConfig = encryptedConfig;
    await event.save();

    return NextResponse.json({
      success: true,
      message: "M-Pesa configuration updated successfully",
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

    console.error("M-Pesa config update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update M-Pesa configuration",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
