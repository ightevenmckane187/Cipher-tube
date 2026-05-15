# Cipher-tube

## Comprehensive Enhancements

### Federal OS Integration
- Details on how the application integrates with Federal Operating Systems, including prerequisites and configuration steps.

### Deployment Guides
- Step-by-step instructions for deploying the application in various environments (e.g., cloud, local servers).

### CI/CD Information
- Information about continuous integration and continuous deployment processes supported by this project, including tools and configurations used.

### Cross-Platform Support
- Explanation of how the application supports different platforms, along with system requirements for each platform.

## Getting Started
- Installation instructions and requirements for running the application.
<!DOCTYPE html>
<html lang="en">
<head>
<!-- Playables SDK -->
<script>// Playables SDK v1.0.0
// Game lifecycle bridge: rAF-based game-ready detection + event communication
(function() {
  'use strict';

  // Idempotency: skip if already initialized (e.g., server-side injection
  // followed by client-side inject-javascript via the Bloks webview component).
  if (window.playablesSDK) return;

  var HANDLER_NAME = 'playablesGameEventHandler';
  var ANDROID_BRIDGE_NAME = '_MetaPlayablesBridge';
  var RAF_FRAME_THRESHOLD = 3;

  var gameReadySent = false;
  var firstInteractionSent = false;
  var errorSent = false;
  var frameCount = 0;
  var originalRAF = window.requestAnimationFrame;

  // --- Transport Layer ---

  function hasIOSBridge() {
    return !!(window.webkit &&
              window.webkit.messageHandlers &&
              window.webkit.messageHandlers[HANDLER_NAME]);
  }

  function hasAndroidBridge() {
    return !!(window[ANDROID_BRIDGE_NAME] &&
              typeof window[ANDROID_BRIDGE_NAME].postEvent === 'function');
  }

  function isInIframe() {
    return !!(window.parent && window.parent !== window);
  }

  function sendEvent(eventName, payload) {
    var message = {
      type: eventName,
      payload: payload || {},
      timestamp: Date.now()
    };

    if (hasIOSBridge()) {
      try {
        window.webkit.messageHandlers[HANDLER_NAME].postMessage(message);
      } catch (e) { /* ignore */ }
      return;
    }

    if (hasAndroidBridge()) {
    try {
      var p = payload || {};
      p.__secureToken = window.__fbAndroidBridgeAuthToken || '';
      p.timestamp = message.timestamp;
      window[ANDROID_BRIDGE_NAME].postEvent(
        eventName,
        JSON.stringify(p)
      );
    } catch (e) { /* ignore */ }
    return;
  }

    if (isInIframe()) {
      try {
        window.parent.postMessage(message, '*');
      } catch (e) { /* ignore */ }
      return;
    }
  }

  // --- rAF Game-Ready Detection ---

  function onFrame() {
    if (gameReadySent) return;

    frameCount++;
    if (frameCount >= RAF_FRAME_THRESHOLD) {
      gameReadySent = true;
      sendEvent('game_ready', {
        frame_count: frameCount,
        detected_at: Date.now()
      });
      return;
    }

    originalRAF.call(window, onFrame);
  }

  if (originalRAF) {
    window.requestAnimationFrame = function(callback) {
      if (!gameReadySent) {
        return originalRAF.call(window, function(timestamp) {
          frameCount++;
          if (frameCount >= RAF_FRAME_THRESHOLD && !gameReadySent) {
            gameReadySent = true;
            sendEvent('game_ready', {
              frame_count: frameCount,
              detected_at: Date.now()
            });
          }
          callback(timestamp);
        });
      }
      return originalRAF.call(window, callback);
    };
  }

  // --- First User Interaction Detection ---

  function setupFirstInteractionDetection() {
    var events = ['touchstart', 'mousedown', 'keydown'];

    function onFirstInteraction() {
      if (firstInteractionSent) return;
      firstInteractionSent = true;
      sendEvent('user_interaction_start', null);

      for (var i = 0; i < events.length; i++) {
        document.removeEventListener(events[i], onFirstInteraction, true);
      }
    }

    for (var i = 0; i < events.length; i++) {
      document.addEventListener(events[i], onFirstInteraction, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFirstInteractionDetection);
  } else {
    setupFirstInteractionDetection();
  }

  // --- Auto Error Capture ---

  window.addEventListener('error', function(event) {
    if (errorSent) return;
    errorSent = true;
    sendEvent('error', {
      message: event.message || 'Unknown error',
      source: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      auto_captured: true
    });
  });

  window.addEventListener('unhandledrejection', function(event) {
    if (errorSent) return;
    errorSent = true;
    var reason = event.reason;
    sendEvent('error', {
      message: (reason instanceof Error) ? reason.message : String(reason),
      type: 'unhandled_promise_rejection',
      auto_captured: true
    });
  });

  // --- Public API ---

  window.playablesSDK = {
    complete: function(score) {
      sendEvent('game_ended', {
        score: score,
        completed: true
      });
    },

    error: function(message) {
      if (errorSent) return;
      errorSent = true;
      sendEvent('error', {
        message: message || 'Unknown error',
        auto_captured: false
      });
    },

    sendEvent: function(eventName, payload) {
      if (!eventName || typeof eventName !== 'string') return;
      sendEvent(eventName, payload);
    }
  };

  // Kick off rAF detection in case no game code calls rAF immediately
  if (originalRAF) {
    originalRAF.call(window, onFrame);
  }
})();</script>
<script>window.Intl=window.Intl||{};Intl.t=function(s){return(Intl._locale&&Intl._locale[s])||s;};</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cipher Tube v1.5.0 - Accessible User Guide</title>
    <style>
        :root {
            --text: #1a1a1a;
            --bg: #ffffff;
            --link: #0066cc;
            --focus: #ff6b00;
            --code-bg: #f5f5f5;
            --border: #d0d0d0;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --text: #e0e0e0;
                --bg: #1a1a1a;
                --link: #4da6ff;
                --focus: #ffaa00;
                --code-bg: #2a2a2a;
                --border: #404040;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            * { animation: none !important; transition: none !important; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        a { color: var(--link); }
        a:focus, button:focus, [tabindex]:focus {
            outline: 3px solid var(--focus);
            outline-offset: 2px;
        }
        .skip-link {
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--focus);
            color: var(--bg);
            padding: 8px;
            text-decoration: none;
            z-index: 100;
        }
        .skip-link:focus { top: 0; }
        h1, h2, h3 { line-height: 1.3; }
        code, pre {
            font-family: "Courier New", Courier, monospace;
            background: var(--code-bg);
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid var(--border);
        }
        pre {
            padding: 12px;
            overflow-x: auto;
            display: block;
        }
        nav ul { list-style: none; padding: 0; }
        nav li { margin: 8px 0; }
        .notice {
            border-left: 4px solid var(--link);
            padding: 12px;
            background: var(--code-bg);
            margin: 16px 0;
        }
        header, nav, main, section, footer { display: block; }
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            border: 0;
        }
    </style>
