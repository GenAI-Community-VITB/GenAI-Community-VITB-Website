const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const roles = load('lib/auth/roles.ts');
const memberPolicy = load('lib/auth/member-management.ts');
const memberProfile = (role, team, position = 'core_member') => ({ role, roles: team ? [{ team, position }] : [] });

test('core additions and lead credential management stay within assigned teams without executive escalation', () => {
  const core = memberProfile('core_member','design_team');
  const lead = memberProfile('lead','design_team','lead');
  const peer = memberProfile('core_member','content_team');
  assert.equal(memberPolicy.canAddCommunityMember(core),true);
  assert.doesNotThrow(()=>memberPolicy.assertCommunityMemberCreation(core,core));
  for(const invalid of [peer, memberProfile('top_executive','design_team'),memberProfile('core_member','design_team','lead'),memberProfile('core_member','panel'),memberProfile('core_member')]) assert.throws(()=>memberPolicy.assertCommunityMemberCreation(core,invalid));
  assert.equal(memberPolicy.canManageMemberCredentials(core,core),false);
  assert.equal(memberPolicy.canManageMemberCredentials(lead,core),true);
  assert.equal(memberPolicy.canManageMemberCredentials(lead,peer),false);
  assert.equal(memberPolicy.canManageMemberCredentials(memberProfile('co_lead','design_team','co_lead'),core),true);
  const technicalLead=memberProfile('technical_lead');
  assert.equal(memberPolicy.isCommunityExecutive(technicalLead),false);
  assert.equal(memberPolicy.canManageMemberCredentials(technicalLead,memberProfile('core_member','technical_team')),true);
  assert.equal(memberPolicy.canManageMemberCredentials(technicalLead,peer),false);
  assert.equal(memberPolicy.canManageMemberCredentials(lead,{...core,roles:[...core.roles,...peer.roles]}),false);
  assert.equal(memberPolicy.canManageMemberCredentials(lead,memberProfile('system_council','design_team')),false);
  assert.equal(memberPolicy.canManageMemberCredentials(memberProfile('top_executive'),peer),true);
  assert.equal(memberPolicy.canManageMemberCredentials(memberProfile('top_executive'),memberProfile('technical_lead')),false);
  assert.equal(memberPolicy.canManageMemberCredentials(memberProfile('system_council'),memberProfile('superadmin')),false);
  assert.equal(memberPolicy.canManageMemberCredentials(memberProfile('core_member','technical'),memberProfile('core_member','technical_team')),false);
  assert.equal(roles.isTeamLoginAllowed('core_member',[{team:'design_team',position:'core_member'}]),true);
});

test('member directory renders Add Member for cores and credential controls only for authorized targets', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { UserManagement } = load('components/admin/user-management.tsx', {
    '@/app/admin/events-actions': {}, '@/lib/data/password-resets': {},
    '@/lib/utils/scroll-lock': { useScrollLock() {} },
    '@/components/ui/custom-dropdown': { CustomDropdown: () => null },
  });
  const own = { id: 'own', full_name: 'Own Team Member', email: 'own@example.invalid', is_active: true, ...memberProfile('core_member', 'design_team') };
  const other = { ...own, id: 'other', full_name: 'Other Team Member', ...memberProfile('core_member', 'content_team') };
  const render = (actor, users) => renderToStaticMarkup(React.createElement(UserManagement, { users, currentUserId: 'actor', currentUserRole: actor.role, currentUserAssignments: actor.roles, isSupremeLeader: false }));
  const core = render(memberProfile('core_member', 'design_team'), [own]);
  assert.match(core, /Add Member/);
  assert.doesNotMatch(core, /Reset Requests|>Show<|>Email</);
  const lead = render(memberProfile('lead', 'design_team', 'lead'), [own]);
  assert.match(lead, /Reset Requests/);
  assert.match(lead, />Show</);
  assert.match(lead, />Email</);
  const foreign = render(memberProfile('lead', 'design_team', 'lead'), [other]);
  assert.doesNotMatch(foreign, />Show<|>Email</);
});

test('core member account creation rejects forged roles and stores but does not reveal the generated password', async () => {
  let creates=0, saved=0, suppliedToAuth;
  const actor={user:{id:'actor'},profile:memberProfile('core_member','design_team'),role:'core_member'};
  const empty={};
  const actions=load('app/admin/events-actions.ts',{
    'next/cache':{revalidatePath(){}},
    '@/lib/auth/member-management-server':{requireCommunityMemberActor:async()=>actor},
    '@/lib/auth/permissions':roles,
    '@/lib/supabase/admin':{createAdminSupabase:()=>({
      auth:{admin:{createUser:async input=>{creates++;suppliedToAuth=input.password;return {data:{user:{id:'11111111-1111-4111-8111-111111111111'}}};}}},
      rpc:async (name,args)=>{assert.equal(name,'save_staff_profile');assert.equal(args.p_profile.role,'core_member');return {error:null};},
    })},
    '@/lib/data/staff-credentials':{saveTemporaryPassword:async (id,password,actorId)=>{saved++;assert.equal(password,suppliedToAuth);assert.equal(actorId,'actor');}},
    '@/lib/security/temporary-password':{encryptTemporaryPassword:()=> 'encrypted'},
    '@/lib/validation':{userManagementSchema:{safeParse:()=>({success:true})}},
    '@/lib/data/registrations':empty,'@/lib/google/drive':empty,'@/lib/data/audit':empty,
  });
  const form=new FormData();
  form.set('email','test@example.invalid');form.set('full_name','Test Member');form.set('is_active','true');
  form.set('role','top_executive');form.set('roles_json',JSON.stringify([{team:'design_team',position:'core_member'}]));
  await assert.rejects(actions.upsertStaffUserAction(form),/privileged roles/);assert.equal(creates,0);
  form.set('role','core_member');form.set('password','Known-password-123');
  await assert.rejects(actions.upsertStaffUserAction(form),/Only your team lead/);assert.equal(creates,0);
  form.delete('password');
  const result=await actions.upsertStaffUserAction(form);
  assert.equal(result.success,true);assert.equal(creates,1);assert.equal(saved,1);assert.equal(result.generatedPassword,undefined);
  assert.ok(suppliedToAuth.length>=24);
});

