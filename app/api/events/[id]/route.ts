import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event, Ticket } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const event = await Event.findById(params.id).populate("managerId", "name");

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

    // Check if event is accessible (published or ongoing)
    if (!["published", "ongoing"].includes(event.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not available",
          code: "EVENT_NOT_PUBLISHED",
        },
        { status: 404 }
      );
    }

    // Calculate available tickets for each type
    const ticketTypesWithAvailability = event.ticketTypes.map((type: any) => ({
      name: type.name,
      price: type.price,
      capacity: type.capacity,
      sold: type.sold,
      available: Math.max(0, type.capacity - type.sold),
      description: type.description,
    }));

    // Get total tickets sold and available
    const totalSold = ticketTypesWithAvailability.reduce(
      (sum, type) => sum + type.sold,
      0
    );
    const totalAvailable = ticketTypesWithAvailability.reduce(
      (sum, type) => sum + type.available,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...event.toObject(),
        ticketTypes: ticketTypesWithAvailability,
        totalSold,
        totalAvailable,
        totalCapacity: event.totalCapacity,
      },
    });
  } catch (error) {
    console.error("Event fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch event",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

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
          error: "Unauthorized",
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

    // Check permissions (owner or super admin)
    if (
      event.managerId.toString() !== session.user.id &&
      session.user.role !== "super_admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const allowedFields = [
      "title",
      "description",
      "date",
      "venue",
      "images",
      "ticketTypes",
      "status",
      "allowTransfers",
      "allowResale",
      "maxTransfers",
      "ticketTemplate",
      "termsAndConditions",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Recalculate total capacity if ticket types changed
    if (updateData.ticketTypes) {
      updateData.totalCapacity = updateData.ticketTypes.reduce(
        (sum: number, type: any) => sum + type.capacity,
        0
      );
    }

    // Convert date string to Date object
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update event",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized access",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
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

    // Check if event has tickets sold
    const ticketsSold = await Ticket.countDocuments({ eventId: params.id });

    if (ticketsSold > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete event with sold tickets",
          code: "EVENT_HAS_TICKETS",
        },
        { status: 409 }
      );
    }

    await Event.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Event deletion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete event",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}