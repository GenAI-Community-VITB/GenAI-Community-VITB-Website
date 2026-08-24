export type EventStatus = "draft" | "active" | "upcoming" | "live" | "completed" | "past" | "archived";

export type Top6Role =
  | "president"
  | "vice_president"
  | "technical_lead"
  | "technical_co_lead"
  | "aiml_lead"
  | "aiml_co_lead";

export type ClubTeam =
  | "panel"
  | "human_resources"
  | "event_management"
  | "design_team"
  | "aiml_innovation_team"
  | "social_media_team"
  | "pr_outreach_team"
  | "technical_team"
  | "content_team"
  | "finance_team";

export type PanelPosition =
  | "president"
  | "vice_president"
  | "general_secretary_provisional"
  | "general_secretary"
  | "joint_secretary"
  | "assistant_secretary"
  | "student_coordinator";

export type StandardPosition = "lead" | "co_lead" | "core_member";

export type ClubPosition = PanelPosition | StandardPosition;

export type UserRole = "tech" | "finance" | "volunteer" | Top6Role | ClubPosition;

export type RegistrationSource = "online" | "on_spot";

export type RegistrationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "cancelled"
  | "checked_in";

export type PaymentStatus = "pending" | "verified" | "rejected";

export type CheckinStatus =
  | "approved"
  | "rejected_already_checked_in"
  | "rejected_invalid_time"
  | "rejected_unverified"
  | "overridden";

export type EmailType =
  | "submission_received"
  | "payment_approved_qr"
  | "payment_rejected"
  | "custom_email"
  | "finance_reminder"
  | "password_reset_otp"
  | "login_security_alert"
  | "system_alert"
  | "test_email";

export interface EventVolunteer {
  id: string;
  event_id: string;
  user_id: string;
  assigned_by?: string | null;
  assigned_at: string;
  user?: UserProfile;
}

export interface MemberRoleAssignment {
  id?: string;
  user_id?: string;
  team: ClubTeam | string;
  position: ClubPosition | string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  assigned_to_name?: string | null;
  avatar_url?: string | null;
  drive_file_id?: string | null;
  password?: string | null;
  role: UserRole;
  is_active: boolean;
  is_voided?: boolean;
  voided_at?: string | null;
  voided_reason?: string | null;
  roles?: MemberRoleAssignment[];
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  role: string;
  position: string;
  linkedin_url: string | null;
  image_url: string | null;
  status: "pending" | "active";
  created_at: string;
  updated_at: string;
  team?: Team;
  roles?: MemberRoleAssignment[];
}