test('reset requests are filtered before returning and both approve and reject recheck target teams', async () => {
  let actor={user:{id:'actor'},profile:memberProfile('lead','design_team','lead')};
  const profiles=[{id:'own',email:'own@example.invalid',...memberProfile('core_member','design_team')},{id:'other',email:'other@example.invalid',...memberProfile('core_member','content_team')}];
  let requestedId='other', writes=0, resets=0, scopedEmails;
  const mocks={
    'next/cache':{revalidatePath(){}},'next/headers':{},
    '@/lib/auth/permissions':{STAFF_PROFILE_FIELDS:'id,email,role,roles'},
    '@/lib/auth/member-management-server':{
      requireCommunityMemberActor:async()=>actor,
      assertCanManageCommunityStaff:async id=>{const target=profiles.find(p=>p.id===id);if(!memberPolicy.canManageMemberCredentials(actor.profile,target))throw Error('Outside team scope');return {actor,target};},
    },
    '@/lib/supabase/admin':{createAdminSupabase:()=>({from:table=>{
      const filters={};let updating=false;
      const query={select:()=>query,eq:(field,value)=>{filters[field]=value;return query;},in:(field,values)=>{assert.equal(field,'email');scopedEmails=values;return query;},order:()=>query,limit:()=>query,
        update:()=>{updating=true;writes++;return query;},
        single:async()=>({data:updating?{id:requestedId}:table==='user_profiles'?profiles.find(p=>p.email===filters.email):{id:requestedId,email:profiles.find(p=>p.id===requestedId).email,status:'pending'}}),
        then:resolve=>resolve({data:table==='user_profiles'?profiles:profiles.filter(p=>scopedEmails.includes(p.email)).map(p=>({id:p.id,email:p.email,status:'pending'}))}),
      };return query;
    }})},
    '@/lib/security/auth-rate-limit':{},'@/lib/email/mailer':{},
    '@/app/admin/events-actions':{resetStaffPasswordAction:async()=>{resets++;return {newPassword:'Synthetic-123!'};}},
  };
  const actions=load('lib/data/password-resets.ts',mocks);
  assert.deepEqual((await actions.getPasswordResetQueries()).map(r=>r.id),['own']);
  assert.deepEqual(scopedEmails,['own@example.invalid']);
  const form=new FormData();form.set('query_id','other');
  for(const action of ['approve','reject']){form.set('action_type',action);await assert.rejects(actions.resolvePasswordResetQueryAction(form),/team scope/);}
  assert.equal(writes,0);assert.equal(resets,0);
  requestedId='own';form.set('query_id','own');form.set('action_type','approve');
  assert.equal((await actions.resolvePasswordResetQueryAction(form)).success,true);assert.equal(resets,1);assert.equal(writes,1);
  actor={...actor,profile:memberProfile('core_member','design_team')};
  await assert.rejects(actions.getPasswordResetQueries(),/Only team leads/);
  await assert.rejects(actions.resolvePasswordResetQueryAction(form),/team scope/);
  assert.equal(writes,1);
});

test('temporary passwords encrypt with a unique nonce, bind to the user and reject tampering or missing keys', () => {
  const previous = process.env.STAFF_CREDENTIAL_ENCRYPTION_KEY;
  process.env.STAFF_CREDENTIAL_ENCRYPTION_KEY = 'a1'.repeat(32);
  try {
    const { encryptTemporaryPassword: encrypt, decryptTemporaryPassword: decrypt } = load('lib/security/temporary-password.ts');
    const secret = 'Synthetic-password<&>123';
    const first = encrypt('staff-one', secret), second = encrypt('staff-one', secret);
    assert.notEqual(first, second); assert.ok(!first.includes(secret));
    assert.equal(decrypt('staff-one', first), secret);
    assert.throws(() => decrypt('staff-two', first));
    const parts = first.split('.'); parts[2] = Buffer.alloc(16).toString('base64');
    assert.throws(() => decrypt('staff-one', parts.join('.')));
    delete process.env.STAFF_CREDENTIAL_ENCRYPTION_KEY;
    assert.throws(() => encrypt('staff-one', secret), /not configured/);
  } finally {
    if (previous === undefined) delete process.env.STAFF_CREDENTIAL_ENCRYPTION_KEY;
    else process.env.STAFF_CREDENTIAL_ENCRYPTION_KEY = previous;
  }
});

