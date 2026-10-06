import { parseCSVRecords } from "./csv";

export interface ParsedRow {
  registrationId?: string;
  fullName: string;
  vitRegistrationNumber?: string;
  branch?: string;
  collegeEmail?: string;
  personalEmail?: string;
  email?: string;
  phoneNumber?: string;
  transactionId?: string;
  college?: string;
  amount?: number;
  paymentStatus?: string;
}


export function parseParticipantCSV(raw: string) {
    const lines = parseCSVRecords(raw);
    if (lines.length === 0) return [];

    const headers = lines[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split by comma ignoring commas inside quotes
      const values = lines[i].map(v => v.trim());
      if (values.length === 0 || !values.some(Boolean)) continue;

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });

      // 1. Full Name
      const fullName =
        rowObj.full_name ||
        rowObj.name ||
        rowObj.student_name ||
        rowObj.participant_name ||
        rowObj.candidate_name ||
        rowObj.applicant_name ||
        "";

      // 2. VIT Registration Number
      const vitReg =
        rowObj.vit_registration_number ||
        rowObj.vit_reg_no ||
        rowObj.vit_reg ||
        rowObj.reg_no ||
        rowObj.registration_no ||
        rowObj.roll_no ||
        rowObj.enrollment_no ||
        "";

      // 3. Branch
      const branch =
        rowObj.branch_name ||
        rowObj.branch ||
        rowObj.specialization ||
        rowObj.department ||
        rowObj.dept ||
        rowObj.degree ||
        "";

      // 4. College Email & Personal Email
      const collegeEmail =
        rowObj.college_email ||
        rowObj.vit_email ||
        rowObj.official_email ||
        rowObj.campus_email ||
        "";

      const personalEmail =
        rowObj.personal_email ||
        rowObj.gmail ||
        rowObj.personal_mail ||
        rowObj.email ||
        rowObj.mail_id ||
        rowObj.email_id ||
        "";

      // 5. Phone Number
      const phone =
        rowObj.phone_number ||
        rowObj.phone ||
        rowObj.mobile ||
        rowObj.contact ||
        rowObj.contact_number ||
        rowObj.mobile_number ||
        rowObj.whatsapp ||
        "";

      // 6. Transaction ID / UTR
      const transactionId =
        rowObj.transaction_id || rowObj.transaction_id__utr_ ||
        rowObj.utr ||
        rowObj.txn_id ||
        rowObj.payment_id ||
        rowObj.ref_no ||
        rowObj.reference_no ||
        rowObj.payment_ref ||
        rowObj.utr_number ||
        "";

      // 7. Registration ID
      const regId =
        rowObj.registration_id ||
        rowObj.reg_id ||
        rowObj.pass_id ||
        rowObj.ticket_id ||
        rowObj.registration_number ||
        undefined;

      // 8. College & Payment Details
      const college = rowObj.college || rowObj.college_name || rowObj.university || "VIT Bhopal University";
      const paymentStatus = rowObj.payment_status || rowObj.status || rowObj.approval_status || "pending";
      const amount = rowObj.amount || rowObj.fee || rowObj.registration_fee ? Number(rowObj.amount || rowObj.fee || rowObj.registration_fee) : undefined;

      const primaryEmail = personalEmail || collegeEmail;

      {
        rows.push({
          registrationId: regId,
          fullName,
          vitRegistrationNumber: vitReg ? vitReg.toUpperCase() : undefined,
          branch,
          collegeEmail: collegeEmail || (primaryEmail.includes("@vitbhopal.ac.in") ? primaryEmail : undefined),
          personalEmail: personalEmail || (!primaryEmail.includes("@vitbhopal.ac.in") ? primaryEmail : undefined),
          email: primaryEmail,
          phoneNumber: phone,
          transactionId: transactionId || undefined,
          college,
          amount,
          paymentStatus,
        });
      }
    }

    return rows;
  }
