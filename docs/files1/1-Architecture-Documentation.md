EVENT TICKETING SYSTEM

Microservices Architecture Documentation

Version 1.0

12/20/2025

# 1. SYSTEM OVERVIEW

## Purpose

A reusable, multi-tenant event ticketing platform that enables event managers to create, manage, and sell tickets for various events with integrated M-Pesa payments, QR code generation, and comprehensive ticket validation.

## Key Features

- • Multi-tenant architecture with event manager isolation
- • Flexible ticket types and pricing configurations
- • M-Pesa STK Push payment integration per event manager
- • QR code generation and web-based scanning
- • Ticket transfer and resale marketplace (configurable)
- • Real-time ticket validation and fraud prevention
- • Email and WhatsApp notifications
- • Comprehensive analytics and reporting

## Target Capacity

- • 10,000 tickets per event
- • Concurrent high-traffic ticket sales
- • Real-time payment confirmation and ticket delivery

# 2. MICROSERVICES ARCHITECTURE

## Architecture Overview

The system is designed as a microservices architecture to ensure scalability, maintainability, and independent deployment of services. Each service handles a specific domain and communicates via REST APIs and message queues.

## Core Services

### 2.1 API Gateway Service

**Purpose:** Single entry point for all client requests, handles routing, authentication, and rate limiting.

**Technology:** Next.js 16 API Routes

**Responsibilities:**

- • Request routing to appropriate microservices
- • JWT token validation and session management
- • Rate limiting and DDoS protection
- • Request/response logging and monitoring
- • CORS handling

### 2.2 Authentication Service

**Purpose:** Manages user authentication, authorization, and session management.

**Technology:** NextAuth.js with MongoDB adapter

**Responsibilities:**

- • User registration and login (email/password, OAuth)
- • JWT token generation and validation
- • Role-based access control (Super Admin, Event Manager, User, Scanner)
- • Password reset and account recovery
- • Guest checkout support

### 2.3 Event Management Service

**Purpose:** Handles all event-related operations including creation, configuration, and management.

**Technology:** Next.js API Routes + MongoDB

**Responsibilities:**

- • Event CRUD operations
- • Ticket type configuration (VIP, Regular, Early Bird, etc.)
- • Capacity management per ticket type
- • Event status management (draft, published, ongoing, completed, cancelled)
- • M-Pesa credentials configuration per event manager
- • Transfer/resale settings configuration
- • Custom ticket template upload

### 2.4 Ticketing Service

**Purpose:** Manages ticket inventory, reservations, and lifecycle.

**Technology:** Next.js API Routes + MongoDB with transactions

**Responsibilities:**

- • Ticket reservation with time-limited locks (10 minutes)
- • Real-time inventory management
- • Ticket state transitions (pending → paid → active → used/transferred/expired)
- • QR code generation with encrypted payload
- • Ticket PDF generation with custom templates
- • Ticket validation and fraud detection

### 2.5 Payment Service

**Purpose:** Handles all payment processing, M-Pesa integration, and transaction management.

**Technology:** Next.js API Routes + M-Pesa Daraja API

**Responsibilities:**

- • M-Pesa STK Push initiation
- • Payment callback handling and verification
- • Transaction status tracking
- • Failed payment handling and retry logic
- • Commission calculation for platform and resales
- • Payment reconciliation and reporting

### 2.6 Notification Service

**Purpose:** Manages all communication channels including email and WhatsApp.

**Technology:** Next.js API Routes + SendGrid + WAHA (WhatsApp)

**Responsibilities:**

- • Email delivery via SendGrid
- • WhatsApp message delivery via WAHA API
- • Ticket delivery after payment confirmation
- • Event reminders (24 hours before, day-of)
- • Payment failure notifications with retry links
- • Transfer confirmation notifications
- • Template management for customizable messages

### 2.7 Transfer & Marketplace Service

**Purpose:** Facilitates ticket transfers and optional resale marketplace.

**Technology:** Next.js API Routes + MongoDB

**Responsibilities:**

- • Peer-to-peer ticket transfers with OTP verification
- • Marketplace listing creation and management
- • Transfer history and audit trail
- • Original QR invalidation and new QR generation
- • Transfer limit enforcement (max 2-3 per ticket)
- • Commission calculation and payment splitting

