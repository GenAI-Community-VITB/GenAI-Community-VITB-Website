const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('email relay requires its configured Script Properties token before dispatch', () => {
  let configured=null, sent=0;
  const context={
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>configured})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){}})},
    GmailApp:{sendEmail(){sent++;}}, MailApp:{sendEmail(){sent++;}}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('Code.gs','utf8'),context);
  const call=token=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({token})}}).text);
  assert.match(call('unconfigured-token').error,/Unauthorized/);
  configured='synthetic-private-token';
  assert.match(call('wrong-token').error,/Unauthorized/);
  assert.match(call(configured).error,/recipient/);
  assert.equal(sent,0);
});

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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

test('cron writes fail closed and query parameters cannot authenticate', async () => {
  const old=process.env.CRON_SECRET;
  const {isAuthorizedCron}=load('lib/security/cron-auth.ts');
  try {
    delete process.env.CRON_SECRET;
    assert.equal(isAuthorizedCron(new Request('https://test.invalid')),false);
    process.env.CRON_SECRET='synthetic-cron-secret';
    assert.equal(isAuthorizedCron(new Request('https://test.invalid?secret=synthetic-cron-secret')),false);
    assert.equal(isAuthorizedCron(new Request('https://test.invalid',{headers:{authorization:'Bearer synthetic-cron-secret'}})),true);
    assert.equal(isAuthorizedCron(new Request('https://test.invalid',{headers:{authorization:'Bearer wrong'}})),false);
    let writes=0;
    const mocks={'next/server':{NextResponse:Response},'next/cache':{revalidatePath(){}},'@/lib/data/blog':{syncLinkedInDispatches:async()=>{writes++;},getPastClubBlogPosts:()=>[]}};
    for(const file of ['app/api/blogs/sync/route.ts','app/api/cron/sync-linkedin/route.ts']) {
      const route=load(file,mocks);
      for(const method of ['GET','POST']) assert.equal((await route[method](new Request('https://test.invalid'))).status,401);
    }
    assert.equal(writes,0);
  } finally {if(old===undefined) delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old;}
});

test('structured data and email templates cannot inject HTML', () => {
  const {serializeJsonLd}=load('lib/security/content.ts');
  const payload='</script><script>alert(1)</script><a href="https://attacker.invalid">Pay</a>';
  const json=serializeJsonLd({name:payload});
  assert.ok(!json.includes('<'));assert.equal(JSON.parse(json).name,payload);
  const templates=load('lib/email/templates.ts');
  const email=templates.getSubmissionReceivedTemplate({fullName:payload,eventTitle:payload,vitRegNumber:'24BCE10549',registrationNumber:'SYNTHETIC',amount:100,transactionId:'SYNTHETIC'});
  assert.ok(!email.html.includes(payload));assert.ok(email.html.includes('&lt;/script&gt;'));
  assert.equal(email.subject,`Registration Received: ${payload} (SYNTHETIC)`);
  assert.ok(!templates.getCustomEmailTemplate({subject:payload,message:payload}).html.includes(payload));
});

test('LinkedIn scraping rejects internal addresses, deceptive hosts and credentials', () => {
  const {linkedInPostUrl}=load('lib/security/content.ts');
  for(const input of ['http://127.0.0.1','https://169.254.169.254/posts/x','https://www.linkedin.com.evil.invalid/posts/x','https://user:pass@www.linkedin.com/posts/x','https://www.linkedin.com:444/posts/x','https://www.linkedin.com/redir/redirect?url=http://127.0.0.1']) assert.throws(()=>linkedInPostUrl(input));
  assert.equal(linkedInPostUrl('https://www.linkedin.com/posts/community-123'),'https://www.linkedin.com/posts/community-123');
  assert.ok(fs.readFileSync('app/admin/blog-actions.ts','utf8').includes('redirect: "error"'));
});

test('image uploads reject forged MIME types and executable formats', () => {
  const {validateImageUpload}=load('lib/security/image-upload.ts');
  for(const type of ['image/svg+xml','text/html','image/png']) assert.throws(()=>validateImageUpload(Buffer.from('<svg onload="alert(1)"/>'),type));
  const png=Buffer.from([137,80,78,71,13,10,26,10,0]);
  assert.doesNotThrow(()=>validateImageUpload(png,'image/png'));
  assert.throws(()=>validateImageUpload(png,'image/png',4));
});

