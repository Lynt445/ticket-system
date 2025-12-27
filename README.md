# Event Ticketing System

A comprehensive event ticketing platform built with Next.js 16, featuring M-Pesa integration, QR code validation, analytics, and multi-role user management.

## Features

- **Event Management**: Create and manage events with multiple ticket types
- **M-Pesa Integration**: Secure payment processing with STK Push
- **QR Code System**: Encrypted QR codes with version control for security
- **Role-Based Access**: Super Admin, Event Manager, Scanner, and User roles
- **Analytics Dashboard**: Comprehensive event and ticket analytics
- **Ticket Transfers**: Secure ticket transfer system with OTP verification
- **Marketplace**: Resale tickets functionality
- **Real-time Notifications**: Email and WhatsApp notifications

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js with JWT
- **Payments**: M-Pesa Daraja API
- **Email**: SendGrid
- **Storage**: Cloudinary (images)
- **QR Codes**: Encrypted with CryptoJS

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- M-Pesa Daraja API credentials
- SendGrid account
- Cloudinary account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticket-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables in `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://...
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   JWT_SECRET=your-jwt-secret
   SENDGRID_API_KEY=SG.xxx
   MPESA_ENCRYPTION_KEY=32-char-key
   QR_ENCRYPTION_KEY=32-char-key
   ENCRYPTION_KEY=32-char-key
   ```

4. **Database Setup**
   ```bash
   # Create database indexes
   npm run setup:indexes

   # Create super admin user
   npm run create:admin
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
ticket-system/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/      # Dashboard pages
│   ├── (public)/         # Public pages
│   └── admin/            # Admin pages
├── lib/                   # Core utilities
│   ├── db/               # Database models & connection
│   ├── services/         # Business logic services
│   └── auth.ts           # Authentication config
├── components/           # React components
├── scripts/             # Setup scripts
└── docs/                # Documentation
```

## API Documentation

Complete API documentation is available in `docs/files1/2-API-Documentation.md`.

### Key Endpoints

- **Authentication**: `/api/auth/login`, `/api/auth/register`, `/api/auth/guest`
- **Events**: `/api/events` (CRUD operations)
- **Tickets**: `/api/tickets/reserve`, `/api/tickets/my-tickets`
- **Payments**: `/api/payments/initiate`, `/api/payments/callback`
- **Analytics**: `/api/analytics/[eventId]`

## User Roles

1. **Super Admin**: Platform administration, user management
2. **Event Manager**: Create and manage events, view analytics
3. **Scanner**: Validate tickets at event entry
4. **User**: Purchase tickets, manage profile

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Production Checklist

- [ ] Set up production MongoDB cluster
- [ ] Configure production M-Pesa credentials
- [ ] Set up SendGrid for production email
- [ ] Configure Cloudinary for image storage
- [ ] Set up custom domain
- [ ] Enable SSL certificate
- [ ] Configure monitoring and error tracking

See `docs/files1/3-Deployment-Guide.md` for detailed deployment instructions.

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run setup:indexes # Set up database indexes
npm run create:admin  # Create super admin user
```

### Testing M-Pesa Integration

Use M-Pesa sandbox environment for testing:
- Test phone numbers: 254708374149, 254708374148, etc.
- Test amount: Any amount between 1-70000 KES

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the documentation in the `docs/` folder
- Create an issue in the repository
- Review the API documentation for integration details
