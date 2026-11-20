/**
 * Cart Drawer – Pull to Dismiss (Mobile)
 *
 * The pull handle sits OUTSIDE the scroll container (.drawer__body),
 * so there is zero conflict with native scrolling.
 * touch-action:none on the handle in CSS prevents the browser
 * from intercepting the gesture.
 *
 * Quick swipe or slow drag — both work.
 */
(function () {
  'use strict';

  var THRESHOLD = 0.25;
  var VELOCITY_THRESHOLD = 0.4; // px/ms — fast swipe bypasses distance check
  var SNAP_MS = 200;

  function init() {
    var drawer = document.querySelector('cart-drawer');
    if (!drawer) return;

    var inner  = drawer.querySelector('[data-cart-drawer-inner]');
    var handle = drawer.querySelector('[data-cart-pull-handle]');
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

    handle.addEventListener('touchstart', function (e) {
      if (!isMobile()) return;
      if (!drawer.classList.contains('is-open')) return;

      var t = e.touches[0];
      startY = t.clientY;
      startT = Date.now();
      lastY  = startY;
      pulling = false;
      baseTransform = readBaseTransform();
    }, { passive: true });

    handle.addEventListener('touchmove', function (e) {
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
    }, { passive: false });

    handle.addEventListener('touchend', function () {
      handle.classList.remove('is-pulling');
      if (!pulling) { startY = 0; return; }

      var dy = lastY - startY;
      var dt = Date.now() - startT;
      var velocity = dy / Math.max(dt, 1); // px/ms
      var resistance = Math.min(dy * 0.55, window.innerHeight * 0.75);
      var height = inner.offsetHeight || window.innerHeight;

      var dismiss = resistance > height * THRESHOLD || velocity > VELOCITY_THRESHOLD;

      if (dismiss) {
        inner.style.transition = 'transform 0.3s ease-out';
        inner.style.transform = baseTransform
          ? baseTransform + ' translateY(100vh)'
          : 'translateY(100vh)';
        setTimeout(function () {
          resetInner();
          drawer.closeCartDrawer();
        }, 320);
      } else {
        inner.style.transition = 'transform ' + SNAP_MS + 'ms ease-out';
        inner.style.transform = baseTransform || '';
        setTimeout(function () {
          resetInner();
        }, SNAP_MS);
      }

      startY  = 0;
      pulling = false;
    }, { passive: true });

    // Clean up on normal close
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
