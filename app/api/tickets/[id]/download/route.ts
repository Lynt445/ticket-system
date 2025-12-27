import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Ticket, Event, User } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import puppeteer from "puppeteer";

export async function GET(
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

    const ticket = await Ticket.findById(params.id)
      .populate("eventId")
      .populate("userId", "name email");

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket not found",
          code: "TICKET_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if user owns this ticket
    if (ticket.userId._id.toString() !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied",
          code: "AUTH_INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    // Check if ticket is active
    if (!["paid", "active"].includes(ticket.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticket is not available for download",
          code: "TICKET_NOT_ACTIVE",
        },
        { status: 400 }
      );
    }

    const event = ticket.eventId as any;
    const user = ticket.userId as any;

    // Generate HTML template for the ticket
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket - ${event.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .ticket { max-width: 600px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
            .header { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
            .event-title { font-size: 24px; font-weight: bold; margin: 0; }
            .event-date { font-size: 16px; color: #666; margin: 5px 0; }
            .ticket-info { display: flex; justify-content: space-between; margin: 20px 0; }
            .info-section { flex: 1; }
            .label { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #666; }
            .value { font-size: 14px; margin-top: 2px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-placeholder { width: 150px; height: 150px; border: 1px solid #ddd; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
            .warning { color: #d9534f; font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1 class="event-title">${event.title}</h1>
              <p class="event-date">${new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <div class="ticket-info">
              <div class="info-section">
                <div class="label">Ticket Holder</div>
                <div class="value">${user.name}</div>
              </div>
              <div class="info-section">
                <div class="label">Ticket Type</div>
                <div class="value">${ticket.ticketType}</div>
              </div>
              <div class="info-section">
                <div class="label">Price</div>
                <div class="value">KES ${ticket.price}</div>
              </div>
            </div>

            <div class="ticket-info">
              <div class="info-section">
                <div class="label">Venue</div>
                <div class="value">${event.venue.name}</div>
                <div class="value">${event.venue.address}</div>
                <div class="value">${event.venue.city}</div>
              </div>
              <div class="info-section">
                <div class="label">Ticket ID</div>
                <div class="value">${ticket._id.toString().slice(-8).toUpperCase()}</div>
              </div>
              <div class="info-section">
                <div class="label">Purchase Date</div>
                <div class="value">${new Date(ticket.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="qr-code">
              <div class="qr-placeholder">
                QR Code<br/>
                <small>Scan at entrance</small>
              </div>
            </div>

            <div class="footer">
              <p>This ticket is valid only when presented with a valid QR code.</p>
              <p>Keep this ticket safe and present it at the event entrance.</p>
              <p class="warning">No refunds or exchanges. Management reserves the right to refuse entry.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate);
    await page.waitForSelector('.ticket');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${ticket._id.toString().slice(-8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Ticket download error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate ticket PDF",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
