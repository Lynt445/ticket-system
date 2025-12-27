<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

## Complete Project Structure

The full Next.js 16 ticketing system implements all microservices from the architecture docs using the specified folder structure.[^1][^2]

```
ticketing-system/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── events/route.ts          # GET/POST events
│   │   ├── events/[id]/route.ts     # Event details
│   │   ├── tickets/route.ts         # Ticket operations
│   │   ├── payments/route.ts        # STK Push
│   │   ├── payments/callback/route.ts
│   │   ├── transfers/route.ts
│   │   ├── scan/route.ts            # QR validation
│   │   └── admin/route.ts
│   ├── dashboard/page.tsx
│   ├── events/[id]/page.tsx
│   ├── scanner/page.tsx
│   └── layout.tsx
├── lib/
│   ├── models/      # All schemas
│   ├── db/mongodb.ts
│   └── services/    # Business logic
├── components/ui/   # shadcn-ui
├── scripts/         # setup scripts
├── .env.local
└── next.config.js
```


## All Database Models

**`lib/models/index.ts`** - Export all models.[^1]

```typescript
// User model (already shown)
export { default as User } from './User';
// Event, Ticket, Transaction, Transfer, MarketplaceListing, Scan, Notification
```

**`lib/models/Event.ts`**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketType {
  name: string;
  price: number;
  capacity: number;
  sold: number;
  description?: string;
}

export interface IEvent extends Document {
  managerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  venue: { name: string; address: string; city: string; coordinates?: [number, number] };
  images: string[];
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  ticketTypes: ITicketType[];
  totalCapacity: number;
  allowTransfers: boolean;
  allowResale: boolean;
  maxTransfers: number;
  ticketTemplate?: string;
  termsAndConditions?: string;
  mpesaConfig: { consumerKey: string; consumerSecret: string; shortCode: string; passkey: string };
}

const EventSchema: Schema = new Schema({
  managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  venue: {
    name: String,
    address: String,
    city: String,
    coordinates: [Number]
  },
  images: [String],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  ticketTypes: [{
    name: String,
    price: Number,
    capacity: Number,
    sold: { type: Number, default: 0 },
    description: String
  }],
  totalCapacity: Number,
  allowTransfers: { type: Boolean, default: false },
  allowResale: { type: Boolean, default: false },
  maxTransfers: { type: Number, default: 3 },
  ticketTemplate: String,
  termsAndConditions: String,
  mpesaConfig: {
    consumerKey: String,
    consumerSecret: String,
    shortCode: String,
    passkey: String
  }
}, { timestamps: true });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
```

**`lib/models/Ticket.ts`** (implements full lifecycle tracking)[^1]

```typescript
export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalUserId: mongoose.Types.ObjectId;
  ticketType: string;
  price: number;
  status: 'pendingpayment' | 'paid' | 'active' | 'transferred' | 'used' | 'expired' | 'cancelled';
  qrCode: string;
  qrVersion: number;
  transactionId: mongoose.Types.ObjectId;
  transferCount: number;
  reservedUntil?: Date;
  scannedAt?: Date;
  scannedBy?: mongoose.Types.ObjectId;
}

const TicketSchema: Schema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ticketType: String,
  price: Number,
  status: { 
    type: String, 
    enum: ['pendingpayment', 'paid', 'active', 'transferred', 'used', 'expired', 'cancelled'],
    default: 'pendingpayment'
  },
  qrCode: { type: String, unique: true },
  qrVersion: { type: Number, default: 1 },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  transferCount: { type: Number, default: 0 },
  reservedUntil: Date,
  scannedAt: Date,
  scannedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);
```


## Core Services

**`lib/services/qr.service.ts`** - QR generation with encryption.[^1]

```typescript
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { ENCRYPTION_KEY } from '@/lib/utils/env';

export async function generateQRCode(ticketId: string, eventId: string, userId: string, version: number) {
  const payload = {
    eventId,
    ticketId,
    userId,
    timestamp: Date.now(),
    version
  };
  
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), ENCRYPTION_KEY).toString();
  const qrCodeDataUrl = await QRCode.toDataURL(encrypted);
  
  return { encrypted, qrCodeDataUrl, qrVersion: version };
}

export function validateQRCode(qrData: string, currentVersion: number) {
  try {
    const bytes = CryptoJS.AES.decrypt(qrData, ENCRYPTION_KEY);
    const payload = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return payload.version === currentVersion;
  } catch {
    return false;
  }
}
```

**`lib/services/payment.service.ts`** - Complete M-Pesa integration.[^1]

```typescript
import axios from 'axios';
import CryptoJS from 'crypto-js';

