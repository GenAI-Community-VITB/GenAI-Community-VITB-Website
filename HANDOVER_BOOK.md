# 📘 Generative AI Club — Master Engineering Handover Book & Developer Handbook
**Official Technical Blueprint, Infrastructure Guide, & Operations Manual**  
*Maintained by the GenAI Community Technical Core & Lead Engineering Team*

---

## 📑 Table of Contents

1. [Executive Summary & Welcome](#1-executive-summary--welcome)
2. [High-Level Architecture & System Blueprint](#2-high-level-architecture--system-blueprint)
3. [Complete Technology Stack](#3-complete-technology-stack)
4. [Master Environment Configuration & Secrets](#4-master-environment-configuration--secrets)
5. [Database Architecture & Security Policies (Supabase Postgres)](#5-database-architecture--security-policies-supabase-postgres)
6. [Google Cloud Services & 100% Free Zero-Cost Infrastructure](#6-google-cloud-services--100-free-zero-cost-infrastructure)
   - 6.1 [Google Drive Media Engine & 15GB Storage Bypass](#61-google-drive-media-engine--15gb-storage-bypass)
   - 6.2 [Google Sheets Real-Time 3-Tab Split Audit Engine](#62-google-sheets-real-time-3-tab-split-audit-engine)
   - 6.3 [Google Apps Script (GAS) + Gmail Transactional Engine](#63-google-apps-script-gas--gmail-transactional-engine)
7. [Admin Command Center & Operations Manual](#7-admin-command-center--operations-manual)
   - 7.1 [Event Lifecycle & Capacity Management](#71-event-lifecycle--capacity-management)
   - 7.2 [Finance Queue & Payment Verification](#72-finance-queue--payment-verification)
   - 7.3 [On-Spot Desk Registration & Live Dual-Mode QR](#73-on-spot-desk-registration--live-dual-mode-qr)
   - 7.4 [Member Hierarchy Management & Executive Unvoid Engine](#74-member-hierarchy-management--executive-unvoid-engine)
   - 7.5 [High-Speed Camera Ticket Scanner (HMAC-SHA256)](#75-high-speed-camera-ticket-scanner-hmac-sha256)
8. [AI Content & LinkedIn Social Media Pipeline](#8-ai-content--linkedin-social-media-pipeline)
9. [Local Development, Preflight Verification, & Build Lifecycle](#9-local-development-preflight-verification--build-lifecycle)
10. [Production Deployment, Multi-Remote Git, & CI/CD](#10-production-deployment-multi-remote-git--cicd)
11. [Incident Response & Emergency Troubleshooting Playbook](#11-incident-response--emergency-troubleshooting-playbook)
12. [Future Roadmap & Recommended Extensions](#12-future-roadmap--recommended-extensions)

---

## 1. Executive Summary & Welcome

Welcome to the **Generative AI Community VIT Bhopal Web & Event Management Engine**! 

This platform is not a standard static club portfolio; it is an enterprise-grade, high-throughput web application built to serve over **5,000+ university students**, handle high-concurrency national hackathon registrations, manage multi-tier executive rosters, process dynamic UPI payments, and verify event attendees at the door in sub-100ms camera scans.

### Core Design Philosophy:
1. **Zero Recurring Infrastructure Cost**: The entire system is engineered to run at **100% free tier capacity** using Supabase Postgres, Google Drive 15GB bypass proxy, Google Sheets live backup relay, and Google Apps Script Gmail relay.
2. **Resilience & Graceful Degradation**: If any single third-party provider experiences downtime, the system automatically falls back to secondary channels (e.g., Supabase failover to Google Sheets; Google Drive fallback to raw base64 cache; auth fallback to offline superadmin credentials).
3. **Sub-150ms Interaction Speed**: Next.js 16 Webpack compilation, SWR caching, and edge link pre-fetching provide liquid-smooth transitions.
4. **Strict Security & Anti-Fraud**: HMAC-SHA256 signed digital passes, rate limiters, MIME-sniffed file upload protections, and strict Supabase Row-Level Security (RLS).

---

## 2. High-Level Architecture & System Blueprint

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         CLIENT APPLICATION LAYER                            │
 ├──────────────────────────────────────┬──────────────────────────────────────┤
 │         Public Campus Portals        │       Admin Operations Matrix        │
 │  - / (Hero, Stats, Pillars, Portals) │  - /admin/events (Lifecycle)         │
 │  - /blogs (LinkedIn AI Pipeline)     │  - /admin/finance (Payments & Queue) │
 │  - /team (Hierarchy Visualizer)      │  - /admin/users (Unvoid Engine)      │
 │  - /events/[slug]/register (Passes)  │  - /admin/scanner (HMAC Check-in)    │
 └──────────────────────────────────┬───┴──────────────────────────────────┬───┘
                                    │                                      │
 ┌──────────────────────────────────▼──────────────────────────────────────▼───┐
 │                      NEXT.JS 16 SERVER ACTIONS & API                        │
 │  - Rate Limiting Middleware (10 req/min registrations, 5 req/min auth)      │
 │  - Zod Input & File Validation (MIME & 10MB ceiling)                        │
 │  - Dynamic HMAC-SHA256 Pass Cryptographic Tokenizer                         │
 │  - In-Memory Memory Cache Engine (60s SWR TTL)                              │
 └──────┬───────────────────────────┬───────────────────────────────┬──────────┘
        │                           │                               │
 ┌──────▼──────────────┐   ┌────────▼──────────────┐   ┌────────────▼─────────┐
 │  Supabase Postgres  │   │  Google Drive Storage │   │ Google Sheets Audit  │
 │  - events           │   │  - Service Account    │   │  - Events Log Tab    │
 │  - registrations    │   │  - Edge Thumbnail CDN │   │  - Audit Trail Tab   │
 │  - payments         │   │  - 15GB Personal Gate │   │  - Check-in Tab      │
 │  - profiles & roles │   │  - 10MB Max Receipt   │   │  - Async Beacon Log  │
 └─────────────────────┘   └───────────────────────┘   └──────────────────────┘
```

---

## 3. Complete Technology Stack

| Layer | Technology | Version / Provider | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.1` | Server Components, Server Actions, Route Handlers |
| **Language** | TypeScript | `5.x` | Strict type safety across database schemas and APIs |
| **Styling** | Tailwind CSS | `v4` | Dark mode token design system, responsive grids |
| **Motion** | Framer Motion | `12.x` | Hardware-accelerated entrance and hover effects |
| **Database** | PostgreSQL | Supabase | Relational data, RLS security, ACID transactions |
| **File Storage** | Google Drive API | v3 | Storing student payment proofs and member avatars |
| **Live Audit** | Google Sheets API | v4 | Secondary append-only ledger for all event data |
| **Email Relay** | Google Apps Script | GAS + Gmail | 100% free transactional email delivery (`gen_ai@vitbhopal.ac.in`) |
| **AI Intelligence**| Google Gemini Pro | `@google/genai` | Auto-summarizing LinkedIn posts into campus blogs |
| **Icons** | Lucide React | `latest` | Consistent, lightweight vector iconography |
| **Validation** | Zod | `3.x` | Strict runtime schema parsing and sanitization |

---

## 4. Master Environment Configuration & Secrets

All environment variables reside in `.env.local` for development and in your **Vercel / Hosting Provider Project Settings** for production.

```bash
# ── 1. Application URL ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://www.genaiclubvitb.in"

# ── 2. Supabase Database & Auth ────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." # REQUIRED for backend Server Actions bypass

# ── 3. Google Cloud Service Account ─────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL="genai-storage@[PROJECT-ID].iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="1a2b3c4d5e6f7g8h9i0j..."

# ── 4. Google Sheets Live Audit Mirror ─────────────────────────────
GOOGLE_SPREADSHEET_ID_EVENTS="1XyZ..."
GOOGLE_SPREADSHEET_ID_LOGS="1AbC..."
GOOGLE_SPREADSHEET_ID_INTERNAL="1MnO..."
GOOGLE_SPREADSHEET_ID="1XyZ..." # Master fallback

# ── 5. Free Transactional Email Relay (GAS + Gmail) ─────────────────
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"
GOOGLE_APPS_SCRIPT_TOKEN="GENAI_GAS_EMAIL_SECRET_2026"
EMAIL_SENDER_NAME="GENAI Community VIT Bhopal"
EMAIL_REPLY_TO="gen_ai@vitbhopal.ac.in"

# ── 6. Gemini AI Engine ────────────────────────────────────────────
GEMINI_API_KEY="AIzaSy..." # Use official club Gemini API key

# ── 7. Offline Emergency Superadmin Fallback ───────────────────────
HARDCODED_ADMIN_EMAIL="admin.club.core@genai.local"
HARDCODED_ADMIN_PASSWORD="[Secure-Random-String]"

# ── 8. Rate Limiter Configuration ──────────────────────────────────
RATE_LIMIT_ENABLED="true"
RATE_LIMIT_REGISTRATION_REQUESTS="10"
RATE_LIMIT_REGISTRATION_WINDOW_SECONDS="600"
```

> [!CAUTION]
> Never commit `.env.local` to git. If keys are compromised, immediately rotate the `SUPABASE_SERVICE_ROLE_KEY` in Supabase Project Settings and generate a new Google Cloud Service Account key.

---

## 5. Database Architecture & Security Policies (Supabase Postgres)

The database schema is organized around core domains:

### Key Tables:
1. **`events`**: Event titles, slug, description, start/end dates, registration deadlines, seat capacity, fees, poster URLs, and UPI IDs.
2. **`registrations`**: Student submissions including full name, VIT registration number, branch, personal email, college email, phone number, QR pass token, check-in status, and timestamp.
3. **`payments`**: Linked to `registrations`. Contains payment amount, transaction UTR, payment screenshot Drive file ID, verification status (`pending`, `verified`, `rejected`), rejection reason, and verifier user ID.
4. **`profiles`**: Staff accounts linked to Supabase Auth UUID. Contains full name, email, assigned human name, avatar URL, and status (`active`, `voided`).
5. **`user_roles`**: Role mapping (`president`, `vice_president`, `lead`, `core_member`, `volunteer`).
6. **`audit_logs`**: Immutable security log tracking admin operations, payment approvals, user status changes, and exports.

### Row-Level Security (RLS) Rules:
- **Public**: Can only read published `events`, approved `projects`, `achievements`, and `winners`.
- **Public Insert**: Can only insert into `registrations` and `payments` with strict validation via Server Actions.
- **Admin**: Authenticated staff can view and review registrations/payments based on domain hierarchy.

---

## 6. Google Cloud Services & 100% Free Zero-Cost Infrastructure

### 6.1 Google Drive Media Engine & 15GB Storage Bypass
- Service accounts have a default **0MB storage quota** on individual Google accounts.
- **Solution**: All media is uploaded directly to a folder created by the club's primary Google account (`genaicommunityvitbofficial@gmail.com`) and shared with the Service Account with `Editor` permissions.
- **High-Speed CDN Rendering**: Photos and payment proofs are resolved via Google's edge cache (`https://lh3.googleusercontent.com/d/{fileId}`) for instantaneous image rendering.

### 6.2 Google Sheets Real-Time 3-Tab Split Audit Engine
- Every student registration, payment approval, and door check-in fires an asynchronous background task to Google Sheets (`lib/google/sheets.ts`).
- Ensures non-technical executive members can view live registration numbers in Excel/Google Sheets without needing Supabase database access.

### 6.3 Google Apps Script (GAS) + Gmail Transactional Engine
- Located in `scripts/gas-email-relay.js`.
- Deployed as a free Google Apps Script Web App attached to `gen_ai@vitbhopal.ac.in`.
- Dispatches custom-designed HTML tickets with embedded HMAC QR code passes directly to student inboxes.

---

## 7. Admin Command Center & Operations Manual

Access the portal at `/admin` (or `/admin/login`).

### 7.1 Event Lifecycle & Capacity Management (`/admin/events`)
- Create new events, set seat limits, registration fee (₹0 for free, ₹X for paid), and upload event banners.
- Toggle between `Draft`, `Published`, and `Archived` states.

### 7.2 Finance Queue & Payment Verification (`/admin/finance`)
- Displays all registrations sorted by `Pending`, `Verified`, and `Rejected`.
- High-resolution modal allows finance leads to inspect payment screenshots, verify UPI transaction IDs (UTR), and approve passes with 1 click.
- Approving a payment automatically triggers the transactional email engine to dispatch the QR pass.

### 7.3 On-Spot Desk Registration & Live Dual-Mode QR
- When managing walk-in participants at the venue desk, click **`+ On-Spot Registration`** or **`⚡ Desk Payment QR`**.
- Features a side-by-side live QR panel:
  - **⚡ Scan & Pay (₹ Fee)**: Walk-in students scan the dynamic UPI QR to pay on GPay/PhonePe.
  - **📱 Student Portal**: Walk-in students scan the link QR to fill the form on their own smartphone.

### 7.4 Member Hierarchy Management & Executive Unvoid Engine (`/admin/users`)
- Top executives (President, VP, Leads) have exclusive access to the **Unvoid Engine**:
  - Reactivate any deactivated staff member with 1 click.
  - Generates a high-entropy random password (`GenAI#...123!`) and copies login credentials to clipboard.

### 7.5 High-Speed Camera Ticket Scanner (`/admin/scanner`)
- Venue scanners use their smartphone camera to scan participant QR passes.
- Decrypts the HMAC-SHA256 signature, validates entry, checks for duplicate scans, and vibrates/beeps upon successful check-in.

---

## 8. AI Content & LinkedIn Social Media Pipeline

- Configured in `lib/data/blog.ts` and `app/api/cron/sync-linkedin/route.ts`.
- Automatically fetches technical posts from the official LinkedIn channel (`https://www.linkedin.com/company/genai-community-vit-bhopal/posts/`).
- Gemini AI summarizer parses post captions, extracts technical tags (e.g. *#AgenticAI, #RAG, #LLM*), and creates interactive campus blog articles with direct "Read on LinkedIn" outbound links.

---

## 9. Local Development, Preflight Verification, & Build Lifecycle

### Quickstart:
```bash
# 1. Clone the repository
git clone https://github.com/GenAI-Community-VITB/GenAI-Community-VITB-Website.git
cd GenAI-Community-VITB-Website

# 2. Install dependencies
npm install

# 3. Create .env.local from template
cp .env.example .env.local

# 4. Start local development server
npm run dev
# Open http://localhost:3000
```

### Preflight Verification Suite:
Before committing or deploying, run the 100-system automated verification suite:
```bash
# Run automated verification suite (100 Checkpoints)
npm run preflight

# Run production build validation
npm run build
```

---

## 10. Production Deployment, Multi-Remote Git, & CI/CD

### Multi-Remote Push Setup:
The project is configured with two git remotes for redundancy:
1. `origin`: Official Organization Repo (`GenAI-Community-VITB/GenAI-Community-VITB-Website`)
2. `personal`: Lead Backup Repo (`klakshya007/GenAI-Community-VITB-Website`)

To push to both remotes at once:
```bash
git push origin main
git push personal main
```

### Hosting on Vercel:
1. Connect the GitHub repository to **Vercel**.
2. Add all environment variables from `.env.example` in Vercel Settings -> Environment Variables.
3. Build Command: `npm run build`
4. Output Directory: `.next`

---

## 11. Incident Response & Emergency Troubleshooting Playbook

### Scenario 1: Supabase Database Inactivity Pause
- **Symptom**: API routes return database connection errors.
- **Fix**: Open the [Supabase Dashboard](https://supabase.com/dashboard), navigate to the project, and click **Restore Project**. The built-in `/api/keepalive` cron worker pings the database weekly to prevent pausing.

### Scenario 2: Google Drive Quota Exceeded on Service Account
- **Symptom**: `Storage quota exceeded for this account` on file upload.
- **Fix**: Verify that `GOOGLE_DRIVE_ROOT_FOLDER_ID` points to a folder owned by the personal Gmail account (`genaicommunityvitbofficial@gmail.com`) with the Service Account invited as `Editor`.

### Scenario 3: Admin Locked Out / Password Lost
- **Symptom**: Cannot log in to `/admin`.
- **Fix**: Use the offline emergency fallback credentials configured in `.env.local` (`HARDCODED_ADMIN_EMAIL` and `HARDCODED_ADMIN_PASSWORD`).

---

## 12. Future Roadmap & Recommended Extensions

Suggestions for incoming technical teams:
1. **Automated Certificate Generator**: Generate verifiable PDF participation certificates with unique QR hashes upon event check-in completion.
2. **Interactive RAG AI Chatbot**: Embed a floating AI assistant on the homepage trained on club documentation, upcoming hackathons, and syllabus.
3. **Student Project Showcase Submissions**: Allow community members to submit their GitHub generative AI projects for review and public showcase directly from their student dashboard.

---
*Built with ❤️ and passion by the Generative AI Community Technical Team — VIT Bhopal University.*
