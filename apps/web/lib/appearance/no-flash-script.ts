import { APPEARANCE_STORAGE_KEYS } from '@/lib/appearance/appearance-storage';
import { SUPABASE_COOKIE_USER_ID_SNIPPET } from '@/lib/appearance/cookie-user-id-snippet';

/**
 * Blocking script injected before first paint to apply accent / font-size / motion
 * and prevent a flash of the default theme.
 */
export const appearanceNoFlashScript = `(function(){try{
${SUPABASE_COOKIE_USER_ID_SNIPPET}
var uid=__pvUid();
var isPublic=!window.location.pathname.startsWith('/dashboard');
if(isPublic){
  document.documentElement.setAttribute('data-public','true');
  document.documentElement.setAttribute('data-accent','amber');
  document.documentElement.setAttribute('data-color-theme','daylight');
}else{
  var a=__pvScoped('${APPEARANCE_STORAGE_KEYS.accent}',uid)||'amber';
  document.documentElement.setAttribute('data-accent',a);
  var ct=__pvScoped('${APPEARANCE_STORAGE_KEYS.colorTheme}',uid)||'daylight';
  document.documentElement.setAttribute('data-color-theme',ct);
}
var f=__pvScoped('${APPEARANCE_STORAGE_KEYS.fontSize}',uid)||'default';
var s={compact:0.92,'default':1,large:1.1}[f]||1;
document.documentElement.style.setProperty('--font-scale',String(s));
if(__pvScoped('${APPEARANCE_STORAGE_KEYS.motion}',uid)==='reduced'){document.documentElement.classList.add('reduce-motion');}
}catch(e){}})();`;

export { APPEARANCE_STORAGE_KEYS };
