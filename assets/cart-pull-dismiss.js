/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 *
 * Uses document-level touch event capturing (the most reliable
 * cross-browser approach) so the gesture is intercepted before
 * the browser's native scroll handler can steal it.
 *
 * Visual feedback: the handle bar turns darker while pulling.
 */
(function () {
  'use strict';

  var THRESHOLD = 0.3;
  var SNAP_MS   = 250;

  function init() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    var inner = drawer.querySelector('[data-cart-drawer-inner]');
    var body  = drawer.querySelector('[data-cart-drawer-body]');
    var head  = drawer.querySelector('.drawer__head');
    if (!inner || !body) return;

    // The handle bar pseudo-element can't be styled via JS,
    // so we find or create a real element for visual feedback
    var handleBar = body.querySelector('.cm-pull-handle');
    if (!handleBar) {
      // The ::before pseudo creates the bar; we don't touch it
    }

    var startY  = 0;
    var lastY   = 0;
    var pulling = false;
    var onHead  = false;
    var baseTransform = '';

    function isMobile() { return window.innerWidth < 750; }

    function getBaseTransform() {
      // Read the current computed transform (set by CSS animation fill-forward)
      var m = getComputedStyle(inner).transform;
      // identity or none → empty
      if (!m || m === 'none' || m === 'matrix(1, 0, 0, 1, 0, 0)') return '';
      // Extract translateX from matrix(a,b,c,d,tx,ty)
      var parts = m.match(/matrix\(([^)]+)\)/);
      if (parts) {
        var vals = parts[1].split(',').map(Number);
        var tx = vals[4];
        if (tx !== 0) return 'translateX(' + tx + 'px)';
      }
      return '';
    }

    function resetInner() {
      inner.style.transform  = '';
      inner.style.transition = '';
      body.style.overflowY   = '';
      pulling = false;
    }

    // ---- Document-level capturing handlers ----
    // Registered on document in the CAPTURING phase so they fire
    // before the browser's scroll compositor can commit the gesture.

    function onTouchStart(e) {
      if (!isMobile()) return;
      if (!drawer.classList.contains('is-open')) return;

      var t = e.touches[0];
      // Check if touch is inside the drawer
      var rect = inner.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right ||
          t.clientY < rect.top  || t.clientY > rect.bottom) return;

      startY  = t.clientY;
      lastY   = startY;
      pulling = false;
      onHead  = !!(head && head.contains(e.target));

      // Capture the base transform (from CSS animation) before we override it
      baseTransform = getBaseTransform();
    }

    function onTouchMove(e) {
      if (!isMobile()) return;
      if (!drawer.classList.contains('is-open')) return;
      if (!startY) return;

      var t  = e.touches[0];
      var dy = t.clientY - startY;

      // Upward → cancel any active pull
      if (dy <= 0) {
        if (pulling) resetInner();
        return;
      }

      // Can pull? Header always; body only at scroll-top
      var canPull = onHead || (body.scrollTop <= 0);
      if (!canPull) return;

      // Dead-zone: 10 px before committing
      if (!pulling && dy < 10) return;

      // ---- Commit to pull gesture ----
      if (!pulling) {
        pulling = true;
        inner.style.transition = 'none';
        body.style.overflowY = 'hidden';
      }

      // MUST preventDefault to stop browser scroll / pull-to-refresh
      e.preventDefault();

      lastY = t.clientY;
      var raw = lastY - startY;
      var resistance = Math.min(raw * 0.55, window.innerHeight * 0.8);

      var tf = baseTransform
        ? baseTransform + ' translateY(' + resistance + 'px)'
        : 'translateY(' + resistance + 'px)';
      inner.style.transform = tf;
    }

    function onTouchEnd(e) {
      if (!pulling) { startY = 0; return; }

      var dy = lastY - startY;
      var resistance = Math.min(dy * 0.55, window.innerHeight * 0.8);
      var height = inner.offsetHeight || window.innerHeight;

      if (resistance > height * THRESHOLD) {
        // ---- Dismiss: slide down ----
        inner.style.transition = 'transform 0.3s ease-out';
        var tf = baseTransform
          ? baseTransform + ' translateY(100vh)'
          : 'translateY(100vh)';
        inner.style.transform = tf;

        setTimeout(function () {
          resetInner();
          drawer.closeCartDrawer();
        }, 320);
      } else {
        // ---- Snap back ----
        inner.style.transition = 'transform ' + SNAP_MS + 'ms ease-out';
        inner.style.transform = baseTransform || '';

        setTimeout(function () {
          inner.style.transition = '';
          inner.style.transform  = '';
        }, SNAP_MS);
      }

      startY  = 0;
      pulling = false;
    }

    // Register in CAPTURING phase on document — fires before element-level handlers
    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { capture: true, passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { capture: true, passive: true });

    // Clean up on normal close
    document.addEventListener('theme:cart-drawer:close', function () {
      resetInner();
      startY = 0;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
