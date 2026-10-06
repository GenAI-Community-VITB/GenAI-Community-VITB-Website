import {createClient} from '@supabase/supabase-js';

// Run explicitly during the reviewed cutover, after the reconciliation migration.
// Secrets are read from the process environment and never printed or saved in profiles.
const email=process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_BOOTSTRAP_PASSWORD;
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !email || !password || password.length<16) {
  throw new Error('Set Supabase URL/service key and ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD (at least 16 characters).');
}
const db=createClient(url.replace(/\/rest\/v1\/?$/,''),key,{auth:{persistSession:false,autoRefreshToken:false}});
let user;
for(let page=1;;page++) {
  const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
  if(error) throw new Error(error.message);
  user=data.users.find(u=>u.email?.toLowerCase()===email);
  if(user || data.users.length<1000) break;
}
let created=false;
if(!user) {
  const result=await db.auth.admin.createUser({email,password,email_confirm:true});
  if(result.error || !result.data.user) throw new Error(result.error?.message || 'Auth user creation failed.');
  user=result.data.user; created=true;
} else {
  const result=await db.auth.admin.updateUserById(user.id,{password,email_confirm:true});
  if(result.error) throw new Error(result.error.message);
}
const {error}=await db.from('user_profiles').upsert({id:user.id,email,full_name:'System Administrator',assigned_to_name:'System Administrator',role:'superadmin',is_active:true,is_login_disabled:false,is_voided:false},{onConflict:'id'});
if(error) {
  if(created) {
    const cleanup=await db.auth.admin.deleteUser(user.id);
    if(cleanup.error) throw new Error('Profile provisioning and Auth cleanup both failed. Inspect the new Auth account before retrying.');
  }
  throw new Error(`Administrator profile could not be provisioned: ${error.message}`);
}
console.log('Real Supabase Auth administrator provisioned. Verify login before ending maintenance. No credentials were printed.');
