import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import Event from "@/lib/db/models/Event";
import Ticket from "@/lib/db/models/Ticket";
import Transaction from "@/lib/db/models/Transaction";
import Scan from "@/lib/db/models/Scan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

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

    // Get all data for export
    const tickets = await Ticket.find({ eventId })
      .populate("userId", "name email phone")
      .populate("transactionId");

    const transactions = await Transaction.find({ eventId })
      .populate("userId", "name email");

    const scans = await Scan.find({ eventId })
      .populate("ticketId")
      .populate("scannerId", "name")
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Generate CSV content
      let csvContent = '';

      // Tickets CSV
      csvContent += 'TICKETS\n';
      csvContent += 'Ticket ID,User Name,User Email,Phone,Ticket Type,Price,Status,Purchase Date,Scanned At\n';

      tickets.forEach(ticket => {
        csvContent += `${ticket._id},${ticket.userId?.name || ''},${ticket.userId?.email || ''},${ticket.userId?.phone || ''},${ticket.ticketType},${ticket.price},${ticket.status},${ticket.createdAt.toISOString()},${ticket.scannedAt ? ticket.scannedAt.toISOString() : ''}\n`;
      });

      csvContent += '\nTRANSACTIONS\n';
      csvContent += 'Transaction ID,User Name,User Email,Amount,Status,M-Pesa Receipt,Payment Date\n';

      transactions.forEach(transaction => {
        csvContent += `${transaction._id},${transaction.userId?.name || ''},${transaction.userId?.email || ''},${transaction.amount},${transaction.status},${transaction.mpesaReceiptNumber || ''},${transaction.createdAt.toISOString()}\n`;
      });

      csvContent += '\nSCANS\n';
      csvContent += 'Scan ID,Ticket ID,Scanner Name,Scan Time,Result\n';

      scans.forEach(scan => {
        csvContent += `${scan._id},${scan.ticketId?._id || ''},${scan.scannerId?.name || ''},${scan.createdAt.toISOString()},${scan.scanResult}\n`;
      });

      // Return CSV file
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}_report.csv"`);

      return new NextResponse(csvContent, {
        status: 200,
        headers
      });

    } else if (format === 'json') {
      // Return JSON data
      const exportData = {
        event: {
          id: event._id,
          title: event.title,
          date: event.date,
          venue: event.venue,
          status: event.status
        },
        tickets: tickets.map(ticket => ({
          id: ticket._id,
          user: {
            name: ticket.userId?.name,
            email: ticket.userId?.email,
            phone: ticket.userId?.phone
          },
          ticketType: ticket.ticketType,
          price: ticket.price,
          status: ticket.status,
          purchaseDate: ticket.createdAt,
          scannedAt: ticket.scannedAt,
          qrCode: ticket.qrCode
        })),
        transactions: transactions.map(transaction => ({
          id: transaction._id,
          user: {
            name: transaction.userId?.name,
            email: transaction.userId?.email
          },
          amount: transaction.amount,
          status: transaction.status,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          paymentDate: transaction.createdAt
        })),
        scans: scans.map(scan => ({
          id: scan._id,
          ticketId: scan.ticketId?._id,
          scannerName: scan.scannerId?.name,
          scanTime: scan.createdAt,
          result: scan.scanResult
        }))
      };

      return NextResponse.json({
        success: true,
        data: exportData
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
