# 23 — Browser Compatibility & Mobile Guide

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Ensure performance optimizations work across all target browsers and mobile devices. Covers browser support matrix, mobile-specific scenarios, and platform-specific considerations.

---

## Table of Contents

1. [Browser Support Matrix](#1-browser-support-matrix)
2. [Feature Compatibility](#2-feature-compatibility)
3. [Mobile-Specific Scenarios](#3-mobile-specific-scenarios)
4. [Touch Device Optimizations](#4-touch-device-optimizations)
5. [Mobile Network Conditions](#5-mobile-network-conditions)
6. [Platform-Specific Considerations](#6-platform-specific-considerations)
7. [Testing on Real Devices](#7-testing-on-real-devices)

---

## 1. Browser Support Matrix

### 1.1 Target Browsers

| Browser | Version | Market Share | Priority |
|---------|---------|--------------|----------|
| Chrome | Latest 2 versions | ~65% | **P0** (Primary) |
| Safari | Latest 2 versions | ~18% | **P0** (Primary) |
| Firefox | Latest 2 versions | ~3% | **P1** (Secondary) |
| Edge | Latest 2 versions | ~5% | **P1** (Secondary) |
| Samsung Internet | Latest 2 versions | ~2% | **P2** (Tertiary) |
| Opera | Latest 2 versions | ~2% | **P2** (Tertiary) |

**Note:** Internet Explorer is **not supported**.

### 1.2 Mobile Browsers

| Browser | Platform | Market Share | Priority |
|---------|----------|--------------|----------|
| Safari iOS | iOS 15+ | ~55% | **P0** (Primary) |
| Chrome Android | Android 10+ | ~40% | **P0** (Primary) |
| Samsung Internet | Android 10+ | ~3% | **P2** (Tertiary) |
| Firefox Mobile | Android 10+ | ~1% | **P2** (Tertiary) |

---

## 2. Feature Compatibility

### 2.1 Optimization Feature Support

| Optimization | Chrome | Safari | Firefox | Edge | Mobile Safari | Chrome Android |
|--------------|--------|--------|---------|------|---------------|----------------|
| **bfcache** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Navigation API** | ✅ 102+ | ⚠️ 16.4+ | ✅ 113+ | ✅ 102+ | ⚠️ 16.4+ | ✅ 102+ |
| **Intersection Observer** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **React 19 Concurrent Features** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Suspense for Data Fetching** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Dynamic Imports** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Web Vitals API** | ✅ Full | ⚠️ Partial | ⚠️ Partial | ✅ Full | ⚠️ Partial | ✅ Full |
| **Performance Observer** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

### 2.2 bfcache Compatibility

**bfcache (Back-Forward Cache)** is critical for instant back/forward navigation.

**Browser Support:**
- ✅ Chrome 96+
- ✅ Safari 15+
- ✅ Firefox 95+
- ✅ Edge 96+

**Blockers (must avoid):**
- ❌ `unload` event listeners
- ❌ `beforeunload` event listeners
- ❌ `Cache-Control: no-store` headers
- ❌ Open WebSocket connections
- ❌ Service Worker `fetch` handlers that don't call `event.respondWith()`

**Verification:**

```javascript
// Check if page is bfcache-compatible
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('✅ Page restored from bfcache');
  } else {
    console.log('❌ Page not restored from bfcache');
  }
});

// Check for bfcache blockers
const bfcacheChecklist = {
  hasUnloadListener: window.onunload !== null,
  hasBeforeUnloadListener: window.onbeforeunload !== null,
  // Add more checks as needed
};

console.table(bfcacheChecklist);
```

**Testing:**
1. Open Chrome DevTools → Application → Back/forward cache
2. Click "Test back/forward cache" button
3. Navigate to target page
4. Click back button
5. Check if page was restored from bfcache

### 2.3 Navigation API

The Navigation API provides better control over navigation events.

**Browser Support:**
- ✅ Chrome 102+
- ✅ Edge 102+
- ✅ Firefox 113+
- ⚠️ Safari 16.4+ (partial support)

**Fallback:** Use `window.addEventListener('popstate')` for older browsers.

```typescript
// Modern Navigation API
if ('navigation' in window) {
  navigation.addEventListener('navigate', (event) => {
    console.log('Navigating to:', event.destination.url);
  });
} else {
  // Fallback to popstate
  window.addEventListener('popstate', (event) => {
    console.log('Navigation via popstate');
  });
}
```

### 2.4 Intersection Observer

Used for lazy loading below-fold content.

**⚠️ CORRECTION for Three.js:** The `NeatWireframeBackground` component is in the above-fold HeroSection, NOT below-fold. IntersectionObserver will NOT defer its loading. Use `next/dynamic` with `ssr: false` instead (see `20-font-and-bundle-optimization.md` §2).

**Browser Support:**
- ✅ All modern browsers (Chrome 51+, Safari 12.1+, Firefox 55+, Edge 15+)

**Polyfill:** Not needed for target browsers.

```typescript
// Example: lazy loading truly below-fold content (FAQ, Pricing sections)
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        loadBelowFoldContent();
        observer.disconnect();
      }
    });
  },
  { rootMargin: '200px' } // Start loading 200px before visible
);

observer.observe(threejsContainer);
```

---

## 3. Mobile-Specific Scenarios

### 3.1 Mobile Navigation Patterns

Mobile users have different navigation patterns:

| Pattern | Desktop | Mobile | Optimization |
|---------|---------|--------|--------------|
| **Hover prefetch** | ✅ Mouse hover | ❌ No hover | Use `touchstart` instead |
| **Back button** | Browser back | Swipe gesture | Ensure bfcache works |
| **Keyboard navigation** | Tab/Enter | ❌ No keyboard | Focus management for touch |
| **Multi-tab** | Common | Rare | Optimize for single-tab |
| **Network** | WiFi/Ethernet | Cellular | Aggressive caching |

### 3.2 Touch Prefetch Strategy

**Problem:** Mobile devices don't have hover events, so `onPointerEnter` doesn't work.

**Solution:** Use `touchstart` event to trigger prefetch.

```typescript
// usePrefetchOnTouch.ts
export function usePrefetchOnTouch(href: string) {
  const router = useRouter();
  
  const handleTouchStart = useCallback(() => {
    // Prefetch on touch start (before tap)
    router.prefetch(href);
  }, [href, router]);
  
  return { onTouchStart: handleTouchStart };
}

// Usage
<Link
  href="/workshop/projects"
  onTouchStart={handleTouchStart}
>
  Projects
</Link>
```

**Trade-offs:**
- ✅ Prefetches earlier (on touch start, not tap)
- ❌ May prefetch links user doesn't tap (wasted bandwidth)
- ❌ Can interfere with scroll gestures

**Mitigation:** Add 100ms debounce to avoid prefetch during scroll.

```typescript
const touchStartTimer = useRef<NodeJS.Timeout>();

const handleTouchStart = useCallback(() => {
  touchStartTimer.current = setTimeout(() => {
    router.prefetch(href);
  }, 100);
}, [href, router]);

const handleTouchEnd = useCallback(() => {
  if (touchStartTimer.current) {
    clearTimeout(touchStartTimer.current);
  }
}, []);
```

### 3.3 Mobile Gesture Navigation

**iOS Safari swipe-back gesture:**
- User swipes from left edge to go back
- Triggers bfcache if page is compatible
- Must ensure `pageshow` event fires with `event.persisted === true`

**Android Chrome swipe-back gesture:**
- Similar to iOS, but gesture detection varies by device
- Test on multiple Android devices

**Testing:**
1. Navigate to page
2. Swipe back from left edge
3. Verify page restores instantly (bfcache)
4. Check no overlay appears

### 3.4 Mobile Keyboard Avoidance

**Problem:** Mobile keyboard can cover input fields when editing estimate rows.

**Solution:** Use `visualViewport` API to detect keyboard and adjust layout.

```typescript
useEffect(() => {
  if (!window.visualViewport) return;
  
  const handleResize = () => {
    const viewportHeight = window.visualViewport!.height;
    const windowHeight = window.innerHeight;
    const keyboardHeight = windowHeight - viewportHeight;
    
    if (keyboardHeight > 0) {
      // Keyboard is open
      document.body.style.paddingBottom = `${keyboardHeight}px`;
    } else {
      // Keyboard is closed
      document.body.style.paddingBottom = '0px';
    }
  };
  
  window.visualViewport.addEventListener('resize', handleResize);
  return () => {
    window.visualViewport?.removeEventListener('resize', handleResize);
  };
}, []);
```

---

## 4. Touch Device Optimizations

### 4.1 Touch Action Optimization

**Problem:** Default touch actions can cause delays (e.g., 300ms tap delay).

**Solution:** Use `touch-action: manipulation` CSS.

```css
/* globals.css */
button,
a,
[role="button"] {
  touch-action: manipulation; /* Removes 300ms tap delay */
}
```

**Browser Support:** All modern browsers.

### 4.2 Passive Event Listeners

**Problem:** Non-passive scroll/touch listeners block scrolling.

**Solution:** Use passive listeners for scroll and touch events.

```typescript
// ✅ Good: Passive listener
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('scroll', handler, { passive: true });

// ❌ Bad: Non-passive listener blocks scrolling
element.addEventListener('touchstart', handler);
```

**Performance Impact:** Smoother scrolling, especially on mobile.

### 4.3 Touch Feedback

**Problem:** Mobile users need immediate visual feedback on tap.

**Solution:** Use `:active` pseudo-class or add tap highlight.

```css
/* globals.css */
button:active,
a:active,
[role="button"]:active {
  opacity: 0.7;
  transition: opacity 0.1s;
}

/* iOS tap highlight */
-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
```

---

## 5. Mobile Network Conditions

### 5.1 Network Throttling Profiles

| Profile | Download | Upload | Latency | Use Case |
|---------|----------|--------|---------|----------|
| **Good 4G** | 10 Mbps | 5 Mbps | 50ms | Urban areas |
| **Regular 4G** | 4 Mbps | 2 Mbps | 100ms | Suburban areas |
| **Good 3G** | 1.5 Mbps | 750 Kbps | 150ms | Rural areas |
| **Regular 3G** | 750 Kbps | 250 Kbps | 200ms | Poor coverage |
| **Slow 3G** | 400 Kbps | 400 Kbps | 400ms | Edge of coverage |
| **Offline** | 0 | 0 | - | No connection |

### 5.2 Testing on Slow Networks

**Chrome DevTools:**
1. Open DevTools → Network tab
2. Select throttling profile (e.g., "Slow 3G")
3. Test navigation latency
4. Verify skeletons appear immediately
5. Verify overlay appears after 150ms delay

**Expected behavior on Slow 3G:**
- Skeleton appears within 100ms
- Overlay appears after 150ms (if navigation > 150ms)
- Content loads within 3-5 seconds
- No layout shift when content loads

### 5.3 Offline Support

**Problem:** Users may lose connection during navigation.

**Solution:** Show error boundary with retry button.

```typescript
// Error boundary for network errors
function NetworkErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-semibold">Connection Lost</h2>
      <p className="text-gray-600 mt-2">
        Please check your internet connection and try again.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Retry
      </button>
    </div>
  );
}
```

### 5.4 Data Saver Mode

**Problem:** Users with limited data plans may enable "Data Saver" mode.

**Detection:**

```typescript
// Check if user has data saver enabled
const isDataSaver = navigator.connection?.saveData === true;

if (isDataSaver) {
  // Disable prefetch to save data
  disablePrefetch();
  
  // Load lower quality images
  useLowQualityImages();
}
```

**Browser Support:**
- ✅ Chrome Android
- ✅ Chrome Desktop (with flag)
- ❌ Safari (not supported)

---

## 6. Platform-Specific Considerations

### 6.1 iOS Safari Specifics

**Issue 1: 100vh problem**
- `100vh` doesn't account for Safari toolbar
- Use `dvh` (dynamic viewport height) instead

```css
/* ✅ Good */
.fullscreen {
  height: 100dvh;
}

/* ❌ Bad */
.fullscreen {
  height: 100vh; /* Doesn't account for toolbar */
}
```

**Browser Support:**
- ✅ Safari 15.4+
- ✅ Chrome 108+
- ⚠️ Fallback needed for older browsers

```css
.fullscreen {
  height: 100vh; /* Fallback */
  height: 100dvh; /* Modern browsers */
}
```

**Issue 2: Rubber band scrolling**
- iOS Safari has "rubber band" effect when scrolling past content bounds
- Can cause layout shift if not handled

**Solution:** Use `overscroll-behavior: none` on containers.

```css
.scroll-container {
  overscroll-behavior: none;
}
```

**Issue 3: Safari memory limits**
- iOS Safari has strict memory limits (~1GB for web pages)
- Large bundles can cause crashes

**Mitigation:**
- Keep route bundles < 200KB
- Lazy load heavy components
- Monitor memory usage in Safari Web Inspector

### 6.2 Android Chrome Specifics

**Issue 1: Address bar hiding**
- Chrome Android hides address bar on scroll
- Can cause layout shift

**Solution:** Use `dvh` and avoid fixed positioning based on `100vh`.

**Issue 2: Back button behavior**
- Android back button can close app instead of navigating back
- Ensure proper history management

**Solution:** Use `router.back()` instead of `window.history.back()`.

### 6.3 Desktop Browser Specifics

**Chrome:**
- Best bfcache support
- Best performance profiling tools
- Primary testing target

**Safari:**
- Stricter memory limits
- Different JavaScript engine (JavaScriptCore vs V8)
- Test on macOS Safari

**Firefox:**
- Good bfcache support
- Different rendering engine (Gecko)
- Test for compatibility

**Edge:**
- Chromium-based (similar to Chrome)
- Test for compatibility

---

## 7. Testing on Real Devices

### 7.1 Device Lab

**Recommended devices:**

| Device | OS | Browser | Priority |
|--------|-----|---------|----------|
| iPhone 12/13/14 | iOS 16+ | Safari | **P0** |
| iPad (9th gen) | iPadOS 16+ | Safari | **P1** |
| Pixel 6/7 | Android 12+ | Chrome | **P0** |
| Samsung Galaxy S21/S22 | Android 12+ | Chrome | **P1** |
| MacBook Pro | macOS 13+ | Safari | **P0** |
| Windows Laptop | Windows 11 | Chrome | **P0** |

### 7.2 Remote Testing Services

**BrowserStack:**
- Test on 3000+ real devices
- Automated testing with Playwright
- Network throttling simulation

**Sauce Labs:**
- Similar to BrowserStack
- Good for automated testing

**LambdaTest:**
- Cost-effective alternative
- Good coverage of mobile devices

### 7.3 Testing Checklist

**Mobile Testing:**
- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Chrome Android (Pixel/Samsung)
- [ ] Test touch prefetch (touchstart event)
- [ ] Test swipe-back gesture (bfcache)
- [ ] Test on Slow 3G network
- [ ] Test with Data Saver mode enabled
- [ ] Test keyboard avoidance on input focus
- [ ] Test touch feedback (tap highlight)
- [ ] Test 100vh issue (use dvh instead)
- [ ] Test rubber band scrolling

**Desktop Testing:**
- [ ] Test on Chrome (Windows/Mac/Linux)
- [ ] Test on Safari (macOS)
- [ ] Test on Firefox (Windows/Mac/Linux)
- [ ] Test on Edge (Windows)
- [ ] Test hover prefetch
- [ ] Test bfcache (back/forward buttons)
- [ ] Test keyboard navigation

---

## 8. Polyfills and Fallbacks

### 8.1 Required Polyfills

**None required** for target browsers (all modern).

### 8.2 Graceful Degradation

If a feature is not supported, provide fallback:

```typescript
// bfcache fallback
if (!('navigation' in window)) {
  // Use popstate instead of Navigation API
  window.addEventListener('popstate', handleBackForward);
}

// Intersection Observer fallback
if (!('IntersectionObserver' in window)) {
  // Load Three.js immediately (no lazy loading)
  loadThreeJS();
} else {
  // Use Intersection Observer for lazy loading
  const observer = new IntersectionObserver(/* ... */);
}
```

---

**Next:** See `24-accessibility-and-security-guide.md` for accessibility and security considerations.
