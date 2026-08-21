# Generative AI Club — Official Campus Platform ⚡

[![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase)](https://supabase.com/)
[![Google Drive](https://img.shields.io/badge/Google_Drive-Media_Storage-4285F4?logo=google-drive)](https://developers.google.com/drive)
[![Google Sheets](https://img.shields.io/badge/Google_Sheets-Live_Audit_Sync-34A853?logo=google-sheets)](https://developers.google.com/sheets)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, high-performance web platform and event management engine engineered for the **Generative AI Community at VIT Bhopal University**. Features atomic event registration with instant UPI QR intent, payment verification, camera-driven ticket scanning, real-time Google Sheets logging, resilient image storage with offline fallback, and role-based administrative control.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema & Security](#-database-schema--security)
- [Google Cloud Integrations](#-google-cloud-integrations)
- [Getting Started & Local Development](#-getting-started--local-development)
- [Deployment (Vercel + Render)](#-deployment-vercel--render)
- [Security & Penetration Hardening](#-security--penetration-hardening)
- [Authors & Acknowledgments](#-authors--acknowledgments)

---

## 🏛 System Architecture

```text
                                [ User / Participant ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
             [ Public Site & Hub ]                  [ Event Registration ]
             - Homepage / Live Ticker               - Dynamic UPI QR Code
             - Interactive Team Tree                - Screenshot Proof Upload
             - Projects & Winners Showcases         - Rate-Limited (10 req/min)
                        │                                     │
                        │                                     ▼
                        │                            [ Next.js Server Actions ]
                        │                            - Zod Strict Validation
                        │                            - Server-side MIME checks
                        │                            - Role-based Auth Guards
                        │                                     │
       ┌────────────────┴─────────────────────────────────────┼──────────────────────────────┐
       ▼                                                      ▼                              ▼
 [ Supabase Postgres ]                                [ Google Drive ]              [ Google Sheets ]
 - Public Tables (Events, Teams, Members)             - Shared Drive Media          - 3-Workbook Split Architecture
 - Private Tables (Registrations, Payments, Audits)   - Fallback DB Data-URLs       - Real-time Fire & Forget Logging
 - Row-Level Security (RLS) policies                                                - Historical Bulk Sync Engine
```

---

## 🚀 Key Features

### 1. Public Portals & User Experience
- **Dynamic Hero Banner**: Displays upcoming/live events with thumbnail posters, pulsing status beacons, and direct registration CTAs.
- **Interactive Team Hierarchy Tree**: Visualizes executive leadership and 10+ official domain verticals with member cards and LinkedIn links.
- **Research & Projects**: Open-source models, tools, and repositories built by club members.
- **Podium & Winners Gallery**: Showcases champions from hackathons, ideathons, and coding challenges.
- **Kinetic Marquee Ticker**: GPU-accelerated smooth ticker highlighting core achievements and announcements.

### 2. Event Operations & Registration Engine
- **Atomic Registration Flow**: Captures student data, branch verification, and transaction identifiers.
- **Dynamic UPI QR Code**: Real-time QR generator with pre-filled transaction parameters and one-tap payment intent.
- **Live Ticket Scanner**: Built-in camera QR scanner (`/admin/scanner`) with manual fallback token check-ins.

### 3. Administrative Command Center (`/admin`)
- **Interactive Workspaces**: Unified tabs for managing Events, Teams, Members, Projects, Achievements, and Winners.
- **Finance Review Queue**: Verifiers inspect payment screenshots with high-resolution modal zoom, approving or rejecting with automated logs.
- **Community User Management**: Multi-team provisioning, custom role assignments, and account access controls.
- **Security & Audit Trail**: Real-time immutable record of all administrative operations.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Database & Auth**: [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS)
- **APIs & Storage**: Google Drive API v3, Google Sheets API v4, Gmail SMTP (Nodemailer)
- **Validation**: [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Project Directory Structure

```text
├── app/
│   ├── (public)/                 # Public routes (/, /about, /events, /projects, /team, /winners)
│   ├── admin/                    # Admin command center & specialized sub-portals
│   │   ├── audit/                # Audit trail & 1-click Google Sheets sync
│   │   ├── events/               # Event lifecycle & capacity settings
│   │   ├── finance/              # Registration queue & payment approvals
│   │   ├── scanner/              # Real-time QR check-in camera scanner
│   │   ├── users/                # User management & role provisioning
│   │   └── actions.ts            # Hardened Server Actions with audit logging
│   └── api/                      # Protected & public API route handlers
├── components/
│   ├── admin/                    # Admin managers, queues, modals, and charts
│   ├── events/                   # Dynamic UPI QR & registration forms
│   ├── site/                     # Navbar, Hero, Banners, Trees, and Tickers
│   └── ui/                       # Accessible UI building blocks
├── lib/
│   ├── auth/                     # Role hierarchies & session permission guards
│   ├── data/                     # Data access layers with React Server Caching
│   ├── google/                   # Google Drive storage & Sheets 3-workbook sync
│   ├── supabase/                 # Supabase server, admin, and client connectors
│   ├── types.ts                  # Shared TypeScript interfaces & club constants
│   └── validation.ts             # Zod input verification schemas
├── supabase/                     # SQL migration scripts & schema recovery files
├── .env.example                  # Environment configuration template
├── next.config.ts                # Next.js performance & remote image configuration
└── render.yaml                   # Background keepalive worker configuration
```

---

## 📊 Google Cloud Integrations

### 1. Resilient Image Upload Pipeline (`lib/google/drive.ts`)
- Automatically routes image uploads (avatars, event posters, payment proofs) to Google Shared Drive.
- If storage quota or permission constraints arise, uploads automatically fall back to high-fidelity Base64 data-URLs stored directly in Supabase Postgres. Images **never** fail to display.

### 2. 3-Workbook Split Architecture (`lib/google/sheets.ts`)
Operational data and logs are synced to three separate Google Spreadsheets:
1. **Event Operations Sheet**: Registrations, Payment Management, Attendance, Deleted Registrations.
2. **Website Logs Sheet**: System Audit Logs, User Management Log, Internal Management Log, Email Logs, System Failures.
3. **Internal Management Sheet**: Members Database, Branch Database, Events Database, Event Lifecycle Log, Event Winners.

---

## ⚙️ Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.18.0 or newer
- **npm** / **yarn** / **pnpm**
- Active **Supabase** project and **Google Cloud Service Account**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/GenAITechOfficial/GenAIClubWebsite.git
   cd GenAIClubWebsite
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and populate your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Initialize Database Schema**:
   Run the scripts in `supabase/schema.sql` and `supabase/fix_all_missing_tables.sql` inside your Supabase SQL Editor.

5. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Production Build Check**:
   ```bash
   npm run build
   ```

---

## 🚢 Deployment (Vercel + Render)

### Main Application (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Configure all environment keys from `.env.example` in **Project Settings → Environment Variables**.
3. Deploy. All 16 routes build cleanly with automatic edge optimization.

### Keepalive Service (Render)
1. Deploy `render.yaml` as a **Blueprint** on [Render](https://render.com).
2. Set `NEXT_PUBLIC_APP_URL` to your production Vercel URL to keep free-tier databases and endpoints warm.

---

## 🔒 Security & Penetration Hardening

- **MIME Type Whitelist**: Restricts file uploads exclusively to verified image formats (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, `image/svg+xml`) with strict 8MB ceiling.
- **Sanitized Health Endpoint**: `/api/health` exposes only operational health statuses without leaking infrastructure details.
- **Sliding-Window Rate Limiting**: Built-in IP throttling on `/api/register` preventing spam attacks.
- **Row-Level Security (RLS)**: Enforces zero-trust database policies at the Postgres engine level.
- **UUID Sanitization**: Client-side temporary IDs (`official-*`, `team-*`) are cleansed before database transactions.

---

## 👥 Authors & Acknowledgments

### Current Maintainers & Lead Developers
- **[Lakshya Kant](https://github.com/lakshyakant007)** (`lakshyakant007@gmail.com`) — *Platform Architecture, Security Hardening, Resilient Storage Pipeline, Google Sheets 3-Workbook Engine, and Full-Stack Implementation.*

### Original & Past Authors
- **[Ayush Mishra](https://github.com/AYUSHMISHRAOFFICIAL)** (`ayushmishra2005.official@gmail.com`) — *Initial Platform Blueprint, Starter Schemas, and Early Foundations.*

### Community & Organization
- **[Generative AI Community VIT Bhopal](https://github.com/GenAITechOfficial)** — *Core Executive Council, Technical Leads, and Contributing Student Members.*

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