test('multipart parsing bounds chunked requests as well as declared size', async () => {
  const {limitedFormData}=load('lib/security/request-body.ts');
  const form=new FormData();form.set('name','synthetic');
  assert.equal((await limitedFormData(new Request('https://test.invalid',{method:'POST',body:form}))).get('name'),'synthetic');
  await assert.rejects(()=>limitedFormData(new Request('https://test.invalid',{method:'POST',body:'too much input'}),4),/REQUEST_TOO_LARGE/);
  await assert.rejects(()=>limitedFormData(new Request('https://test.invalid',{method:'POST',headers:{'content-length':'500'},body:'x'}),4),/REQUEST_TOO_LARGE/);
});

test('payment files and unreferenced files are never public assets', async () => {
  let payment=true, published=false, failed=false;
  const media=load('lib/security/media-access.ts',{'@/lib/supabase/admin':{createAdminSupabase:()=>({from:table=>{
    const q={select:()=>q,eq:()=>q,in:()=>q,limit:async()=>({data:(table==='payments'?payment:published)?[{id:'synthetic'}]:[],error:failed?new Error('database unavailable'):null})};return q;
  }})}});
  assert.equal(await media.isPublicMedia('valid-id'),false);
  payment=false;assert.equal(await media.isPublicMedia('valid-id'),false);
  published=true;assert.equal(await media.isPublicMedia('valid-id'),true);
  failed=true;assert.equal(await media.isPublicMedia('valid-id'),false);
  assert.equal(await media.isPublicMedia('../private'),false);
});

test('public asset route checks publication before touching privileged storage', async () => {
  let reads=0, permitted=false, type='text/html';
  const {Readable}=require('node:stream');
  const route=load('app/api/drive/asset/[fileId]/route.ts',{
    'next/server':{NextResponse:Response},
    '@/lib/security/media-access':{isValidFileId:()=>true,isPublicMedia:async()=>permitted},
    '@/lib/google/drive':{getDriveFileStream:async()=>{reads++;return {stream:Readable.from([Buffer.from('image')]),mimeType:type};}},
  });
  const context={params:Promise.resolve({fileId:'synthetic'})};
  assert.equal((await route.GET(new Request('https://test.invalid'),context)).status,404);assert.equal(reads,0);
  permitted=true;assert.equal((await route.GET(new Request('https://test.invalid'),context)).status,415);
  type='image/png';const response=await route.GET(new Request('https://test.invalid'),context);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');await response.text();
});

test('on-spot registration requires a verified authorized staff member and same origin', async () => {
  let staff=null, captchaCalls=0, saved;
  const roles=load('lib/auth/roles.ts');
  const route=load('app/api/register/route.ts',{
    'next/server':{NextResponse:Response},
    '@/lib/auth/permissions':{...roles,getAuthenticatedStaff:async()=>staff||{},isAssignedEventVolunteer:async()=>false},
    '@/lib/data/registrations':{submitStudentRegistration:async params=>{saved=params;return {success:true,registrationNumber:'SYNTHETIC',warning:'Saved but email unavailable'};}},
    '@/lib/security/rate-limiter':{getClientIp:()=> 'synthetic',checkRateLimit:async()=>({limited:false,totalLimit:10,remaining:9}),createRateLimitResponse(){}},
    '@/lib/security/idempotency':{generateRegistrationFingerprint:()=> 'synthetic',checkIdempotency:()=>null,saveIdempotencyRecord(){}},
    '@/lib/security/turnstile':{verifyCloudflareTurnstile:async()=>{captchaCalls++;return {success:false};}},
  });
  const request=(origin='https://test.invalid',source='on_spot')=>{
    const form=new FormData();form.set('registration_source',source);form.set('event_id','synthetic-event');
    form.set('screenshot_file',new File([Buffer.from([137,80,78,71,13,10,26,10,0])],'test.png',{type:'image/png'}));
    return new Request('https://test.invalid/api/register',{method:'POST',body:form,headers:{origin}});
  };
  assert.equal((await route.POST(request())).status,403);
  staff={user:{id:'real-auth-id'},profile:{roles:[]},role:'finance'};
  assert.equal((await route.POST(request('https://attacker.invalid'))).status,403);
  const response=await route.POST(request());assert.equal(response.status,200);
  assert.equal(saved.createdBy,'real-auth-id');assert.equal(saved.registrationSource,'on_spot');assert.equal(captchaCalls,0);
  assert.equal((await response.json()).message,'Saved but email unavailable');
  assert.equal((await route.POST(request('https://test.invalid','online'))).status,400);assert.equal(captchaCalls,1);
});

