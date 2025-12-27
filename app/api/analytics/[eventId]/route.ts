import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import Event from "@/lib/db/models/Event";
import Ticket from "@/lib/db/models/Ticket";
import Transaction from "@/lib/db/models/Transaction";
import Scan from "@/lib/db/models/Scan";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventId } = params;

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

    // Get all tickets for this event
    const tickets = await Ticket.find({ eventId }).populate("userId", "name email");

    // Calculate analytics
    const totalTickets = tickets.length;
    const soldTickets = tickets.filter(t => t.status === "active" || t.status === "used").length;
    const usedTickets = tickets.filter(t => t.status === "used").length;
    const pendingTickets = tickets.filter(t => t.status === "pendingpayment").length;
    const cancelledTickets = tickets.filter(t => t.status === "cancelled").length;

    // Revenue calculations
    const transactions = await Transaction.find({
      eventId,
      status: "completed"
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTicketPrice = soldTickets > 0 ? totalRevenue / soldTickets : 0;

    // Ticket type breakdown
    const ticketTypeBreakdown = event.ticketTypes.map(type => {
      const typeTickets = tickets.filter(t => t.ticketType === type.name);
      const sold = typeTickets.filter(t => t.status === "active" || t.status === "used").length;
      const revenue = typeTickets
        .filter(t => t.status === "active" || t.status === "used")
        .reduce((sum, t) => sum + t.price, 0);

      return {
        type: type.name,
        capacity: type.capacity,
        sold,
        available: type.capacity - sold,
        revenue,
        percentage: type.capacity > 0 ? ((sold / type.capacity) * 100).toFixed(1) : "0"
      };
    });

    // Scan analytics
    const scans = await Scan.find({ eventId }).populate("scannerId", "name");

    // Sales trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await Transaction.find({
      eventId,
      status: "completed",
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    const salesTrend = [];
    const dailySales = new Map();

    recentTransactions.forEach(transaction => {
      const date = transaction.createdAt.toISOString().split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + transaction.amount);
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      salesTrend.push({
        date: dateStr,
        revenue: dailySales.get(dateStr) || 0
      });
    }

    // Attendee insights
    const attendeesByDay = new Map();
    scans.forEach(scan => {
      const date = scan.createdAt.toISOString().split('T')[0];
      attendeesByDay.set(date, (attendeesByDay.get(date) || 0) + 1);
    });

    const attendeeTrend = Array.from(attendeesByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, attendees: count }));

    const analytics = {
      summary: {
        totalTickets,
        soldTickets,
        usedTickets,
        pendingTickets,
        cancelledTickets,
        totalRevenue,
        averageTicketPrice: Math.round(averageTicketPrice),
        sellThroughRate: totalTickets > 0 ? ((soldTickets / totalTickets) * 100).toFixed(1) : "0"
      },
      ticketTypeBreakdown,
      salesTrend,
      attendeeInsights: {
        totalScans: scans.length,
        uniqueAttendees: new Set(scans.map(s => s.ticketId.toString())).size,
        attendeeTrend,
        peakAttendance: attendeeTrend.length > 0 ? Math.max(...attendeeTrend.map(d => d.attendees)) : 0
      },
      eventDetails: {
        title: event.title,
        date: event.date,
        status: event.status,
        venue: event.venue
      }
    };

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
