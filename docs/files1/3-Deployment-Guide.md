DEPLOYMENT GUIDE

Event Ticketing System

Setup, Configuration & Deployment

Version 1.0

# 1. PREREQUISITES

## Development Environment

- • Node.js (v18 or higher)
- • npm or yarn package manager
- • Git for version control
- • Code editor (VS Code recommended)

## Required Accounts & Services

- • MongoDB Atlas account (free tier available)
- • Vercel account for deployment
- • SendGrid account for email
- • Cloudinary account for image storage
- • M-Pesa Daraja API credentials (Safaricom developer portal)
- • WAHA instance or WhatsApp Business API access

# 2. PROJECT SETUP

## Step 1: Initialize Next.js Project

```bash
npx create-next-app@latest ticketing-system
cd ticketing-system
```

Select the following options when prompted:

- • TypeScript: Yes
- • ESLint: Yes
- • Tailwind CSS: Yes
- • App Router: Yes
- • Import alias: @/\*

## Step 2: Install Core Dependencies

```bash
npm install mongoose next-auth @auth/mongodb-adapter bcryptjs
npm install @sendgrid/mail axios qrcode puppeteer
npm install crypto-js jsonwebtoken zod react-hook-form
npm install @hookform/resolvers zustand
npm install html5-qrcode
```

## Step 3: Install UI Components

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card table dialog

```

## Step 4: Install Dev Dependencies

```bash
npm install -D @types/bcryptjs @types/jsonwebtoken
npm install -D @types/qrcode @types/crypto-js
```

# 3. PROJECT STRUCTURE

## Recommended Folder Structure

```text

ticketing-system/
├── app/
│ ├── api/ # API Routes (Microservices)
│ │ ├── auth/
│ │ │ ├── register/route.ts
│ │ │ ├── login/route.ts
│ │ │ └── guest/route.ts
│ │ ├── events/
│ │ │ ├── route.ts
│ │ │ └── [id]/route.ts
│ │ ├── tickets/
│ │ ├── payments/
│ │ ├── transfers/
│ │ ├── marketplace/
│ │ ├── scan/
│ │ ├── analytics/
│ │ └── admin/
│ ├── (auth)/ # Auth Pages
│ │ ├── login/page.tsx
│ │ └── register/page.tsx
│ ├── (dashboard)/ # Dashboard Pages
│ │ ├── events/
│ │ ├── tickets/
│ │ └── analytics/
│ ├── (public)/ # Public Pages
│ │ ├── events/[id]/page.tsx
│ │ └── checkout/page.tsx
│ ├── scanner/ # Scanner Interface
│ │ └── page.tsx
│ └── admin/ # Admin Dashboard
├── lib/ # Utilities & Services
│ ├── db/
│ │ ├── mongodb.ts
│ │ └── models/
│ ├── services/
│ │ ├── payment.service.ts
│ │ ├── notification.service.ts
│ │ ├── qr.service.ts
│ │ └── ticket.service.ts
│ ├── utils/
│ │ ├── encryption.ts
│ │ └── validators.ts
│ └── auth.ts # NextAuth config
├── components/ # React Components
│ ├── ui/ # shadcn components
│ ├── events/
│ ├── tickets/
│ └── scanner/
├── public/ # Static Assets
├── .env.local # Environment Variables
├── next.config.js
├── package.json
└── tsconfig.json

```

# 4. ENVIRONMENT CONFIGURATION

## Create .env.local File

Create a .env.local file in the root directory with the following variables:

# Database

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ticketing

# NextAuth

NEXTAUTH_URL=http://localhost:3000  
NEXTAUTH_SECRET=your-super-secret-key-change-in-production

# JWT

JWT_SECRET=your-jwt-secret-key

# SendGrid

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx  
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Cloudinary

CLOUDINARY_CLOUD_NAME=your-cloud-name  
CLOUDINARY_API_KEY=your-api-key  
CLOUDINARY_API_SECRET=your-api-secret

# WhatsApp (WAHA)

WAHA_API_URL=http://localhost:3001  
WAHA_API_KEY=your-waha-api-key

# Encryption

ENCRYPTION_KEY=32-character-encryption-key-here

# Base URL

NEXT_PUBLIC_BASE_URL=http://localhost:3000

## IMPORTANT: Security Notes

- • NEVER commit .env.local to version control
- • Generate strong random keys for NEXTAUTH_SECRET and JWT_SECRET
- • Use different secrets for development, staging, and production
- • M-Pesa credentials are stored per event manager (encrypted in database)

# 5. DATABASE SETUP

## MongoDB Atlas Setup

1. Create MongoDB Atlas Account

- - • Visit https://www.mongodb.com/cloud/atlas
    - • Sign up for free tier (sufficient for development)

2. Create a Cluster

- - • Choose cloud provider (AWS, Google Cloud, or Azure)
    - • Select nearest region (e.g., Frankfurt for Kenya)
    - • Choose M0 (Free) tier for development

3. Configure Database Access

- - • Create database user with username and password
    - • Add IP whitelist (0.0.0.0/0 for development, specific IPs for production)

4. Get Connection String

- - • Click 'Connect' > 'Connect your application'
    - • Copy connection string and add to .env.local as MONGODB_URI
    - • Replace <password> with your database password

## Create Database Indexes

Create a script (scripts/setup-indexes.js) to set up required indexes:

```javascript
const mongoose = require("mongoose");

