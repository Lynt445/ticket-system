<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Project Setup Commands

Follow these exact steps from the deployment guide to initialize the Next.js project with all required dependencies.[^1_1]

```bash
# Initialize project
npx create-next-app@latest ticketing-system
cd ticketing-system

# Select: TypeScript Yes, ESLint Yes, Tailwind CSS Yes, App Router Yes, Import alias Yes

# Core dependencies
npm install mongoose @next-auth/mongodb-adapter@next bcryptjs
npm install @sendgrid/mail axios qrcode puppeteer
npm install crypto-js jsonwebtoken zod react-hook-form @hookform/resolvers zustand
npm install html5-qrcode

# UI components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card table dialog

# Dev dependencies
npm install -D @types/bcryptjs @types/jsonwebtoken @types/qrcode @types/crypto-js
```


## Environment Configuration

Create `.env.local` with these variables based on the documented requirements.[^1_1]

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ticketing
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-key
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=your-waha-api-key
ENCRYPTION_KEY=32-character-encryption-key-here
NEXTPUBLIC_BASE_URL=http://localhost:3000
```


## Database Models

Implement Mongoose schemas matching the architecture documentation for all collections.[^1_2]

**`lib/models/User.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'superadmin' | 'eventmanager' | 'user' | 'scanner';
  isGuest?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['superadmin', 'eventmanager', 'user', 'scanner'], required: true },
  isGuest: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
```

**`lib/models/Event.ts`** (similar structure for Events, Tickets, Transactions, etc.)

```typescript
// Follow exact fields from architecture doc section 3.2-3.8[file:1]
export interface IEvent extends Document {
  managerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  venue: { name: string; address: string; city: string; coordinates?: [number, number] };
  images: string[];
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  ticketTypes: Array<{ name: string; price: number; capacity: number; sold: number; description?: string }>;
  // ... remaining fields
}
```


## Core Services Implementation

**`lib/db/mongodb.ts`** - Database connection with pooling.[^1_1]

```typescript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
```

**`lib/services/payment.service.ts`** - M-Pesa STK Push integration.[^1_2]

```typescript
import axios from 'axios';
import CryptoJS from 'crypto-js';

export async function initiateSTKPush(phone: string, amount: number, eventId: string, ticketId: string) {
  // Generate OAuth token from M-Pesa credentials (decrypted from event.mpesaConfig)
  // Implement Daraja API STK Push per architecture[file:1]
  const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: 'your_shortcode',
    Password: 'your_encrypted_password',
    Timestamp: new Date().toISOString(),
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: 'your_shortcode',
    PhoneNumber: phone,
    CallBackURL: `${process.env.NEXTAUTH_URL}/api/payments/callback`,
    AccountReference: `TICKET-${ticketId}`,
    TransactionDesc: `Payment for Event ${eventId}`
  });
  return response.data;
}
```


## API Routes Structure

**`app/api/auth/[...nextauth]/route.ts`** - NextAuth configuration.[^1_2][^1_1]

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// Import MongoDB adapter and User model

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Validate user credentials against User model
        return user;
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.role = user.role;
      return token;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```


## Key Files to Create

- **Models**: User, Event, Ticket, Transaction, Transfer, MarketplaceListing, Scan, Notification[^1_2]
- **Services**: payment.service.ts, qr.service.ts, notification.service.ts, ticket.service.ts[^1_2]
- **API Routes**: `/api/events/route.ts`, `/api/tickets/route.ts`, `/api/payments/route.ts`, `/api/scan/route.ts`[^1_2]
- **Scripts**: `scripts/setup-indexes.js`, `scripts/create-admin.js`[^1_1]


## Next Steps

1. Run `npm run dev` after setup[^1_1]
2. Execute database index script and create super admin[^1_1]
3. Implement remaining API routes following microservices pattern (Event Management, Ticketing, Payment, etc.)[^1_2]
4. Build frontend pages: dashboard, events/[id], scanner, checkout[^1_1]

This provides the complete foundation matching the documentation architecture and deployment guide.[^1_2][^1_1]

<div align="center">⁂</div>

[^1_1]: 3-Deployment-Guide.docx

[^1_2]: 1-Architecture-Documentation.docx

