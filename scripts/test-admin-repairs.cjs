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
const hierarchy = load('lib/utils/team-hierarchy.ts');
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