test('credential reads require target authorization and use the current Auth email', async () => {
  let role = 'tech', touched = 0, ciphertext = 'encrypted';
  const data = load('lib/data/staff-credentials.ts', {
    '@/lib/auth/member-management-server': { assertCanManageCommunityStaff: async () => {
      const actor={user:{id:'actor'},profile:memberProfile(role),role};
      const target={id:'staff',email:'outdated@example.invalid',...memberProfile('core_member','technical_team')};
      if(!memberPolicy.canManageMemberCredentials(actor.profile,target))throw Error('Outside team scope');
      return {actor,target};
    } },
    '@/lib/auth/permissions': {
      requireStaffActionRole: async () => ({ user: { id: 'actor' }, profile: { roles: [] }, role }),
      isTop6Admin: roles.isTop6Admin,
      assertCanManageStaff: async () => ({ target: { id: 'staff', email: 'outdated@example.invalid' } }),
    },
    '@/lib/security/temporary-password': { decryptTemporaryPassword: (id, value) => { assert.equal(id,'staff'); assert.equal(value,'encrypted'); return 'Temporary-only'; } },
    '@/lib/supabase/admin': { createAdminSupabase: () => { touched++; return {
      auth: { admin: { getUserById: async () => ({ data: { user: { email: 'current@example.invalid' } } }) } },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ciphertext ? { ciphertext } : null }) }) }) }),
    }; } },
  });
  for (role of ['tech','core_member','lead','co_lead','finance','volunteer']) await assert.rejects(data.getTemporaryCredential('staff'), /team scope/);
  assert.equal(touched, 0);
  for (role of ['system_council','top_executive','superadmin','vice_president','technical_lead']) {
    const result = await data.getTemporaryCredential('staff');
    assert.equal(result.password,'Temporary-only'); assert.equal(result.email,'current@example.invalid');
  }
  ciphertext = null;
  assert.equal((await data.getTemporaryCredential('staff')).password, null);
  assert.equal(roles.isTop6Admin('top_executive'), true);
  assert.equal(roles.isSupremeExecutive('top_executive'), false);
});

test('credential email uses current saved password, escaped content and public URL; missing credentials require Reset', async () => {
  let password = 'Temporary<&>123456', sent = [];
  const empty = {};
  const actions = load('app/admin/events-actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/auth/permissions': empty, '@/lib/supabase/admin': empty,
    '@/lib/data/registrations': empty, '@/lib/google/drive': empty, '@/lib/data/audit': empty, '@/lib/validation': empty,
    '@/lib/data/staff-credentials': { getTemporaryCredential: async () => ({ actor: { user: { id: 'actor' }, role: 'top_executive' }, target: { is_active: true, full_name: '<Member>', email: 'old@example.invalid' }, email: 'current@example.invalid', password }) },
    '@/lib/email/mailer': { sendEmail: async message => { sent.push(message); return { success: true }; } },
  });
  assert.equal((await actions.sendStaffCredentialsEmailAction('staff')).success, true);
  assert.equal(sent[0].to, 'current@example.invalid'); assert.equal(sent[0].sensitiveContent, true);
  assert.ok(sent[0].html.includes('Temporary&lt;&amp;&gt;123456'));
  assert.ok(sent[0].html.includes('https://www.genaiclubvitb.in/admin/login'));
  assert.ok(!sent[0].html.includes('genai-club.vercel.app')); assert.ok(!sent[0].html.includes('<Member>'));
  password = null;
  await assert.rejects(actions.sendStaffCredentialsEmailAction('staff'), /Use Reset/);
  assert.equal(sent.length, 1);
});

test('credential email content is sent but never stored as a plaintext retry payload', async () => {
  const logs = []; let delivered;
  const { EmailService } = load('lib/email/service.ts', {
    '@/lib/email/google-apps-script': { googleAppsScriptClient: { isConfigured: () => true, sendTransactionalEmail: async payload => { delivered = payload; return { success: true, messageId: 'test' }; } } },
    '@/lib/supabase/admin': { createAdminSupabase: () => ({ from: () => ({ insert: row => { logs.push(row); return { select: () => ({ single: async () => ({ data: { id: 'log' } }) }) }; } }) }) },
    '@/lib/google/sheets': { appendToGoogleSheet: async () => {} },
    '@/lib/utils/format': { formatISTDate: String },
  });
  const secret = 'Synthetic-credential-123!';
  await EmailService.send({ to: 'test@example.invalid', subject: 'Staff access', html: secret, emailType: 'custom_email', sensitiveContent: true });
  assert.equal(delivered.htmlContent, secret);
  assert.equal(logs[0].metadata.retryPayload, null);
  assert.ok(!JSON.stringify(logs).includes(secret));
});

function scannerRoute({ authenticated = true, verify, confirm } = {}) {
  return load('app/api/checkin/scan/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/auth/permissions': {
      getAuthenticatedStaff: async () => authenticated
        ? { user: { id: 'real-staff' }, profile: { full_name: 'Gate Volunteer' }, role: 'volunteer' }
        : { user: null },
      isTop6Admin: () => false,
    },
    '@/lib/security/rate-limiter': { checkRateLimit: async () => ({ limited: false }) },
    '@/lib/data/registrations': { verifyQRTokenDetails: verify, confirmAttendance: confirm },
  });
}
const scanRequest = body => ({ json: async () => body });