</head>
<body>
    <a href="#main" class="skip-link">Skip to main content</a>
    
    <header role="banner">
        <h1>Cipher Tube Assembly & Session Service v1.5.0</h1>
        <p><strong>User Guide - Accessible Edition</strong></p>
        <p>Conforms to Section 508 602.3 and WCAG 2.1 Level AA</p>
    </header>

    <nav role="navigation" aria-label="Table of Contents">
        <h2 id="toc">Table of Contents</h2>
        <ul>
            <li><a href="#getting-started">1. Getting Started</a></li>
            <li><a href="#authentication">2. Authentication</a></li>
            <li><a href="#assembling">3. Assembling a Cipher Tube</a></li>
            <li><a href="#session-mgmt">4. Session Management</a></li>
            <li><a href="#decrypting">5. Decrypting CTAs</a></li>
            <li><a href="#errors">6. Error Handling</a></li>
            <li><a href="#a11y">7. Accessibility Features</a></li>
            <li><a href="#support">8. Support</a></li>
        </ul>
    </nav>

    <main id="main" role="main">
        <section id="getting-started" aria-labelledby="getting-started-h">
            <h2 id="getting-started-h">1. Getting Started</h2>
            <p>Cipher Tube provides secure cryptographic session management via REST API. All operations require an API key and user ID.</p>
            <p>This documentation is fully keyboard navigable. Use Tab to move between links and buttons. Press Enter to activate.</p>
        </section>

        <section id="authentication" aria-labelledby="auth-h">
            <h2 id="auth-h">2. Authentication</h2>
            <p>All requests must include two HTTP headers:</p>
            <ul>
                <li><strong>X-API-Key</strong>: Your secret API key. Contact your administrator if you need one.</li>
                <li><strong>x-user-id</strong>: Your UUID v4 identifier. Required as of v1.5.0 for IDOR protection per <a href="#pr-19">PR #19</a>.</li>
            </ul>
            <h3 id="auth-example">Example Request</h3>
            <pre><code>curl -H "X-API-Key: YOUR_KEY" \
     -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
     https://api.ciphertube.example.com/health</code></pre>
        </section>

        <section id="assembling" aria-labelledby="assembling-h">
            <h2 id="assembling-h">3. Assembling a Cipher Tube</h2>
            <p><code>POST /assemble</code> creates a new encrypted session.</p>
            <h3 id="assemble-body">Request Body</h3>
            <pre><code>{
  "payload": {},
  "ttl": 3600
}</code></pre>
            <p>Response includes <code>session_id</code> and <code>tube</code>. Store the tube securely. The session expires after <code>ttl</code> seconds.</p>
            <div class="notice" role="note" aria-label="Keyboard tip">
                <strong>Keyboard tip:</strong> Focus on the code blocks and press Ctrl+C or Cmd+C to copy.
            </div>
        </section>

        <section id="session-mgmt" aria-labelledby="session-h">
            <h2 id="session-h">4. Session Management</h2>
            <p>Use <code>GET /session/{session_id}/status</code> to check session state. Sessions are cached for fast lookup.</p>
            <p><strong>Timeout Warning:</strong> You will receive a warning 60 seconds before expiration. You can extend the session at any time.</p>
        </section>

        <section id="decrypting" aria-labelledby="decrypt-h">
            <h2 id="decrypt-h">5. Decrypting CTAs</h2>
            <p><code>POST /cta/decrypt</code> decrypts a Cipher Tube Assembly. Send the <code>tube</code> value from the assemble response.</p>
        </section>

        <section id="errors" aria-labelledby="errors-h">
            <h2 id="errors-h">6. Error Handling</h2>
            <p>All errors are returned as JSON with descriptive text. We do not rely on color alone to indicate errors.</p>
            <h3 id="error-format">Error Format</h3>
            <pre><code>{
  "error": {
    "code": "INVALID_USER_ID",
    "message": "x-user-id header required",
    "request_id": "uuid"
  }
}</code></pre>
            <p>Provide the <code>request_id</code> when contacting support.</p>
        </section>

        <section id="a11y" aria-labelledby="a11y-h">
            <h2 id="a11y-h">7. Accessibility Features</h2>
            <p>Cipher Tube v1.5.0 conforms to WCAG 2.1 Level AA and Section 508.</p>
            <ul>
                <li><strong>Keyboard Navigation</strong>: All functions operable without a mouse. Logical tab order. No keyboard traps.</li>
                <li><strong>Screen Reader Support</strong>: ARIA labels, roles, and landmarks. Status changes are announced.</li>
                <li><strong>Focus Indicators</strong>: Visible 3px focus outline on all controls. Meets WCAG 2.4.7.</li>
                <li><strong>Timing Adjustable</strong>: Session timeouts can be extended. Warning at 60 seconds remaining per WCAG 2.2.1.</li>
                <li><strong>Error Identification</strong>: Errors described in text per WCAG 3.3.1. No 500 errors on malformed input.</li>
                <li><strong>Color Contrast</strong>: Minimum 4.5:1 ratio for text. Meets WCAG 1.4.3.</li>
                <li><strong>Reduced Motion</strong>: Respects <code>prefers-reduced-motion</code> setting.</li>
                <li><strong>Zoom</strong>: Text resizes up to 200% without loss of functionality per WCAG 1.4.4.</li>
            </ul>
            <p>This page was tested with NVDA, JAWS, VoiceOver, and keyboard-only navigation.</p>
        </section>

        <section id="support" aria-labelledby="support-h">
            <h2 id="support-h">8. Support and Feedback</h2>
            <p>To report accessibility barriers or request this document in alternate formats:</p>
            <address>
                <strong>Email:</strong> <a href="mailto:accessibility@cipher-tube.io">accessibility@cipher-tube.io</a><br>
                <strong>Phone:</strong> <a href="tel:+15550100199">(555) 010-0199</a><br>
                <strong>TTY:</strong> 711
            </address>
            <p>We respond to accessibility requests within 2 business days per Section 508 603.3.</p>
        </section>
    </main>

    <footer role="contentinfo">
        <p><small>Cipher Tube v1.5.0 | Last updated: 2026-05-09 | <a href="/accessibility">Accessibility Statement</a> | <a href="/vpat">VPAT 2.4 ACR</a></small></p>
    </footer>
</body>
</html>
