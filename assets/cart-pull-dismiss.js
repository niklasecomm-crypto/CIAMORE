/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 * Swipe down to close the cart drawer on touch devices.
 *
 * Rules:
 *  - Header (.drawer__head) is always draggable
 *  - Body (.drawer__body) is draggable only when scrolled to top
 *  - Pull past 30% of drawer height → close
 *  - Pull less than 30% → snap back
 *  - Only active on touch devices (< 750px)
 */
(function () {
  'use strict';

  var THRESHOLD_RATIO = 0.3;
  var SNAP_DURATION = 250; // ms

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

    function getScrollTop() {
      return body.scrollTop || 0;
    }

    function onTouchStart(e) {
      // Only on mobile-ish widths
      if (window.innerWidth >= 750) return;
      // Only when drawer is open
      if (!drawer.classList.contains('is-open')) return;

      var touch = e.touches[0];
      startY = touch.clientY;
      currentY = startY;
      pulling = false;

      // Check if touch started on the header area
      startedOnHeader = head && head.contains(e.target);
    }

    function onTouchMove(e) {
      if (window.innerWidth >= 750) return;
      if (!drawer.classList.contains('is-open')) return;

      var touch = e.touches[0];
      var deltaY = touch.clientY - startY;

      // Only pull down (positive delta)
      if (deltaY <= 0) {
        if (pulling) {
          // Was pulling but reversed direction → reset
          inner.style.transform = '';
          inner.style.transition = '';
          pulling = false;
        }
        return;
      }

      // Allow pull if: on header OR scrolled to top
      var canPull = startedOnHeader || getScrollTop() <= 0;
      if (!canPull) return;

      // Start pulling
      if (!pulling) {
        pulling = true;
        inner.style.transition = 'none';
      }

      currentY = touch.clientY;

      // Apply resistance curve (feels more natural)
      var rawDelta = currentY - startY;
      var resistance = Math.min(rawDelta * 0.6, window.innerHeight * 0.8);

      // The drawer is already translateX(-100%), we add translateY
      inner.style.transform = 'translateX(-100%) translateY(' + resistance + 'px)';

      // Prevent scroll while pulling
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!pulling) return;
      pulling = false;

      var deltaY = currentY - startY;
      var resistance = Math.min(deltaY * 0.6, window.innerHeight * 0.8);
      var drawerHeight = inner.offsetHeight || window.innerHeight;
      var threshold = drawerHeight * THRESHOLD_RATIO;

      if (resistance > threshold) {
        // Past threshold → slide down and close
        inner.style.transition = 'transform 0.3s ease-out';
        inner.style.transform = 'translateX(-100%) translateY(100vh)';

        // After animation, actually close the drawer
        setTimeout(function () {
          inner.style.transform = '';
          inner.style.transition = '';
          drawer.closeCartDrawer();
        }, 300);
      } else {
        // Snap back
        inner.style.transition = 'transform ' + SNAP_DURATION + 'ms ease-out';
        inner.style.transform = '';

        setTimeout(function () {
          inner.style.transition = '';
        }, SNAP_DURATION);
      }
    }

    // Use capturing + passive:false so we can preventDefault on touchmove
    inner.addEventListener('touchstart', onTouchStart, { passive: true });
    inner.addEventListener('touchmove', onTouchMove, { passive: false });
    inner.addEventListener('touchend', onTouchEnd, { passive: true });

    // Clean up transform when drawer closes normally (X button, overlay, etc.)
    document.addEventListener('theme:cart-drawer:close', function () {
      inner.style.transform = '';
      inner.style.transition = '';
      pulling = false;
    });
  }

  // Init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
