import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Ticket } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const status = searchParams.get("status");
    const eventId = searchParams.get("eventId");

    // Build query
    const query: any = { userId: session.user.id };

    if (status) {
      query.status = status;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    const tickets = await Ticket.find(query)
      .populate("eventId", "title date venue status")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("My tickets fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tickets",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
