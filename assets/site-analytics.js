/* Mello Scoop: optional analytics. Never send booking field values or link queries. */
(() => {
  'use strict';
  const KEY = 'melloscoop-analytics-consent-v1';
  const production = /^(www\.)?melloscoop\.com$/.test(location.hostname);
  let enabled = false, started = false;
  const seen = new Set();
  const consent = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  function event(name, params = {}) {
    if (!enabled) return;
    window.gtag('event', name, { ...params, page_location: location.origin + location.pathname });
    window.clarity('event', name);
  }
  function load() {
    if (enabled || !production) return;
    enabled = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-BWVRCSFG43', { page_location: location.origin + location.pathname, page_referrer: document.referrer ? new URL(document.referrer).origin : '', allow_google_signals: false, allow_ad_personalization_signals: false });
    const ga = document.createElement('script'); ga.async = true; ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-BWVRCSFG43'; document.head.append(ga);
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    window.clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' });
    const cl = document.createElement('script'); cl.async = true; cl.src = 'https://www.clarity.ms/tag/yy48bmi1ek'; document.head.append(cl);
  }
  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch {}
    document.getElementById('analytics-choice')?.remove();
    if (value === 'yes') load();
    else if (enabled) {
      window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' });
      window.clarity('consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' });
      enabled = false;
      location.reload();
    }
  }
  function showChoice() {
    if (document.getElementById('analytics-choice')) return;
    const box = document.createElement('aside'); box.id = 'analytics-choice'; box.setAttribute('aria-label', 'Analytics preferences');
    box.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;max-width:520px;padding:18px;background:#faf6ed;color:#392d24;box-shadow:0 4px 30px #0002;border:1px solid #dfd4c3;border-radius:12px;z-index:99999;font:14px/1.5 sans-serif';
    box.innerHTML = '<p style="margin:0 0 12px">May we use analytics cookies to understand visits and improve your experience? Booking details are masked. <a href="/privacy.html">Privacy</a></p><button type="button" data-choice="yes">Allow analytics</button> <button type="button" data-choice="no">Decline</button>';
    box.querySelectorAll('button').forEach(button => { button.style.cssText = 'padding:9px 14px;border:1px solid #78614d;border-radius:20px;background:transparent;color:inherit;cursor:pointer'; button.onclick = () => choose(button.dataset.choice); });
    document.body.append(box);
  }
  document.querySelectorAll('.booking-section-wrapper,#check-result,input,textarea,select').forEach(el => el.setAttribute('data-clarity-mask', 'true'));
  const footer = document.querySelector('footer');
  if (footer) {
    const p = document.createElement('p'); p.className = 'footer-privacy-links'; p.style.cssText = 'font-size:10px;line-height:1.6;text-align:center;padding:10px 20px 0;margin:0;color:#857768;position:relative;z-index:1';
    const privacy = document.createElement('a'); privacy.href = location.pathname.includes('/characters/') ? '../privacy.html' : 'privacy.html'; privacy.textContent = 'Privacy'; privacy.style.cssText = 'color:inherit;font:inherit;text-decoration:none';
    const settings = document.createElement('button'); settings.type = 'button'; settings.textContent = 'Cookie settings'; settings.style.cssText = 'font:inherit;color:inherit;background:none;border:0;text-decoration:none;cursor:pointer;padding:0'; settings.onclick = showChoice;
    p.append(privacy, ' · ', settings); const bottom = footer.querySelector('.footer-bottom-bar'); if (bottom) { bottom.after(p); bottom.style.cssText += ';padding-top:24px!important;margin-top:0!important;position:relative;z-index:1'; } else footer.append(p);
  }
  if (consent() === 'yes') load(); else if (!consent() && production) showChoice();
  document.addEventListener('change', e => {
    if (!enabled || !e.target.closest('.booking-section-wrapper')) return;
    if (!started) { started = true; event('booking_start'); }
    const id = e.target.id || '';
    const step = /addon/.test(id) ? 'addons' : /package|tray|flav/.test(id + ' ' + e.target.className) ? 'package_flavours' : 'event_details';
    if (!seen.has(step)) { seen.add(step); event('booking_step_interacted', { step_name: step }); }
  });
  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (link && /^(https:\/\/)?(wa\.me|api\.whatsapp\.com)\//.test(link.href)) event(link.closest('#check-result') ? 'whatsapp_quote_click' : 'whatsapp_click');
    if (e.target.closest('[onclick*="checkAvailability"]')) event('booking_estimate_click');
    if (link && link.getAttribute('href') === '#booking') event('booking_open');
  });
  const result = document.getElementById('check-result');
  if (result) new MutationObserver(() => { if (result.querySelector('a[href*="wa.me"]')) event('booking_estimate_view'); }).observe(result, { childList: true, subtree: true });
  let active = '', seconds = 0, lastInput = Date.now();
  ['pointerdown','keydown','scroll','touchstart'].forEach(type => window.addEventListener(type, () => { lastInput = Date.now(); }, { passive:true }));
  const sections = [...document.querySelectorAll('section[id], section:has([id="booking"])')];
  const allowed = new Set(['packages','flavors','gallery','characters','faq','booking','together','top','pippo','enzo','how-it-works']);
  function flush() { if (active && seconds) event('section_active_time', { section_name: active, active_seconds: seconds }); seconds = 0; }
  setInterval(() => {
    if (!enabled || document.hidden || !document.hasFocus() || Date.now() - lastInput > 60000) return;
    let best = '', area = 0;
    sections.forEach(el => { const r = el.getBoundingClientRect(); const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); if (visible > area) { area = visible; best = el.id || 'booking'; } });
    if (!allowed.has(best)) best = '';
    if (best !== active) { flush(); active = best; if (best && !seen.has('section:' + best)) { seen.add('section:' + best); event('section_view', { section_name:best }); } }
    if (active) seconds++;
    if (seconds >= 30) flush();
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
})();
