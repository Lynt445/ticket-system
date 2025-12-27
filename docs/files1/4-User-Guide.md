USER GUIDE

Event Ticketing System

Complete Guide for All Users

Version 1.0

# 1. GETTING STARTED

## System Overview

The Event Ticketing System is a comprehensive platform for creating, managing, and selling event tickets with integrated M-Pesa payments, QR code generation, and real-time ticket validation.

## User Roles

The system supports four user roles, each with different permissions and capabilities:

**1. Regular User**  
Can browse events, purchase tickets, view purchase history, and transfer tickets.

**2. Event Manager**  
Can create and manage events, configure ticket types, view analytics, and manage M-Pesa credentials.

**3. Scanner**  
Can validate tickets at event entry using QR code scanner interface.

**4. Super Admin**  
Has full access to all features, can manage users, view platform-wide analytics, and oversee all events.

## Creating an Account

1. Visit the website homepage

2. Click 'Sign Up' or 'Register'

3. Fill in required information:

- - • Full Name
    - • Email Address
    - • Phone Number (for M-Pesa payments)
    - • Secure Password

4. Click 'Create Account'

5. Verify your email address (check inbox for verification link)

## Logging In

1. Click 'Sign In' or 'Login'

2. Enter your email and password

3. Click 'Login'

4. If you forgot your password, click 'Forgot Password' and follow instructions

# 2. BUYING TICKETS (REGULAR USER)

## Browsing Events

1. Navigate to the Events page from the main menu

2. Use filters to find events:

- - • Search by event name or keyword
    - • Filter by date range
    - • Filter by location
    - • Sort by date, popularity, or price

3. Click on an event to view full details

## Purchasing Tickets

Step 1: Select Tickets

- - • Choose ticket type (VIP, Regular, Early Bird, etc.)
    - • Select quantity
    - • Review total price
    - • Click 'Reserve Tickets'

NOTE: Tickets are reserved for 10 minutes. Complete payment within this time or they will be released.

Step 2: Make Payment

- - • Confirm your phone number (must match M-Pesa account)
    - • Click 'Pay with M-Pesa'
    - • You will receive an STK Push prompt on your phone
    - • Enter your M-Pesa PIN to complete payment
    - • Wait for payment confirmation (usually within seconds)

Step 3: Receive Tickets

- - • Tickets are automatically sent to your email and WhatsApp
    - • Each ticket includes a unique QR code
    - • Download PDF tickets from your account dashboard
    - • Save tickets to your phone for easy access at event

## Guest Checkout

If you don't want to create an account, you can checkout as a guest:

1. Select tickets as normal

2. Click 'Continue as Guest'

3. Provide name, email, and phone number

4. Complete payment

5. Tickets will be sent to provided email/WhatsApp

NOTE: Guest purchases cannot be viewed in account dashboard. Save your tickets immediately.

## Viewing Your Tickets

1. Log in to your account

2. Navigate to 'My Tickets' or 'Dashboard'

3. View all purchased tickets with status:

- - • Active: Ready for use
    - • Used: Already scanned at event
    - • Transferred: Sent to another user

4. Click on ticket to view details or download PDF

## Payment Issues

If payment fails:

- • Check if you entered correct phone number
- • Ensure you have sufficient M-Pesa balance
- • Make sure M-Pesa PIN was entered correctly
- • If STK Push didn't arrive, check phone is on and has network
- • You can retry payment from your dashboard
- • Contact event manager if issues persist

# 3. TRANSFERRING & RESELLING TICKETS

## Transferring Tickets to Another Person

NOTE: Not all events allow transfers. Check event details first.

1. Log in to your account

2. Go to 'My Tickets'

3. Select ticket you want to transfer

4. Click 'Transfer Ticket'

5. Enter recipient's email address

6. Both you and recipient will receive OTP codes

7. Enter your OTP to confirm transfer

8. Recipient must verify with their OTP

