/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 *
 * The pull handle (.cm-pull-handle) and the overlay (.drawer__underlay)
 * both sit OUTSIDE the scroll container, so there is zero conflict
 * with native scrolling in the product list.
 *
 * Quick swipe or slow drag — both work.
 * Drawer slides DOWN (not to the side) when dismissed via pull.
 */
(function () {
  'use strict';

  var THRESHOLD = 0.3;           // 30 % of drawer height to dismiss
  var VELOCITY_THRESHOLD = 1.5;  // px/ms — only a real fast flick skips the distance check
  var SNAP_MS = 200;

  function init() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    var inner   = drawer.querySelector('[data-cart-drawer-inner]');
    var handle  = drawer.querySelector('[data-cart-pull-handle]');
    var overlay = drawer.querySelector('[data-drawer-underlay]');
    if (!inner || !handle) return;

    var startY = 0;
    var startT = 0;
    var lastY  = 0;
    var pulling = false;
    var baseTransform = '';

    function isMobile() { return window.innerWidth < 750; }

    function readBaseTransform() {
      var m = getComputedStyle(inner).transform;
      if (!m || m === 'none') return '';
      var p = m.match(/matrix\(([^)]+)\)/);
      if (p) {
        var tx = parseFloat(p[1].split(',')[4]);
        if (tx !== 0) return 'translateX(' + tx + 'px)';
      }
      return '';
    }

    function resetInner() {
      inner.style.transform  = '';
      inner.style.transition = '';
    }

    /**
     * Close the drawer without the slideOutRight animation.
     * We replicate what closeCartDrawer() does internally,
     * but skip the is-closing class that triggers slideOutRight.
     */
    function closeWithoutSlideRight() {
      // Remove is-open (this would normally trigger slideOutRight via is-closing)
      drawer.classList.remove('is-open');
      drawer.cartDrawerIsOpen = false;

      // Dispatch the same events the theme expects
      document.dispatchEvent(new CustomEvent('theme:cart-drawer:close', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('theme:scroll:unlock', { bubbles: true }));

      // A11y cleanup
      if (drawer.a11y) {
        try { drawer.a11y.removeTrapFocus(); } catch (_) {}
        try { drawer.a11y.autoFocusLastElement(); } catch (_) {}
      }

      // Remove body click listener (same as theme does)
      if (drawer.onBodyClickEvent) {
        document.body.removeEventListener('click', drawer.onBodyClickEvent);
      }

      // Reset our inline styles
      resetInner();
    }

    /* ---- Shared touch logic ---- */
    function onStart(e) {
      if (!isMobile()) return;
      if (!drawer.classList.contains('is-open')) return;

      var t = e.touches[0];
      startY = t.clientY;
      startT = Date.now();
      lastY  = startY;
      pulling = false;
      baseTransform = readBaseTransform();
    }

    function onMove(e) {
      if (!startY) return;

      var t  = e.touches[0];
      var dy = t.clientY - startY;

      if (dy <= 0) {
        if (pulling) {
          resetInner();
          handle.classList.remove('is-pulling');
          pulling = false;
        }
        return;
      }

      // Commit after 6px
      if (!pulling && dy < 6) return;

      if (!pulling) {
        pulling = true;
        inner.style.transition = 'none';
        handle.classList.add('is-pulling');
      }

      e.preventDefault();
      lastY = t.clientY;

      // Near-1:1 follow with slight rubber-band dampening past 60 % of screen
      var raw = dy * 0.85;
      var maxPull = window.innerHeight * 0.8;
      var pull = raw < maxPull ? raw : maxPull + (raw - maxPull) * 0.3;
      inner.style.transform = baseTransform
        ? baseTransform + ' translateY(' + pull + 'px)'
        : 'translateY(' + pull + 'px)';
    }

    function onEnd() {
      handle.classList.remove('is-pulling');
      if (!pulling) { startY = 0; return; }

      var dy = lastY - startY;
      var dt = Date.now() - startT;
      var velocity = dy / Math.max(dt, 1);
      var raw = dy * 0.85;
      var maxPull = window.innerHeight * 0.8;
      var pull = raw < maxPull ? raw : maxPull + (raw - maxPull) * 0.3;
      var height = inner.offsetHeight || window.innerHeight;

      var dismiss = pull > height * THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (dismiss) {
        // Slide down and close
        inner.style.transition = 'transform 0.3s ease-out';
        inner.style.transform = baseTransform
          ? baseTransform + ' translateY(100vh)'
          : 'translateY(100vh)';
        setTimeout(closeWithoutSlideRight, 320);
      } else {
        // Snap back
        inner.style.transition = 'transform ' + SNAP_MS + 'ms ease-out';
        inner.style.transform = baseTransform || '';
        setTimeout(resetInner, SNAP_MS);
      }

      startY  = 0;
      pulling = false;
    }

    /* ---- Register on the handle (outside scroll container) ---- */
    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove',  onMove,  { passive: false });
    handle.addEventListener('touchend',   onEnd,   { passive: true });

    /* ---- Register on the overlay (also outside scroll container) ---- */
    if (overlay) {
      overlay.addEventListener('touchstart', onStart, { passive: true });
      overlay.addEventListener('touchmove',  onMove,  { passive: false });
      overlay.addEventListener('touchend',   onEnd,   { passive: true });
    }

    // Clean up on normal close (X button, overlay tap, etc.)
    document.addEventListener('theme:cart-drawer:close', function () {
      resetInner();
      handle.classList.remove('is-pulling');
      pulling = false;
      startY  = 0;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
