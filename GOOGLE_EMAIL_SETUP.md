# 📧 Free Google Apps Script + Gmail Transactional Email Engine Setup

This guide explains how to deploy the **100% Free** Google Apps Script Web App relay to send transactional emails (registration confirmations, payment approvals, QR entry passes, payment rejections, and reminders) directly via Gmail without any external paid services.

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Open Google Apps Script
1. Open your browser and go to [https://script.google.com/](https://script.google.com/).
2. Log in with your club Google account (e.g. `genaicommunityvitbofficial@gmail.com` or your club domain account).
3. Click **+ New Project** at the top left.
4. Rename the project at the top to: **`GENAI Community Email Web App`**.

---

### Step 2: Paste the Relay Code (`Code.gs`)
1. In the Apps Script code editor, delete any placeholder code in `Code.gs`.
2. Open [`Code.gs`](file:///c:/Code/GenAI-Community-VITB-Website/Code.gs) from this repository and copy all the code.
3. Paste the code into the Apps Script editor.
4. Click the **💾 Save** icon (or press `Ctrl + S`).

---

### Step 3: Configure Authentication Secret Token (Optional but Recommended)
1. In Google Apps Script, click on the **⚙️ Project Settings** (gear icon) on the left sidebar.
2. Scroll down to **Script Properties** and click **Add script property**.
3. Add:
   - **Property:** `AUTH_TOKEN`
   - **Value:** Choose a strong secret token (e.g. `GENAI_GAS_EMAIL_SECRET_2026` or your own random key).
4. Click **Save script properties**.

---

### Step 4: Deploy as a Web App
1. At the top right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon **Select type** and choose **Web app**.
3. Configure the deployment settings:
   - **Description:** `GENAI Production Email Relay v1.0`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Crucial: This allows your website backend server to send POST requests securely with your secret token)*.
4. Click **Deploy**.
5. When prompted, click **Authorize access**, select your Google account, click **Advanced → Go to GENAI Community Email Web App (unsafe)**, and grant the required Gmail permissions.
6. Copy the generated **Web App URL** (it looks like: `https://script.google.com/macros/s/AKfycbx.../exec`).

---

### Step 5: Add Environment Variables to Your Production Hosting (Vercel / Render / .env.local)

Add these variables to your environment:

```env
# Google Apps Script + Gmail Transactional Email Engine
GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"
GOOGLE_APPS_SCRIPT_TOKEN="GENAI_GAS_EMAIL_SECRET_2026"
EMAIL_SENDER_NAME="GENAI Community VIT Bhopal"
EMAIL_REPLY_TO="gen_ai@vitbhopal.ac.in"
EMAIL_BATCH_SIZE="15"
EMAIL_DELAY_MS="250"
EMAIL_MAX_RETRIES="3"
```

---

## 🧪 Testing Your Google Apps Script Email Relay

### Quick Test via cURL or PowerShell:

```bash
# PowerShell Test Command:
Invoke-RestMethod -Uri "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"token":"GENAI_GAS_EMAIL_SECRET_2026","to":"your-email@gmail.com","subject":"Test Email from GENAI","html":"<h1>Email Relay Operational!</h1><p>Sent via Google Apps Script + Gmail.</p>"}'
```

**Expected JSON Response:**
```json
{
  "success": true,
  "messageId": "gas-1740000000000-123456",
  "timestamp": "2026-08-26T17:15:00.000Z",
  "recipient": "your-email@gmail.com"
}
```

---

## 📊 Google Daily Quota Reference

| Google Account Type | Daily Email Quota | Supported Hourly Throughput |
| :--- | :--- | :--- |
| **Free Personal Gmail (`@gmail.com`)** | **100 – 500 emails / day** | ~100 emails/hour in throttled batches |
| **Google Workspace Account (Custom Domain)** | **1,500 – 2,000 emails / day** | ~500 emails/hour in throttled batches |

> **Note on High-Volume Campaigns:**  
> The system's built-in queueing engine automatically processes bulk emails in batches of `15` with `250ms` delays to avoid exceeding Gmail bursts and prevent rate limiting.