### 2.8 Validation & Scanning Service

**Purpose:** Provides web-based QR scanning and ticket validation at event entry.

**Technology:** Next.js (Scanner UI) + API Routes

**Responsibilities:**

- • Real-time QR code scanning via web camera
- • QR decryption and validation
- • Duplicate scan detection and prevention
- • Check-in timestamp recording
- • Offline mode with sync capability
- • Scanner personnel authentication
- • Real-time attendance tracking

### 2.9 Analytics & Reporting Service

**Purpose:** Provides comprehensive analytics, dashboards, and reporting for event managers and super admins.

**Technology:** Next.js API Routes + MongoDB Aggregation

**Responsibilities:**

- • Real-time sales dashboards
- • Revenue reports and commission tracking
- • Attendee demographics and insights
- • Sales trends and forecasting
- • Ticket type performance analysis
- • Export functionality (CSV, PDF, Excel)
- • Custom report generation

# 3. DATABASE ARCHITECTURE

**Database:** MongoDB (NoSQL)

## Collections Schema

### 3.1 users Collection

Stores user accounts including buyers, event managers, and admins.

**Fields:**

- • \_id (ObjectId): Unique user identifier
- • email (String, unique, required): User email
- • password (String, hashed): Encrypted password
- • name (String, required): Full name
- • phone (String): Phone number for M-Pesa
- • role (String, enum): 'super_admin', 'event_manager', 'user', 'scanner'
- • isGuest (Boolean): Guest checkout flag
- • createdAt (Date): Account creation timestamp
- • updatedAt (Date): Last update timestamp

### 3.2 events Collection

Stores event details and configurations.

**Fields:**

- • \_id (ObjectId): Unique event identifier
- • managerId (ObjectId, ref: 'users'): Event manager reference
- • title (String, required): Event name
- • description (String): Event details
- • date (Date, required): Event date/time
- • venue (Object): { name, address, city, coordinates }
- • images (Array): Event poster URLs
- • status (String, enum): 'draft', 'published', 'ongoing', 'completed', 'cancelled'
- • ticketTypes (Array): [{ name, price, capacity, sold, description }]
- • totalCapacity (Number): Maximum attendees
- • allowTransfers (Boolean): Enable ticket transfers
- • allowResale (Boolean): Enable marketplace
- • maxTransfers (Number): Transfer limit per ticket
- • ticketTemplate (String): Custom template URL
- • termsAndConditions (String): Event T&Cs
- • mpesaConfig (Object): Encrypted M-Pesa credentials
- • createdAt (Date): Event creation timestamp
- • updatedAt (Date): Last update timestamp

### 3.3 tickets Collection

Stores individual ticket records with full lifecycle tracking.

**Fields:**

- • \_id (ObjectId): Unique ticket identifier
- • eventId (ObjectId, ref: 'events'): Event reference
- • userId (ObjectId, ref: 'users'): Current owner
- • originalUserId (ObjectId, ref: 'users'): Original purchaser
- • ticketType (String): Ticket tier
- • price (Number): Purchase price
- • status (String, enum): 'pending_payment', 'paid', 'active', 'transferred', 'used', 'expired', 'cancelled'
- • qrCode (String): Encrypted QR payload
- • qrVersion (Number): QR regeneration counter
- • transactionId (ObjectId, ref: 'transactions'): Payment reference
- • transferCount (Number): Number of transfers
- • reservedUntil (Date): Reservation expiry
- • scannedAt (Date): Entry scan timestamp
- • scannedBy (ObjectId, ref: 'users'): Scanner reference
- • createdAt (Date): Ticket creation timestamp
- • updatedAt (Date): Last update timestamp

### 3.4 transactions Collection

Stores all payment transactions and M-Pesa records.

**Fields:**

