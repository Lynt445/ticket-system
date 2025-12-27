import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import Scan from "@/lib/db/models/Scan";
import Event from "@/lib/db/models/Event";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const scannerId = searchParams.get('scannerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!eventId) {
      return NextResponse.json({
        error: "Event ID is required"
      }, { status: 400 });
    }

    // Check if user owns this event or is admin
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (
      session.user.role !== "super_admin" &&
      event.managerId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query
    const query: any = { eventId };

    if (scannerId) {
      query.scannerId = scannerId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const totalScans = await Scan.countDocuments(query);

    // Get scans with pagination
    const scans = await Scan.find(query)
      .populate({
        path: 'ticketId',
        select: 'ticketType userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('scannerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Calculate summary statistics
    const totalPages = Math.ceil(totalScans / limit);
    const validScans = scans.filter(scan => scan.scanResult === 'valid').length;
    const invalidScans = scans.filter(scan => scan.scanResult === 'invalid').length;
    const duplicateScans = scans.filter(scan => scan.scanResult === 'duplicate').length;

    // Group by hour for timeline
    const scansByHour = new Map();
    scans.forEach(scan => {
      const hour = scan.createdAt.getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      scansByHour.set(key, (scansByHour.get(key) || 0) + 1);
    });

    const hourlyTimeline = Array.from(scansByHour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, scans: count }));

    const scanHistory = {
      summary: {
        totalScans,
        validScans,
        invalidScans,
        duplicateScans,
        successRate: totalScans > 0 ? ((validScans / totalScans) * 100).toFixed(1) : "0"
      },
      pagination: {
        page,
        limit,
        totalPages,
        totalScans,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timeline: {
        hourly: hourlyTimeline
      },
      scans: scans.map(scan => ({
        id: scan._id,
        ticketId: scan.ticketId?._id,
        ticketType: scan.ticketId?.ticketType,
        userName: scan.ticketId?.userId?.name,
        userEmail: scan.ticketId?.userId?.email,
        scannerName: scan.scannerId?.name,
        scannerEmail: scan.scannerId?.email,
        scanResult: scan.scanResult,
        scannedAt: scan.createdAt,
        deviceInfo: scan.deviceInfo
      }))
    };

    return NextResponse.json({
      success: true,
      data: scanHistory
    });

  } catch (error) {
    console.error("Scan history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    );
  }
}
