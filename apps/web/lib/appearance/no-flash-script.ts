export const APPEARANCE_STORAGE_KEYS = {
  accent: 'planevo-accent',
  fontSize: 'planevo-font-size',
  motion: 'planevo-motion',
} as const;

/**
 * Blocking script injected before first paint to apply accent / font-size / motion
 * and prevent a flash of the default theme.
 */
export const appearanceNoFlashScript = `(function(){try{
  if (!window.location.pathname.startsWith('/dashboard')) {
    document.documentElement.setAttribute('data-public', 'true');
  }
  var a=localStorage.getItem('${APPEARANCE_STORAGE_KEYS.accent}')||'honey';
  document.documentElement.setAttribute('data-accent',a);
  var f=localStorage.getItem('${APPEARANCE_STORAGE_KEYS.fontSize}')||'default';
  var s={compact:0.92,'default':1,large:1.1}[f]||1;
  document.documentElement.style.setProperty('--font-scale',String(s));
  if(localStorage.getItem('${APPEARANCE_STORAGE_KEYS.motion}')==='reduced'){document.documentElement.classList.add('reduce-motion');}
}catch(e){}})();`;