test('gate scan saves attendance before replying, using server identity and the verified pass', async () => {
  const participant = { id: 'real-registration', status: 'verified' };
  let finishWrite;
  const write = new Promise(resolve => { finishWrite = resolve; });
  const route = scannerRoute({
    verify: async token => { assert.equal(token, 'qr-pass'); return { success: true, participant }; },
    confirm: async args => {
      assert.deepEqual(args, { registrationId: participant.id, scannerUserId: 'real-staff', scannerName: 'Gate Volunteer', scannerRole: 'volunteer' });
      await write;
      return { success: true, participant: { ...participant, status: 'checked_in' } };
    },
  });
  let replied = false;
  const pending = route.POST(scanRequest({ action: 'scan', qrToken: 'qr-pass', registrationId: 'forged', isOverride: true, scannerUserId: 'forged' })).then(result => { replied = true; return result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(replied, false, 'validating a pass alone must not report admission');
  finishWrite();
  assert.equal((await pending).body.participant.status, 'checked_in');
});

test('failed, duplicate, unauthorized and read-only QR lookups do not save attendance', async () => {
  let writes = 0;
  const confirm = async () => { writes++; return { success: true }; };
  for (const verified of [
    { success: false, errorCode: 'INVALID_QR' },
    { success: false, errorCode: 'PAYMENT_PENDING' },
    { success: false, errorCode: 'FORBIDDEN' },
    { success: true, isAlreadyCheckedIn: true, priorCheckinTime: 'saved-time' },
  ]) {
    const route = scannerRoute({ verify: async () => verified, confirm });
    assert.deepEqual((await route.POST(scanRequest({ action: 'scan', qrToken: 'qr' }))).body, verified);
  }
  const route = scannerRoute({ verify: async () => ({ success: true, participant: { id: 'reg' } }), confirm });
  await route.POST(scanRequest({ action: 'verify', qrToken: 'qr' }));
  assert.equal((await route.POST(scanRequest({ action: 'scan', qrToken: ' ' }))).status, 400);
  assert.equal((await scannerRoute({ authenticated: false, confirm }).POST(scanRequest({ action: 'scan', qrToken: 'qr' }))).status, 401);
  assert.equal(writes, 0);
});

test('gate scan surfaces write failures and concurrent duplicates instead of false success', async () => {
  const participant = { id: 'reg', status: 'verified' };
  for (const result of [
    { success: false, message: 'Outside event check-in window' },
    { success: false, message: 'Database unavailable' },
    { success: false, isAlreadyCheckedIn: true, priorCheckinTime: 'saved-time', priorScannedBy: 'Other volunteer' },
  ]) {
    const route = scannerRoute({ verify: async () => ({ success: true, participant }), confirm: async () => result });
    const response = await route.POST(scanRequest({ qrToken: 'qr' }));
    assert.deepEqual(response.body, { ...result, participant });
    assert.equal(response.body.success, false);
  }
});

const hierarchy = load('lib/utils/team-hierarchy.ts');

test('attendance writes enforce event assignment and use the authenticated operator for every permitted role', async () => {
  let assigned = false, writes = 0, role = 'volunteer';
  const empty = {};
  const data = load('lib/data/registrations.ts', {
    '@/lib/auth/permissions': {
      requireStaffActionRole: async minimum => { assert.equal(minimum, 'volunteer'); return { user: { id: 'operator' }, profile: { full_name: 'Operator' }, role }; },
      isAssignedEventVolunteer: async (userId, eventId) => { assert.equal(userId, 'operator'); assert.equal(eventId, 'event'); return assigned; },
    },
    '@/lib/supabase/admin': { createAdminSupabase: () => ({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { event_id: 'event' } }) }) }) }),
      rpc: async (name, args) => {
        assert.equal(name, 'record_attendance'); assert.equal(args.p_actor, 'operator'); assert.equal(args.p_name, 'Operator');
        assert.equal(args.p_role, role); assert.equal(args.p_override, false); writes++;
        return { data: { success: true, participant: { status: 'checked_in' } } };
      },
    }) },
    '@/lib/validation': empty, '@/lib/qr/generator': empty, '@/lib/email/mailer': empty, '@/lib/email/templates': empty,
    '@/lib/google/sheets': empty, '@/lib/google/drive': empty, '@/lib/data/audit': empty, '@/lib/utils/format': empty, '@/lib/data/events': empty,
  });
  const params = { registrationId: 'registration', scannerUserId: 'forged', scannerName: 'forged', scannerRole: 'superadmin' };
  assert.equal((await data.confirmAttendance(params)).success, false); assert.equal(writes, 0);
  assigned = true;
  for (role of ['volunteer', 'core_member', 'finance', 'tech', 'superadmin']) assert.equal((await data.confirmAttendance(params)).success, true);
  assert.equal(writes, 5);
});

test('scanner shows saved attendance only after the response and ignores repeated frames until next attendee', async () => {
  const slots = []; let cursor = 0;
  const react = {
    useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: callback => callback, useEffect: () => {},
  };
  const { QrScannerClient } = load('components/admin/qr-scanner.tsx', {
    react, 'html5-qrcode': {}, '@/lib/utils/scroll-lock': { useScrollLock: () => {} },
  });
  const render = () => { cursor = 0; return QrScannerClient({ currentUserRole: 'volunteer', currentUserName: 'Test Scanner' }); };
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : Array.isArray(tree) ? tree.map(text).join(' ') : text(tree?.props?.children || '');
  const find = (tree, type, label) => nodes(tree).find(node => node.type === type && (!label || text(node).includes(label)));
  const originalFetch = global.fetch; let respond; let requests = 0;
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/checkin/scan'); assert.equal(JSON.parse(options.body).action, 'scan'); requests++;
    return new Promise(resolve => { respond = data => resolve({ ok: true, json: async () => data }); });
  };
  try {
    nodes(render()).find(node => node.type === 'input' && node.props.placeholder).props.onChange({ target: { value: 'test-pass' } });
    find(render(), 'form').props.onSubmit({ preventDefault() {} });
    assert.ok(text(render()).includes('Checking pass & saving attendance'));
    assert.ok(!text(render()).includes('ATTENDANCE RECORDED'));
    find(render(), 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests, 1);
    respond({ success: true, participant: { id: 'reg', status: 'checked_in', full_name: 'Test participant' } });
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(text(render()).includes('ATTENDANCE RECORDED'));
    find(render(), 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests, 1);
    find(render(), 'button', 'Ready For Next Attendee').props.onClick();
    nodes(render()).find(node => node.type === 'input' && node.props.placeholder).props.onChange({ target: { value: 'next-pass' } });
    find(render(), 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(requests, 2);
    respond({ success: false, message: 'Database unavailable' });
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(text(render()).includes('ATTENDANCE NOT CONFIRMED'));
    assert.ok(!text(render()).includes('ATTENDANCE RECORDED'));
  } finally { global.fetch = originalFetch; }
});
const hierarchyMemberId = '11111111-1111-4111-8111-111111111111';
const treeFixture = () => [
  {id:'leader',parentId:null,kind:'member',memberId:hierarchyMemberId,label:''},
  {id:'team',parentId:'leader',kind:'group',memberId:null,label:'Technical'},
  {id:'subteam',parentId:'team',kind:'group',memberId:null,label:'Research'},
  {id:'design',parentId:'leader',kind:'group',memberId:null,label:'Design'},
];

