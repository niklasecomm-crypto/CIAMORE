/* CIAMORE | Benefits-Laufband auf der Produktseite: läuft automatisch, lässt sich wischen,
   läuft nach 1 Sekunde in Wischrichtung weiter (gleiche Logik wie "Was unsere Kundinnen sagen") */
(function () {
  function init(list) {
    if (list.__cmRun) return; list.__cmRun = true;
    var COPIES = 9, dur = 12, resumeDelay = 1000, dir = 1;
    var vp = document.createElement('div'); vp.className = 'cm-usp-run';
    var track = document.createElement('div'); track.className = 'cm-usp-run__track';
    vp.appendChild(track);
    for (var k = 0; k < COPIES; k++) {
      var c = list.cloneNode(true); c.removeAttribute('data-v'); c.className = 'cm-usp-run__set';
      if (k !== Math.floor(COPIES / 2)) c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('img').forEach(function (i) { i.loading = 'eager'; });
      track.appendChild(c);
    }
    list.parentNode.insertBefore(vp, list); list.style.display = 'none';

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var setW = 0, base = 0, off = 0, last = 0, ramp = 1, lastSl = 0;
    var auto = true, touching = false, visible = true, timer = null;
    function setOff(v) { off = v; track.style.transform = 'translate3d(' + (-off) + 'px,0,0)'; }
    function center() { return (setW * COPIES - vp.clientWidth) / 2; }
    function measure() {
      var w = track.scrollWidth / COPIES; if (!w) return;
      var phase = setW ? (((base + off) % setW) + setW) % setW * (w / setW) : 0;
      setW = w; var c = center(); var cur = phase + Math.round((c - phase) / w) * w;
      setOff(0); vp.scrollLeft = cur; base = vp.scrollLeft; lastSl = base;
    }
    function recenter() {
      if (!setW) return; var sl = vp.scrollLeft;
      var t = sl + Math.round((center() - sl) / setW) * setW;
      if (Math.abs(t - sl) > 1) vp.scrollLeft = t; lastSl = vp.scrollLeft;
    }
    function toNative() { if (!auto) return; auto = false; var p = Math.round(base + off); setOff(0); vp.scrollLeft = p; lastSl = vp.scrollLeft; }
    function toAuto() { recenter(); base = vp.scrollLeft; lastSl = base; setOff(0); last = 0; ramp = 0; auto = true; }
    function wrapAuto() { var p = base + off, c = center(); if (p < c - setW / 2) setOff(off + setW); else if (p > c + setW / 2) setOff(off - setW); }
    function resume() { clearTimeout(timer); timer = setTimeout(function () { if (!touching) toAuto(); }, resumeDelay); }
    function ease(x) { return x < 1 ? x * x * (3 - 2 * x) : 1; }
    function tick(t) {
      if (!document.body.contains(vp)) return;
      if (!last) last = t; var dt = Math.min(t - last, 50) / 1000; last = t;
      if (auto && visible && !reduce && setW) { if (ramp < 1) ramp = Math.min(1, ramp + dt / 0.9); setOff(off + dir * (setW / dur) * ease(ramp) * dt); wrapAuto(); }
      requestAnimationFrame(tick);
    }
    vp.addEventListener('touchstart', function () { touching = true; clearTimeout(timer); toNative(); recenter(); }, { passive: true });
    function endTouch() { touching = false; resume(); }
    vp.addEventListener('touchend', endTouch, { passive: true });
    vp.addEventListener('touchcancel', endTouch, { passive: true });
    vp.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { toNative(); resume(); } }, { passive: true });
    vp.addEventListener('scroll', function () {
      if (auto) return; var sl = vp.scrollLeft, d = sl - lastSl;
      if (Math.abs(d) > 0.5 && Math.abs(d) < setW * 0.5) dir = d > 0 ? 1 : -1;
      lastSl = sl; if (!touching) resume();
    }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; last = 0; }).observe(vp);
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (auto) measure(); }).observe(vp);
    window.addEventListener('load', function () { if (auto) measure(); });
    measure(); requestAnimationFrame(tick);
  }
  function run() { document.querySelectorAll('.cm-usp[data-v="marquee"]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
