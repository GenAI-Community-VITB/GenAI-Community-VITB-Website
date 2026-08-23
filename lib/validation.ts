import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Existing Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  team_id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  role: z.string().min(1, "Role is required").max(200),
  position: z.string().min(1, "Position is required").max(200),
  linkedin_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  image_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  status: z.enum(["pending", "active"]).default("active"),
});

export const teamSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  description: z.string().max(3000).optional().nullable().or(z.literal("")),
  image_url: z.string().max(2000).optional().nullable().or(z.literal("")),
});

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  short_description: z.string().max(2000).optional().nullable().or(z.literal("")),
  image_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  github_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  live_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  blog_url: z.string().max(2000).optional().nullable().or(z.literal("")),
});

export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().max(200).optional().nullable(),
  description: z.string().max(5000).optional().or(z.literal("")).default(""),
  venue: z.string().min(1, "Venue is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  registration_fee: z.coerce.number().min(0).default(200),
  max_capacity: z.coerce.number().int().positive().default(2000),
  registration_deadline: z.string().nullable().optional(),
  event_start_time: z.string().nullable().optional(),
  event_end_time: z.string().nullable().optional(),
  is_registration_open: z.boolean().default(true),
  status: z.enum(["upcoming", "live", "past"]).default("upcoming"),
  image_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  register_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  upi_id: z.string().max(200).optional().nullable().or(z.literal("")),
  upi_qr_image_url: z.string().max(2000).optional().nullable().or(z.literal("")),
  guidelines: z.union([z.array(z.string()), z.string()]).optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Platform Validation Helpers & Regexes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VIT Bhopal Registration Number format:
 * 2 digits (year e.g. 24) + 3 alphabets (branch code e.g. BCE) + 5 digits (serial e.g. 10549)
 * Example: 24BCE10549
 */
export const VIT_REG_NUMBER_REGEX = /^[0-9]{2}[A-Za-z]{3}[0-9]{5}$/;

/**
 * Indian 10-digit mobile number: starts with 6, 7, 8, or 9 followed by 9 digits
 */
export const INDIAN_PHONE_REGEX = /^[6-9][0-9]{9}$/;

/**
 * General safe transaction ID: 4 to 64 alphanumeric characters, hyphens, underscores
 */
export const TRANSACTION_ID_REGEX = /^[A-Za-z0-9\-_]{4,64}$/;

/**
 * Approved B.Tech Branches for VIT Bhopal (BTECH <BRANCH> (<SPECIALIZATION>) format)
 */
export const APPROVED_BTECH_BRANCHES = [
  "BTECH CSE (Core)",
  "BTECH CSE (AI & ML)",
  "BTECH CSE (Cloud)",
  "BTECH CSE (Cyber Security)",
  "BTECH CSE (Gaming)",
  "BTECH CSE (Health Informatics)",
  "BTECH CSE (E-Commerce)",
  "BTECH CSE (EdTech)",
  "BTECH CSE (AI & Leadership)",
  "BTECH ECE (Core)",
  "BTECH ECE (AI & Cybernetics)",
  "BTECH Electrical & Computer",
  "BTECH Mechanical (Core)",
  "BTECH Mechanical (AI & Robotics)",
  "BTECH Aerospace",
  "BTECH Bioengineering",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Student Registration Schema
// ─────────────────────────────────────────────────────────────────────────────

export const studentRegistrationSchema = z.object({
  event_id: z.string().uuid("Invalid event selected"),
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  vit_registration_number: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .refine((val) => VIT_REG_NUMBER_REGEX.test(val), {
      message: "Please enter a valid VIT registration number such as 24XXX11111",
    }),
  branch_name: z
    .string()
    .trim()
    .refine((val) => APPROVED_BTECH_BRANCHES.includes(val as any), {
      message: "Please select an eligible B.Tech branch from the dropdown",
    }),
  branch_id: z.string().uuid().optional().nullable(),
  personal_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid personal email address")
    .refine(
      (email) => {
        const domain = email.split("@")[1];
        return domain === "gmail.com";
      },
      {
        message: "Personal email must be a Gmail address (@gmail.com)",
      },
    ),
  college_email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid college email address")
    .refine(
      (email) => {
        const domain = email.split("@")[1];
        return domain === "vitbhopal.ac.in";
      },
      {
        message: "College email must end with @vitbhopal.ac.in",
      },
    ),
  phone_number: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-\+]/g, "").replace(/^91/, ""))
    .refine((val) => INDIAN_PHONE_REGEX.test(val), {
      message: "Please enter a valid 10-digit Indian mobile number",
    }),
  transaction_id: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ""))
    .refine((val) => TRANSACTION_ID_REGEX.test(val), {
      message: "Please enter a valid transaction ID (alphanumeric, min 4 characters)",
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Payment Screenshot File Validation
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_PAYMENT_SCREENSHOT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function validatePaymentScreenshotFile(file: File | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!file || file.size === 0) {
    return { valid: false, error: "Payment screenshot is mandatory." };
  }

  if (file.size > MAX_PAYMENT_SCREENSHOT_SIZE_BYTES) {
    return {
      valid: false,
      error: "Screenshot file exceeds the 2 MB limit. Please upload a smaller image.",
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a clear JPG, PNG, or WEBP payment screenshot under 2 MB.",
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return {
      valid: false,
      error: "Invalid file extension. Allowed extensions are .jpg, .jpeg, .png, .webp.",
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance Payment Review Schema
// ─────────────────────────────────────────────────────────────────────────────

export const REJECTION_REASONS = [
  "Transaction ID invalid",
  "Amount not ₹200",
  "Transaction not found",
  "Screenshot unclear",
  "Duplicate transaction",
  "Other",
] as const;

export const paymentReviewSchema = z.object({
  payment_id: z.string().uuid("Invalid payment ID"),
  registration_id: z.string().uuid("Invalid registration ID"),
  action: z.enum(["approve", "reject"]),
  rejection_reason: z
    .enum(REJECTION_REASONS)
    .optional(),
  rejection_explanation: z
    .string()
    .max(500)
    .optional(),
}).refine(
  (data) => {
    if (data.action === "reject" && !data.rejection_reason) {
      return false;
    }
    return true;
  },
  {
    message: "A rejection reason is required when rejecting a payment",
    path: ["rejection_reason"],
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Email Schema
// ─────────────────────────────────────────────────────────────────────────────

export const customEmailSchema = z.object({
  registration_id: z.string().uuid().optional(),
  recipient_email: z.string().email("Invalid recipient email"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().min(5, "Message must be at least 5 characters").max(5000),
});

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Override Schema
// ─────────────────────────────────────────────────────────────────────────────

export const checkinOverrideSchema = z.object({
  qr_token: z.string().min(6, "QR token is required"),
  override_reason: z
    .string()
    .trim()
    .min(5, "A mandatory reason (at least 5 characters) is required for overrides")
    .max(500),
});

export const registrationSchema = studentRegistrationSchema;

// ─────────────────────────────────────────────────────────────────────────────
// User Management Schema
// ─────────────────────────────────────────────────────────────────────────────

export const userManagementSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(2, "Full name is required").max(100),
  role: z.string().min(2),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  is_active: z.boolean().default(true),
});

export { generateSecureQRToken } from "@/lib/qr/generator";

