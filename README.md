# ⚡ Generative AI Community VIT Bhopal — Official Web Engine & Event Operations Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-Drive_%26_Sheets_API-4285F4?style=for-the-badge&logo=google-cloud)](https://cloud.google.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-AI_Content_Engine-8E75B2?style=for-the-badge&logo=googlegemini)](https://ai.google.dev/)
[![Cloudflare Turnstile](https://img.shields.io/badge/Cloudflare-Turnstile_Anti--Bot-F38020?style=for-the-badge&logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F5B642?style=for-the-badge)](LICENSE)


An enterprise-grade, zero-cost web engine and real-time event operations platform built for the **Generative AI Community at VIT Bhopal University**. Engineered for extreme concurrency, atomic UPI payments, camera QR pass scanning, multi-tier executive rosters, and multi-cloud data synchronization.

> 📖 **Handing over the codebase to incoming leads?**  
> An official confidential **Master Developer Handover & Operations Manual** (PDF) is provided in person to authorized incoming technical leads, containing complete operational blueprints, database schemas, and recovery playbooks.

---

## 📑 Table of Contents

- [🏛 System Architecture](#-system-architecture)
- [🚀 Key Features](#-key-features)
  - [1. Public Experience & Interactive Portals](#1-public-experience--interactive-portals)
  - [2. Event Engine & Registration Gateway](#2-event-engine--registration-gateway)
  - [3. Administrative Command Center (`/admin`)](#3-administrative-command-center-admin)
  - [4. Multi-Cloud Sync & Storage Architecture](#4-multi-cloud-sync--storage-architecture)
- [🛠 Tech Stack & Ecosystem](#-tech-stack--ecosystem)
- [📂 Project Directory Structure](#-project-directory-structure)
- [⚡ Quickstart & Local Setup](#-quickstart--local-setup)
- [⚙️ Environment Variables Reference](#️-environment-variables-reference)
- [📜 Available Scripts & CLI Tools](#-available-scripts--cli-tools)
- [🛡️ 100-Point Automated Verification Suite](#️-100-point-automated-verification-suite)
- [🔒 Security & Penetration Hardening](#-security--penetration-hardening)
- [🌐 Multi-Remote Git & Deployment](#-multi-remote-git--deployment)
- [👥 Official Club Leadership (2026–2027)](#-official-club-leadership-20262027)
- [🏗️ Platform System Architects & Handover Lineage](#️-platform-system-architects--handover-lineage)
- [📄 License](#-license)

---

## 🏛 System Architecture

```text
                                [ Student / Attendee ]
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
               [ Public Web Portals ]              [ Event Registration ]
               - Dynamic Hero & Ticker             - Dynamic UPI QR Intent
               - 50-Member Hierarchy Tree          - 10MB Payment Proof Upload
               - Gemini & LinkedIn Blogs           - Cloudflare Turnstile Bot Guard
               - Winners & Project Showcase        - Strict In-Memory Rate Limiter
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
  - Events, Registrations, Payments                  - Shared Drive Media Engine   - 3-Workbook Split Architecture
  - Relational Teams & Members Schema                - 15GB Personal Gate Bypass   - Failover Submission Ledger
  - Row-Level Security (RLS)                         - High-Speed Edge CDN         - Real-Time Dual Cloud Sync
  - Immutable Audit Logs & Admin RBAC                - Payment Proof Vault         - Offline Door Check-in Buffer
```

---

## 🚀 Key Features

### 1. Public Experience & Interactive Portals
- **Dynamic Hero & Event Banner**: Live countdown timer, real-time ticket quotas, registration status badges, and 1-click entry pass triggers.
- **50+ Member Interactive Hierarchy Tree**: Visualizes the complete student leadership across Executive Panel, AI/ML, Tech, Design, Events, HR, PR, Social, Content, and Finance verticals with high-resolution modal profile cards and LinkedIn integrations.
- **LinkedIn & Gemini AI Technical Blogs**: Automatically ingests authentic technical dispatches from the official LinkedIn company feed into responsive, reader-friendly articles with Gemini summarization.
- **Hall of Fame & Winners Showcase**: Celebrates winners, runner-ups, and notable projects from hackathons, ideathons, and coding sprints.
- **Apple Dark Mode Design System**: Built with modern typography, frosted-glass backdrops (`backdrop-blur`), vibrant neon gradients, smooth Framer Motion micro-interactions, and hardware-accelerated transitions.

### 2. Event Engine & Registration Gateway
- **Atomic Registration Flow**: Captures name, VIT registration number, verified branch (including unified MTech & Allied branches), email, and transaction ID with instant client and server validation.
- **Dynamic UPI QR Code Generator**: Generates instant scan-to-pay intent for GPay, PhonePe, Paytm, and BHIM with pre-configured event fee and reference codes.
- **Bot & Abuse Prevention**: Integrated with 100% free Cloudflare Turnstile captcha and in-memory rate limiting to prevent spam and denial-of-service attempts.
- **Instant HMAC-Signed QR Pass**: Automatically generates cryptographically signed QR passes upon approval, complete with unique hash tokens and pass verification URLs.

### 3. Administrative Command Center (`/admin`)
- **Event Lifecycle Manager**: Create, edit, publish, schedule, and archive events with custom ticket quotas, registration windows, and banner artwork.
- **Finance Review & Payment Queue**: Real-time payment verification queue with instant high-resolution receipt inspection (zoom & rotate), approval workflow, and 1-click automated email dispatch.
- **Real-Time Camera QR Scanner (`/admin/scanner`)**: High-speed, in-browser camera scanner that verifies HMAC-signed QR passes at event entry with duplicate scan protection and offline check-in buffering.
- **On-Spot Desk Registration & Live QR**: Side-by-side live QR display facilitating walk-in student registrations and on-the-spot UPI payments at registration desks.
- **Top-Executive Unvoid & Recovery Engine**: Leadership portal to manage staff permissions, reactivate team members, reset passwords, and generate secure credentials with 1-click clipboard export.

### 4. Multi-Cloud Sync & Storage Architecture
- **Supabase PostgreSQL Layer**: Relational data schema linking teams, members, events, registrations, and audit logs with granular Row-Level Security (RLS).
- **Google Cloud Drive Integration**: Service account-driven asset engine bypassing personal storage limits for storing banners, member avatars, and payment receipts.
- **Google Sheets 3-Workbook Split**: Real-time dual sync separating event registrations, audit trails, and internal logs into dedicated spreadsheets for offline resilience.
- **Dual Email Delivery Engine**: Google Apps Script (GAS) Web App email relay backed by Nodemailer fallback with automatic retries and rate throttling.

---

## 🛠 Tech Stack & Ecosystem

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Core Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | Hybrid SSR, React Server Components, Server Actions, Webpack bundler |
| **UI Library** | [React 19](https://react.dev/) | Concurrent rendering, modern hooks, and component lifecycle |
| **Language** | [TypeScript 5.x](https://www.typescriptlang.org/) | Strict type safety, end-to-end data contracts, and schema verification |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility engine, CSS variables, and fluid responsive layouts |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | Hardware-accelerated UI transitions, modal entrance, and micro-interactions |
| **Database & Auth** | [Supabase PostgreSQL](https://supabase.com/) | Managed PostgreSQL with RLS, auth sessions, and foreign key relations |
| **Bot Protection** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Invisible, privacy-friendly bot verification on registrations & login |
| **File Storage** | [Google Drive API v3](https://developers.google.com/drive) | Service account asset hosting and payment proof storage |
| **Audit Ledger** | [Google Sheets API v4](https://developers.google.com/sheets) | 3-Workbook split real-time sync for operational failover |
| **Email Relay** | Google Apps Script + Gmail | Zero-cost transactional email engine with Nodemailer fallback |
| **AI Processing** | Google Gemini API (`@google/genai`) | LinkedIn feed extraction and technical article summarization |
| **Validation** | [Zod 3.x](https://zod.dev/) | Runtime request validation, type-safe API inputs, and sanitization |
| **QR Code Scanner** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) + [qrcode](https://github.com/soldair/node-qrcode) | Real-time camera scan validation and vector QR generation |

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
│   ├── seed-logins.ts            # Admin and staff credential seeding utility
│   ├── sync-linkedin.ts          # Manual LinkedIn dispatch ingestion script
│   ├── init-google-sheets.js     # Google Sheets 3-workbook tab initializer
│   ├── populate-member-emails.js # Synchronize authentic VIT student emails
│   └── apps-script.js            # Google Apps Script transactional email engine
└── README.md                     # Repository documentation
```

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Supabase Project**: Free tier or hosted PostgreSQL database
- **Google Cloud Console**: Service Account with Google Drive & Sheets API enabled

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/GenAI-Community-VITB/GenAI-Community-VITB-Website.git
cd GenAI-Community-VITB-Website

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and populate Supabase, Google Cloud, and email credentials

# 4. Run database migrations / seedings (if setting up fresh DB)
npm run seed:logins

# 5. Launch development server
npm run dev
# Open http://localhost:3000 in your browser
```

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env.local` and set the following parameters:

```bash
# --- Application URL ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# --- Supabase Database & Auth (Required) ---
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-secret-key"

# --- Google Cloud Service Account (Drive & Sheets) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL="genai-club-service-account@your-gcp-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="your_google_drive_folder_id"

# --- Google Sheets 3-Workbook Split ---
GOOGLE_SPREADSHEET_ID_EVENTS="your_events_spreadsheet_id"
GOOGLE_SPREADSHEET_ID_LOGS="your_logs_spreadsheet_id"
GOOGLE_SPREADSHEET_ID_INTERNAL="your_internal_spreadsheet_id"

# --- Google Apps Script + Transactional Email Relay ---
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"
GOOGLE_APPS_SCRIPT_TOKEN="GENAI_GAS_EMAIL_SECRET_2026"
EMAIL_SENDER_NAME="GENAI Community VIT Bhopal"
EMAIL_REPLY_TO="gen_ai@vitbhopal.ac.in"

# --- Google Gemini AI Engine ---
GEMINI_API_KEY="your-gemini-api-key"

# --- Gmail Nodemailer Fallback (Optional) ---
GMAIL_USER="genaicommunityvitbofficial@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# --- Cloudflare Turnstile Bot Guard ---
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY="your-turnstile-site-key"
CLOUDFLARE_TURNSTILE_SECRET_KEY="your-turnstile-secret-key"
```

---

## 📜 Available Scripts & CLI Tools

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Webpack |
| `npm run build` | Builds production-optimized Next.js bundle |
| `npm run start` | Starts production server |
| `npm run lint` | Runs ESLint validation across code and routes |
| `npm run preflight` | Executes the **100-Point Automated Verification Suite** |
| `npm run test:diagnostics` | Alias for preflight verification suite |
| `npm run seed:logins` | Seeds executive & staff accounts into Supabase |
| `npm run sync:linkedin` | Fetches and syncs latest LinkedIn posts via Gemini AI |
| `npm run null-invalid-emails`| Data cleanup script for sanitizing member contact records |
| `npm run send-testing-emails`| Verifies transactional email pipeline and receipt templates |

---

## 🛡️ 100-Point Automated Verification Suite

The repository includes an automated 100-point preflight verification engine that validates every critical layer before deployment:

```bash
# Run the verification engine
npm run preflight
```

```text
================================================================================
 🚀 GENAI COMMUNITY VIT BHOPAL — 100-CHECKPOINT FULL STARTUP VERIFICATION
================================================================================
 [01] Performance & Runtime Turbo Engine      -> 10/10 PASS
 [02] Security, RBAC & Secrets                -> 10/10 PASS
 [03] Database & Hierarchy Roster             -> 10/10 PASS
 [04] Google Cloud & Drive Architecture       -> 10/10 PASS
 [05] Failsafe Google Forms & AppScript Relay -> 10/10 PASS
 [06] AI & LinkedIn Content Pipeline          -> 10/10 PASS
 [07] Google Transactional Email Delivery     -> 10/10 PASS
 [08] Top-Executive Admin & Unvoid Engine     -> 10/10 PASS
 [09] Event & Financial Operations            -> 10/10 PASS
 [10] Multi-Remote Git & Site Verification    -> 10/10 PASS
================================================================================
 📊 SUMMARY: 100/100 PASSED (100%) | 0 WARNINGS | 0 FAILURES
 🎯 STATUS : ALL 100 SYSTEMS OPERATIONAL & VERIFIED ✅
================================================================================
```

---

## 🔒 Security & Penetration Hardening

- **Cryptographic Pass Verification**: Registration QR passes use HMAC-SHA256 signatures with secret key salting to eliminate pass duplication and forging.
- **Bot Mitigation**: Cloudflare Turnstile prevents automated scraping and fraudulent registrations without intrusive puzzle captchas.
- **Rate Limiting Engine**: Multi-tiered in-memory token bucket rate limiter restricting registrations (10 requests/10 min/IP) and admin logins (5 requests/10 min/IP).
- **MIME Type & Buffer Inspection**: Uploaded payment receipts undergo strict server-side magic byte inspection and a strict 10MB ceiling (supporting JPG, PNG, WEBP, and HEIC).
- **Postgres Row-Level Security (RLS)**: Enforced database policies ensure unauthenticated clients cannot read private attendee data, phone numbers, or payment records.

---

## 🌐 Multi-Remote Git & Deployment

The codebase is pushed simultaneously to two redundant GitHub remotes:
- **`origin`**: `git@github.com:GenAI-Community-VITB/GenAI-Community-VITB-Website.git` (Official Org)
- **`personal`**: `git@github.com:klakshya007/GenAI-Community-VITB-Website.git` (Lead Backup)

To synchronize both remotes simultaneously:
```bash
git push origin main
git push personal main
```

### Production Deployment
The application is pre-configured for instant zero-configuration deployment on **Vercel** or **Render**:
- **Vercel**: Set Build Command to `npm run build` and output directory to `.next`. Add environment variables in project settings.
- **Render**: Configured via [`render.yaml`](file:///c:/Code/GenAI-Community-VITB-Website/render.yaml) with Docker or Node.js web service runtime.

---

## 👥 Official Club Leadership (2026–2027)

- **President**: Harshvardhan Om (`harshvardhan.24bce10511@vitbhopal.ac.in`)
- **Vice President**: Akshita Singh (`akshita.25bce10779@vitbhopal.ac.in`)
- **AI/ML & Innovation Lead**: Lakshya Kant (`lakshya.24bce10549@vitbhopal.ac.in`)
- **Technical Lead**: Abhinav Kumar (`abhinav.24bsa10110@vitbhopal.ac.in`)
- **Design Lead**: Agrim Mathur (`agrim.24bcg10060@vitbhopal.ac.in`)
- **Event Management Lead**: Priyansh Upadhyay (`priyansh.24bcy10117@vitbhopal.ac.in`)
- **PR & Outreach Lead**: Shashwat Mishra (`shashwat.25bai10233@vitbhopal.ac.in`)
- **Social Media Lead**: Jharna Gupta (`jharna.25bai10557@vitbhopal.ac.in`)
- **Content & Writing Lead**: Muskan Jha (`muskan.25bce11431@vitbhopal.ac.in`)

---

## 🏗️ Platform System Architects & Handover Lineage

| Edition | System Architect | Role & Contact Information |
| :--- | :--- | :--- |
| **Edition 3.0** *(Current Production)* | **Lakshya Kant** | **Lead System Architect & Core Author**<br/>• AI/ML & Innovation Lead, Core Platform Architect<br/>• Personal: `lakshyakant007@gmail.com`<br/>• College: `lakshya.24bce10549@vitbhopal.ac.in`<br/>• GitHub: [`github.com/klakshya007`](https://github.com/klakshya007) |
| **Edition 1.0 & 2.0** *(Foundational)* | **Ayush Mishra** | **Founding Architect & Platform Pioneer**<br/>• Founding Web Lead & Core Platform Architect<br/>• Personal: `ayushmishra2005.official@gmail.com`<br/>• College: `ayush.24bce10224@vitbhopal.ac.in`<br/>• Original Next.js 14 Setup & Supabase Architecture |
| **Edition 4.0+** *(Future Cohort)* | **Incoming Successor** | *To be authored, updated, and signed by incoming technical leadership during formal handover.* |

> 📘 **Master Developer Handover Manual**: A private operations manual (`GenAI_Community_Master_Handover_Book.pdf`) is provided directly in person to incoming technical leads, containing complete PostgreSQL schemas, Google Cloud failover topologies, HMAC ticket verification algorithms, and disaster recovery playbooks.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](file:///c:/Code/GenAI-Community-VITB-Website/LICENSE) for details.

*Engineered with ⚡ by the GenAI Community Technical Core Team at VIT Bhopal University.*
