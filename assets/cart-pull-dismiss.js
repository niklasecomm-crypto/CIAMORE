/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 * Swipe down on the header handle to close the cart drawer.
 *
 * Uses Pointer Events + setPointerCapture for maximum mobile reliability.
 * The header area (.drawer__head) is always draggable.
 * When the body (.drawer__body) is scrolled to top, pulling down there also works.
 * Pull past 30 % of drawer height → close (slide down).
 * Pull less → snap back.
 */
(function () {
  'use strict';

  var THRESHOLD = 0.3;
  var SNAP_MS = 250;
  var BASE = 'translateX(-100%)';

  function init() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    var inner = drawer.querySelector('[data-cart-drawer-inner]');
    var body  = drawer.querySelector('[data-cart-drawer-body]');
    var head  = drawer.querySelector('.drawer__head');
    if (!inner || !body) return;

    var active    = false;   // gesture recognised
    var pointerId = -1;
    var startY    = 0;
    var lastY     = 0;
    var onHead    = false;

    /* ---- helpers ---- */
    function isMobile() { return window.innerWidth < 750; }
    function isOpen()   { return drawer.classList.contains('is-open'); }

    function resetInner() {
      inner.style.transform  = '';
      inner.style.transition = '';
      body.style.overflowY   = '';
    }

    /* ---- pointer handlers (registered on inner) ---- */
    function onDown(e) {
      if (!isMobile() || !isOpen()) return;
      // Only primary pointer (finger / left mouse)
      if (!e.isPrimary) return;

      startY    = e.clientY;
      lastY     = startY;
      active    = false;
      onHead    = !!(head && head.contains(e.target));
      pointerId = e.pointerId;
    }

    function onMove(e) {
      if (e.pointerId !== pointerId) return;
      if (!isMobile() || !isOpen()) return;

      var dy = e.clientY - startY;

      // Only downward
      if (dy <= 0) {
        if (active) { resetInner(); active = false; }
        return;
      }

      // May pull if on head OR body is at scroll-top
      var canPull = onHead || (body.scrollTop <= 0);
      if (!canPull) return;

      // Dead zone (10 px) before committing — avoids accidental pulls
      if (!active && dy < 10) return;

      // Commit to gesture
      if (!active) {
        active = true;
        // Capture all future pointer events to THIS element
        try { inner.setPointerCapture(pointerId); } catch (_) {}
        inner.style.transition = 'none';
        body.style.overflowY = 'hidden';
      }

      lastY = e.clientY;
      var raw = lastY - startY;
      var resistance = Math.min(raw * 0.55, window.innerHeight * 0.8);
      inner.style.transform = BASE + ' translateY(' + resistance + 'px)';
    }

    function onUp(e) {
      if (e.pointerId !== pointerId) return;
      try { inner.releasePointerCapture(pointerId); } catch (_) {}
      body.style.overflowY = '';

      if (!active) { pointerId = -1; return; }
      active = false;
      pointerId = -1;

      var raw = lastY - startY;
      var resistance = Math.min(raw * 0.55, window.innerHeight * 0.8);
      var height = inner.offsetHeight || window.innerHeight;

      if (resistance > height * THRESHOLD) {
        // ---- close: slide down ----
        inner.style.transition = 'transform 0.3s ease-out';
        inner.style.transform  = BASE + ' translateY(100vh)';
        setTimeout(function () {
          resetInner();
          drawer.closeCartDrawer();
        }, 320);
      } else {
        // ---- snap back ----
        inner.style.transition = 'transform ' + SNAP_MS + 'ms ease-out';
        inner.style.transform  = BASE;
        setTimeout(function () {
          inner.style.transition = '';
          inner.style.transform  = '';   // let CSS animation fill-forward take over
        }, SNAP_MS);
      }
    }

    function onCancel(e) {
      if (e.pointerId !== pointerId) return;
      try { inner.releasePointerCapture(pointerId); } catch (_) {}
      resetInner();
      active = false;
      pointerId = -1;
    }

    /* ---- register ---- */
    inner.addEventListener('pointerdown',   onDown,   { passive: true });
    inner.addEventListener('pointermove',   onMove,   { passive: true });
    inner.addEventListener('pointerup',     onUp,     { passive: true });
    inner.addEventListener('pointercancel', onCancel, { passive: true });

    // CSS does the heavy lifting: touch-action:none on .drawer__head
    // prevents browser from stealing vertical swipes on the header.
    // For the body area we rely on scroll-top check + pointerCapture.

    /* ---- safety: clean up on normal close ---- */
    document.addEventListener('theme:cart-drawer:close', function () {
      resetInner();
      active = false;
      pointerId = -1;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