test('hierarchy rejects cycles, missing parents, duplicate members, oversized and deep trees', () => {
  const nodes=treeFixture();
  assert.deepEqual(hierarchy.validateHierarchy(nodes),nodes);
  assert.throws(()=>hierarchy.moveHierarchyNode(nodes,'leader','subteam'),/descendants/);
  assert.throws(()=>hierarchy.moveHierarchyNode(nodes,'team','team'),/descendants/);
  assert.throws(()=>hierarchy.moveHierarchyNode(nodes,'team','missing'),/no longer exists/);
  assert.throws(()=>hierarchy.validateHierarchy([...nodes,{...nodes[0],id:'duplicate'}]),/only once/);
  assert.throws(()=>hierarchy.validateHierarchy([...nodes,nodes[1]]),/unique ID/);
  assert.throws(()=>hierarchy.validateHierarchy([{...nodes[1],parentId:null,label:' '}]),/name/);
  assert.throws(()=>hierarchy.validateHierarchy(Array.from({length:251},(_,i)=>({...nodes[1],id:String(i),parentId:null}))));
  assert.throws(()=>hierarchy.validateHierarchy(Array.from({length:9},(_,i)=>({...nodes[1],id:String(i),parentId:i ? String(i-1):null}))),/eight levels/);
  assert.deepEqual(nodes,treeFixture(),'rejected moves must not mutate the draft');
});

test('hierarchy moves whole branches, orders siblings and promotes children of removed members', () => {
  const nodes=treeFixture();
  const moved=hierarchy.moveHierarchyNode(nodes,'team',null);
  assert.equal(moved.find(n=>n.id==='subteam').parentId,'team');
  assert.deepEqual(hierarchy.reorderHierarchyNode(nodes,'design',-1).filter(n=>n.parentId==='leader').map(n=>n.id),['design','team']);
  assert.deepEqual(hierarchy.moveHierarchyBefore(nodes,'design','team').filter(n=>n.parentId==='leader').map(n=>n.id),['design','team']);
  assert.throws(()=>hierarchy.moveHierarchyBefore(nodes,'leader','subteam'),/descendants/);
  const visible=hierarchy.visibleHierarchy(nodes,new Set());
  assert.equal(visible.length,3);
  assert.equal(visible.find(n=>n.id==='team').parentId,null);
  assert.equal(visible.find(n=>n.id==='subteam').parentId,'team');
  assert.deepEqual(nodes,treeFixture());
});

test('initial hierarchy uses only real active roster entries and includes custom teams', () => {
  const members=[{id:hierarchyMemberId,name:'Real president',role:'president',position:'President',status:'active',team_id:'custom'},
    {id:'22222222-2222-4222-8222-222222222222',name:'Pending',role:'core',status:'pending',team_id:'custom'}];
  const result=hierarchy.createInitialHierarchy(members,[{id:'custom',name:'Custom team'}]);
  assert.equal(result.filter(n=>n.kind==='member').length,1);
  assert.equal(result.find(n=>n.kind==='group').label,'Custom team');
  assert.deepEqual(hierarchy.validateHierarchy(result),result);
});

test('public hierarchy renders only configured active members and escapes labels and social links', () => {
  const React=require('react');
  const {renderToStaticMarkup}=require('react-dom/server');
  const {EditableHierarchyTree}=load('components/site/editable-hierarchy-tree.tsx',{
    '@/components/site/hierarchy-tree':{HierarchyAvatar:()=>null},
  });
  const members=[{id:hierarchyMemberId,name:'<script>alert(1)</script>',position:'Leader',status:'active',github_url:'javascript:alert(1)',linkedin_url:'https://www.linkedin.com/in/test'}];
  const html=renderToStaticMarkup(React.createElement(EditableHierarchyTree,{nodes:treeFixture(),members}));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('https://www.linkedin.com/in/test'));
  assert.ok(html.includes('Technical'));
  const pending=renderToStaticMarkup(React.createElement(EditableHierarchyTree,{nodes:treeFixture(),members:[{...members[0],status:'pending'}]}));
  assert.ok(!pending.includes('alert(1)'));
  assert.ok(pending.includes('Technical'),'hiding a parent must not hide its descendants');
  const empty=renderToStaticMarkup(React.createElement(EditableHierarchyTree,{nodes:[],members}));
  assert.ok(empty.includes('roster is being updated'));
  assert.ok(!empty.includes('alert(1)'),'unplaced members are not automatically published');
});

