import {readFile,writeFile} from 'node:fs/promises';
const base=await readFile('supabase/schema.sql','utf8');
const reconciliation=await readFile('supabase/migrations/20260930_admin_reconciliation.sql','utf8');
const retirement=await readFile('supabase/migrations/20260930_retire_plaintext_credentials.sql','utf8');
const sql='-- GENERATED: node scripts/create-fresh-schema.mjs\n-- Fresh Supabase projects only; use the reconciliation migration for an existing deployment.\nbegin;\n'+base+'\n'+reconciliation.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')+'\n'+retirement.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')+'\ncommit;\n';
const hierarchy=await readFile('supabase/migrations/20261007_team_hierarchy.sql','utf8');
await writeFile('supabase/fresh-install.sql',(sql+'\n'+hierarchy).replace(/[ \t]+$/gm, '').trimEnd()+'\n');
console.log('Generated supabase/fresh-install.sql');
