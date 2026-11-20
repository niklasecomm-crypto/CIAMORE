/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 * Swipe down to close the cart drawer on touch devices.
 *
 * Rules:
 *  - Header (.drawer__head) is always draggable (touch-action: none via CSS)
 *  - Body (.drawer__body) is draggable only when scrolled to top
 *  - Pull past 30% of drawer height → close
 *  - Pull less than 30% → snap back
 *  - Only active on touch devices (< 750px)
 */
(function () {
  'use strict';

  var THRESHOLD_RATIO = 0.3;
  var SNAP_DURATION = 250; // ms
  var BASE_TRANSFORM = 'translateX(-100%)';

  function init() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    var inner = drawer.querySelector('[data-cart-drawer-inner]');
    var body = drawer.querySelector('[data-cart-drawer-body]');
    var head = drawer.querySelector('.drawer__head');
    if (!inner || !body) return;

    var startY = 0;
    var currentY = 0;
    var pulling = false;
    var startedOnHeader = false;
    var locked = false; // true once we decide this gesture is a pull

    function getScrollTop() {
      return body.scrollTop || 0;
    }

    function onTouchStart(e) {
      if (window.innerWidth >= 750) return;
      if (!drawer.classList.contains('is-open')) return;

      var touch = e.touches[0];
      startY = touch.clientY;
      currentY = startY;
      pulling = false;
      locked = false;

      startedOnHeader = head && head.contains(e.target);

      // If starting on header, immediately signal we may prevent scroll
      if (startedOnHeader) {
        locked = true;
      }
    }

    function onTouchMove(e) {
      if (window.innerWidth >= 750) return;
      if (!drawer.classList.contains('is-open')) return;

      var touch = e.touches[0];
      var deltaY = touch.clientY - startY;

      // Only pull down (positive delta)
      if (deltaY <= 0) {
        if (pulling) {
          inner.style.transform = BASE_TRANSFORM;
          inner.style.transition = '';
          pulling = false;
        }
        return;
      }

      // Allow pull if: on header OR scrolled to top
      var canPull = startedOnHeader || getScrollTop() <= 0;
      if (!canPull) return;

      // Lock on first qualifying move — after this, we own the gesture
      if (!locked) {
        // Check if this is more vertical than horizontal (avoid hijacking horizontal swipes)
        var dx = Math.abs(touch.clientX - (startY ? touch.clientX : 0)); // approx
        if (deltaY > 8) {
          locked = true;
        } else {
          return;
        }
      }

      // Start pulling
      if (!pulling) {
        pulling = true;
        inner.style.transition = 'none';
        // Prevent body from scrolling during pull
        body.style.overflowY = 'hidden';
      }

      currentY = touch.clientY;

      var rawDelta = currentY - startY;
      var resistance = Math.min(rawDelta * 0.6, window.innerHeight * 0.8);

      inner.style.transform = BASE_TRANSFORM + ' translateY(' + resistance + 'px)';

      e.preventDefault();
    }

    function onTouchEnd() {
      // Restore body scroll
      body.style.overflowY = '';

      if (!pulling) return;
      pulling = false;
      locked = false;

      var deltaY = currentY - startY;
      var resistance = Math.min(deltaY * 0.6, window.innerHeight * 0.8);
      var drawerHeight = inner.offsetHeight || window.innerHeight;
      var threshold = drawerHeight * THRESHOLD_RATIO;

      if (resistance > threshold) {
        // Past threshold → slide down and close
        inner.style.transition = 'transform 0.3s ease-out';
        inner.style.transform = BASE_TRANSFORM + ' translateY(100vh)';

        setTimeout(function () {
          inner.style.transform = '';
          inner.style.transition = '';
          drawer.closeCartDrawer();
        }, 300);
      } else {
        // Snap back to open position
        inner.style.transition = 'transform ' + SNAP_DURATION + 'ms ease-out';
        inner.style.transform = BASE_TRANSFORM;

        setTimeout(function () {
          inner.style.transition = '';
          // Clear inline transform so CSS animation fill-forward takes over again
          inner.style.transform = '';
        }, SNAP_DURATION);
      }
    }

    // Register on inner with passive:false for touchmove so we can preventDefault
    inner.addEventListener('touchstart', onTouchStart, { passive: true });
    inner.addEventListener('touchmove', onTouchMove, { passive: false });
    inner.addEventListener('touchend', onTouchEnd, { passive: true });

    // Also register on head specifically — ensures capturing even if body steals events
    if (head) {
      head.addEventListener('touchstart', onTouchStart, { passive: true });
      head.addEventListener('touchmove', onTouchMove, { passive: false });
      head.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    // Clean up transform when drawer closes normally (X button, overlay, etc.)
    document.addEventListener('theme:cart-drawer:close', function () {
      inner.style.transform = '';
      inner.style.transition = '';
      body.style.overflowY = '';
      pulling = false;
      locked = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
