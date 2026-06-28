/**
 * Inlined into the blocking no-flash script so dashboard accent reads are
 * scoped to the signed-in Supabase user (localStorage is per-origin, not per-user).
 */
export const SUPABASE_COOKIE_USER_ID_SNIPPET = `
function __pvUid(){
  try{
    var prefix='';
    var chunks={};
    var parts=document.cookie.split(';');
    for(var i=0;i<parts.length;i++){
      var p=parts[i].trim();
      var eq=p.indexOf('=');
      if(eq<0)continue;
      var name=p.slice(0,eq);
      var val=decodeURIComponent(p.slice(eq+1));
      var m=name.match(/^sb-[^-]+-auth-token(?:\\.(\\d+))?$/);
      if(!m)continue;
      if(m[1]!==undefined){chunks[m[1]]=val;}else{prefix=val;}
    }
    var raw=prefix;
    if(!raw){
      var keys=Object.keys(chunks).sort(function(a,b){return Number(a)-Number(b);});
      if(!keys.length)return null;
      raw=keys.map(function(k){return chunks[k];}).join('');
    }
    if(raw.indexOf('base64-')===0)raw=raw.slice(7);
    var json=JSON.parse(atob(raw.replace(/-/g,'+').replace(/_/g,'/')));
    return json&&json.user&&json.user.id||null;
  }catch(e){return null;}
}
function __pvScoped(key,uid){
  if(!uid)return null;
  return localStorage.getItem(key+':'+uid);
}
`.trim();
