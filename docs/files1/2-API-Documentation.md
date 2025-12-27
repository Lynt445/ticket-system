API DOCUMENTATION

Event Ticketing System

RESTful API Reference

Version 1.0

# 1. API OVERVIEW

## Base URL

**Production:** https://yourdomain.com/api

**Development:** http://localhost:3000/api

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```json
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:

Success Response:

```json
{
"success": true,
"data": { ... },
"message": "Operation successful"
}
```

Error Response:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes

- • 200 OK - Request successful
- • 201 Created - Resource created successfully
- • 400 Bad Request - Invalid request parameters
- • 401 Unauthorized - Missing or invalid authentication
- • 403 Forbidden - Insufficient permissions
- • 404 Not Found - Resource not found
- • 409 Conflict - Resource conflict (e.g., duplicate entry)
- • 429 Too Many Requests - Rate limit exceeded
- • 500 Internal Server Error - Server error

# 2. AUTHENTICATION ENDPOINTS

## POST /api/auth/register

Register a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+254712345678",
  "role": "user" // optional, defaults to "user"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## POST /api/auth/login

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
"success": true,
"data": {
"user": { ... },
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
}

```

## POST /api/auth/guest

Create guest account for checkout without registration.

**Request Body:**

```json
{
  "name": "Guest User",
  "email": "guest@example.com",
  "phone": "+254712345678"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "guestId": "507f1f77bcf86cd799439011",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

# 3. EVENT MANAGEMENT ENDPOINTS

## POST /api/events

Create a new event (Event Manager only).

**Authorization:** Bearer token required (event_manager or super_admin role)

**Request Body:**

```json
{
  "title": "Tech Conference 2025",
  "description": "Annual technology conference",
  "date": "2025-06-15T09:00:00Z",
  "venue": {
    "name": "Nairobi Convention Center",
    "address": "123 Main Street",
    "city": "Nairobi"
  },

  "ticketTypes": [
    {
      "name": "VIP",
      "price": 5000,
      "capacity": 100,
      "description": "Premium access with front row seats"
    },
    {
      "name": "Regular",
      "price": 2000,
      "capacity": 500
    }
  ],
  "allowTransfers": true,
  "allowResale": true,
  "maxTransfers": 3,
  "mpesaConfig": {
    "shortCode": "174379",
    "consumerKey": "your_consumer_key",
    "consumerSecret": "your_consumer_secret",
    "passkey": "your_passkey"
  }
}
```

## GET /api/events

Get all published events with pagination and filters.

**Query Parameters:**  
• page: Page number (default: 1)  
• limit: Results per page (default: 10)  
• status: Filter by status (published, ongoing, completed)  
• search: Search by title or description  
• date: Filter by date range

## GET /api/events/:id

Get detailed event information including available tickets.

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Tech Conference 2025",
    "date": "2025-06-15T09:00:00Z",
    "ticketTypes": [
      {
        "name": "VIP",
        "price": 5000,
        "capacity": 100,
        "sold": 45,
        "available": 55
      }
    ]
  }
}
```

## PATCH /api/events/:id

Update event details (Event Manager only - own events).

**Authorization:** Bearer token required (event owner or super_admin)

## PATCH /api/events/:id/mpesa

Update M-Pesa credentials for event.

**Request Body:**

```json
{
  "shortCode": "174379",
  "consumerKey": "new_consumer_key",
  "consumerSecret": "new_consumer_secret",
  "passkey": "new_passkey"
}
```

# 4. TICKETING ENDPOINTS

## POST /api/tickets/reserve

Reserve tickets for 10 minutes pending payment.

**Request Body:**

```json
{
  "eventId": "507f1f77bcf86cd799439011",
  "ticketType": "VIP",
  "quantity": 2
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "reservationId": "507f1f77bcf86cd799439012",
    "tickets": ["ticketId1", "ticketId2"],
    "totalAmount": 10000,
    "expiresAt": "2025-12-20T10:10:00Z"
  }
}
```

## GET /api/tickets/my-tickets

Get all tickets for authenticated user.

**Authorization:** Bearer token required

**Response:**

```json
{
"success": true,
"data": [
{
"_id": "507f1f77bcf86cd799439011",
"eventId": { ... },
"ticketType": "VIP",
"status": "active",
"qrCode": "encrypted_qr_data"
}
]
}
```

## GET /api/tickets/:id/download

Download ticket PDF with QR code.

**Response:** PDF file with ticket details and QR code

# 5. PAYMENT ENDPOINTS

## POST /api/payments/initiate

Initiate M-Pesa STK Push payment.

**Request Body:**

```json
{
  "reservationId": "507f1f77bcf86cd799439012",
  "phoneNumber": "+254712345678"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "checkoutRequestID": "ws_CO_20122024100000",
    "merchantRequestID": "29115-34620561-1",
    "message": "STK Push sent. Please enter PIN on phone."
  }
}
```

## POST /api/payments/callback

M-Pesa callback endpoint (internal use only). This endpoint is called by M-Pesa after payment completion.

## GET /api/payments/status/:checkoutRequestID

