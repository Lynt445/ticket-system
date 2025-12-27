import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  venue: z.object({
    name: z.string().min(1, "Venue name is required"),
    address: z.string().min(1, "Venue address is required"),
    city: z.string().min(1, "Venue city is required"),
    coordinates: z.array(z.number()).length(2).optional(),
  }),
  images: z.array(z.string()).default([]),
  ticketTypes: z.array(z.object({
    name: z.string().min(1, "Ticket type name is required"),
    price: z.number().min(0, "Price must be non-negative"),
    capacity: z.number().min(1, "Capacity must be at least 1"),
    description: z.string().optional(),
  })).min(1, "At least one ticket type is required"),
  allowTransfers: z.boolean().default(false),
  allowResale: z.boolean().default(false),
  maxTransfers: z.number().min(0).max(5).default(3),
  ticketTemplate: z.string().optional(),
  termsAndConditions: z.string().optional(),
  mpesaConfig: z.object({
    consumerKey: z.string().min(1, "Consumer key is required"),
    consumerSecret: z.string().min(1, "Consumer secret is required"),
    shortCode: z.string().min(1, "Short code is required"),
    passkey: z.string().min(1, "Passkey is required"),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !["super_admin", "event_manager"].includes(session.user.role)) {
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
    const validatedData = createEventSchema.parse(body);

    // Calculate total capacity
    const totalCapacity = validatedData.ticketTypes.reduce(
      (sum, type) => sum + type.capacity,
      0
    );

    const eventData = {
      ...validatedData,
      managerId: session.user.id,
      date: new Date(validatedData.date),
      totalCapacity,
      status: "draft",
    };

    const event = await Event.create(eventData);

    return NextResponse.json(
      {
        success: true,
        data: event,
        message: "Event created successfully",
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

    console.error("Event creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      // Default to published and ongoing events for public access
      query.status = { $in: ["published", "ongoing"] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("managerId", "name")
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit),
      Event.countDocuments(query),
    ]);

    // Calculate available tickets for each event
    const eventsWithAvailability = events.map((event: any) => {
      const ticketTypesWithAvailability = event.ticketTypes.map((type: any) => ({
        ...type.toObject(),
        available: Math.max(0, type.capacity - type.sold),
      }));

      return {
        ...event.toObject(),
        ticketTypes: ticketTypesWithAvailability,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        events: eventsWithAvailability,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