test('hierarchy save authorizes first, verifies active members, rejects concurrent writes and never writes accounts', async () => {
  let authorized=false, tables=[], writes=[], stale=false, missing=false, fail=false, invalidated=[];
  const action=load('app/admin/hierarchy-actions.ts',{
    'next/cache':{revalidatePath:p=>invalidated.push(p)},
    '@/lib/auth/permissions':{requireStaffActionRole:async role=>{assert.equal(role,'tech');if(!authorized)throw Error('Forbidden');}},
    '@/lib/supabase/admin':{createAdminSupabase:()=>({from:table=>{
      tables.push(table);
      const q={select:()=>q,in:()=>q,eq:()=>q,insert:p=>{writes.push(p);return q;},update:p=>{writes.push(p);return q;},maybeSingle:async()=>({data:stale?null:{version:2},error:fail?{code:'XX000'}:null}),then:resolve=>resolve({data:missing?[]:[{id:hierarchyMemberId}],error:null})};return q;
    }})},
  });
  assert.equal((await action.saveTeamHierarchy(treeFixture(),1)).success,false);
  assert.equal(tables.length,0);
  authorized=true;
  assert.equal((await action.saveTeamHierarchy(treeFixture(),-1)).success,false);
  assert.equal(tables.length,0);
  missing=true;
  assert.equal((await action.saveTeamHierarchy(treeFixture(),1)).success,false);
  assert.equal(writes.length,0);
  missing=false;stale=true;
  assert.match((await action.saveTeamHierarchy(treeFixture(),1)).error,/Another administrator/);
  assert.equal(invalidated.length,0);
  stale=false;fail=true;
  assert.equal((await action.saveTeamHierarchy(treeFixture(),1)).success,false);
  assert.equal(invalidated.length,0);
  fail=false;
  assert.deepEqual(await action.saveTeamHierarchy(treeFixture(),1),{success:true,version:2});
  assert.deepEqual(invalidated,['/team','/admin']);
  assert.ok(tables.every(t=>['members','team_hierarchy_layout'].includes(t)));
  assert.deepEqual(writes.at(-1).nodes,treeFixture());
});
test('ordinary technical, AI/ML and core members are not executive administrators', () => {
  for (const role of ['tech', 'aiml', 'core', 'core_member', 'volunteer', 'finance']) assert.equal(roles.isTop6Admin(role), false);
  assert.equal(roles.isTop6Admin('member', [{team:'technical_team',position:'core_member'}]), false);
  assert.equal(roles.isTop6Admin('member', [{team:'technical_team',position:'lead'}]), true);
  assert.equal(roles.isSupremeExecutive('superadmin'), true);
  assert.equal(roles.isSupremeExecutive('member', [], 'genaicommunityvitbofficial@gmail.com'), false);
});
test('finance can export, but cannot manage staff; disabled accounts have no permissions', () => {
  const p = {role:'finance',is_active:true,is_voided:false,is_login_disabled:false};
  assert.equal(roles.checkPermission(p,'export_data'), true);
  assert.equal(roles.checkPermission(p,'manage_members'), false);
  assert.equal(roles.checkPermission({...p,is_login_disabled:true},'export_data'), false);
});

test('unsigned cookies, missing profiles and disabled profiles cannot authenticate', async () => {
  let currentUser = null; let profile = null;
  const auth = load('lib/auth/permissions.ts', {
    'next/navigation': {redirect: () => {throw new Error('redirect');}},
    '@/lib/utils/format': {formatISTDate: String},
    '@/lib/supabase/server': {createServerSupabase: async () => ({auth:{getUser:async () => ({data:{user:currentUser},error:null})}})},
    '@/lib/supabase/admin': {createAdminSupabase: () => ({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error:null})})})})})},
  });
  assert.equal((await auth.getAuthenticatedStaff()).user, null);
  currentUser = {id:'real-auth-id'};
  assert.equal((await auth.getAuthenticatedStaff()).user, null);
  profile={id:currentUser.id,role:'superadmin',is_active:true,is_login_disabled:true};
  assert.equal((await auth.getAuthenticatedStaff()).user, null);
  profile={...profile,is_login_disabled:false,is_voided:true};
  assert.equal((await auth.getAuthenticatedStaff()).user, null);
  profile={...profile,is_voided:false};
  assert.equal((await auth.requireStaffActionRole('tech')).user.id,currentUser.id);
});

test('CSV handles BOM, quoted commas/newlines and escaped quotes; formula cells are neutralized', () => {
  const {parseCSVRecords,csvCell}=load('lib/utils/csv.ts');
  assert.deepEqual(parseCSVRecords('\uFEFFName,Note\r\n"A, B","line 1\nline ""2"""\r\n'), [['Name','Note'],['A, B','line 1\nline "2"']]);
  assert.throws(()=>parseCSVRecords('"unfinished'));
  for (const input of ['=SUM(A1)', '+cmd', '-cmd', '@SUM(A1)', '  =cmd', '\tcmd']) assert.ok(csvCell(input).startsWith('"\''));
});

test('campus times convert to UTC consistently and reject invalid windows', () => {
  const {campusDateTime,validateEventTimes}=load('lib/utils/event-time.ts');
  assert.equal(campusDateTime('2026-10-10T09:30'), '2026-10-10T04:00:00.000Z');
  assert.equal(campusDateTime('09:30 AM','2026-10-10'),'2026-10-10T04:00:00.000Z');
  assert.equal(campusDateTime('12:00 AM','2026-10-10'),'2026-10-09T18:30:00.000Z');
  assert.throws(()=>campusDateTime('25:00','2026-10-10'));
  assert.throws(()=>validateEventTimes('2026-10-10T09:00Z','2026-10-10T08:00Z'));
});

