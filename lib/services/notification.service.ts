import axios from 'axios';
import sgMail from '@sendgrid/mail';
import Notification from '@/lib/db/models/Notification';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// WAHA API configuration
const WAHA_BASE_URL = process.env.WAHA_API_URL || 'http://localhost:3002';
const WAHA_API_KEY = process.env.WAHA_API_KEY;

export interface NotificationData {
  userId: string;
  eventId?: string;
  ticketId?: string;
  type: 'ticket_delivery' | 'payment_failed' | 'event_reminder' | 'transfer_confirmation';
  channel: 'email' | 'whatsapp' | 'both';
  content: {
    subject?: string;
    body: string;
    attachments?: string[];
  };
}

export interface UserContactInfo {
  email: string;
  phone?: string;
  name: string;
}

// Send email notification
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email');
      return { success: false, error: 'SendGrid not configured' };
    }

    const msg = {
      to,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@ticketingsystem.com',
        name: process.env.FROM_NAME || 'Event Ticketing System'
      },
      subject,
      html,
      attachments,
    };

    const result = await sgMail.send(msg);
    return {
      success: true,
      messageId: result[0]?.headers?.['x-message-id'],
      data: result
    };
  } catch (error: any) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Send WhatsApp message
export async function sendWhatsApp(phone: string, message: string) {
  try {
    if (!WAHA_API_KEY) {
      console.warn('WAHA API key not configured, skipping WhatsApp');
      return { success: false, error: 'WAHA not configured' };
    }

    // Format phone number for WhatsApp
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+?254/, '254');

    const response = await axios.post(
      `${WAHA_BASE_URL}/api/sendText`,
      {
        session: 'default',
        chatId: `${cleanPhone}@c.us`,
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WAHA_API_KEY,
        },
        timeout: 30000,
      }
    );

    return {
      success: true,
      messageId: response.data?.id,
      data: response.data
    };
  } catch (error: any) {
    console.error('WhatsApp sending error:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      code: 'WHATSAPP_SEND_FAILED'
    };
  }
}

// Send notification to user
export async function sendNotification(
  user: UserContactInfo,
  notificationData: NotificationData
) {
  const { channel, content } = notificationData;
  const results = {
    email: null as any,
    whatsapp: null as any,
  };

  // Send email if requested
  if (channel === 'email' || channel === 'both') {
    if (user.email && content.subject) {
      results.email = await sendEmail(
        user.email,
        content.subject,
        content.body,
        content.attachments
      );
    }
  }

  // Send WhatsApp if requested
  if (channel === 'whatsapp' || channel === 'both') {
    if (user.phone) {
      results.whatsapp = await sendWhatsApp(user.phone, content.body);
    }
  }

  // Save notification record
  const notification = await Notification.create({
    ...notificationData,
    status: (results.email?.success || results.whatsapp?.success) ? 'sent' : 'failed',
    emailId: results.email?.messageId,
    whatsappId: results.whatsapp?.messageId,
    sentAt: new Date(),
  });

  return {
    success: results.email?.success || results.whatsapp?.success || false,
    notificationId: notification._id,
    results,
  };
}

// Generate notification content templates
export function generateNotificationContent(type: string, data: any) {
  switch (type) {
    case 'ticket_delivery':
      return {
        subject: `Your tickets for ${data.eventTitle}`,
        body: `
          <h2>Ticket Delivery</h2>
          <p>Dear ${data.userName},</p>
          <p>Your tickets for <strong>${data.eventTitle}</strong> have been delivered successfully!</p>
          <p>Event Details:</p>
          <ul>
            <li>Date: ${new Date(data.eventDate).toLocaleDateString()}</li>
            <li>Venue: ${data.venue}</li>
            <li>Tickets: ${data.ticketCount}</li>
          </ul>
          <p>Please find your QR codes attached to this email.</p>
          <p>Show your QR code at the entrance for entry.</p>
        `,
      };

    case 'payment_failed':
      return {
        subject: 'Payment Failed - Retry Your Purchase',
        body: `
          <h2>Payment Failed</h2>
          <p>Dear ${data.userName},</p>
          <p>Your payment for tickets to <strong>${data.eventTitle}</strong> was not successful.</p>
          <p>Please try again using this link: <a href="${data.retryUrl}">${data.retryUrl}</a></p>
          <p>If you continue to experience issues, please contact our support team.</p>
        `,
      };

    case 'event_reminder':
      return {
        subject: `Reminder: ${data.eventTitle} Tomorrow`,
        body: `
          <h2>Event Reminder</h2>
          <p>Dear ${data.userName},</p>
          <p>This is a reminder that <strong>${data.eventTitle}</strong> is happening tomorrow!</p>
          <p>Event Details:</p>
          <ul>
            <li>Date: ${new Date(data.eventDate).toLocaleDateString()}</li>
            <li>Time: ${data.eventTime}</li>
            <li>Venue: ${data.venue}</li>
          </ul>
          <p>Don't forget to bring your QR code for entry.</p>
        `,
      };

    case 'transfer_confirmation':
      return {
        subject: 'Ticket Transfer Confirmation',
        body: `
          <h2>Ticket Transfer Completed</h2>
          <p>Dear ${data.userName},</p>
          <p>Your ticket transfer has been completed successfully!</p>
          <p>Transfer Details:</p>
          <ul>
            <li>Event: ${data.eventTitle}</li>
            <li>Ticket Type: ${data.ticketType}</li>
            <li>From: ${data.fromUser}</li>
            <li>To: ${data.toUser}</li>
          </ul>
          <p>Your new QR code is attached to this message.</p>
        `,
      };

    default:
      return {
        subject: 'Notification from Event Ticketing System',
        body: data.message || 'You have a new notification.',
      };
  }
}

// Bulk send notifications (for event reminders, etc.)
export async function sendBulkNotifications(
  notifications: Array<{ user: UserContactInfo; data: NotificationData }>
) {
  const results = [];

  for (const { user, data } of notifications) {
    try {
      const result = await sendNotification(user, data);
      results.push({
        userId: user.email,
        success: result.success,
        notificationId: result.notificationId,
      });
    } catch (error) {
      console.error(`Failed to send notification to ${user.email}:`, error);
      results.push({
        userId: user.email,
        success: false,
        error: error.message,
      });
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
