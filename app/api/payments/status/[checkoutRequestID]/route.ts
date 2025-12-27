import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import Transaction from "@/lib/db/models/Transaction";
import Event from "@/lib/db/models/Event";
import { querySTKPushStatus } from "@/lib/services/payment.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { checkoutRequestID: string } }
) {
  await dbConnect();

  try {
    const { checkoutRequestID } = params;

    // Find transaction by checkout request ID
    const transaction = await Transaction.findOne({
      checkoutRequestId: checkoutRequestID
    }).populate({
      path: 'eventId',
      select: 'mpesaConfig title'
    });

    if (!transaction) {
      return NextResponse.json({
        error: "Transaction not found"
      }, { status: 404 });
    }

    // If transaction is already completed, return the status
    if (transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'completed',
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          transactionId: transaction._id,
          amount: transaction.amount,
          tickets: transaction.tickets || []
        }
      });
    }

    // If transaction is still pending, query M-Pesa for status
    if (transaction.status === 'pending' && transaction.eventId?.mpesaConfig) {
      try {
        const statusResult = await querySTKPushStatus(
          transaction.eventId,
          checkoutRequestID
        );

        if (statusResult.success) {
          const { ResultCode, ResultDesc } = statusResult.data;

          // Update transaction status based on M-Pesa response
          if (ResultCode === 0) {
            transaction.status = 'completed';
            // Extract receipt number if available
            if (statusResult.data.CallbackMetadata?.Item) {
              const receiptItem = statusResult.data.CallbackMetadata.Item.find(
                (item: any) => item.Name === 'MpesaReceiptNumber'
              );
              if (receiptItem) {
                transaction.mpesaReceiptNumber = receiptItem.Value;
              }
            }
            await transaction.save();
          } else if (ResultCode !== null) {
            // Payment failed or cancelled
            transaction.status = 'failed';
            transaction.failureReason = ResultDesc;
            await transaction.save();
          }

          return NextResponse.json({
            success: true,
            data: {
              status: transaction.status,
              resultCode: ResultCode,
              resultDesc: ResultDesc,
              mpesaReceiptNumber: transaction.mpesaReceiptNumber,
              transactionId: transaction._id,
              amount: transaction.amount
            }
          });
        }
      } catch (queryError) {
        console.error("M-Pesa status query error:", queryError);
        // Continue with database status if query fails
      }
    }

    // Return current transaction status from database
    return NextResponse.json({
      success: true,
      data: {
        status: transaction.status,
        transactionId: transaction._id,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
        failureReason: transaction.failureReason
      }
    });

  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
