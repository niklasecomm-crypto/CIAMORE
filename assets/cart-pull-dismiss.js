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

  var THRESHOLD = 0.25;
  var VELOCITY_THRESHOLD = 0.4; // px/ms — fast swipe bypasses distance check
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
     * The slide-down was already done by our pull gesture.
     */
    function closeWithoutSlideRight() {
      // Prevent the slideOutRight animation by overriding inline
      inner.style.animation = 'none';

      // Call the theme's close method (handles classes, events, scroll unlock, a11y)
      drawer.closeCartDrawer();

      // Clean up after a frame
      requestAnimationFrame(function () {
        resetInner();
        inner.style.animation = '';
      });
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

      var resistance = Math.min(dy * 0.55, window.innerHeight * 0.75);
      inner.style.transform = baseTransform
        ? baseTransform + ' translateY(' + resistance + 'px)'
        : 'translateY(' + resistance + 'px)';
    }

    function onEnd() {
      handle.classList.remove('is-pulling');
      if (!pulling) { startY = 0; return; }

      var dy = lastY - startY;
      var dt = Date.now() - startT;
      var velocity = dy / Math.max(dt, 1);
      var resistance = Math.min(dy * 0.55, window.innerHeight * 0.75);
      var height = inner.offsetHeight || window.innerHeight;

      var dismiss = resistance > height * THRESHOLD || velocity > VELOCITY_THRESHOLD;

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