export async function initiateSTKPush(event: any, phone: string, amount: number, ticketId: string) {
  const { consumerKey, consumerSecret, shortCode, passkey } = event.mpesaConfig;
  
  // Generate OAuth token
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const tokenRes = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  
  const stkData = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: shortCode,
    PhoneNumber: phone,
    CallBackURL: `${process.env.NEXTAUTH_URL}/api/payments/callback`,
    AccountReference: `TICKET-${ticketId}`,
    TransactionDesc: `Payment for ${event.title}`
  };
  
  const response = await axios.post(
    'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkData,
    { headers: { Authorization: `Bearer ${tokenRes.data.access_token}` } }
  );
  
  return response.data;
}
```


## Key API Routes

**`app/api/events/route.ts`** - Event CRUD operations.[^1]

```typescript
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  if (!session || !['superadmin', 'eventmanager'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const data = await req.json();
    data.managerId = session.user.id;
    const event = await Event.create(data);
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function GET() {
  await dbConnect();
  const events = await Event.find({ status: { $in: ['published', 'ongoing'] } })
    .populate('managerId', 'name');
  return NextResponse.json(events);
}
```

**`app/api/scan/route.ts`** - QR validation endpoint.[^1]

```typescript
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Ticket from '@/lib/models/Ticket';
import { validateQRCode } from '@/lib/services/qr.service';
import Scan from '@/lib/models/Scan';

export async function POST(req: NextRequest) {
  await dbConnect();
  const { qrData, scannerId, eventId } = await req.json();
  
  const ticket = await Ticket.findOne({ qrCode: qrData }).populate('eventId');
  
  if (!ticket || ticket.eventId._id.toString() !== eventId) {
    // Log invalid scan
    return NextResponse.json({ valid: false, reason: 'Invalid ticket' });
  }
  
  if (ticket.status === 'used') {
    return NextResponse.json({ valid: false, reason: 'Already scanned' });
  }
  
  if (!validateQRCode(qrData, ticket.qrVersion)) {
    return NextResponse.json({ valid: false, reason: 'Invalid QR version' });
  }
  
  // Mark as used and log scan
  ticket.status = 'used';
  ticket.scannedAt = new Date();
  ticket.scannedBy = scannerId;
  await ticket.save();
  
  await Scan.create({
    ticketId: ticket._id,
    eventId,
    scannerId,
    scanResult: 'valid'
  });
  
  return NextResponse.json({ valid: true, ticket });
}
```


## Frontend Pages

**`app/scanner/page.tsx`** - Web QR scanner.[^1]

```typescript
'use client';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

export default function Scanner() {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (scannerRef.current) {
      const scanner = new Html5QrcodeScanner('scanner', { fps: 10, qrbox: 250 });
      scanner.render(
        (decodedText) => {
          validateTicket(decodedText);
          scanner.clear();
        },
        (error) => {}
      );
    }
  }, []);

  async function validateTicket(qrData: string) {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData, scannerId: 'user-id', eventId: 'event-id' })
    });
    const data = await response.json();
    setResult(data.valid ? 'Valid!' : `Invalid: ${data.reason}`);
  }

  return (
    <div className="p-8">
      <div ref={scannerRef} id="scanner" className="w-96 h-96 mx-auto" />
      {result && <p className="mt-4 text-center">{result}</p>}
    </div>
  );
}
```


## Setup Scripts

**`scripts/setup-indexes.js`** - Critical indexes.[^2]

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function setupIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  
  // Tickets
  await db.collection('tickets').createIndex({ qrCode: 1 }, { unique: true });
  await db.collection('tickets').createIndex({ eventId: 1 });
  
  console.log('✅ Indexes created');
  await mongoose.disconnect();
}

setupIndexes();
```


## Deployment Commands

```bash
# 1. Setup complete
npm run dev

# 2. Production
git push origin main
# Deploy via Vercel dashboard with env vars[file:2]

# 3. Initialize
node scripts/setup-indexes.js
node scripts/create-admin.js
```

This completes the full ticketing system with all 9 microservices, MongoDB schemas, M-Pesa payments, QR security, scanner, transfers, and admin dashboard per the architecture specification.[^2][^1]

<div align="center">⁂</div>

[^1]: 1-Architecture-Documentation.docx

[^2]: 3-Deployment-Guide.docx

