# ⚡ Generative AI Community VIT Bhopal — Official Web Engine & Event Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Google Drive](https://img.shields.io/badge/Google_Drive-Media_Storage-4285F4?style=for-the-badge&logo=google-drive)](https://developers.google.com/drive)
[![Google Sheets](https://img.shields.io/badge/Google_Sheets-Live_Audit-34A853?style=for-the-badge&logo=google-sheets)](https://developers.google.com/sheets)
[![License: MIT](https://img.shields.io/badge/License-MIT-F5B642?style=for-the-badge)](LICENSE)

An enterprise-grade, zero-cost web platform and event operations engine built for the **Generative AI Community at VIT Bhopal University**. Engineered for high concurrency, instant UPI payments, camera QR pass scanning, multi-tier executive rosters, and real-time multi-cloud data synchronization.

> 📖 **Handing over the codebase to new members?**  
> Read the complete [📘 Master Handover & Developer Handbook (HANDOVER_BOOK.md)](./HANDOVER_BOOK.md) for full operational blueprints, database schemas, API references, and incident recovery playbooks.

---

## 📑 Quick Navigation

- [🏛 System Architecture](#-system-architecture)
- [🚀 Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [⚡ Quickstart & Local Setup](#-quickstart--local-setup)
- [🛡️ 100-Point Automated Verification](#-100-point-automated-verification)
- [🔒 Security & Penetration Hardening](#-security--penetration-hardening)
- [🌐 Multi-Remote Git & Deployment](#-multi-remote-git--deployment)
- [👥 Official Club Leadership](#-official-club-leadership)

---

## 🏛 System Architecture

```text
                                [ Student / Attendee ]
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
               [ Public Web Portals ]              [ Event Registration ]
               - Homepage & Live Ticker            - Real-Time Dynamic UPI QR
               - Member Hierarchy Tree             - Payment Proof Upload (10MB)
               - Technical Blogs (LinkedIn AI)     - Rate-Limited API Gateway
                         │                                   │
                         │                                   ▼
                         │                        [ Next.js Server Actions ]
                         │                        - Zod Schema Sanitization
                         │                        - HMAC-SHA256 Token Pass
                         │                        - Edge Thumbnail Proxy
                         │                                   │
        ┌────────────────┴───────────────────────────────────┼──────────────────────────────┐
        ▼                                                    ▼                              ▼
  [ Supabase Postgres ]                              [ Google Drive ]              [ Google Sheets ]
  - Events, Registrations, Payments                  - Shared Drive Media Engine   - 3-Tab Split Real-Time Sync
  - Row-Level Security (RLS)                         - 15GB Personal Gate Bypass   - Failover Submission Ledger
  - Audit Trail & Staff Roles                        - High-Speed Edge CDN         - Offline Check-in Buffer
```

---

## 🚀 Key Features

### 1. Public Portals & User Experience
- **Dynamic Hero Banner**: Shows upcoming flagship events with countdown timer, live registration status, and 1-click entry pass CTAs.
- **Interactive Team Hierarchy Tree**: Visualizes 50+ official student leaders across Executive Panel, AI/ML, Tech, Design, Events, HR, PR, Social, Content, and Finance verticals with large high-resolution modal profile cards.
- **LinkedIn & Gemini AI Technical Blogs**: Automatically syncs authentic technical dispatches from the official LinkedIn company feed into responsive articles.
- **Podium & Winners Showcase**: Celebrates champions from hackathons, ideathons, and coding sprints.

### 2. Event Operations & Registration Engine
- **Atomic Registration Flow**: Captures name, VIT registration number, verified branch, emails, and transaction ID with instantaneous validation.
- **Dynamic UPI QR Code Generator**: Generates instant scan-to-pay intent for GPay, PhonePe, Paytm, and BHIM with pre-configured event fee.
- **Camera Ticket Scanner (`/admin/scanner`)**: High-speed, real-time camera scanner that verifies HMAC-signed QR passes at the door with duplicate scan guards.

### 3. Administrative Command Center (`/admin`)
- **Event Lifecycle Manager**: Create, edit, publish, and archive events with custom ticket quotas and banner artwork.
- **Finance Review Queue**: Inspect 10MB payment screenshots with zoom preview, approving passes with 1-click automated email dispatch.
- **On-Spot Desk Registration & Live QR**: Side-by-side live QR panel displaying UPI scan-to-pay and student self-registration portals for walk-in crowds.
- **Top-Executive Unvoid Engine**: Top leadership can reactivate staff members and generate high-entropy credentials with 1-click clipboard export.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript 5.x](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS)
- **File Storage**: Google Drive API v3 (15GB Personal Quota Bypass)
- **Live Audit Ledger**: Google Sheets API v4 (3-Tab Real-Time Sync)
- **Email Delivery**: Google Apps Script (GAS) + Gmail Transactional Relay (`gen_ai@vitbhopal.ac.in`)
- **AI Intelligence**: Google Gemini Pro (`@google/genai`)
- **Validation**: [Zod 3.x](https://zod.dev/)

---

## 📂 Project Directory Structure

```text
├── app/
│   ├── (public)/                 # Public pages (/, /about, /blogs, /events, /projects, /team, /winners)
│   ├── admin/                    # Admin command center & operational sub-portals
│   │   ├── audit/                # Immutable audit logs & Google Sheets sync
│   │   ├── events/               # Event creation, capacity, and deadlines
│   │   ├── finance/              # Registration queue & payment approvals
│   │   ├── login/                # Staff authentication & password reset modal
│   │   ├── scanner/              # Real-time camera QR ticket validator
│   │   └── users/                # Member hierarchy & Top-Executive unvoid engine
│   ├── api/                      # Backend route handlers & cron endpoints
│   │   ├── admin/                # Export, preview, and system status APIs
│   │   ├── blogs/sync/           # LinkedIn sync endpoint
│   │   ├── checkin/scan/         # Check-in validation handler
│   │   ├── cron/sync-linkedin/   # Gemini AI blog summarizer cron
│   │   ├── drive/asset/          # Google Drive thumbnail edge proxy
│   │   ├── keepalive/            # Supabase database keepalive worker
│   │   └── register/             # Student event registration handler
│   ├── globals.css               # Apple dark mode design system tokens
│   └── layout.tsx                # Root layout, fonts, SEO tags, and telemetry
├── components/
│   ├── admin/                    # Admin modals, queues, and management tables
│   ├── events/                   # Event registration forms and pass cards
│   ├── seo/                      # JSON-LD Schema.org structured data & Analytics
│   └── site/                     # Public UI components, navbar, footer, hierarchy tree
├── lib/
│   ├── data/                     # Data fetching layers (events, public, blog)
│   ├── google/                   # Google Drive, Google Sheets, and Gmail clients
│   ├── supabase/                 # Supabase client, server, and middleware helpers
│   ├── types/                    # TypeScript interfaces and data models
│   └── validation/               # Zod schemas, branches, and regex validators
├── scripts/
│   ├── verify-100-checkpoints.js # Automated 100-system preflight test suite
│   └── gas-email-relay.js        # Google Apps Script transactional email script
├── HANDOVER_BOOK.md              # Complete developer & operations handover handbook
└── README.md                     # Repository documentation
```

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- A free [Supabase](https://supabase.com/) account
- A Google Cloud Service Account with Drive & Sheets API enabled

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/GenAI-Community-VITB/GenAI-Community-VITB-Website.git
cd GenAI-Community-VITB-Website

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Open .env.local and populate your Supabase and Google Cloud keys

# 4. Start the local development server
npm run dev
# Access the web app at http://localhost:3000
```

---

## 🛡️ 100-Point Automated Verification

The repository includes a comprehensive 100-system preflight verification suite checking route health, Supabase connectivity, Google Cloud clients, failover relays, and security guards:

```bash
# Run the automated verification suite
npm run preflight

# Expected output:
# ================================================================================
#  📊 SUMMARY: 100/100 PASSED (100%) | 0 WARNINGS | 0 FAILURES
#  🎯 STATUS : ALL 100 SYSTEMS OPERATIONAL & VERIFIED ✅
# ================================================================================
```

To run a production build:
```bash
npm run build
```

---

## 🔒 Security & Penetration Hardening

- **Cryptographic Pass Verification**: Registration QR passes use HMAC-SHA256 signatures to prevent counterfeit tickets.
- **Strict Rate Limiting**: Built-in in-memory rate limiting blocks DDoS attempts (10 registrations per 10 minutes per IP; 5 auth attempts per 10 minutes).
- **MIME Type & File Inspection**: Uploaded payment receipts are sanitized on the server side with a strict 10MB ceiling (supporting JPG, PNG, WEBP, and HEIC).
- **Row-Level Security (RLS)**: Public users cannot read private registration records or financial data directly from Postgres.

---

## 🌐 Multi-Remote Git & Deployment

The codebase is pushed simultaneously to two redundant GitHub remotes:
- **`origin`**: `git@github.com:GenAI-Community-VITB/GenAI-Community-VITB-Website.git` (Official Org)
- **`personal`**: `git@github.com:klakshya007/GenAI-Community-VITB-Website.git` (Lead Backup)

To push changes to both remotes:
```bash
git push origin main
git push personal main
```

---

## 👥 Official Club Leadership

- **President**: Harshvardhan Om
- **Vice President**: Akshita Singh
- **AI/ML & Innovation Lead**: Lakshya Kant
- **Technical Lead**: Abhinav Kumar
- **Design Lead**: Agrim Mathur
- **Events Lead**: Priyansh Upadhyay
- **HR Lead**: Amritanshu Gupta
- **PR & Outreach Lead**: Shashwat Mishra
- **Social Media Lead**: Jharna Gupta
- **Content Lead**: Muskan Jha

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

*Engineered with ⚡ by the GenAI Community Technical Core Team at VIT Bhopal University.*