test('valid ten-digit phone numbers starting with 91 are preserved', () => {
  const {studentRegistrationSchema}=load('lib/validation.ts');
  const field=studentRegistrationSchema.shape.phone_number;
  assert.equal(field.parse('9123456789'),'9123456789');
  assert.equal(field.parse('+91 9123456789'),'9123456789');
});

test('production request limits use atomic storage and fail closed on errors', async () => {
  const old=process.env.NODE_ENV;let error=null,data=true,calls=0;
  const limiter=load('lib/security/rate-limiter.ts',{'next/server':{NextResponse:Response},'@/lib/supabase/admin':{createAdminSupabase:()=>({rpc:async(_name,params)=>{calls++;assert.ok(!params.p_key.includes('private-email'));return {data,error};}})}});
  try {
    process.env.NODE_ENV='production';
    assert.equal((await limiter.checkRateLimit('private-email','registration')).limited,false);
    data=false;assert.equal((await limiter.checkRateLimit('private-email','registration')).limited,true);
    error=new Error('offline');await assert.rejects(()=>limiter.checkRateLimit('private-email','registration'),/temporarily unavailable/);
    assert.equal(calls,3);
  } finally {if(old===undefined) delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});

test('upload fallback requires durable storage and does not deduplicate private proofs into avatars', async () => {
  const keys=['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_DRIVE_RELAY_URL','GOOGLE_FORM_WEBHOOK_URL'];
  const previous=keys.map(key=>process.env[key]);keys.forEach(key=>delete process.env[key]);
  let fail=true,writes=0;const payloads=[];
  const drive=load('lib/google/drive.ts',{
    crypto:{default:require('node:crypto')},googleapis:{google:{}},
    '@/lib/google/sheets':{appendToGoogleSheet:async()=>{}},'@/lib/utils/format':{formatISTDate:String},
    '@/lib/supabase/admin':{createAdminSupabase:()=>({from:()=>({insert:async row=>{writes++;payloads.push(row.payload);return {error:fail?new Error('offline'):null};}})})},
  });
  const buffer=Buffer.from([137,80,78,71,13,10,26,10,0]);
  const proof={fileBuffer:buffer,fileName:'test.png',mimeType:'image/png',eventTitle:'Synthetic event'};
  try {
    await assert.rejects(()=>drive.uploadPaymentScreenshotToDrive(proof),/could not be saved/);
    fail=false;const saved=await drive.uploadPaymentScreenshotToDrive(proof);
    assert.ok(saved.viewUrl.startsWith('/api/admin/drive/preview/'));
    assert.equal(payloads[1].visibility,'private');
    await drive.uploadMemberAvatarToDrive({buffer,fileName:'test.png',mimeType:'image/png',memberName:'Synthetic'});
    assert.equal(writes,3);assert.equal(payloads[2].visibility,'public');
  } finally {keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});}
});

test('Apps Script refuses missing or incorrect relay tokens before invoking handlers', () => {
  let secret=null;
  const context={PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='DRIVE_RELAY_TOKEN'?secret:null})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},Logger:{log(){}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('scripts/apps-script.js','utf8'),context);
  for(const token of ['', 'wrong']) {
    secret=token?'correct':null;
    const response=context.doPost({postData:{contents:JSON.stringify({action:'upload',token})}});
    assert.equal(JSON.parse(response.text).error,'Unauthorized');
  }
});