- • \_id (ObjectId): Unique transaction identifier
- • ticketId (ObjectId, ref: 'tickets'): Ticket reference
- • eventId (ObjectId, ref: 'events'): Event reference
- • userId (ObjectId, ref: 'users'): Payer reference
- • amount (Number): Transaction amount
- • commission (Number): Platform commission
- • status (String, enum): 'pending', 'completed', 'failed', 'refunded'
- • mpesaReceiptNumber (String): M-Pesa confirmation code
- • mpesaPhone (String): M-Pesa phone number
- • checkoutRequestID (String): STK Push request ID
- • merchantRequestID (String): Merchant request ID
- • transactionType (String, enum): 'purchase', 'resale', 'transfer_fee'
- • createdAt (Date): Transaction creation timestamp
- • completedAt (Date): Payment confirmation timestamp

### 3.5 transfers Collection

Stores ticket transfer history and audit trail.

**Fields:**

- • \_id (ObjectId): Unique transfer identifier
- • ticketId (ObjectId, ref: 'tickets'): Ticket reference
- • fromUserId (ObjectId, ref: 'users'): Sender reference
- • toUserId (ObjectId, ref: 'users'): Recipient reference
- • status (String, enum): 'pending', 'completed', 'cancelled'
- • otpSent (String): OTP for verification
- • otpVerified (Boolean): OTP verification status
- • oldQrCode (String): Previous QR code
- • newQrCode (String): New QR code after transfer
- • transferFee (Number): Fee charged for transfer
- • createdAt (Date): Transfer initiation timestamp
- • completedAt (Date): Transfer completion timestamp

### 3.6 marketplace_listings Collection

Stores tickets listed for resale on the marketplace.

**Fields:**

- • \_id (ObjectId): Unique listing identifier
- • ticketId (ObjectId, ref: 'tickets'): Ticket reference
- • eventId (ObjectId, ref: 'events'): Event reference
- • sellerId (ObjectId, ref: 'users'): Seller reference
- • originalPrice (Number): Original ticket price
- • listingPrice (Number): Resale price
- • maxPrice (Number): Price cap (if enforced)
- • status (String, enum): 'active', 'sold', 'cancelled'
- • createdAt (Date): Listing creation timestamp
- • soldAt (Date): Sale completion timestamp

### 3.7 scans Collection

Stores all QR code scan attempts and validation records.

**Fields:**

- • \_id (ObjectId): Unique scan identifier
- • ticketId (ObjectId, ref: 'tickets'): Ticket reference
- • eventId (ObjectId, ref: 'events'): Event reference
- • scannerId (ObjectId, ref: 'users'): Scanner reference
- • scanResult (String, enum): 'valid', 'duplicate', 'invalid', 'expired', 'transferred'
- • location (Object): { latitude, longitude } (optional)
- • deviceInfo (String): Scanner device details
- • timestamp (Date): Scan timestamp
- • syncedAt (Date): Offline sync timestamp

### 3.8 notifications Collection

Stores notification history and delivery status.

**Fields:**

- • \_id (ObjectId): Unique notification identifier
- • userId (ObjectId, ref: 'users'): Recipient reference
- • eventId (ObjectId, ref: 'events'): Event reference (optional)
- • ticketId (ObjectId, ref: 'tickets'): Ticket reference (optional)
- • type (String, enum): 'ticket_delivery', 'payment_failed', 'event_reminder', 'transfer_confirmation'
- • channel (String, enum): 'email', 'whatsapp', 'both'
- • status (String, enum): 'pending', 'sent', 'failed', 'bounced'
- • emailId (String): SendGrid message ID
- • whatsappId (String): WAHA message ID
- • content (Object): { subject, body, attachments }
- • retryCount (Number): Retry attempts
- • createdAt (Date): Notification creation timestamp
- • sentAt (Date): Delivery timestamp

## Database Indexes

Critical indexes for performance optimization:

- • users: email (unique), role
- • events: managerId, status, date
- • tickets: eventId, userId, status, qrCode (unique), reservedUntil
- • transactions: ticketId, eventId, userId, mpesaReceiptNumber
- • transfers: ticketId, fromUserId, toUserId, status
- • marketplace_listings: eventId, ticketId, sellerId, status
- • scans: ticketId, eventId, scannerId, timestamp
- • notifications: userId, eventId, status, createdAt

# 4. SECURITY & FRAUD PREVENTION

## Fraud Prevention Strategies

### 4.1 QR Code Security

**Encryption:** QR codes contain encrypted payload with eventId, ticketId, userId, timestamp, and HMAC signature.