export interface Project {
  id: string;
  title: string;
  short_description: string;
  image_url: string | null;
  github_url: string | null;
  live_url: string | null;
  blog_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  slug?: string | null;
  description: string;
  venue: string;
  event_date: string;
  registration_fee: number;
  max_capacity: number;
  registration_deadline?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  is_registration_open: boolean;
  status: EventStatus;
  image_url: string | null;
  register_url: string | null;
  upi_id?: string | null;
  upi_qr_image_url?: string | null;
  guidelines?: string[] | string | null;
  registered_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EventStatistics {
  event_id: string;
  registered_count: number;
  approved_count: number;
  pending_count: number;
  attended_count: number;
  updated_at: string;
}

export interface Registration {
  id: string;
  registration_number: string;
  event_id: string;
  full_name: string;
  vit_registration_number: string;
  branch_id?: string | null;
  branch_name: string;
  college?: string;
  course?: string;
  academic_year?: string;
  personal_email: string;
  college_email: string;
  phone_number: string;
  registration_source: RegistrationSource;
  registration_status: RegistrationStatus;
  qr_token?: string | null;
  qr_generated_at?: string | null;
  override_reason?: string | null;
  overridden_by?: string | null;
  created_at: string;
  updated_at: string;
  event?: Event;
  payment?: Payment;
}

export interface DeletedRegistration {
  id: string;
  original_registration_id: string;
  registration_number: string;
  event_id?: string | null;
  full_name: string;
  vit_registration_number: string;
  branch_name: string;
  personal_email: string;
  college_email: string;
  phone_number: string;
  registration_source: RegistrationSource;
  payment_status: string;
  deleted_by?: string | null;
  deleted_by_name?: string | null;
  deleted_by_role?: string | null;
  deletion_reason?: string | null;
  deleted_at_ist: string;
  raw_data?: Record<string, unknown>;
  created_at: string;
}

export interface Payment {
  id: string;
  registration_id: string;
  event_id: string;
  amount: number;
  transaction_id: string;
  payment_status: PaymentStatus;
  drive_file_id: string;
  drive_file_name: string;
  drive_mime_type: string;
  drive_folder_id: string;
  drive_view_url?: string | null;
  rejection_reason?: string | null;
  rejection_explanation?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  registration?: Registration;
}

export interface Checkin {
  id: string;
  registration_id: string;
  event_id: string;
  scanned_by: string;
  scanned_by_name?: string | null;
  scanned_by_role?: string | null;
  status: CheckinStatus;
  is_override: boolean;
  override_reason?: string | null;
  scan_timestamp: string;
  registration?: Registration;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  registration_id?: string | null;
  event_id?: string | null;
  recipient_email: string;
  email_type: EmailType;
  subject: string;
  sender_id?: string | null;
  sender_role?: string | null;
  status: "sent" | "failed";
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  sent_at: string;
}

export interface SyncFailure {
  id: string;
  service: string;
  operation: string;
  payload: Record<string, unknown>;
  error_message: string;
  retry_count: number;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

// ─── CLUB HIERARCHY CONSTANTS ───────────────────────────────────────────────

export const CLUB_TEAMS: { id: ClubTeam; name: string; description: string }[] = [
  { id: "panel", name: "Panel", description: "Executive leadership and governing body of GenAI Club." },
  { id: "technical_team", name: "Technical Team", description: "Core web, backend, and software engineering division." },
  { id: "aiml_innovation_team", name: "AI/ML & Innovation Team", description: "Cutting-edge AI research, LLM labs, and ML projects." },
  { id: "event_management", name: "Event Management", description: "End-to-end logistics, venue ops, and event execution." },
  { id: "finance_team", name: "Finance Team", description: "Payment approvals, budget allocation, and financial auditing." },
  { id: "design_team", name: "Design Team", description: "Visual identity, UI/UX, branding, and motion design." },
  { id: "human_resources", name: "Human Resources", description: "Member recruitment, internal coordination, and culture." },
  { id: "social_media_team", name: "Social Media Team", description: "Public engagement, digital campaigns, and community reach." },
  { id: "pr_outreach_team", name: "PR & Outreach Team", description: "Sponsorships, external partnerships, and guest speaker relations." },
  { id: "content_team", name: "Content Team", description: "Technical writing, newsletters, documentation, and blog curation." },
];

export const TEAM_POSITIONS: Record<ClubTeam, { id: ClubPosition; title: string }[]> = {
  panel: [
    { id: "president", title: "President" },
    { id: "vice_president", title: "Vice President" },
    { id: "general_secretary_provisional", title: "General Secretary (Provisional)" },
    { id: "general_secretary", title: "General Secretary" },
    { id: "joint_secretary", title: "Joint Secretary" },
    { id: "assistant_secretary", title: "Assistant Secretary" },
    { id: "student_coordinator", title: "Student Coordinator" },
  ],
  technical_team: [
    { id: "lead", title: "Technical Lead" },
    { id: "co_lead", title: "Technical Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  aiml_innovation_team: [
    { id: "lead", title: "AI/ML Lead" },
    { id: "co_lead", title: "AI/ML Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  event_management: [
    { id: "lead", title: "Event Management Lead" },
    { id: "co_lead", title: "Event Management Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  finance_team: [
    { id: "lead", title: "Finance Lead" },
    { id: "co_lead", title: "Finance Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  design_team: [
    { id: "lead", title: "Design Lead" },
    { id: "co_lead", title: "Design Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  human_resources: [
    { id: "lead", title: "HR Lead" },
    { id: "co_lead", title: "HR Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  social_media_team: [
    { id: "lead", title: "Social Media Lead" },
    { id: "co_lead", title: "Social Media Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  pr_outreach_team: [
    { id: "lead", title: "PR & Outreach Lead" },
    { id: "co_lead", title: "PR & Outreach Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
  content_team: [
    { id: "lead", title: "Content Lead" },
    { id: "co_lead", title: "Content Co-Lead" },
    { id: "core_member", title: "Core Member" },
  ],
};

export type AchievementCategory =
  | "Hackathon"
  | "Research"
  | "Award"
  | "Milestone"
  | "Workshop"
  | "Recognition";

export interface Achievement {
  id: string;
  title: string;
  caption: string;
  category: AchievementCategory;
  achievement_date: string;
  image_url?: string | null;
  drive_file_id?: string | null;
  link_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
