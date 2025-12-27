import { NextRequest, NextResponse } from "next/server";
import { createGuestUser } from "@/lib/auth";
import { z } from "zod";

const guestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = guestSchema.parse(body);

    const guestUser = await createGuestUser(
      validatedData.name,
      validatedData.email,
      validatedData.phone
    );

    // Create a temporary token for guest user (24 hours)
    const token = require("jsonwebtoken").sign(
      {
        id: guestUser._id.toString(),
        email: guestUser.email,
        role: guestUser.role,
        isGuest: true,
      },
      process.env.NEXTAUTH_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          guestId: guestUser._id.toString(),
          token,
          message: "Guest account created successfully",
        },
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

    console.error("Guest creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
