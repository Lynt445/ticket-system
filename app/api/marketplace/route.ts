import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import {
  getMarketplaceListings,
  listTicketForSale,
  cancelMarketplaceListing,
  getUserListings
} from "@/lib/services/marketplace.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const listTicketSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  listingPrice: z.number().min(0, "Listing price must be non-negative"),
});

const cancelListingSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const ticketType = searchParams.get("ticketType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const result = await getMarketplaceListings({
      eventId,
      minPrice,
      maxPrice,
      ticketType,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get marketplace listings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch marketplace listings",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "list") {
      const body = await req.json();
      const { ticketId, listingPrice } = listTicketSchema.parse(body);

      const result = await listTicketForSale(ticketId, session.user.id, listingPrice);

      return NextResponse.json({
        success: true,
        data: result,
        message: "Ticket listed for sale successfully",
      });
    } else if (action === "cancel") {
      const body = await req.json();
      const { listingId } = cancelListingSchema.parse(body);

      const result = await cancelMarketplaceListing(listingId, session.user.id);

      return NextResponse.json({
        success: true,
        data: result,
        message: "Listing cancelled successfully",
      });
    } else if (action === "my-listings") {
      const status = searchParams.get("status");
      const result = await getUserListings(session.user.id, status || undefined);

      return NextResponse.json({
        success: true,
        data: result,
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

    console.error("Marketplace operation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process marketplace operation",
        code: error.message?.includes("not found") ? "RESOURCE_NOT_FOUND" :
             error.message?.includes("not allowed") ? "RESALE_NOT_ALLOWED" :
             error.message?.includes("price") ? "INVALID_PRICE" :
             "INTERNAL_ERROR",
      },
      { status: 400 }
    );
  }
}


