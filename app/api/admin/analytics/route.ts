import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Event, Ticket, Transaction, User } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions, hasRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !hasRole(session.user.role, "super_admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get system statistics
    const [
      totalEvents,
      totalTicketsSold,
      totalRevenue,
      activeEventManagers,
      totalUsers
    ] = await Promise.all([
      Event.countDocuments(),
      Ticket.countDocuments({ status: "active" }),
      Transaction.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      User.countDocuments({ role: "event_manager" }),
      User.countDocuments()
    ]);

    const platformRevenue = totalRevenue.length > 0 ? totalRevenue[0].total * 0.1 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        totalTicketsSold,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        platformCommission: platformRevenue,
        activeEventManagers,
        totalUsers
      }
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