**One-Time Scan:** Tickets are marked as 'used' immediately upon first valid scan. Subsequent scans are rejected.

**Real-Time Sync:** Scanner syncs with database in real-time to prevent duplicate entries across multiple scanners.

**Timestamp Validation:** QR codes include generation timestamp. Expired or future-dated codes are rejected.

**Version Tracking:** Each QR regeneration increments version number. Only latest version is valid.

### 4.2 Transfer & Resale Security

**Two-Factor Verification:** Transfer requires OTP sent to both sender and recipient email/SMS.

**QR Invalidation:** Original QR code is invalidated upon transfer initiation. New QR generated for new owner.

**Transfer Audit Trail:** Complete transfer history stored with timestamps, user IDs, and old/new QR codes.

**Transfer Limits:** Maximum 2-3 transfers per ticket to discourage scalping.

**Transfer Fee:** Optional fee per transfer to discourage fraudulent activity.

### 4.3 Payment Security

**Time-Limited Reservations:** Tickets reserved for 10 minutes. Released automatically if payment not completed.

**Phone Number Matching:** M-Pesa phone number must match user account phone number.

**Duplicate Payment Detection:** System flags suspicious patterns (same user, multiple failed payments).

**Callback Verification:** M-Pesa callbacks verified using HMAC signature before processing.

**Encrypted Credentials:** Event manager M-Pesa credentials encrypted at rest in MongoDB.

### 4.4 Scanner Security

**Role-Based Access:** Scanner personnel must have 'scanner' role assigned by event manager.

**Event-Specific Access:** Scanners can only validate tickets for events they are assigned to.

**Offline Mode Protection:** Offline scans require authentication before sync. Pending scans encrypted locally.

**Duplicate Scan Alerts:** Scanner displays prominent alert if QR code has already been scanned.

**Scanner Logs:** All scan attempts logged with scanner ID, timestamp, device info, and location.

# 5. TECHNOLOGY STACK

## Frontend

- • Framework: Next.js 16 (App Router)
- • Language: TypeScript
- • Styling: Tailwind CSS
- • UI Components: shadcn/ui, Radix UI
- • State Management: React Context + Zustand
- • QR Scanner: html5-qrcode library
- • Forms: React Hook Form + Zod validation

## Backend

- • API: Next.js 16 API Routes
- • Authentication: NextAuth.js (v5)
- • Database: MongoDB with Mongoose ODM
- • Payment: M-Pesa Daraja API (custom wrapper)
- • QR Generation: qrcode library
- • PDF Generation: puppeteer for ticket PDFs
- • Email: SendGrid API
- • WhatsApp: WAHA (WhatsApp HTTP API)
- • File Storage: Cloudinary / Vercel Blob
- • Encryption: crypto-js for sensitive data

## Infrastructure

- • Hosting: Vercel (Frontend + API Routes)
- • Database Hosting: MongoDB Atlas
- • CDN: Vercel Edge Network
- • Caching: Vercel KV (Redis) for sessions and rate limiting
- • Monitoring: Sentry for error tracking
- • Logging: Axiom / Logtail for application logs

## DevOps

- • Version Control: Git + GitHub
- • CI/CD: GitHub Actions + Vercel
- • Environment Management: .env files + Vercel environment variables
- • Testing: Jest + React Testing Library
- • API Testing: Postman / Insomnia collections

# 6. DEPLOYMENT ARCHITECTURE

## Deployment Strategy

The system is deployed as a monorepo on Vercel with separate API routes acting as microservices. Each service is independently scalable through Vercel's serverless functions.

## Environment Configuration

**Development:** Local environment with MongoDB local or Atlas dev cluster

**Staging:** Vercel preview deployments for PR testing

**Production:** Vercel production environment with MongoDB Atlas production cluster

## Scalability Considerations

- • Auto-scaling: Vercel automatically scales serverless functions based on traffic
- • Database Connection Pooling: Mongoose connection pooling for efficient DB access
- • Redis Caching: Vercel KV for session management and rate limiting
- • CDN: Static assets served via Vercel Edge Network
- • Database Indexes: Optimized indexes for high-traffic queries

End of Architecture Documentation
