"use server";
import { randomInt, createHmac } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireStaffActionRole, assertCanManageStaff } from "@/lib/auth/permissions";
import { enforceAuthLimit } from "@/lib/security/auth-rate-limit";
import { sendEmail } from "@/lib/email/mailer";
import { getOTPEmailTemplate } from "@/lib/email/templates";
export interface PasswordResetQuery { id:string; email:string; student_name:string; reason?:string|null; status:"pending"|"approved"|"rejected"; resolved_by?:string|null; resolved_at?:string|null; notes?:string|null; created_at:string; }
function hashCode(email:string,code:string) {
  const key=process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Password recovery is not configured.");
  return createHmac("sha256",key).update(`${email}:${code}`).digest("hex");
}
async function rateLimit(email:string, operation:string) {
  const ip=(await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await enforceAuthLimit(`${operation}:${email}`,5,600);
  await enforceAuthLimit(`${operation}-ip:${ip}`,30,600);
}
export async function requestPasswordResetOTP(emailInput:string):Promise<{success:boolean;message:string;error?:string}> {
  try {
    const email=emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    await rateLimit(email,"reset-request");
    const db=createAdminSupabase();
    const {data:profile,error}=await db.from("user_profiles").select("id,full_name,is_active,is_login_disabled,is_voided").eq("email",email).maybeSingle();
    if (error) throw new Error("Password recovery is temporarily unavailable.");
    const message="If this email has an enabled account, a reset code has been sent.";
    if (!profile?.is_active || profile.is_login_disabled || profile.is_voided) return {success:true,message};
    const code=String(randomInt(100000,1000000));
    const stored=await db.rpc("issue_staff_reset",{p_email:email,p_hash:hashCode(email,code)});
    if (stored.error) throw new Error("Unable to issue a reset code. Please retry later.");
    const template=getOTPEmailTemplate({fullName:profile.full_name,email,otpCode:code,validMinutes:10});
    const sent=await sendEmail({to:email,subject:template.subject,html:template.html,emailType:"password_reset_otp",forceResend:true});
    if (!sent.success) throw new Error("Reset email could not be delivered. Please retry later.");
    return {success:true,message};
  } catch(error) { return {success:false,message:error instanceof Error ? error.message : "Reset request failed."}; }
}
export async function verifyOTPAndResetPassword(params:{email:string;otp:string;newPassword:string}):Promise<{success:boolean;message:string;error?:string}> {
  try {
    const email=params.email.trim().toLowerCase();
    if (params.newPassword.length<12) throw new Error("Use at least 12 characters for your password.");
    await rateLimit(email,"reset-verify");
    const db=createAdminSupabase();
    const {data:profile,error}=await db.from("user_profiles").select("id,is_active,is_login_disabled,is_voided").eq("email",email).maybeSingle();
    if (error || !profile?.is_active || profile.is_login_disabled || profile.is_voided) throw new Error("Invalid or expired reset code.");
    const hash=hashCode(email,params.otp.trim());
    const claim=await db.rpc("claim_staff_reset",{p_email:email,p_hash:hash});
    if (claim.error || claim.data!==true) throw new Error("Invalid, expired, or already used reset code.");
    const changed=await db.auth.admin.updateUserById(profile.id,{password:params.newPassword});
    if (changed.error) {
      await db.from("staff_reset_codes").update({claimed_at:null}).eq("email",email).eq("code_hash",hash);
      throw new Error("Password update failed. Please retry.");
    }
    const finalized=await db.from("staff_reset_codes").update({used_at:new Date().toISOString()}).eq("email",email).eq("code_hash",hash).select("email").single();
    // A claimed code remains unusable even if this final bookkeeping write fails.
    if (finalized.error) console.error("Password reset completion bookkeeping failed",finalized.error.code);
    return {success:true,message:"Password updated. Sign in using your new password."};
  } catch(error) { return {success:false,message:error instanceof Error ? error.message : "Password reset failed."}; }
}
export async function submitPasswordResetQuery(formData:FormData) {
  const email=String(formData.get("email") || "").trim().toLowerCase();
  await rateLimit(email,"reset-help");
  const student_name=String(formData.get("student_name") || "").trim();
  const reason=String(formData.get("reason") || "").trim();
  if (!student_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Name and valid email required.");
  const {error}=await createAdminSupabase().from("password_reset_requests").insert({email,student_name,reason});
  if (error) throw new Error(error.message);
  return {success:true,message:"Your request has been submitted."};
}
export async function getPasswordResetQueries():Promise<PasswordResetQuery[]> {
  await requireStaffActionRole("tech");
  const {data,error}=await createAdminSupabase().from("password_reset_requests").select("*").order("created_at",{ascending:false}).limit(500);
  if (error) throw new Error(error.message);
  return data as PasswordResetQuery[];
}
export async function resolvePasswordResetQueryAction(formData:FormData) {
  const {user}=await requireStaffActionRole("tech");
  const db=createAdminSupabase();
  const id=String(formData.get("query_id") || "");
  const action=String(formData.get("action_type") || "");
  if (!["approve","reject"].includes(action)) throw new Error("Invalid action.");
  const {data:request,error}=await db.from("password_reset_requests").select("*").eq("id",id).eq("status","pending").single();
  if (error || !request) throw new Error("Pending request not found.");
  let newPassword:string|undefined;
  if (action==="approve") {
    const target=await db.from("user_profiles").select("id").eq("email",request.email).single();
    if (target.error) throw new Error("Account not found.");
    await assertCanManageStaff(target.data.id);
    const {resetStaffPasswordAction}=await import("@/app/admin/events-actions");
    newPassword=(await resetStaffPasswordAction(target.data.id,String(formData.get("new_password") || "") || undefined)).newPassword;
  }
  const saved=await db.from("password_reset_requests").update({status:action==="approve" ? "approved":"rejected",resolved_by:user.id,resolved_at:new Date().toISOString(),notes:String(formData.get("notes") || "")}).eq("id",id).eq("status","pending").select("id").single();
  if (saved.error) throw new Error(action==="approve" ? "Password changed, but request status could not be updated." : saved.error.message);
  revalidatePath("/admin/users");
  return {success:true,action:action==="approve" ? "approved":"rejected",email:request.email,newPassword};
}
