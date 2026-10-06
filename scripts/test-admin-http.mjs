import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

// Local production-server smoke test; never targets the deployed website.
const port=3027;
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='';
child.stdout.on('data',data=>{output+=data.toString();});
child.stderr.on('data',data=>{output+=data.toString();});
try {
  let ready=false;
  for(let i=0;i<90;i++) {
    if(child.exitCode!==null) throw new Error('Local server exited before becoming ready.');
    if(output.includes('Ready in')) {ready=true;break;}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.equal(ready,true,'Local production server must become ready');
  const cookie='club_admin_email=forged%40example.invalid; club_admin_session=1';
  const login=await fetch(`${base}/admin/login`);
  assert.equal(login.status,200);
  console.log('PASS: login page renders');
  for(const path of ['/admin','/admin/users','/admin/events','/admin/finance']) {
    const response=await fetch(base+path,{headers:{cookie},redirect:'manual'});
    assert.ok([303,307,308].includes(response.status),`${path} must redirect without a verified session`);
    assert.ok(response.headers.get('location')?.includes('/admin/login'));
    console.log(`PASS: forged cookies rejected by ${path}`);
  }
  for(const path of ['/api/checkin/scan','/api/admin/email','/api/admin/export','/api/admin/events/archive']) {
    const response=await fetch(base+path,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'verify',qrToken:'synthetic-test'})});
    assert.ok([401,403].includes(response.status),`${path}: expected access denial, received ${response.status}`);
    console.log(`PASS: forged cookies rejected by ${path}`);
  }
  for(const path of ['/api/blogs/sync','/api/cron/sync-linkedin']) {
    for(const method of ['GET','POST']) {
      const response=await fetch(base+path,{method});
      assert.equal(response.status,401,`${method} ${path} must require cron authentication`);
      console.log(`PASS: unauthenticated ${method} rejected by ${path}`);
    }
  }
  for(const path of ['/api/admin/system-status','/api/admin/drive/preview/synthetic']) {
    const response=await fetch(base+path,{headers:{cookie}});
    assert.ok([401,403].includes(response.status));
    console.log(`PASS: forged cookies rejected by ${path}`);
  }
  assert.equal((await fetch(base+'/api/drive/asset/invalid.file')).status,400);
  console.log('PASS: invalid public asset identifier rejected');
  const form=new FormData();form.set('registration_source','on_spot');form.set('event_id','synthetic');
  const onSpot=await fetch(base+'/api/register',{method:'POST',headers:{cookie,origin:base},body:form});
  assert.equal(onSpot.status,403);
  console.log('PASS: forged cookies cannot bypass CAPTCHA using on-spot registration');
  console.log('17 local production HTTP checks passed. No authenticated writes or email deliveries were attempted.');
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {child.kill();}