async function setupIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;

  // Users indexes
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ role: 1 });

  // Events indexes
  await db.collection("events").createIndex({ managerId: 1 });
  await db.collection("events").createIndex({ status: 1 });
  await db.collection("events").createIndex({ date: 1 });

  // Tickets indexes
  await db.collection("tickets").createIndex({ eventId: 1 });
  await db.collection("tickets").createIndex({ userId: 1 });
  await db.collection("tickets").createIndex({ qrCode: 1 }, { unique: true });

  console.log("Indexes created successfully");
  await mongoose.disconnect();
}

setupIndexes();
```

**Run:** node scripts/setup-indexes.js

# 6. EXTERNAL SERVICES CONFIGURATION

## SendGrid Email Setup

1. Create SendGrid account at https://sendgrid.com

2. Verify your sender email or domain

3. Create API key with 'Mail Send' permissions

4. Add API key to .env.local as SENDGRID_API_KEY

## M-Pesa Daraja API Setup

1. Register at https://developer.safaricom.co.ke

2. Create a new app in sandbox environment

3. Get Consumer Key and Consumer Secret

4. For production, apply for Paybill/Till number

5. Event managers will provide their own M-Pesa credentials via admin panel

## WAHA (WhatsApp) Setup

1. Install WAHA using Docker:

docker run -it -p 3001:3001 devlikeapro/waha

2. Access WAHA at http://localhost:3001

3. Connect WhatsApp by scanning QR code

4. Configure WAHA_API_URL in .env.local

## Cloudinary Setup

1. Create account at https://cloudinary.com

2. Get Cloud Name, API Key, and API Secret from dashboard

3. Add credentials to .env.local

# 7. DEVELOPMENT WORKFLOW

## Start Development Server

npm run dev

Application will be available at http://localhost:3000

## Create Initial Super Admin

Create a script (scripts/create-admin.js) to create the first super admin:

```javascript
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = mongoose.model("User", {
    name: String,
    email: String,
    password: String,
    role: String,
  });

  const hashedPassword = await bcrypt.hash("Admin123!", 12);

  await User.create({
    name: "Super Admin",
    email: "admin@yourdomain.com",
    password: hashedPassword,
    role: "super_admin",
  });

  console.log("Admin created successfully");
  await mongoose.disconnect();
}
```

# 8. PRODUCTION DEPLOYMENT

## Deploy to Vercel

1. Push Code to GitHub

```text
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ticketing-system.git
git push -u origin main

```

2. Deploy on Vercel

- - • Visit https://vercel.com and sign in
    - • Click 'Import Project'
    - • Select your GitHub repository
    - • Configure project settings (Framework: Next.js)
    - • Add environment variables from .env.local
    - • Click 'Deploy'

## Configure Production Environment

1. Update NEXTAUTH_URL to production URL

2. Use production MongoDB cluster

3. Generate new, strong secrets for production

4. Configure production M-Pesa credentials

5. Set up custom domain in Vercel

## Post-Deployment Checklist

- • Test user registration and login
- • Test event creation by event manager
- • Test M-Pesa payment flow (sandbox first)
- • Test ticket generation and QR codes
- • Test scanner functionality
- • Test email and WhatsApp notifications
- • Configure SSL certificate (automatic with Vercel)
- • Set up monitoring and error tracking

# 9. MONITORING & MAINTENANCE

## Set Up Monitoring

- • Vercel Analytics for performance monitoring
- • Sentry for error tracking (npm install @sentry/nextjs)
- • MongoDB Atlas monitoring for database performance
- • Set up alerts for API failures and high error rates

## Backup Strategy

- • Enable automated backups in MongoDB Atlas
- • Schedule daily database backups
- • Keep backups for minimum 30 days
- • Test restore process quarterly

## Scaling Considerations

- • Vercel automatically scales serverless functions
- • Monitor MongoDB performance and scale cluster as needed
- • Implement Redis caching for frequently accessed data
- • Consider CDN for static assets and ticket PDFs
- • Monitor API rate limits and implement queuing for high-traffic events

End of Deployment Guide