9. Once verified:

- - • Your original QR code becomes invalid
    - • New QR code generated for recipient
    - • Recipient receives ticket via email/WhatsApp
    - • Transfer recorded in history

IMPORTANT: Most events limit transfers to 2-3 times per ticket. A transfer fee may apply.

## Listing Tickets for Resale

If the event allows resale marketplace:

1. Go to 'My Tickets'

2. Select ticket to sell

3. Click 'List for Resale'

4. Set your selling price (may have maximum cap)

5. Review commission details

6. Confirm listing

7. Your ticket appears in marketplace

8. When someone buys:

- - • You receive payment (minus commission)
    - • Ticket automatically transfers to buyer
    - • Both parties notified

## Buying Resale Tickets

1. Visit event page

2. If resale enabled, you'll see 'Marketplace' tab

3. Browse available resale tickets

4. Select ticket and purchase as normal

5. Complete M-Pesa payment

6. Ticket automatically transfers to you

# 4. EVENT MANAGER GUIDE

## Becoming an Event Manager

1. Create a regular user account

2. Contact the Super Admin to request event manager role

3. Once approved, you'll see 'Create Event' option in your dashboard

## Configuring M-Pesa Credentials

Before creating events, set up your M-Pesa account:

1. Go to 'Settings' > 'Payment Configuration'

2. Enter your M-Pesa credentials:

- - • Paybill/Till Number
    - • Consumer Key (from Safaricom Daraja)
    - • Consumer Secret
    - • Passkey

3. Click 'Test Connection' to verify credentials

4. Save configuration

NOTE: All payments go directly to your M-Pesa account. Platform commission is calculated separately.

## Creating an Event

Step 1: Basic Information

1. Click 'Create Event' in dashboard

2. Fill in event details:

- - • Event Title
    - • Description (markdown supported)
    - • Date and Time
    - • Venue Name and Address
    - • Upload event poster/images
    - • Terms and Conditions

Step 2: Configure Ticket Types

For each ticket type, specify:

- - • Name (e.g., VIP, Regular, Early Bird)
    - • Price in KES
    - • Capacity (maximum tickets available)
    - • Description of benefits

Click 'Add Ticket Type' to create multiple tiers

Step 3: Configure Transfer & Resale

- - • Enable/Disable Ticket Transfers
    - • Set Maximum Transfer Count (recommended: 2-3)
    - • Enable/Disable Resale Marketplace
    - • Set Resale Price Cap (optional)

Step 4: Design Ticket Template

- - • Upload custom ticket template (optional)
    - • Or use default template with your branding
    - • Preview how tickets will look

Step 5: Review & Publish

- - • Save as Draft to edit later
    - • Or Publish immediately to start selling
    - • Share event link on social media

## Managing Your Events

View All Events

- - • Dashboard shows all your events
    - • Filter by status: Draft, Published, Ongoing, Completed
    - • Quick stats: Tickets sold, Revenue, Attendance

Edit Event

- - • Click on event to view details
    - • Click 'Edit' to modify information
    - • Can edit most fields before event starts
    - • Cannot change ticket prices after first sale

Cancel Event

- - • Click 'Cancel Event' in event settings
    - • Confirm cancellation
    - • All ticket holders automatically notified
    - • Handle refunds manually via M-Pesa

## Viewing Analytics

Real-Time Dashboard

- - • Total Tickets Sold
    - • Revenue Generated
    - • Tickets by Type Breakdown
    - • Sales Trend Graph
    - • Peak Sales Times

Attendee Insights

- - • Demographics
    - • Purchase Patterns
    - • Check-in Status

Export Reports

- - • Download attendee list (CSV, Excel, PDF)
    - • Revenue report
    - • Scan history

## Managing Scanner Personnel

1. Go to Event Settings > Scanners

2. Click 'Add Scanner'

3. Enter scanner's email (must be registered user)

