# KaziFlow

**Run Your Kenyan Business Smarter** — Invoices, Clients & Payments in One Place.

KaziFlow is an affordable, mobile-first SaaS business management platform for freelancers, solopreneurs, and small businesses in Kenya and Africa.

## Features

- **Smart Invoicing** — Create, send, track invoices with PDF export and partial payments
- **Client CRM** — Manage contacts, notes, and communication logs
- **M-Pesa Payments** — STK Push integration via Safaricom Daraja API
- **Stripe Subscriptions** — Pro (KSh 999/mo) and Business (KSh 2,499/mo) tiers
- **Expense Tracking** — Categorize spending with tax-deductible flags
- **Task Management** — Simple project/task tracking
- **AI Assistant** — Generate invoice descriptions, emails, social posts
- **Tax Reports** — Basic VAT and expense summaries
- **Freemium Model** — Free tier with 5 invoices/month, 10 clients

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Drizzle ORM, PostgreSQL
- **Auth:** NextAuth.js v5 (Email + Google OAuth)
- **Payments:** Stripe + M-Pesa Daraja API
- **AI:** OpenAI API (configurable)
- **Email:** Resend
- **Deployment:** Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, or local)
- npm or pnpm

### 1. Clone & Install

```bash
cd SAAS
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

**Required for basic dev:**
```env
DATABASE_URL=postgresql://REPLACE_WITH_DB_USER:REPLACE_WITH_DB_PASSWORD@REPLACE_WITH_DB_HOST:5432/kaziflow
AUTH_SECRET=your-secret-here  # openssl rand -base64 32
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Optional (enable features as needed):**
```env
AUTH_GOOGLE_ID=          # Google OAuth
AUTH_GOOGLE_SECRET=
STRIPE_SECRET_KEY=       # Subscriptions
OPENAI_API_KEY=          # AI features
RESEND_API_KEY=          # Email delivery
MPESA_CONSUMER_KEY=      # M-Pesa STK Push
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Or generate + run migrations
npm run db:generate
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup, forgot password, onboarding
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth + signup
│   │   ├── invoices/        # CRUD, PDF, send
│   │   ├── clients/         # Client management
│   │   ├── payments/        # Payments + M-Pesa
│   │   ├── mpesa/callback/  # M-Pesa webhook
│   │   ├── expenses/        # Expense tracking
│   │   ├── tasks/           # Task management
│   │   └── ai/              # AI content generation
│   ├── dashboard/           # Protected app pages
│   ├── privacy/             # Privacy policy
│   ├── terms/               # Terms of service
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── marketing/           # Landing page sections
│   ├── dashboard/           # Dashboard shell, overview
│   └── providers/           # Theme, auth, query providers
├── db/
│   ├── schema.ts            # Drizzle schema + relations
│   └── index.ts             # Database connection
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── utils.ts             # Helpers, pricing, limits
│   ├── validations.ts       # Zod schemas
│   ├── stripe.ts            # Stripe integration
│   ├── mpesa.ts             # M-Pesa Daraja API
│   ├── ai.ts                # OpenAI integration
│   ├── email.ts             # Resend email
│   └── pdf.ts               # Invoice PDF generation
├── types/                   # TypeScript declarations
└── middleware.ts            # Auth guards
```

## M-Pesa Sandbox Integration

### Step 1: Register on Safaricom Developer Portal

1. Go to [https://developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an account and log in
3. Create a new app (Lipa Na M-Pesa Online)

### Step 2: Get Sandbox Credentials

From your app dashboard, copy:
- **Consumer Key**
- **Consumer Secret**
- **Passkey** (from Lipa Na M-Pesa Online section)

Sandbox defaults:
- Shortcode: `174379`
- Test phone: `254708374149`

### Step 3: Configure Environment

```env
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_sandbox_passkey
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback
MPESA_ENV=sandbox
```

### Step 4: Expose Callback URL (Local Dev)

M-Pesa needs a public HTTPS URL for callbacks. Use ngrok:

```bash
ngrok http 3000
```

Copy the HTTPS URL to `MPESA_CALLBACK_URL`.

### Step 5: Test STK Push

1. Log into KaziFlow dashboard
2. Go to **Payments**
3. Enter test phone `254708374149` and amount `1`
4. Click **Send STK Push**
5. Use sandbox PIN: check Safaricom docs for current test PIN

### Step 6: Production

1. Apply for production credentials on Daraja portal
2. Set `MPESA_ENV=production`
3. Update shortcode and passkey to production values
4. Deploy callback URL to your production domain

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables
4. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your domain
5. Deploy

```bash
npm run build  # Verify build locally first
```

## Freemium Limits

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Invoices/month | 5 | Unlimited | Unlimited |
| Clients | 10 | Unlimited | Unlimited |
| AI requests/month | 10 | 100 | Unlimited |
| M-Pesa STK Push | ❌ | ✅ | ✅ |
| PDF Export | ✅ | ✅ | ✅ |
| Tax Reports | ❌ | ✅ | ✅ |

## Next Steps

- [ ] Connect Neon/Supabase PostgreSQL
- [ ] Set up Google OAuth credentials
- [ ] Configure Stripe products and webhooks
- [ ] Register M-Pesa Daraja sandbox app
- [ ] Add OpenAI API key for AI features
- [ ] Set up Resend for email delivery
- [ ] Customize branding and colors
- [ ] Add custom domain on Vercel

## License

Private — All rights reserved.
