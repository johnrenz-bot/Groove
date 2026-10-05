
const fs=require('fs');
const txt=fs.readFileSync('.env.local','utf8')+fs.readFileSync('.env','utf8');
const g=(k)=>{const m=txt.match(new RegExp('^'+k+'=(.*)$','m'));return m?m[1].trim().replace(/^["']|["']$/g,''):null;};
(async()=>{
  const {createClient}=require('@supabase/supabase-js');
  const sb=createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  const email='groove.confirm.'+Date.now()+'@example.com';
  const {data,error}=await sb.auth.signUp({email,password:'Str0ngPass!23',options:{data:{role:'client',firstname:'Probe'}}});
  console.log('signUp error:', error?error.message:'none');
  console.log('session returned (=> email confirmation DISABLED):', !!(data&&data.session));
  const uid = data&&data.user&&data.user.id;
  if (uid) {
    const {data:rows}=await sb.from('profiles').select('id,role,email').eq('id',uid).maybeSingle();
    console.log('trigger-created profile row:', rows?JSON.stringify(rows):'NONE');
    console.log('TEST_UID='+uid);
  }
})();