Check payment status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "mpesaReceiptNumber": "QAB2C3D4E5",
    "tickets": [
      {
        "ticketId": "507f1f77bcf86cd799439011",
        "qrCode": "encrypted_qr_data"
      }
    ]
  }
}
```

# 6. TRANSFER & MARKETPLACE ENDPOINTS

## POST /api/transfers/initiate

Initiate ticket transfer to another user.

**Request Body:**

```json
{
  "ticketId": "507f1f77bcf86cd799439011",
  "toEmail": "recipient@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transferId": "507f1f77bcf86cd799439013",
    "message": "OTP sent to both parties. Verify to complete transfer."
  }
}
```

## POST /api/transfers/verify

Verify transfer with OTP.

**Request Body:**

```json
{
  "transferId": "507f1f77bcf86cd799439013",
  "otp": "123456"
}
```

## GET /api/marketplace

Get all tickets available for resale.

**Query Parameters:**  
• eventId: Filter by event  
• minPrice: Minimum price  
• maxPrice: Maximum price

## POST /api/marketplace/list

List ticket for resale.

**Request Body:**

```json
{
  "ticketId": "507f1f77bcf86cd799439011",
  "listingPrice": 4500
}
```

# 7. SCANNING & VALIDATION ENDPOINTS

## POST /api/scan/validate

Validate QR code at event entry (Scanner role required).

**Authorization:** Bearer token required (scanner role)

**Request Body:**

```json
{
  "qrCode": "encrypted_qr_data",
  "eventId": "507f1f77bcf86cd799439011"
}
```

**Response (Valid):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "ticket": {
      "ticketType": "VIP",
      "userName": "John Doe",
      "eventTitle": "Tech Conference 2025"
    }
  }
}
```

**Response (Invalid):**

```json
{
  "success": false,
  "error": "Ticket already used",
  "code": "DUPLICATE_SCAN"
}
```

## GET /api/scan/history

Get scan history for event (Event Manager only).

**Query Parameters:**  
• eventId: Event ID (required)  
• scannerId: Filter by scanner  
• startDate: Filter by date range  
• endDate: Filter by date range

# 8. ANALYTICS & REPORTING ENDPOINTS

## GET /api/analytics/event/:eventId

Get comprehensive analytics for event (Event Manager only).

**Response:**

```json
{
"success": true,
"data": {
"salesSummary": {
"totalTicketsSold": 450,
"totalRevenue": 1200000,
"averageTicketPrice": 2667
},
"ticketTypeBreakdown": [
{
"type": "VIP",
"sold": 80,
"capacity": 100,
"revenue": 400000
}
],
"salesTrend": [ ... ],
"attendeeInsights": { ... }
}
}
```

## GET /api/analytics/export/:eventId

Export event report (CSV, PDF, or Excel).

**Query Parameters:**  
• format: csv, pdf, or xlsx (default: csv)

# 9. ADMIN ENDPOINTS

## GET /api/admin/users

Get all users (Super Admin only).

**Authorization:** Bearer token required (super_admin role)

## PATCH /api/admin/users/:id/role

Update user role (Super Admin only).

**Request Body:**

```json
{
  "role": "event_manager"
}
```

## GET /api/admin/analytics

Get platform-wide analytics (Super Admin only).

**Response:**

```json
{
  "success": true,
  "data": {
    "totalEvents": 150,
    "totalTicketsSold": 25000,
    "totalRevenue": 50000000,
    "platformCommission": 2500000,
    "activeEventManagers": 45
  }
}
```

# 10. ERROR CODES REFERENCE

## Authentication Errors

- • AUTH_INVALID_CREDENTIALS - Invalid email or password
- • AUTH_TOKEN_EXPIRED - JWT token has expired
- • AUTH_TOKEN_INVALID - Invalid JWT token
- • AUTH_INSUFFICIENT_PERMISSIONS - User lacks required permissions

## Event Errors

- • EVENT_NOT_FOUND - Event does not exist
- • EVENT_NOT_PUBLISHED - Event is not published yet
- • EVENT_CANCELLED - Event has been cancelled
- • EVENT_PAST_DATE - Event date has passed

## Ticketing Errors

- • TICKET_SOLD_OUT - No tickets available
- • TICKET_TYPE_INVALID - Invalid ticket type
- • RESERVATION_EXPIRED - Ticket reservation expired
- • TICKET_ALREADY_USED - Ticket has been scanned
- • TICKET_TRANSFERRED - Ticket has been transferred

## Payment Errors

- • PAYMENT_FAILED - M-Pesa payment failed
- • PAYMENT_TIMEOUT - Payment request timed out
- • PAYMENT_PHONE_MISMATCH - Phone number doesn't match account
- • MPESA_CONFIG_MISSING - M-Pesa credentials not configured

## Transfer Errors

- • TRANSFER_NOT_ALLOWED - Transfers disabled for event
- • TRANSFER_LIMIT_EXCEEDED - Maximum transfers reached
- • TRANSFER_OTP_INVALID - Invalid OTP code
- • RECIPIENT_NOT_FOUND - Recipient user not found

## Scanning Errors

- • QR_INVALID - QR code is invalid or corrupted
- • QR_EXPIRED - QR code has expired
- • DUPLICATE_SCAN - Ticket already scanned
- • SCANNER_UNAUTHORIZED - Scanner not authorized for event

End of API Documentation
