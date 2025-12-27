import axios from "axios";
import CryptoJS from "crypto-js";

// Environment variables
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || "sandbox";
const MPESA_ENCRYPTION_KEY = process.env.MPESA_ENCRYPTION_KEY || "default-mpesa-key";

const MPESA_BASE_URL = MPESA_ENVIRONMENT === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

// Decrypt M-Pesa configuration
export function decryptMpesaConfig(encryptedConfig: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedConfig, MPESA_ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    throw new Error("Failed to decrypt M-Pesa configuration");
  }
}

// Generate OAuth token
export async function getMpesaAccessToken(consumerKey: string, consumerSecret: string) {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 30000, // 30 seconds timeout
    }
  );

  return response.data.access_token;
}

// Initiate STK Push
export async function initiateSTKPush(
  event: any,
  phone: string,
  amount: number,
  ticketId: string
) {
  try {
    // Decrypt M-Pesa config
    const mpesaConfig = decryptMpesaConfig(event.mpesaConfig);
    const { consumerKey, consumerSecret, shortCode, passkey } = mpesaConfig;

    // Validate phone number format (Kenya)
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+?254/, "254");
    if (!/^254[0-9]{9}$/.test(cleanPhone)) {
      throw new Error("Invalid phone number format");
    }

    // Get access token
    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret);

    // Generate timestamp and password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    // Prepare STK Push data
    const stkData = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount), // Ensure integer amount
      PartyA: cleanPhone,
      PartyB: shortCode,
      PhoneNumber: cleanPhone,
      CallBackURL: `${process.env.NEXTAUTH_URL}/api/payments/callback`,
      AccountReference: `TICKET-${ticketId}`,
      TransactionDesc: `Payment for ${event.title}`,
    };

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      stkData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      data: {
        ...response.data,
        phoneNumber: cleanPhone,
        amount: Math.round(amount),
      },
    };
  } catch (error: any) {
    console.error("STK Push error:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message,
      code: "PAYMENT_INITIATION_FAILED",
    };
  }
}

// Query STK Push payment status
export async function querySTKPushStatus(
  event: any,
  checkoutRequestId: string
) {
  try {
    const mpesaConfig = decryptMpesaConfig(event.mpesaConfig);
    const { consumerKey, consumerSecret, shortCode, passkey } = mpesaConfig;

    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret);

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

    const queryData = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      queryData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("STK Query error:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message,
      code: "PAYMENT_QUERY_FAILED",
    };
  }
}

// Process M-Pesa callback
export function processMpesaCallback(callbackData: any) {
  try {
    // Verify callback data structure
    if (!callbackData.Body?.stkCallback) {
      throw new Error("Invalid callback data structure");
    }

    const { stkCallback } = callbackData.Body;
    const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const result = {
      success: ResultCode === 0,
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      metadata: null as any,
    };

    // Extract transaction details if successful
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const metadata: any = {};
      CallbackMetadata.Item.forEach((item: any) => {
        switch (item.Name) {
          case "Amount":
            metadata.amount = item.Value;
            break;
          case "MpesaReceiptNumber":
            metadata.mpesaReceiptNumber = item.Value;
            break;
          case "TransactionDate":
            metadata.transactionDate = item.Value;
            break;
          case "PhoneNumber":
            metadata.phoneNumber = item.Value;
            break;
        }
      });
      result.metadata = metadata;
    }

    return result;
  } catch (error) {
    console.error("Callback processing error:", error);
    throw new Error("Failed to process M-Pesa callback");
  }
}