test('the downloadable CSV template round-trips its UTR column and preserves rejected status', () => {
  const {parseParticipantCSV}=load('lib/utils/participant-csv.ts');
  const source=fs.readFileSync('components/admin/participant-importer-modal.tsx','utf8');
  const sample=source.match(/const sample = `([^`]+)`/)[1].replace(/\\n/g,'\n');
  const rows=parseParticipantCSV(sample);
  assert.equal(rows.length,3);
  assert.equal(rows[0].transactionId,'UPI492817291029');
  assert.equal(rows[0].vitRegistrationNumber,'24BCE10511');
  assert.equal(rows[2].transactionId,'REF109283746519');
  assert.equal(parseParticipantCSV(sample.replaceAll('verified','rejected'))[0].paymentStatus,'rejected');
  const missing=parseParticipantCSV('Full Name,Personal Email\nTest,test@example.invalid');
  assert.equal(missing[0].vitRegistrationNumber,undefined);
  assert.equal(missing[0].collegeEmail,undefined);
});

test('export paginates beyond 1000 rows and ignores revoked check-ins', async () => {
  const registrations=Array.from({length:1203},(_,i)=>({id:String(i),full_name:i===0 ? '=SUM(A1)' : `Participant ${i}`,vit_registration_number:`REG${i}`,personal_email:'test@example.invalid',college_email:'test@vitbhopal.ac.in',branch_name:'CSE',registration_status:'verified',qr_token:'qr',created_at:'2026-10-01T00:00:00Z',payments:[],checkins:[{status:'revoked',scan_timestamp:'2026-10-01T01:00:00Z',scanned_by_name:'Old scanner'}]}));
  let authorized=false;
  const empty={};
  const exports=load('lib/data/registrations.ts', {
    '@/lib/auth/permissions':{requireStaffActionRole:async role=>{assert.equal(role,'finance');authorized=true;}},
    '@/lib/supabase/admin': {
      createAdminSupabase: () => ({
        from: table => ({ select: () => ({
          eq: () => table === 'events'
            ? { single: async () => ({data:{id:'event',slug:'test'}}) }
            : { order: () => ({range: async (a,b) => ({data:registrations.slice(a,b+1)})}) },
        }) }),
      }),
    },
    '@/lib/validation':empty, '@/lib/qr/generator':empty, '@/lib/email/mailer':empty,
    '@/lib/email/templates':empty, '@/lib/google/sheets':empty, '@/lib/google/drive':empty,
    '@/lib/data/audit':empty, '@/lib/utils/format':{formatISTDate:String}, '@/lib/data/events':empty,
  });
  const result=await exports.exportAttendanceDataAction('event');
  assert.equal(result.success,true); assert.equal(authorized,true);
  const lines=result.csvContent.split('\r\n');
  assert.equal(lines.length,1204);
  assert.ok(lines[1].startsWith('"\'=SUM(A1)"'));
  assert.ok(lines[1].includes('"Absent"'));
  assert.ok(!result.csvContent.includes('Old scanner'));
});

test('finance loads all 1500 event registrations in stable batches and scopes archived entries', async () => {
  const records=Array.from({length:1500},(_,i)=>({id:String(i),event_id:'selected'}));
  const requests=[];let denied=false,failed=false;
  const empty={};
  const data=load('lib/data/registrations.ts',{
    '@/lib/auth/permissions':{requireStaffActionRole:async role=>{assert.equal(role,'finance');if(denied)throw Error('Forbidden');}},
    '@/lib/supabase/admin':{createAdminSupabase:()=>({from:table=>{
      const request={table,order:[],eventId:null,range:null};requests.push(request);
      const q={select:()=>q,order:field=>{request.order.push(field);return q;},range:(a,b)=>{request.range=[a,b];return q;},eq:(field,value)=>{assert.equal(field,'event_id');request.eventId=value;return q;},then:resolve=>resolve({data:failed?null:records.slice(request.range[0],request.range[1]+1),count:records.length,error:failed?{message:'Database unavailable'}:null})};return q;
    }})},
    '@/lib/validation':empty,'@/lib/qr/generator':empty,'@/lib/email/mailer':empty,'@/lib/email/templates':empty,
    '@/lib/google/sheets':empty,'@/lib/google/drive':empty,'@/lib/data/audit':empty,'@/lib/utils/format':empty,'@/lib/data/events':empty,
  });
  denied=true;await assert.rejects(data.getFinanceRegistrations('selected'),/Forbidden/);assert.equal(requests.length,0);
  denied=false;
  const result=await data.getFinanceRegistrations('selected');
  assert.equal(result.length,1500);assert.equal(new Set(result.map(r=>r.id)).size,1500);
  assert.deepEqual(requests.map(r=>r.range),[[0,499],[500,999],[1000,1499]]);
  assert.ok(requests.every(r=>r.eventId==='selected'&&r.order.join(',')==='created_at,id'));
  requests.length=0;
  assert.equal((await data.getDeletedRegistrations('selected')).length,1500);
  assert.ok(requests.every(r=>r.table==='deleted_registrations'&&r.eventId==='selected'));
  requests.length=0;assert.deepEqual(await data.getFinanceRegistrations(''),[]);assert.equal(requests.length,0);
  failed=true;await assert.rejects(data.getFinanceRegistrations('selected'),/Database unavailable/);
});

test('registration paging exposes every record, clamps shrinking last pages and filters beyond page one', () => {
  const {paginateRegistrations:paginate,filterFinanceRegistrations:filter}=load('lib/utils/registration-pagination.ts');
  const rows=Array.from({length:1500},(_,i)=>({id:String(i),full_name:`Student ${i}`,vit_registration_number:null,personal_email:null,college_email:null,registration_number:`REG${i}`,registration_status:i%2?'pending':'verified',registration_source:'online',branch_name:'CSE',payments:[{transaction_id:`UTR${i}`}]}));
  for(const size of [10,25,50]){
    const found=[];
    for(let page=1;page<=Math.ceil(rows.length/size);page++){const slice=paginate(rows,page,size);assert.ok(slice.rows.length<=50);found.push(...slice.rows.map(r=>r.id));}
    assert.deepEqual(found,rows.map(r=>r.id));
  }
  const last=paginate(rows.slice(0,159),4,50);
  assert.equal(last.first,151);assert.equal(last.last,159);assert.equal(last.rows.length,9);
  const reduced=paginate(rows.slice(0,150),4,50);assert.equal(reduced.page,3);assert.equal(reduced.rows.length,50);
  assert.equal(paginate([],10,50).first,0);assert.equal(paginate([],10,50).page,1);
  assert.equal(paginate(rows,-1,5000).rows.length,50);
  const matched=filter(rows,{status:'all',source:'all',branch:'all',search:'UTR1499'});
  assert.deepEqual(matched.map(r=>r.id),['1499']);
  assert.equal(filter(rows,{status:'verified',source:'online',branch:'CSE',search:''}).length,750);
  assert.deepEqual(filter(rows,{status:'all',source:'all',branch:'all',search:'not present'}),[]);
});

test('login verifies the submitted challenge and Auth password, then refuses a disabled profile', async () => {
  let captchaValid=true, profileEnabled=true, authCalls=0, signouts=0, receivedToken;
  const notifications=[];
  const actions=load('app/admin/actions.ts', {
    'next/cache':{revalidatePath(){}}, 'next/navigation':{redirect(){}},
    'next/server':{after:callback=>notifications.push(callback)},
    'next/headers':{headers:async()=>({get:()=> '127.0.0.1'}),cookies:async()=>({delete(){}})},
    '@/lib/supabase/server':{createServerSupabase:async()=>({auth:{signInWithPassword:async payload=>{authCalls++;assert.equal(payload.password,' untrimmed-password ');return {error:null};},signOut:async()=>{signouts++;}}})},
    '@/lib/supabase/admin':{}, '@/lib/validation':{}, '@/lib/google/sheets':{}, '@/lib/google/drive':{},
    '@/lib/security/auth-rate-limit':{enforceAuthLimit:async()=>{}},
    '@/lib/security/turnstile':{verifyCloudflareTurnstile:async token=>{receivedToken=token;return {success:captchaValid};}},
    '@/lib/auth/permissions':{getAuthenticatedStaff:async()=>({user:profileEnabled ? {id:'real-user'} : null})},
  });
  const form=new FormData();form.set('email','staff@example.invalid');form.set('password',' untrimmed-password ');form.set('cf_turnstile_response','real-challenge-token');
  assert.equal((await actions.loginStaff(form)).ok,true);
  assert.equal(receivedToken,'real-challenge-token');assert.equal(notifications.length,1);
  captchaValid=false;
  assert.equal((await actions.loginStaff(form)).ok,false);assert.equal(authCalls,1);
  captchaValid=true;profileEnabled=false;
  assert.equal((await actions.loginStaff(form)).ok,false);assert.equal(signouts,1);
  assert.equal(notifications.length,1);
});


test('events become past exactly four days after their end, with a date fallback', () => {
  const {applyEventLifecycle,EVENT_PAST_DELAY_MS}=load('lib/utils/event-lifecycle.ts');
  const event={status:'live',event_date:'2026-10-01T09:30:00Z',event_end_time:'2026-10-03T17:00:00+05:30',is_registration_open:true,is_spotlight:true};
  const cutoff=Date.parse(event.event_end_time)+EVENT_PAST_DELAY_MS;
  assert.equal(applyEventLifecycle(event,cutoff-1).status,'live');
  const past=applyEventLifecycle(event,cutoff);
  assert.equal(past.status,'past');assert.equal(past.is_registration_open,false);assert.equal(past.is_spotlight,false);
  assert.equal(event.status,'live');
  const fallback={...event,status:'upcoming',event_end_time:null};
  assert.equal(applyEventLifecycle(fallback,Date.parse(event.event_date)+EVENT_PAST_DELAY_MS).status,'past');
  assert.equal(applyEventLifecycle({...event,status:'past'},0).status,'past');
  assert.equal(applyEventLifecycle({...event,status:'draft'},cutoff).status,'draft');
  assert.equal(applyEventLifecycle({...event,event_end_time:'invalid'},cutoff).status,'live');
});

test('scheduled event transition requires authentication, uses an atomic date condition and preserves participants', async () => {
  const old=process.env.CRON_SECRET;process.env.CRON_SECRET='synthetic-lifecycle-secret';
  let calls=0,filter,patch,dbError=null;const invalidated=[];
  const query={update(p){patch=p;return this;},in(column,statuses){assert.equal(column,'status');assert.deepEqual(statuses,['live','upcoming']);return this;},or(value){filter=value;return this;},async select(){return{data:[{id:'synthetic-event'}],error:dbError};}};
  const route=load('app/api/cron/event-lifecycle/route.ts',{'next/cache':{revalidatePath:p=>invalidated.push(p)},'@/lib/supabase/admin':{createAdminSupabase:()=>({from(table){calls++;assert.equal(table,'events');return query;}})}});
  try {
    assert.equal((await route.GET(new Request('https://test.invalid'))).status,401);assert.equal(calls,0);
    const req=()=>new Request('https://test.invalid',{headers:{authorization:'Bearer synthetic-lifecycle-secret'}});
    const result=await route.GET(req());assert.equal(result.status,200);assert.equal((await result.json()).movedToPast,1);
    assert.deepEqual(patch,{status:'past',is_registration_open:false,is_spotlight:false});
    assert.match(filter,/event_end_time\.lte\./);assert.match(filter,/and\(event_end_time\.is\.null,event_date\.lte\./);
    assert.ok(invalidated.includes('/events'));assert.ok(invalidated.includes('/admin'));
    dbError={message:'Synthetic database error'};assert.equal((await route.GET(req())).status,500);
  } finally {if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});