4. Assign to specific entry points if needed

5. Scanner receives email with access instructions

6. Can revoke access anytime

# 5. SCANNER GUIDE

## Accessing Scanner Interface

1. Receive scanner access email from event manager

2. Click link in email or go to /scanner in website

3. Log in with your credentials

4. Select event you're scanning for

5. Scanner interface opens

## Scanning Tickets

1. Allow camera access when prompted

2. Position QR code in camera frame

3. Scanner automatically reads code

4. Screen shows result:

- - • GREEN: Valid ticket - Allow entry - - Shows attendee name and ticket type - - Ticket automatically marked as used
    - • RED: Invalid ticket - Deny entry
      - - Shows reason: Already used, Transferred, Expired, Fake

5. System logs scan with timestamp and your ID

## Handling Special Cases

Duplicate Scan Alert

- - • If ticket already scanned, screen shows: - - When it was first scanned - - Which scanner scanned it
    - • Alert security for potential fraud

QR Code Won't Scan

- - • Check phone screen brightness
    - • Ensure QR code isn't damaged
    - • Try manual ticket ID entry option

Internet Connection Lost

- - • Scanner continues working in offline mode
    - • Scans stored locally and synced when online
    - • Note: Cannot verify duplicate scans from other scanners while offline

## Scanner Dashboard

View real-time stats:

- • Total Scanned
- • Valid vs Invalid
- • Your Recent Scans
- • Entry Rate (scans per minute)

# 6. SUPER ADMIN GUIDE

## User Management

View All Users

- - • Navigate to Admin Panel > Users
    - • View all registered users
    - • Filter by role, registration date
    - • Search by name, email

Manage User Roles

- - • Click on user to view details
    - • Change role: User, Event Manager, Scanner, Super Admin
    - • Suspend or ban users if needed
    - • View user's event and purchase history

## Event Oversight

- • View all events across all event managers
- • Edit any event if needed
- • Cancel events if policy violations
- • Access all event analytics

## Platform Analytics

Dashboard shows:

- • Total Events Created
- • Total Tickets Sold (platform-wide)
- • Total Revenue
- • Platform Commission Earned
- • Active Event Managers
- • User Growth Trends
- • Popular Event Categories

## System Configuration

- • Configure platform commission rates
- • Set transfer fee amounts
- • Configure email templates
- • Manage system announcements
- • View system logs and errors

# 7. TROUBLESHOOTING & FAQ

## Common Issues

**Q: I didn't receive my tickets after payment**

A: Check spam/junk folder. Tickets sent to email and WhatsApp. If not received within 5 minutes, check 'My Tickets' in dashboard and download manually. Contact event manager if issues persist.

**Q: Payment was deducted but I didn't get tickets**

A: Payment confirmation can take up to 5 minutes. Check your dashboard. If not reflected, contact event manager with M-Pesa reference number.

**Q: My QR code won't scan at event**

A: Increase screen brightness. Show PDF version if using screenshot. Ensure ticket hasn't been transferred. Contact scanner personnel for manual verification using ticket ID.

**Q: Can I cancel my ticket purchase?**

A: Refund policy depends on event manager's terms. Check event Terms & Conditions. Contact event manager directly for refund requests.

**Q: Transfer failed with error**

A: Ensure event allows transfers. Check you haven't exceeded transfer limit. Verify recipient email is correct. Both parties must verify OTP codes.

**Q: M-Pesa payments not working for my event**

A: (Event Manager) Verify M-Pesa credentials in settings. Test credentials using 'Test Connection' button. Ensure Paybill/Till number is active. Contact Safaricom support if issues persist.

## Getting Help

For ticket buyers:

- - • Contact event manager through event page
    - • Use in-app support chat

For event managers:

- - • Access Help Center in dashboard
    - • Contact Super Admin
    - • Email: support@yourdomain.com

End of User Guide

Thank you for using our Event Ticketing System!
