import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { Transaction, Ticket } from "@/lib/db/models";
import { generateQRCode } from "@/lib/services/qr.service";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const callbackData = await req.json();
    console.log("M-Pesa Callback received:", JSON.stringify(callbackData, null, 2));

    // Extract callback metadata
    const {
      Body: {
        stkCallback: {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      }
    } = callbackData;

    // Find the transaction
    const transaction = await Transaction.findOne({
      merchantRequestID: MerchantRequestID,
      checkoutRequestID: CheckoutRequestID,
    });

    if (!transaction) {
      console.error("Transaction not found for callback:", { MerchantRequestID, CheckoutRequestID });
      return NextResponse.json({ success: false, error: "Transaction not found" });
    }

    // Update transaction status
    if (ResultCode === 0) {
      // Payment successful
      transaction.status = "completed";

      // Extract payment details from callback metadata
      if (CallbackMetadata && CallbackMetadata.Item) {
        const metadata = CallbackMetadata.Item;

        // Find M-Pesa receipt number
        const receiptItem = metadata.find((item: any) => item.Name === "MpesaReceiptNumber");
        if (receiptItem) {
          transaction.mpesaReceiptNumber = receiptItem.Value;
        }

        // Find transaction amount
        const amountItem = metadata.find((item: any) => item.Name === "Amount");
        if (amountItem) {
          transaction.amount = amountItem.Value;
        }

        // Find transaction date
        const dateItem = metadata.find((item: any) => item.Name === "TransactionDate");
        if (dateItem) {
          // Convert M-Pesa timestamp to Date (format: YYYYMMDDHHMMSS)
          const timestamp = dateItem.Value.toString();
          const year = timestamp.slice(0, 4);
          const month = timestamp.slice(4, 6);
          const day = timestamp.slice(6, 8);
          const hour = timestamp.slice(8, 10);
          const minute = timestamp.slice(10, 12);
          const second = timestamp.slice(12, 14);
          transaction.completedAt = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        }
      }

      await transaction.save();

      // Find all tickets associated with this reservation
      const tickets = await Ticket.find({
        userId: transaction.userId,
        eventId: transaction.eventId,
        status: "pending_payment",
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Within last 15 minutes
      });

      // Update tickets and generate QR codes
      for (const ticket of tickets) {
        // Generate QR code
        const { encrypted, qrCodeDataUrl } = await generateQRCode(
          ticket._id.toString(),
          transaction.eventId.toString(),
          transaction.userId.toString(),
          ticket.qrVersion
        );

        ticket.status = "paid";
        ticket.qrCode = encrypted;
        ticket.transactionId = transaction._id;
        await ticket.save();
      }

      console.log(`Payment completed successfully. Updated ${tickets.length} tickets.`);
    } else {
      // Payment failed
      transaction.status = "failed";
      transaction.failureReason = ResultDesc;
      await transaction.save();

      // Mark tickets as expired
      await Ticket.updateMany(
        {
          userId: transaction.userId,
          eventId: transaction.eventId,
          status: "pending_payment",
          createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
        },
        { status: "expired" }
      );

      console.log("Payment failed:", ResultDesc);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("M-Pesa callback processing error:", error);
    return NextResponse.json(
      { success: false, error: "Callback processing failed" },
      { status: 500 }
    );
  }
}
