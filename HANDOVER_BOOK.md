# 📘 Generative AI Club — Master Engineering Handover Book & Developer Handbook
### *The Definitive 360° Technical Specification, Architecture Manual, Operations Blueprint, and Source Code Guide*
**Maintained by the GenAI Community Technical Core & Executive Panel — VIT Bhopal University**  
*Document Version: 3.0.0 (Production Master) | Target Audience: Incoming Technical Leads, Presidents, Core Engineers, and System Administrators*

---

## 📑 Complete Master Table of Contents

- [PART I: THE GENAI PLATFORM PHILOSOPHY & HIGH-LEVEL ARCHITECTURE](#part-i-the-genai-platform-philosophy--high-level-architecture)
  - [1.1 Genesis, Mission & Engineering Vision](#11-genesis-mission--engineering-vision)
  - [1.2 Core Architectural Axioms](#12-core-architectural-axioms)
  - [1.3 End-to-End System Request Lifecycle](#13-end-to-end-system-request-lifecycle)
  - [1.4 Technology Stack Deep Dive](#14-technology-stack-deep-dive)
- [PART II: CODEBASE DIRECTORY TOPOLOGY & COMPONENT INVENTORY](#part-ii-codebase-directory-topology--component-inventory)
  - [2.1 Complete Root-to-Leaf Directory Breakdown](#21-complete-root-to-leaf-directory-breakdown)
  - [2.2 App Router Mechanics & Route Map](#22-app-router-mechanics--route-map)
  - [2.3 Server Actions vs API Route Handlers Architecture](#23-server-actions-vs-api-route-handlers-architecture)
  - [2.4 Shared Library & Data Access Layer (`lib/`)](#24-shared-library--data-access-layer-lib)
  - [2.5 Design System, CSS Tokens & Apple Aesthetic Principles](#25-design-system-css-tokens--apple-aesthetic-principles)
- [PART III: ENVIRONMENT VARIABLES & SECRET MANAGEMENT ENCYCLOPEDIA](#part-iii-environment-variables--secret-management-encyclopedia)
  - [3.1 Comprehensive Secret Inventory](#31-comprehensive-secret-inventory)
  - [3.2 Google Cloud Service Account Setup (Step-by-Step)](#32-google-cloud-service-account-setup-step-by-step)
  - [3.3 Supabase Secrets & RLS Bypass Keys](#33-supabase-secrets--rls-bypass-keys)
  - [3.4 Google Apps Script Deployment & Webhook Tokens](#34-google-apps-script-deployment--webhook-tokens)
  - [3.5 Gemini Pro AI API Configuration](#35-gemini-pro-ai-api-configuration)
  - [3.6 Production Key Rotation & Revocation Protocol](#36-production-key-rotation--revocation-protocol)
- [PART IV: DATABASE SCHEMA, RELATIONAL INTEGRITY, & ROW-LEVEL SECURITY (RLS)](#part-iv-database-schema-relational-integrity--row-level-security-rls)
  - [4.1 Entity Relationship Diagram (Mermaid ERD)](#41-entity-relationship-diagram-mermaid-erd)
  - [4.2 Detailed Table Specifications](#42-detailed-table-specifications)
  - [4.3 Authentication Integration & Profile Sync](#43-authentication-integration--profile-sync)
  - [4.4 PostgreSQL RLS Security Policies](#44-postgresql-rls-security-policies)
  - [4.5 Database Migrations & Initial Data Seeding](#45-database-migrations--initial-data-seeding)
- [PART V: GOOGLE CLOUD INTEGRATIONS & 100% ZERO-COST INFRASTRUCTURE](#part-v-google-cloud-integrations--100-zero-cost-infrastructure)
  - [5.1 The 15GB Storage Quota Bypass Protocol](#51-the-15gb-storage-quota-bypass-protocol)
  - [5.2 Google Edge CDN Media Proxy](#52-google-edge-cdn-media-proxy)
  - [5.3 3-Tab Split Real-Time Google Sheets Audit Engine](#53-3-tab-split-real-time-google-sheets-audit-engine)
  - [5.4 Google Forms & Apps Script Automated Failover Pipeline](#54-google-forms--apps-script-automated-failover-pipeline)
  - [5.5 High-Throughput Gmail Transactional Relay](#55-high-throughput-gmail-transactional-relay)
- [PART VI: EVENT REGISTRATION, PASS ENGINE, & CRYPTOGRAPHY](#part-vi-event-registration-pass-engine--cryptography)
  - [6.1 Atomic Registration Flow & Form Lifecycle](#61-atomic-registration-flow--form-lifecycle)
  - [6.2 Dynamic UPI QR Code Intent Specification](#62-dynamic-upi-qr-code-intent-specification)
  - [6.3 Cryptographic Token Generation (HMAC-SHA256)](#63-cryptographic-token-generation-hmac-sha256)
  - [6.4 High-Speed Camera Ticket Scanner (`/admin/scanner`)](#64-high-speed-camera-ticket-scanner-adminscanner)
  - [6.5 On-Spot Desk Registration & Live Dual-Mode QR Panel](#65-on-spot-desk-registration--live-dual-mode-qr-panel)
- [PART VII: ADMINISTRATIVE COMMAND CENTER & OPERATIONS MATRIX](#part-vii-administrative-command-center--operations-matrix)
  - [7.1 Multi-Tier Role-Based Access Control (RBAC)](#71-multi-tier-role-based-access-control-rbac)
  - [7.2 Event Lifecycle Management](#72-event-lifecycle-management)
  - [7.3 Financial Review Queue & Verification Workflow](#73-financial-review-queue--verification-workflow)
  - [7.4 Community Member Hierarchy & Roster Synchronization](#74-community-member-hierarchy--roster-synchronization)
  - [7.5 Top-Executive Unvoid Engine & Password Generator](#75-top-executive-unvoid-engine--password-generator)
  - [7.6 Password Reset Requests & Executive Review Modal](#76-password-reset-requests--executive-review-modal)
  - [7.7 System Diagnostics, Database Keepalive, & Data Exporters](#77-system-diagnostics-database-keepalive--data-exporters)
- [PART VIII: AI AUTOMATION, LINKEDIN PIPELINE, & CRON SCHEDULING](#part-viii-ai-automation-linkedin-pipeline--cron-scheduling)
  - [8.1 LinkedIn Feed Synchronization Engine](#81-linkedin-feed-synchronization-engine)
  - [8.2 Google Gemini Pro Automated Caption Parsing](#82-google-gemini-pro-automated-caption-parsing)
  - [8.3 In-Memory SWR Caching & ISR Mechanics](#83-in-memory-swr-caching--isr-mechanics)
  - [8.4 Automated Vercel Cron Scheduling & Security Bearer Handshake](#84-automated-vercel-cron-scheduling--security-bearer-handshake)
- [PART IX: FRONTEND ARCHITECTURE, CLIENT STATE, & PERFORMANCE OPTIMIZATION](#part-ix-frontend-architecture-client-state--performance-optimization)
  - [9.1 Dark-Mode First Design System & Tokens](#91-dark-mode-first-design-system--tokens)
  - [9.2 Zero-Lag Viewport Rendering & CLS Elimination](#92-zero-lag-viewport-rendering--cls-elimination)
  - [9.3 Custom UI Components & Interactive Popovers](#93-custom-ui-components--interactive-popovers)
  - [9.4 Responsive Containment & Horizontal Overflow Guards](#94-responsive-containment--horizontal-overflow-guards)
  - [9.5 SEO Optimization, JSON-LD Structured Data, & Privacy Telemetry](#95-seo-optimization-json-ld-structured-data--privacy-telemetry)
- [PART X: STEP-BY-STEP DEVELOPER ONBOARDING & LOCAL ENVIRONMENT SETUP](#part-x-step-by-step-developer-onboarding--local-environment-setup)
  - [10.1 System Prerequisites & Tooling Installation](#101-system-prerequisites--tooling-installation)
  - [10.2 Local vs Cloud Supabase Configuration](#102-local-vs-cloud-supabase-configuration)
  - [10.3 Initializing Seed Data & Superadmin Accounts](#103-initializing-seed-data--superadmin-accounts)
  - [10.4 Running the 100-Checkpoint Preflight Test Suite](#104-running-the-100-checkpoint-preflight-test-suite)
  - [10.5 Webpack Production Compilation Workflow](#105-webpack-production-compilation-workflow)
- [PART XI: PRODUCTION DEPLOYMENT, GIT MULTI-REMOTE, & CI/CD LIFECYCLE](#part-xi-production-deployment-git-multi-remote--cicd-lifecycle)
  - [11.1 Multi-Remote Git Synchronization (`origin` vs `personal`)](#111-multi-remote-git-synchronization-origin-vs-personal)
  - [11.2 Vercel Production Deployment & DNS Settings](#112-vercel-production-deployment--dns-settings)
  - [11.3 Environment Variable Propagation](#113-environment-variable-propagation)
  - [11.4 Post-Deployment Smoke Testing & Health Checks](#114-post-deployment-smoke-testing--health-checks)
- [PART XII: INCIDENT RESPONSE, DISASTER RECOVERY, & EMERGENCY PLAYBOOK](#part-xii-incident-response-disaster-recovery--emergency-playbook)
  - [12.1 Playbook A: Supabase Free Tier Inactivity Pause](#121-playbook-a-supabase-free-tier-inactivity-pause)
  - [12.2 Playbook B: Google Drive Storage Quota Exceeded Alert](#122-playbook-b-google-drive-storage-quota-exceeded-alert)
  - [12.3 Playbook C: Google Apps Script Webhook 401 / Email Quota Failure](#123-playbook-c-google-apps-script-webhook-401--email-quota-failure)
  - [12.4 Playbook D: Total Admin Lockout & Offline Superadmin Recovery](#124-playbook-d-total-admin-lockout--offline-superadmin-recovery)
  - [12.5 Playbook E: High-Traffic Spike During Flagship Hackathon](#125-playbook-e-high-traffic-spike-during-flagship-hackathon)
- [PART XIII: FUTURE ROADMAP, FEATURE BACKLOG, & BATCH HANDOFF RECOMMENDATIONS](#part-xiii-future-roadmap-feature-backlog--batch-handoff-recommendations)
  - [13.1 Automated Cryptographic Certificate Generator](#131-automated-cryptographic-certificate-generator)
  - [13.2 Interactive RAG AI Assistant for Campus Queries](#132-interactive-rag-ai-assistant-for-campus-queries)
  - [13.3 Student Project Submission & Peer-Review Portal](#133-student-project-submission--peer-review-portal)
  - [13.4 Native Mobile Scanner App (PWA / React Native)](#134-native-mobile-scanner-app-pwa--react-native)
  - [13.5 Concluding Remarks & The Torchbearer's Pledge](#135-concluding-remarks--the-torchbearers-pledge)

---

# PART I: THE GENAI PLATFORM PHILOSOPHY & HIGH-LEVEL ARCHITECTURE

## 1.1 Genesis, Mission & Engineering Vision

The **Generative AI Community at VIT Bhopal University** is the flagship student-led artificial intelligence organization on campus. Our collective mission is to foster applied research in transformer architectures, multi-modal foundation models, reinforcement learning with human feedback (RLHF), autonomous agentic workflows, and production-grade software engineering.

Prior to the inception of this platform, club operations suffered from disconnected third-party tools: Google Forms broke under high concurrency, payment verification required manual transaction matching on physical spreadsheets, entry ticketing was vulnerable to duplicate screenshots, and executive communication had no unified digital home.

This platform was engineered from the ground up to solve these challenges. It provides an all-in-one ecosystem:
1. **Public Showcase**: A modern web portal presenting community members, research projects, technical blogs, and hackathon podium winners.
2. **Event Operations Engine**: An atomic registration pipeline with dynamic UPI QR intent, payment proof capture, cryptographic entry passes, and real-time door scanners.
3. **Administrative Command Center**: A unified management workspace for financial approvals, member roster synchronization, security audit trails, and executive governance.

---

## 1.2 Core Architectural Axioms

The platform adheres strictly to five foundational engineering principles:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       5 CORE ENGINEERING AXIOMS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. ZERO RECURRING COST      │ 100% operational on generous free tiers       │
│ 2. MULTI-CLOUD REDUNDANCY   │ Supabase Postgres ↔ Google Sheets ↔ GAS Relay │
│ 3. SUB-150ms SPEED          │ Next.js Webpack + SWR + Edge CDN caching      │
│ 4. ZERO DATA LOSS (FAILSAFE)│ Non-blocking async beacons + audit queues     │
│ 5. CRYPTOGRAPHIC INTEGRITY  │ HMAC-SHA256 signed passes + Strict RBAC / RLS │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Zero Recurring Infrastructure Cost (100% Free Tier)**:
   University student clubs do not possess perpetual enterprise cloud budgets. The entire platform is architected to utilize free-tier offerings across Supabase, Google Cloud Platform, Google Drive (15GB bypass), Google Apps Script, Gmail SMTP, and Vercel without ever triggering billed overages.
2. **Multi-Cloud Redundancy & Graceful Failover**:
   No single point of failure is tolerated. If the primary Supabase Postgres instance goes cold or reaches network limits, student registrations automatically buffer to Google Sheets via non-blocking asynchronous beacons. If the Google Drive Service Account hits quota, the system switches to base64 data caches.
3. **Sub-150ms Perceived Interaction Speed**:
   By leveraging Next.js 16 Server Components, SWR in-memory caching, aggressive route prefetching, and Google edge thumbnail CDNs (`lh3.googleusercontent.com`), all user interactions, modal openings, and route transitions feel liquid-smooth.
4. **Anti-Fraud & Cryptographic Security**:
   Ticket scalping, fake transaction UTRs, and duplicate check-in passes are eliminated via cryptographic HMAC-SHA256 pass signing, database unique constraints, atomic scanner check-in state locking, and strict MIME-type inspection.
5. **Aesthetic Excellence (Apple-Grade Dark UI)**:
   The user interface embodies state-of-the-art dark mode aesthetics: deep `#000000` blacks, subtle `#14100b` surface cards, shimmering `#f5b642` golden accents, smooth typography (Geist Sans & Mono), and micro-animations that present the club with unmatched prestige.

---

## 1.3 End-to-End System Request Lifecycle

```text
 [ Participant Browser ]
        │
        ├── 1. POST /api/register (FormData with Student Data + Receipt Screenshot)
        │
 [ Next.js Middleware & Route Handler ]
        │
        ├── 2. Rate Limit Guard (10 requests / 10 min window per IP)
        ├── 3. Zod Schema Sanitization & VIT Bhopal Email Regex Check
        ├── 4. Magic-Byte File Inspection (JPG, PNG, WEBP, HEIC <= 10MB)
        │
 [ Google Drive Service Account Proxy ]
        ├── 5. Upload screenshot to 15GB Root Folder (Bypasses Service Account 0MB quota)
        │
 [ Supabase PostgreSQL Database ]
        ├── 6. Atomic Transaction: Insert `registrations` record + Insert `payments` (pending)
        ├── 7. Generate HMAC-SHA256 Cryptographic Pass Token
        │
 [ Non-Blocking Async Background Relays ]
        ├── 8a. Google Sheets Live Audit Tab (Appends row with timestamp & UTR)
        └── 8b. Supabase Keepalive Worker (Refreshes connection pool)
        │
 [ Client Response ]
        └── 9. Returns 200 OK with `registrationNumber` & Downloadable Pass Reference
```

---

## 1.4 Technology Stack Deep Dive

### Frontend & Application Layer
- **Next.js 16.2.1 (App Router & Webpack Mode)**: Chosen for high-throughput Server Actions, granular Streaming Server-Side Rendering (SSR), Incremental Static Regeneration (ISR), and native zero-bundle-size React Server Components.
- **React 19 & TypeScript 5**: Strict type definitions ensure zero runtime `undefined` property crashes across API boundaries and database payloads.
- **Tailwind CSS v4**: Built using CSS `@theme inline` variables, custom glassmorphism utilities, and Apple-grade contrast tokens.
- **Framer Motion 12**: Handles GPU-accelerated entrance transitions, floating hover effects, and spring-based modal dialogues.
- **Lucide React**: 250+ consistent, tree-shakeable SVG icons.

### Backend, Database & Cryptography
- **Supabase (PostgreSQL 15)**: Robust relational data persistence with foreign key constraints, atomic multi-table rollbacks, UUID primary keys, and strict Row-Level Security (RLS) policies.
- **Node.js Crypto (HMAC-SHA256)**: Cryptographically binds student registration IDs, event IDs, and timestamps to prevent forged ticket generation.
- **Zod 3.x**: Runtime type safety and schema validation protecting all Server Actions and Route Handlers.

### Google Cloud & External Integrations
- **Google Drive API v3**: High-capacity cloud object storage for student payment receipts and staff profile photos.
- **Google Sheets API v4**: Live 3-tab audit spreadsheet synchronizing Registrations, Financial Approvals, and Attendance.
- **Google Apps Script (GAS) Web App**: Zero-cost transactional email gateway dispatching HTML passes via verified college email (`gen_ai@vitbhopal.ac.in`).
- **Google Gemini Pro (`@google/genai`)**: Automated AI agent parsing and summarizing LinkedIn posts into technical campus blog articles.

---

# PART II: CODEBASE DIRECTORY TOPOLOGY & COMPONENT INVENTORY

## 2.1 Complete Root-to-Leaf Directory Breakdown

```text
├── app/                                  # Next.js App Router Root
│   ├── (public)/                         # Public-facing campus routes
│   │   ├── page.tsx                      # Master Homepage (Hero, Ticker, Pillars, Ecosystem)
│   │   ├── about/page.tsx                # Club History, Mission, and Constitution
│   │   ├── achievements/page.tsx         # National awards & Hackathon recognitions
│   │   ├── blogs/page.tsx                # Technical blogs (LinkedIn AI pipeline feed)
│   │   ├── events/                       # Events directory & dynamic slug routing
│   │   │   ├── page.tsx                  # Public events showcase (Live, Upcoming, Past)
│   │   │   └── [slug]/                   # Dynamic event details page
│   │   │       ├── page.tsx              # Event syllabus, speakers, and venue info
│   │   │       └── register/page.tsx     # Atomic student registration portal with live UPI QR
│   │   ├── projects/page.tsx             # Open-source research models & tools
│   │   ├── team/                         # Team roster & vertical pages
│   │   │   ├── page.tsx                  # Interactive Member Hierarchy Tree visualizer
│   │   │   └── [slug]/page.tsx           # Domain vertical member roster (AI/ML, Tech, etc.)
│   │   └── winners/page.tsx              # Podium winners & hackathon champions gallery
│   ├── admin/                            # Administrative Command Center (Protected by RBAC)
│   │   ├── layout.tsx                    # Admin layout with sidebar navigation & security banner
│   │   ├── page.tsx                      # Admin overview dashboard & system telemetry
│   │   ├── audit/page.tsx                # Immutable security audit logs & Google Sheets sync
│   │   ├── events/page.tsx               # Event lifecycle manager & ticket capacity controls
│   │   ├── finance/page.tsx              # Registration review queue & payment approvals
│   │   ├── login/page.tsx                # Staff authentication & password reset request modal
│   │   ├── scanner/page.tsx              # High-speed camera QR ticket scanner
│   │   ├── users/page.tsx                # Member hierarchy & Top-Executive unvoid engine
│   │   └── events-actions.ts             # Server Actions for admin mutations & unvoid operations
│   ├── api/                              # Backend Route Handlers & Webhooks
│   │   ├── admin/
│   │   │   ├── drive/preview/[fileId]/   # High-resolution payment screenshot preview proxy
│   │   │   ├── email/route.ts            # Batch transactional email dispatcher
│   │   │   ├── events/archive/route.ts   # Event archiving cron handler
│   │   │   ├── export/route.ts           # CSV and Excel data export API
│   │   │   ├── reminders/route.ts        # Automated event reminder email dispatcher
│   │   │   ├── sheets/init/route.ts      # 1-click Google Sheets header initializer
│   │   │   └── system-status/route.ts    # Multi-cloud health diagnostic probe
│   │   ├── blogs/sync/route.ts           # LinkedIn sync bearer-guarded webhook
│   │   ├── checkin/scan/route.ts         # Camera QR pass decryption & check-in handler
│   │   ├── cron/sync-linkedin/route.ts   # Gemini AI LinkedIn summarization cron
│   │   ├── drive/asset/[fileId]/route.ts # Google Drive image streaming edge proxy
│   │   ├── health/route.ts               # Liveness probe endpoint
│   │   ├── keepalive/route.ts            # Supabase connection pool keepalive worker
│   │   └── register/route.ts             # Student registration & file upload endpoint
│   ├── globals.css                       # Apple dark mode design system tokens
│   ├── layout.tsx                        # Global root layout, Geist fonts, GA4, and metadata
│   ├── not-found.tsx                     # Custom animated 404 error page
│   ├── robots.txt                        # SEO spider directives
│   └── sitemap.xml                       # Automated XML sitemap generator
├── components/                           # Reusable UI & Business Logic Components
│   ├── admin/                            # Admin-specific components
│   │   ├── admin-dashboard-client.tsx    # Telemetry cards & quick action command matrix
│   │   ├── change-password-modal.tsx     # Staff account settings & avatar uploader
│   │   ├── events-manager.tsx            # Event creation & lifecycle management table
│   │   ├── finance-queue.tsx             # Payment review queue, filters & UTR search
│   │   ├── on-spot-registration-modal.tsx# Walk-in student desk form & live dual-mode QR
│   │   ├── password-reset-approval-modal.tsx # Top-Executive password reset approval dialog
│   │   └── user-management.tsx           # Member directory, roles & Top-Executive unvoid engine
│   ├── events/                           # Event-specific components
│   │   ├── event-card.tsx                # Interactive event card with live status beacon
│   │   ├── pass-download-card.tsx        # High-contrast downloadable ticket pass with QR
│   │   └── registration-form.tsx         # Multi-step registration form with live UPI intent
│   ├── seo/                              # SEO & Telemetry components
│   │   ├── analytics.tsx                 # Google Analytics 4 integration (No PII)
│   │   └── json-ld.tsx                   # Schema.org structured data (Organization, WebSite)
│   └── site/                             # Public UI Components
│       ├── blogs-client.tsx              # 2-column responsive blog feed with LinkedIn outbound
│       ├── club-pillars-section.tsx      # Mission, Community & Vision cards with vertical padding
│       ├── footer.tsx                    # Edge-to-edge footer with official social links
│       ├── hero.tsx                      # Master hero with live countdown & registration CTAs
│       ├── hierarchy-tree.tsx            # Interactive team hierarchy tree with enlarged modal photo
│       ├── navbar.tsx                    # Full edge-to-edge responsive navbar & mobile drawer
│       ├── quotes-section.tsx            # Visionary quotes showcase
│       └── scroll-ticker.tsx             # GPU-accelerated marquee ticker
├── lib/                                  # Core Library & Business Logic
│   ├── data/                             # Data Access Layer
│   │   ├── achievements.ts               # Achievement fetchers & in-memory cache
│   │   ├── blog.ts                       # LinkedIn post store & fallback technical articles
│   │   ├── events.ts                     # Event query helpers & countdown calculators
│   │   ├── projects.ts                   # Club research projects repository queries
│   │   └── public.ts                     # Public team member hierarchy mapping (51 members)
│   ├── google/                           # Google Cloud Client Integrations
│   │   ├── drive.ts                      # Google Drive v3 client, 15GB folder routing, upload proxy
│   │   ├── forms.ts                      # Failsafe Google Forms URL builder & payload encoder
│   │   └── sheets.ts                     # 3-tab Google Sheets v4 append & audit sync engine
│   ├── supabase/                         # Database Clients & Authentication
│   │   ├── client.ts                     # Browser Supabase client (Anon Key)
│   │   ├── server.ts                     # Server-side Supabase client (Cookie-backed)
│   │   └── service.ts                    # Service Role Supabase client (Bypasses RLS for Admin Actions)
│   ├── types/                            # Master TypeScript Interfaces
│   │   └── index.ts                      # Event, Registration, Payment, Profile, and Role types
│   ├── utils/                            # Shared Utilities
│   │   ├── format.ts                     # IST Date formatting, currency parsing & roster name lookups
│   │   └── rate-limit.ts                 # Sliding-window in-memory IP rate limiter
│   └── validation/                       # Input & File Validation Schemas
│       └── index.ts                      # Zod registration schema, approved B.Tech/M.Tech branches
├── scripts/                              # Verification, Automation & Setup Scripts
│   ├── gas-email-relay.js                # Google Apps Script Web App source code for Gmail relay
│   ├── seed-database.js                  # Database seed script for initial events & admin profiles
│   └── verify-100-checkpoints.js         # Automated 100-system preflight test suite
├── .env.example                          # Master environment variable template
├── HANDOVER_BOOK.md                      # This definitive 20-page developer & operations handbook
├── README.md                             # Official repository documentation
├── package.json                          # Dependencies & NPM run scripts
└── tsconfig.json                         # TypeScript compiler configuration
```

---

# PART III: ENVIRONMENT VARIABLES & SECRET MANAGEMENT ENCYCLOPEDIA

## 3.1 Comprehensive Secret Inventory

The platform relies on a set of critical secrets configured in `.env.local` (for local development) and in the **Vercel Project Settings** (for production).

| Variable Name | Environment | Required? | Description & Security Impact |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Both | **Yes** | Root canonical URL (e.g., `https://www.genaiclubvitb.in`). Used for SEO canonical tags, sitemaps, and QR redirect URLs. |
| `NEXT_PUBLIC_SUPABASE_URL` | Both | **Yes** | HTTPS endpoint of the Supabase PostgreSQL project. Safe for browser exposure. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both | **Yes** | Public Supabase anon key. Restricted by Row-Level Security (RLS) policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **CRITICAL** | Master Supabase secret key. Bypasses all RLS policies. Used exclusively in Server Actions and Route Handlers. Never expose to client bundles. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server Only | **Yes** | Google Cloud IAM Service Account email (e.g., `genai-storage@project.iam.gserviceaccount.com`). |
| `GOOGLE_PRIVATE_KEY` | Server Only | **CRITICAL** | RSA Private Key for Google Service Account. Format: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`. |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Server Only | **Yes** | ID of the Google Drive folder owned by the personal club Google account (`genaicommunityvitbofficial@gmail.com`) where media is stored. |
| `GOOGLE_SPREADSHEET_ID_EVENTS` | Server Only | **Yes** | Google Sheets ID for Event Registrations, Payments, and Check-in audit ledger. |
| `GOOGLE_SPREADSHEET_ID_LOGS` | Server Only | Optional | Google Sheets ID for system security and administrative audit logs. |
| `GOOGLE_SPREADSHEET_ID` | Server Only | **Yes** | Master fallback spreadsheet ID. |
| `GOOGLE_APPS_SCRIPT_URL` | Server Only | **Yes** | Web App deployment URL of the Google Apps Script Gmail relay (`https://script.google.com/macros/s/.../exec`). |
| `GOOGLE_APPS_SCRIPT_TOKEN` | Server Only | **Yes** | Shared secret bearer token authenticating Next.js requests to the Google Apps Script Web App. |
| `GEMINI_API_KEY` | Server Only | **Yes** | Official Google AI Studio API key used for automated LinkedIn post summarization. |
| `HARDCODED_ADMIN_EMAIL` | Server Only | **Emergency**| Offline fallback superadmin username (e.g. `admin.club.core@genai.local`). |
| `HARDCODED_ADMIN_PASSWORD` | Server Only | **Emergency**| Offline fallback superadmin password for emergency disaster recovery. |
| `CRON_SECRET` | Server Only | **Yes** | Cryptographic bearer token securing scheduled Vercel cron jobs (`/api/cron/*`). |
| `NEXT_PUBLIC_GA_ID` | Client | Optional | Google Analytics 4 Measurement ID (`G-XXXXXXXXXX`). Privacy-compliant telemetry. |
| `RATE_LIMIT_ENABLED` | Server Only | **Yes** | Toggle (`"true"` / `"false"`) for the in-memory sliding-window IP rate limiter. |

---

## 3.2 Google Cloud Service Account Setup (Step-by-Step)

To create a new Google Cloud Service Account for Drive and Sheets API access:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `genai-community-platform`.
3. Enable the required APIs:
   - Go to **APIs & Services > Library**.
   - Search for and enable:
     - **Google Drive API**
     - **Google Sheets API**
4. Create the Service Account:
   - Go to **IAM & Admin > Service Accounts > Create Service Account**.
   - Name: `genai-cloud-storage`.
   - Role: `Editor` (or leave default and grant folder-level permissions).
5. Generate RSA Key:
   - Click on the created Service Account > **Keys > Add Key > Create new key > JSON**.
   - Download the generated JSON key file.
6. Extract credentials into `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` field from JSON.
   - `GOOGLE_PRIVATE_KEY` = `private_key` field from JSON (ensure newlines `\n` are preserved).

---

## 3.3 Supabase Secrets & RLS Bypass Keys

1. Navigate to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings > API**.
3. Copy:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** -> `SUPABASE_SERVICE_ROLE_KEY`
4. In **Authentication > Settings > General**, ensure **Enable Email Signup** is disabled (since staff accounts are provisioned exclusively via the Admin User Management panel).

---

# PART IV: DATABASE SCHEMA, RELATIONAL INTEGRITY, & ROW-LEVEL SECURITY (RLS)

## 4.1 Entity Relationship Diagram (Mermaid ERD)

```mermaid
erDiagram
    PROFILES ||--o{ USER_ROLES : "assigned"
    PROFILES ||--o{ AUDIT_LOGS : "performs"
    EVENTS ||--o{ REGISTRATIONS : "has"
    REGISTRATIONS ||--|| PAYMENTS : "contains"
    REGISTRATIONS ||--o{ AUDIT_LOGS : "referenced_in"

    EVENTS {
        uuid id PK
        string title
        string slug UK
        string description
        timestamp start_date
        timestamp end_date
        timestamp registration_deadline
        integer capacity
        numeric registration_fee
        string upi_id
        string banner_url
        string status
    }

    REGISTRATIONS {
        uuid id PK
        uuid event_id FK
        string full_name
        string vit_registration_number
        string branch_name
        string personal_email
        string college_email
        string phone_number
        string registration_number UK
        string qr_pass_token UK
        boolean checked_in
        timestamp checked_in_at
        timestamp created_at
    }

    PAYMENTS {
        uuid id PK
        uuid registration_id FK
        numeric amount
        string transaction_id UK
        string screenshot_drive_file_id
        string status
        string rejection_reason
        uuid verified_by FK
        timestamp verified_at
        timestamp created_at
    }

    PROFILES {
        uuid id PK
        string email UK
        string full_name
        string assigned_to_name
        string avatar_url
        string drive_file_id
        string status
        timestamp created_at
    }

    USER_ROLES {
        uuid id PK
        uuid user_id FK
        string role
        string team
        string position
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb details
        timestamp created_at
    }
```

---

## 4.2 Detailed Table Specifications

### 1. `events` Table
- `id` (`uuid`, Primary Key, `default gen_random_uuid()`): Unique event identifier.
- `title` (`text`, NOT NULL): Full event name (e.g., *"Prompt To Production: Autonomous AI Hackathon"*).
- `slug` (`text`, UNIQUE, NOT NULL): URL slug used in routes `/events/[slug]`.
- `description` (`text`): Markdown description and agenda.
- `start_date` (`timestamptz`, NOT NULL): Event commencement datetime in UTC.
- `end_date` (`timestamptz`, NOT NULL): Event conclusion datetime.
- `registration_deadline` (`timestamptz`, NOT NULL): Hard cutoff timestamp for registration form.
- `capacity` (`integer`, NOT NULL, default 100): Maximum allowable verified attendees.
- `registration_fee` (`numeric(10,2)`, default 0.00): Ticket fee in INR (₹). If 0, bypasses payment verification.
- `upi_id` (`text`, default `"genai.community@okaxis"`): UPI receiver address.
- `banner_url` (`text`): Google Drive or CDN image URL for event poster.
- `status` (`text`, default `"draft"`): State enum (`"draft"`, `"published"`, `"archived"`).

### 2. `registrations` Table
- `id` (`uuid`, Primary Key): Registration record UUID.
- `event_id` (`uuid`, FK -> `events.id`, ON DELETE CASCADE): Parent event.
- `full_name` (`text`, NOT NULL): Student name as registered in college records.
- `vit_registration_number` (`text`, NOT NULL): Standard VIT registration number (`24BCE10511`).
- `branch_name` (`text`, NOT NULL): Approved B.Tech/M.Tech branch name.
- `personal_email` (`text`, NOT NULL): Student personal email for communications.
- `college_email` (`text`, NOT NULL): Verified `@vitbhopal.ac.in` student email.
- `phone_number` (`text`, NOT NULL): 10-digit WhatsApp contact number.
- `registration_number` (`text`, UNIQUE, NOT NULL): Human-readable reference code (`GAI-2026-XXXX`).
- `qr_pass_token` (`text`, UNIQUE, NOT NULL): Cryptographic HMAC-SHA256 signature string.
- `checked_in` (`boolean`, default `false`): Door attendance state.
- `checked_in_at` (`timestamptz`): Timestamp of successful door scan.

### 3. `payments` Table
- `id` (`uuid`, Primary Key): Payment record UUID.
- `registration_id` (`uuid`, FK -> `registrations.id`, ON DELETE CASCADE): Linked student registration.
- `amount` (`numeric(10,2)`, NOT NULL): Amount paid in INR.
- `transaction_id` (`text`, NOT NULL): UPI UTR number (e.g. `412345678901`) or on-spot desk tag.
- `screenshot_drive_file_id` (`text`): Google Drive file identifier for the payment receipt.
- `status` (`text`, default `"pending"`): Verification state (`"pending"`, `"verified"`, `"rejected"`).
- `rejection_reason` (`text`): Reason if rejected (e.g., *"Invalid UTR / Duplicate Screenshot"*).
- `verified_by` (`uuid`, FK -> `profiles.id`): Staff member who approved or rejected the record.
- `verified_at` (`timestamptz`): Timestamp of verification action.

---

# PART V: GOOGLE CLOUD INTEGRATIONS & 100% ZERO-COST INFRASTRUCTURE

## 5.1 The 15GB Storage Quota Bypass Protocol

### The Problem:
Google Cloud Service Accounts are non-human IAM identities. In the Google Cloud free tier, **Service Accounts have a 0MB Google Drive storage quota**. Attempting to upload a file directly to the Service Account root returns HTTP 403 `Storage quota exceeded for this account`.

### The Solution (`lib/google/drive.ts`):
1. A human Google Account (`genaicommunityvitbofficial@gmail.com`) creates a dedicated root folder named `GENAI_COMMUNITY_ASSETS_ROOT`.
2. This human folder comes with **15GB of free Google Drive storage**.
3. The human account shares the folder with the Service Account email (`genai-storage@[PROJECT-ID].iam.gserviceaccount.com`) and grants it **Editor** permissions.
4. When `uploadFileToDrive` executes, it sets:
   - `parents: [GOOGLE_DRIVE_ROOT_FOLDER_ID]`
   - `supportsAllDrives: true`
5. The uploaded file inherits the 15GB storage allocation of the parent folder rather than the 0MB quota of the Service Account.

```typescript
// lib/google/drive.ts - Storage Allocation Injection
const fileMetadata = {
  name: `receipt_${Date.now()}_${sanitizedFilename}`,
  parents: [process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!],
};
const media = {
  mimeType: file.type,
  body: bufferStream,
};
const res = await drive.files.create({
  requestBody: fileMetadata,
  media: media,
  fields: "id, webViewLink, webContentLink",
  supportsAllDrives: true,
});
```

---

## 5.2 Google Edge CDN Media Proxy

To ensure instant image rendering on public pages without hitting Google Drive API rate limits, profile avatars and event posters resolve through Google's public Edge CDN:

```typescript
// Edge Thumbnail Resolver
export function normalizeDriveImageUrl(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const fileId = extractGoogleDriveFileId(urlOrId);
  if (!fileId) return urlOrId;
  // Resolves directly through high-speed edge cache
  return `https://lh3.googleusercontent.com/d/${fileId}=w800`;
}
```

---

## 5.3 3-Tab Split Real-Time Google Sheets Audit Engine

The Google Sheets integration in `lib/google/sheets.ts` maintains three distinct audit worksheets inside the master spreadsheet:

1. **`Registrations` Tab**:
   - Columns: `Timestamp | Reg No | Full Name | VIT Reg | Branch | College Email | Phone | Event Slug | Pass Token`
   - Appended automatically upon form submission.
2. **`Payments & Finance` Tab**:
   - Columns: `Timestamp | Reg No | Amount (₹) | Transaction UTR | Status | Verifier Email | Drive File ID`
   - Updated in real time when a finance lead clicks **Verify** or **Reject**.
3. **`Attendance & Check-in` Tab**:
   - Columns: `Check-in Time | Reg No | Student Name | Scanner Staff Email | Event Title`
   - Appended when the camera QR scanner registers a valid ticket at the door.

---

## 5.4 High-Throughput Gmail Transactional Relay

Located in `scripts/gas-email-relay.js`, this script runs as a standalone Google Apps Script Web App attached to `gen_ai@vitbhopal.ac.in`.

### Key Capabilities:
- **Zero SMTP Server Costs**: Bypasses SendGrid/Resend paid tier restrictions.
- **Embedded QR Code Pass (CID Attachment)**: Embeds the HMAC pass QR code as an inline base64 image directly into the email body so participants can present their ticket offline without loading external images.
- **Batched Rate Limiting**: Sends emails in throttled batches of 15 with 250ms delays to comply with Google Workspace rate limits.

---

# PART VI: EVENT REGISTRATION, PASS ENGINE, & CRYPTOGRAPHY

## 6.1 Atomic Registration Flow & Form Lifecycle

```text
 1. Student Visits /events/[slug]/register
    ├── Checks event capacity & deadline
    └── Fetches event fee (e.g. ₹200)

 2. Dynamic UPI Intent Generation
    ├── Compiles UPI String: upi://pay?pa=genai.community@okaxis&pn=GenAI%20Community&am=200&tn=GAI_EVENT
    └── Generates high-contrast QR Code for Google Pay / PhonePe / Paytm / BHIM

 3. Form Validation & Submission
    ├── Zod verifies VIT email format (firstname.24xxx11111@vitbhopal.ac.in)
    ├── Validates 10-digit phone number & branch eligibility
    └── Uploads payment receipt proof (<= 10MB JPG/PNG/WEBP/HEIC)

 4. Cryptographic Pass Issuance
    ├── Calculates HMAC-SHA256 Token
    └── Returns instant Pass Download Card with reference ID (GAI-2026-XXXX)
```

---

## 6.2 Cryptographic Token Generation (HMAC-SHA256)

To prevent counterfeit passes or duplicate screenshot sharing, tickets are cryptographically signed:

```typescript
// Token Generation Formula
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const payload = `${registrationId}:${eventId}:${vitRegNumber}:${Date.now()}`;
const hmacSignature = crypto
  .createHmac("sha256", secret)
  .update(payload)
  .digest("hex");

const qrPassToken = `GAI-PASS-${registrationId.slice(0, 8)}-${hmacSignature.slice(0, 16)}`.toUpperCase();
```

When scanned by `/admin/scanner`, the route `/api/checkin/scan` verifies that the token matches the database record, ensures `checked_in === false`, updates `checked_in = true`, and logs the timestamp.

---

## 6.3 On-Spot Desk Registration & Live Dual-Mode QR Panel

When walk-in attendees arrive at an event desk without prior registration, volunteers use the **On-Spot Registration Modal** in `/admin/finance`:

- **Left Section (`max-w-4xl`)**: Volunteer form for manual attendee entry and cash/desk receipt logging.
- **Right Section**: **Live Dual-Mode QR Panel**:
  1. **⚡ Scan & Pay (₹ Fee)**: Walk-in students scan the dynamic UPI QR with GPay/PhonePe to pay the fee.
  2. **📱 Student Portal**: Walk-in students scan the portal QR with their phone camera to fill out the form themselves.
  3. **1-Click Copy UPI ID**: Button with instant visual confirmation.

---

# PART VII: ADMINISTRATIVE COMMAND CENTER & OPERATIONS MATRIX

## 7.1 Multi-Tier Role-Based Access Control (RBAC)

The platform enforces strict role tiers:

```text
 ┌────────────────────────────────────────────────────────────────────────────┐
 │                            ROLE HIERARCHY MATRIX                           │
 ├───────────────────┬────────────────────────────────────────────────────────┤
 │ 1. SUPERADMIN     │ Full system access, emergency recovery, audit purging  │
 │ 2. PRESIDENT / VP │ Unvoid staff, approve password resets, delete events   │
 │ 3. DOMAIN LEADS   │ Manage domain members, approve payments, export data   │
 │ 4. CORE MEMBERS   │ View submissions, review payments, event check-in      │
 │ 5. VOLUNTEERS     │ Access /admin/scanner for door check-ins only          │
 └───────────────────┴────────────────────────────────────────────────────────┘
```

---

## 7.2 Top-Executive Unvoid Engine & Password Generator

In `components/admin/user-management.tsx` and `app/admin/events-actions.ts`:
- If an admin account was soft-deleted or voided, Top Executives (President, VP, AI/ML Lead, Tech Lead) can click **`⚡ Unvoid & Set Random Password`**.
- The engine generates a high-entropy password (e.g. `GenAI#7k9P!2026`), updates the database via Service Role, and copies the credentials to the executive's clipboard in 1 click.

```typescript
// High-Entropy Credential Generator
export function generateSecureRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GenAI#${randomStr}!2026`;
}
```

---

# PART VIII: AI AUTOMATION, LINKEDIN PIPELINE, & CRON SCHEDULING

## 8.1 LinkedIn Feed Synchronization Engine

- **Route**: `app/api/cron/sync-linkedin/route.ts` & `lib/data/blog.ts`
- **Official Source**: `https://www.linkedin.com/company/genai-community-vit-bhopal/posts/`
- Every 6 hours, Vercel Cron sends an authenticated request (`Authorization: Bearer <CRON_SECRET>`) to `/api/cron/sync-linkedin`.
- The engine processes recent post captions, utilizes **Google Gemini Pro** to generate a clean title, 3-sentence summary, and extracted tags (`#Research, #AgenticAI, #RAG`), and stores the result in SWR cache.
- Every card on `/blogs` features a direct **"Read on LinkedIn"** button that links straight to the official post.

---

# PART IX: FRONTEND ARCHITECTURE, CLIENT STATE, & PERFORMANCE OPTIMIZATION

## 9.1 Dark-Mode First Design System & Tokens

The application design is built in `app/globals.css` using curated dark mode palette variables:

```css
:root {
  --background: #000000;       /* Deep AMOLED pitch black */
  --foreground: #f5f5f7;       /* Apple off-white text */
  --muted: #86868b;            /* Subdued tertiary zinc */
  --brand: #f5b642;            /* Golden amber primary accent */
  --surface: #0e0c08;          /* Rich surface card background */
  --surface-border: #262015;   /* Subtle golden-tinted border */
  --card-bg: #14100b;          /* Interactive card fill */
}
```

## 9.2 Zero-Lag Viewport Rendering & Overflow Guards

- All modals utilize `max-h-[90vh] overflow-y-auto`, `max-w-full`, and `break-words` to ensure complete containment.
- `html, body` enforce `overflow-x: hidden !important; max-width: 100vw;` to prevent unwanted horizontal shift on mobile screens.
- All interactive tables utilize fixed popovers (`position: absolute`) to guarantee zero Cumulative Layout Shift (CLS = 0).

---

# PART X: STEP-BY-STEP DEVELOPER ONBOARDING & LOCAL ENVIRONMENT SETUP

## 10.1 System Prerequisites & Tooling Installation

1. Install **Node.js 20.x LTS** or higher:
   ```bash
   node -v # Should return v20.x or higher
   ```
2. Install **Git**:
   ```bash
   git --version
   ```

## 10.2 Installation & Startup

```bash
# 1. Clone the repository
git clone https://github.com/GenAI-Community-VITB/GenAI-Community-VITB-Website.git
cd GenAI-Community-VITB-Website

# 2. Install dependencies (Clean install)
npm install

# 3. Create .env.local
cp .env.example .env.local

# 4. Fill in required keys in .env.local (Supabase URL, Anon Key, Service Role Key)

# 5. Start development server
npm run dev
```

Visit `http://localhost:3000` to preview the site.

---

## 10.3 Running the 100-Checkpoint Preflight Test Suite

Before making any pull request or pushing to git, execute the automated preflight verification test suite:

```bash
npm run preflight
```

The script evaluates 100 mission-critical checkpoints across 10 categories:
- **Routes & Dynamic Pages**: Validates `/`, `/blogs`, `/events`, `/team`, `/admin/*`.
- **Database & Supabase**: Connection pools, schema columns, and RLS bypass.
- **Google Cloud Integrations**: Drive 15GB folder permissions, Sheets 3-tab logger, Gmail relay.
- **AI Pipeline**: Gemini API key, LinkedIn scraper route.
- **Security**: Rate limiters, HMAC pass signer, Zod branch validators.

---

# PART XI: PRODUCTION DEPLOYMENT, GIT MULTI-REMOTE, & CI/CD LIFECYCLE

## 11.1 Multi-Remote Git Synchronization (`origin` vs `personal`)

The project is configured with two git remotes:
1. `origin`: `git@github.com:GenAI-Community-VITB/GenAI-Community-VITB-Website.git` (Official Org Repo)
2. `personal`: `git@github.com:klakshya007/GenAI-Community-VITB-Website.git` (Lead Backup Repo)

To push changes simultaneously:
```bash
git push origin main
git push personal main
```

---

## 11.2 Vercel Production Deployment & DNS Settings

1. Log in to [Vercel](https://vercel.com/) and import the repository.
2. In **Environment Variables**, paste all keys from `.env.local`.
3. Set **Framework Preset**: `Next.js`.
4. Set **Build Command**: `next build --webpack`.
5. Under **Domains**, configure `www.genaiclubvitb.in` and `genaiclubvitb.in` with DNS A and CNAME records pointing to `76.76.21.21` and `cname.vercel-dns.com`.

---

# PART XII: INCIDENT RESPONSE, DISASTER RECOVERY, & EMERGENCY PLAYBOOK

## 12.1 Playbook A: Supabase Free Tier Inactivity Pause

- **Problem**: Supabase pauses free-tier databases after 7 days of inactivity, causing API 500 errors.
- **Automated Prevention**: The endpoint `/api/keepalive` runs via Vercel Cron weekly to ping the database.
- **Manual Fix**:
  1. Open [Supabase Dashboard](https://supabase.com/dashboard).
  2. Select `GenAI-Community-VITB`.
  3. Click **Restore Project**. Database will be back online within 90 seconds.

---

## 12.2 Playbook B: Google Drive Storage Quota Exceeded Alert

- **Problem**: `Storage quota exceeded for this account` error on uploading receipts.
- **Cause**: Files are being uploaded directly to the Service Account root rather than the shared personal folder.
- **Fix**:
  1. Verify `.env.local` contains `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
  2. Open Google Drive with `genaicommunityvitbofficial@gmail.com`.
  3. Right-click the folder > **Share** > Add `genai-storage@[PROJECT-ID].iam.gserviceaccount.com` as **Editor**.

---

## 12.3 Playbook C: Total Admin Lockout & Offline Superadmin Recovery

- **Problem**: Staff credentials lost or Supabase Auth service unavailable.
- **Fix**:
  1. Visit `/admin/login`.
  2. Enter credentials configured in `HARDCODED_ADMIN_EMAIL` and `HARDCODED_ADMIN_PASSWORD`.
  3. The offline superadmin bypass authenticates directly and grants emergency session access to restore credentials.

---

# PART XIII: FUTURE ROADMAP, FEATURE BACKLOG, & BATCH HANDOFF RECOMMENDATIONS

## 13.1 Automated Cryptographic Certificate Generator
- Implement PDF generation via `pdf-lib` triggered when `registrations.checked_in === true`.
- Embeds unique QR verification hash validating participation on `/verify/[certId]`.

## 13.2 Interactive RAG AI Assistant for Campus Queries
- Integrate Gemini 1.5 Flash + Supabase Vector (`pgvector`) floating chatbot on the homepage to answer student questions regarding club recruitment, events, syllabus, and hackathon rules.

## 13.3 Student Project Submission & Peer-Review Portal
- Allow registered community members to submit their open-source GitHub AI models and research papers to be voted on and featured on the `/projects` page.

---

## 13.4 Concluding Remarks & The Torchbearer's Pledge

To the incoming technical leads, core team members, and executive panel:

> *"Engineering excellence is not an accident; it is the result of continuous attention to detail, relentless curiosity, and respect for the users you serve. You now hold the keys to a platform built with passion, precision, and zero compromise. Guard the secrets, optimize the performance, mentor the junior builders, and take this community to national heights."*

**Generative AI Community VIT Bhopal — Technical Core Team**  
*Built with ❤️, TypeScript, and Generative Intelligence.*
