/*!
 * Pabbly Roadmap Embed Widget
 *
 * Self-contained vanilla JS. Served from backend at /widget.js.
 * Embedded by third-party sites to show a drawer-style feedback widget.
 *
 * Views inside the drawer:
 *   - list   → posts list (card style, matches main app's All Posts)
 *   - detail → single post detail with upvote + comments-like info
 *   - new    → new post submission form
 *   - search → search posts by title/description/tag
 */
(function () {
  'use strict';
  if (window.PabblyRoadmapWidget) return;

  // ---------- derive API base from script src ----------
  var scriptEl = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var scriptSrc = (scriptEl && scriptEl.src) || '';
  var API_BASE = scriptSrc.replace(/\/widget\.js.*$/, '') || window.location.origin;

  // Inject global style rules once — used for rich post content rendering.
  // Keeps the drawer's post body readable no matter what HTML comes back.
  var _stylesInjected = false;
  function ensureStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var css =
      '.prw-post-content { font-size:14px; line-height:1.75; }\n' +
      '.prw-post-content > *:first-child { margin-top:0; }\n' +
      '.prw-post-content > *:last-child { margin-bottom:0; }\n' +
      '.prw-post-content p { margin:0 0 14px 0; }\n' +
      '.prw-post-content h1, .prw-post-content h2, .prw-post-content h3, .prw-post-content h4 { font-weight:700; margin:20px 0 10px; line-height:1.35; }\n' +
      '.prw-post-content h1 { font-size:20px; }\n' +
      '.prw-post-content h2 { font-size:17px; }\n' +
      '.prw-post-content h3 { font-size:15px; }\n' +
      '.prw-post-content strong, .prw-post-content b { font-weight:700; }\n' +
      '.prw-post-content em, .prw-post-content i { font-style:italic; }\n' +
      // Explicit list-style defeats Tailwind preflight (`ul { list-style:none }`)
      // which otherwise wipes out the bullet/number markers on host pages.
      '.prw-post-content ul { list-style:disc outside; padding-left:22px; margin:10px 0 14px; }\n' +
      '.prw-post-content ol { list-style:decimal outside; padding-left:22px; margin:10px 0 14px; }\n' +
      '.prw-post-content ul ul { list-style:circle outside; margin:4px 0; }\n' +
      '.prw-post-content ul ul ul { list-style:square outside; }\n' +
      '.prw-post-content li { margin-bottom:6px; display:list-item; }\n' +
      '.prw-post-content li::marker { color:inherit; }\n' +
      '.prw-post-content li > p { margin:0; }\n' +
      '.prw-post-content li > p + p { margin-top:6px; }\n' +
      '.prw-post-content a { color:#059669; text-decoration:underline; word-break:break-word; }\n' +
      '.prw-post-content code { background:rgba(148,163,184,0.16); padding:1px 6px; border-radius:4px; font-family:"JetBrains Mono",Menlo,Monaco,Consolas,monospace; font-size:12.5px; }\n' +
      '.prw-post-content pre { background:rgba(148,163,184,0.16); padding:10px 12px; border-radius:8px; overflow-x:auto; font-size:12.5px; margin:10px 0; }\n' +
      '.prw-post-content pre code { background:transparent; padding:0; }\n' +
      '.prw-post-content blockquote { border-left:3px solid rgba(148,163,184,0.35); padding:4px 12px; margin:12px 0; color:inherit; opacity:0.85; }\n' +
      '.prw-post-content img { max-width:100%; border-radius:8px; margin:10px 0; display:block; }\n' +
      '.prw-post-content hr { border:0; border-top:1px dashed rgba(148,163,184,0.35); margin:16px 0; }\n' +
      // Upvote button hover — border flips to accent color (matches main app)
      // Accent color is applied inline per instance since it's dynamic per widget.
      '.prw-vote-btn { transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }\n' +
      // Header icon buttons — transparent bg, soft background on hover (matches app's header icon buttons)
      '.prw-hdr-btn { background: transparent !important; transition: background 0.15s ease; }\n' +
      '.prw-hdr-btn:hover { background: rgba(255,255,255,0.22) !important; }\n' +
      // Input / textarea — border darkens on hover and focus (matches .border-gray-200 → .border-gray-400 pattern)
      '.prw-input { transition: border-color 0.15s ease; }\n' +
      '.prw-input:hover, .prw-input:focus { border-color: var(--prw-border-hover, #9ca3af) !important; }\n' +
      // Floating-label inputs (matches the main app\'s Create Post dialog — MUI notch style)
      '.prw-float { position: relative; margin-bottom: 14px; }\n' +
      '.prw-float > input.prw-float-input, .prw-float > textarea.prw-float-input {\n' +
      '  width:100%; padding:16.5px 14px; border-radius:8px; border:1px solid var(--prw-border, #e5e7eb);\n' +
      '  background: var(--prw-field-bg, #ffffff); color: var(--prw-text, #111827);\n' +
      '  outline:none; font-size:14px; font-family: inherit; box-sizing: border-box;\n' +
      '  transition: border-color 0.15s ease;\n' +
      '}\n' +
      '.prw-float > textarea.prw-float-input { min-height: 120px; resize: vertical; line-height: 1.5; }\n' +
      '.prw-float > input.prw-float-input:hover, .prw-float > input.prw-float-input:focus,\n' +
      '.prw-float > textarea.prw-float-input:hover, .prw-float > textarea.prw-float-input:focus {\n' +
      '  border-color: var(--prw-border-hover, #9ca3af);\n' +
      '}\n' +
      '.prw-float > .prw-float-label {\n' +
      '  position:absolute; left:10px; top:50%; transform:translateY(-50%);\n' +
      '  padding:0 4px; background: var(--prw-field-bg, #ffffff); color: var(--prw-muted, #6b7280);\n' +
      '  pointer-events:none; font-size:14px; font-weight: 400;\n' +
      '  transition: top 0.15s ease, font-size 0.15s ease, font-weight 0.15s ease, color 0.15s ease;\n' +
      '}\n' +
      // Textarea label sits near the top of the box rather than vertically centered
      '.prw-float > textarea.prw-float-input + .prw-float-label { top: 22px; transform: none; }\n' +
      // When input/textarea has content or is focused — float the label to the border notch
      '.prw-float > input.prw-float-input:focus + .prw-float-label,\n' +
      '.prw-float > input.prw-float-input:not(:placeholder-shown) + .prw-float-label,\n' +
      '.prw-float > textarea.prw-float-input:focus + .prw-float-label,\n' +
      '.prw-float > textarea.prw-float-input:not(:placeholder-shown) + .prw-float-label {\n' +
      '  top: 0 !important; transform: translateY(-50%) !important;\n' +
      '  font-size: 11px; font-weight: 500;\n' +
      '}\n' +
      // Helper text below the field
      '.prw-float-help { font-size: 11.5px; color: var(--prw-muted, #6b7280); margin: 6px 14px 0; }\n' +
      // Attachment row (below comment textarea) + file chip inside comments
      '.prw-attach-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:none; padding:6px 2px; font-size:13px; cursor:pointer; font-family:inherit; transition: opacity 0.15s ease; }\n' +
      '.prw-attach-btn:hover { opacity:0.75; }\n' +
      '.prw-attach-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; border:1px solid rgba(148,163,184,0.4); font-size:12px; margin-top:6px; max-width:100%; }\n' +
      '.prw-attach-link { display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:8px; border:1.5px solid; font-size:13px; font-weight:600; margin-top:8px; text-decoration:none; transition: opacity 0.15s ease; max-width:100%; overflow:hidden; }\n' +
      '.prw-attach-link:hover { opacity:0.85; }\n' +
      '.prw-attach-link .prw-attach-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }\n' +
      '.prw-attach-link .prw-attach-size { font-size:11.5px; font-weight:500; opacity:0.7; }\n';
    var s = document.createElement('style');
    s.setAttribute('data-prw', '1');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- auth helper ----------
  // If the widget runs on the same origin as the main app (e.g. admin's
  // Test Widget, or pabbly-roadmap.vercel.app users embedding on their
  // own site) an accessToken may already be in localStorage. Use it so
  // the visitor doesn't need to re-enter their email to vote or submit.
  function getAuthToken() {
    try { return localStorage.getItem('accessToken'); } catch (e) { return null; }
  }
  function authHeaders() {
    var t = getAuthToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }
  function isAuthed() { return !!getAuthToken(); }
  var APP_URL  = (function () {
    // Best-effort: main app is usually served from a different host.
    // For now use the same origin as API; admin can override with config.appUrl.
    return API_BASE;
  })();

  // ---------- dom + html helpers ----------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'style') e.style.cssText = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k.charCodeAt(0) === 111 && k.charCodeAt(1) === 110 && typeof attrs[k] === 'function') e[k] = attrs[k]; // onfoo → property
        else e.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function stripHtml(s) {
    var d = document.createElement('div');
    d.innerHTML = String(s || '');
    return (d.textContent || d.innerText || '').trim();
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function fmtBytes(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }
  // Color palette per file type — matches the main app's CommentAttachment styling
  // so widget attachments feel identical to in-app ones.
  function attachmentPalette(mime, name, dark) {
    var m = (mime || '').toLowerCase();
    var ext = (name || '').toLowerCase().split('.').pop() || '';
    var p;
    if (m.indexOf('image/') === 0 || ['jpg','jpeg','png','gif','webp','svg'].indexOf(ext) !== -1) {
      p = { t: '#059669', b: '#a7f3d0', bg: '#ecfdf5', bD: 'rgba(5,150,105,0.4)', bgD: 'rgba(5,150,105,0.12)' };
    } else if (m.indexOf('pdf') !== -1 || ext === 'pdf') {
      p = { t: '#dc2626', b: '#fecaca', bg: '#fef2f2', bD: 'rgba(220,38,38,0.4)', bgD: 'rgba(220,38,38,0.12)' };
    } else if (m.indexOf('word') !== -1 || ['doc','docx'].indexOf(ext) !== -1) {
      p = { t: '#2563eb', b: '#bfdbfe', bg: '#eff6ff', bD: 'rgba(37,99,235,0.4)', bgD: 'rgba(37,99,235,0.12)' };
    } else if (m.indexOf('sheet') !== -1 || m.indexOf('excel') !== -1 || ['xls','xlsx','csv'].indexOf(ext) !== -1) {
      p = { t: '#16a34a', b: '#bbf7d0', bg: '#f0fdf4', bD: 'rgba(22,163,74,0.4)', bgD: 'rgba(22,163,74,0.12)' };
    } else if (m.indexOf('presentation') !== -1 || ['ppt','pptx'].indexOf(ext) !== -1) {
      p = { t: '#ea580c', b: '#fed7aa', bg: '#fff7ed', bD: 'rgba(234,88,12,0.4)', bgD: 'rgba(234,88,12,0.12)' };
    } else if (m.indexOf('zip') !== -1 || m.indexOf('rar') !== -1 || m.indexOf('7z') !== -1 || ['zip','rar','7z'].indexOf(ext) !== -1) {
      p = { t: '#9333ea', b: '#e9d5ff', bg: '#faf5ff', bD: 'rgba(147,51,234,0.4)', bgD: 'rgba(147,51,234,0.12)' };
    } else {
      p = { t: '#4b5563', b: '#e5e7eb', bg: '#f9fafb', bD: 'rgba(156,163,175,0.4)', bgD: 'rgba(156,163,175,0.12)' };
    }
    return dark
      ? { color: p.t, border: p.bD, background: p.bgD }
      : { color: p.t, border: p.b, background: p.bg };
  }
  function prettyStatus(s) {
    return ({
      under_review: 'Under Review', planned: 'Planned', in_progress: 'In Progress',
      live: 'Live', hold: 'On Hold', open: 'Open', closed: 'Closed',
    })[s] || s;
  }
  function statusColor(s) {
    return ({
      under_review: '#eab308', planned: '#a855f7', in_progress: '#f97316',
      live: '#22c55e', hold: '#ef4444', open: '#64748b', closed: '#94a3b8',
    })[s] || '#6b7280';
  }
  // Pill background + text — matches main app's status badges (bg-*-50 / text-*-700 light, subtle in dark)
  function statusBadgeBg(s, dark) {
    var light = {
      under_review: '#fefce8', planned: '#faf5ff', in_progress: '#fff7ed',
      live: '#f0fdf4', hold: '#fef2f2', open: '#eff6ff', closed: '#f9fafb',
    };
    var darkBg = {
      under_review: '#422006', planned: '#2e1065', in_progress: '#431407',
      live: '#052e16', hold: '#450a0a', open: '#172554', closed: '#1e293b',
    };
    return (dark ? darkBg : light)[s] || (dark ? '#1e293b' : '#f3f4f6');
  }
  function statusBadgeColor(s, dark) {
    var light = {
      under_review: '#a16207', planned: '#6b21a8', in_progress: '#9a3412',
      live: '#15803d', hold: '#b91c1c', open: '#1d4ed8', closed: '#4b5563',
    };
    var darkCol = {
      under_review: '#fde047', planned: '#d8b4fe', in_progress: '#fdba74',
      live: '#86efac', hold: '#fca5a5', open: '#93c5fd', closed: '#cbd5e1',
    };
    return (dark ? darkCol : light)[s] || (dark ? '#cbd5e1' : '#374151');
  }
  // SVG icon strings (stroke=currentColor so parent color applies)
  var ICON = {
    chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    comment: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    paperclip: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.98 8.83l-8.58 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  };

  // ---------- constructor ----------
  function Widget(opts) {
    this.opts = opts || {};
    this.config = null;
    this.state = {
      view: 'list',          // list | detail | new | search
      posts: null,           // null = loading
      currentPost: null,     // detail view
      searchQuery: '',
      voterEmail: null,      // from localStorage
      votedIds: {},          // { postId: true } from localStorage
    };
    this.els = {};           // cached references to key DOM nodes
    this.isOpen = false;
  }

  // Local storage key prefixed by widget token to isolate multiple widgets
  Widget.prototype._lsKey = function (k) { return 'prw:' + this.opts.token + ':' + k; };

  Widget.prototype.init = function () {
    var self = this;
    var token = this.opts.token;
    if (!token) {
      console.error('[PabblyRoadmapWidget] token is required');
      return;
    }
    this.state.voterEmail = localStorage.getItem(this._lsKey('email'));
    try { this.state.votedIds = JSON.parse(localStorage.getItem(this._lsKey('votes')) || '{}'); } catch (e) { this.state.votedIds = {}; }

    return fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success || !data.data || !data.data.widget) {
          throw new Error((data && data.message) || 'Invalid widget');
        }
        self.config = data.data.widget;
        self._mountTrigger();
        if (self.opts.selector) {
          var custom = document.querySelector(self.opts.selector);
          if (custom) custom.addEventListener('click', function () { self.open(); });
        }
        // autoOpen (used by admin editor's Test Widget) — open the drawer
        // immediately after config loads, no trigger click needed.
        if (self.opts.autoOpen) self.open();
      })
      .catch(function (err) {
        console.error('[PabblyRoadmapWidget] failed to load config:', err);
      });
  };

  Widget.prototype._mountTrigger = function () {
    if (this.opts.hideDefaultTrigger) return;
    if (this.config.hideDefaultTrigger) return;
    if (this.opts.selector) return;
    var self = this;
    var accent = this.config.accentColor || '#059669';
    var btn = el('button', {
      'aria-label': 'Feedback',
      style: [
        'position:fixed', 'right:20px', 'bottom:20px', 'z-index:2147483000',
        'width:56px', 'height:56px', 'border-radius:50%',
        'border:none', 'cursor:pointer', 'color:#fff',
        'background:' + accent,
        'box-shadow:0 10px 25px rgba(0,0,0,0.2)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'transition:transform 0.15s ease',
      ].join(';'),
      html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>',
      onclick: function () { self.open(); },
    });
    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
    document.body.appendChild(btn);
  };

  Widget.prototype.open = function () {
    if (this.isOpen) return;
    ensureStyles();
    this.isOpen = true;
    this.state.view = this.config.showSubmissionFormOnly ? 'new' : 'list';
    this._renderShell();
    if (this.state.view === 'list') this._loadPosts();
  };

  Widget.prototype.close = function () {
    document.body.style.overflow = '';
    this.isOpen = false;
    if (this._hideHoverPopup) this._hideHoverPopup();
    if (this.els.backdrop && this.els.backdrop.parentNode) {
      this.els.backdrop.parentNode.removeChild(this.els.backdrop);
    }
    this.els = {};
  };

  // ============================================================
  // SHELL — built once on open. Views swap content INSIDE it.
  // Drawer visuals mirror the app's right-side user info drawer:
  //   - border-left only (no border-radius on the outer edge)
  //   - shadow-2xl style shadow
  //   - white (light) / gray-900 (dark) bg
  // ============================================================
  Widget.prototype._renderShell = function () {
    var self = this, cfg = this.config;
    var dark = cfg.theme === 'dark';
    var accent = cfg.accentColor || '#059669';
    var width = cfg.widgetWidth || 380;
    var bg = dark ? '#111827' : '#ffffff';
    var border = dark ? '#374151' : '#e5e7eb';
    // Darker border shown on hover/focus (matches app's gray-400 → gray-500 pattern)
    var borderHover = dark ? '#6b7280' : '#9ca3af';
    var text = dark ? '#ffffff' : '#111827';
    var muted = dark ? '#9ca3af' : '#6b7280';
    var softBg = dark ? '#1f2937' : '#ffffff';

    // Backdrop — semi-transparent dim (matches the main app's dialog style).
    // Captures outside clicks so user can dismiss by clicking off the panel.
    var backdrop = el('div', {
      style: [
        'position:fixed', 'inset:0', 'z-index:2147483600',
        'background:rgba(0,0,0,0.5)',
        'transition:opacity 0.15s ease',
      ].join(';'),
      onclick: function (e) { if (e.target === backdrop) self.close(); },
    });

    // Panel position per type/openFrom
    //   modal   → right/left drawer or centered modal dialog
    //   popover → anchored dialog (auto/top/right/bottom/left)
    var panelStyle = [];
    var from = cfg.openFrom || (cfg.type === 'modal' ? 'right' : 'auto');
    if (cfg.type === 'popover') {
      var popWidth = Math.min(560, width);
      panelStyle.push('width:' + popWidth + 'px', 'max-height:88vh', 'border-radius:14px');
      if (from === 'top') {
        panelStyle.push('top:32px', 'left:50%', 'transform:translateX(-50%)');
      } else if (from === 'bottom') {
        panelStyle.push('bottom:32px', 'left:50%', 'transform:translateX(-50%)');
      } else if (from === 'left') {
        panelStyle.push('top:50%', 'left:32px', 'transform:translateY(-50%)');
      } else if (from === 'right') {
        panelStyle.push('top:50%', 'right:32px', 'transform:translateY(-50%)');
      } else {
        // auto (default) = centered
        panelStyle.push('top:50%', 'left:50%', 'transform:translate(-50%,-50%)');
      }
    } else {
      // modal supports right | left | center
      if (from === 'center') {
        // Centered modal dialog — not a drawer
        panelStyle.push(
          'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
          'width:' + Math.min(560, width) + 'px', 'max-height:88vh',
          'border-radius:14px'
        );
      } else if (from === 'left') {
        panelStyle.push('width:' + width + 'px', 'height:100vh', 'top:0',
          'left:0', 'border-right:1px solid ' + border);
      } else {
        // right (default)
        panelStyle.push('width:' + width + 'px', 'height:100vh', 'top:0',
          'right:0', 'border-left:1px solid ' + border);
      }
    }

    var panel = el('div', {
      style: [
        'position:fixed', panelStyle.join(';'),
        'background:' + bg, 'color:' + text,
        // shadow-2xl equivalent — matches app's right drawer
        'box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)',
        'display:flex', 'flex-direction:column', 'overflow:hidden',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        'font-size:14px',
      ].join(';'),
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    var header = el('div', { id: 'prw-header' });
    var searchBar = el('div', { id: 'prw-search-bar' });
    var content = el('div', {
      id: 'prw-content',
      style: 'flex:1;overflow-y:auto;background:' + bg + ';',
    });

    panel.appendChild(header);
    panel.appendChild(searchBar);
    panel.appendChild(content);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    // Expose theme tokens as CSS custom properties so scoped selectors (inputs / floating labels) can pick them up
    panel.style.setProperty('--prw-border', border);
    panel.style.setProperty('--prw-border-hover', borderHover);
    panel.style.setProperty('--prw-field-bg', dark ? '#111827' : '#ffffff');
    panel.style.setProperty('--prw-text', text);
    panel.style.setProperty('--prw-muted', muted);

    this.els = {
      backdrop: backdrop, panel: panel, header: header, searchBar: searchBar, content: content,
      accent: accent, bg: bg, border: border, borderHover: borderHover,
      text: text, muted: muted, softBg: softBg, dark: dark,
    };

    this._renderHeader();
    this._renderContent();
  };

  // ============================================================
  // HEADER — changes based on current view
  // ============================================================
  Widget.prototype._renderHeader = function () {
    var self = this, e = this.els, view = this.state.view;
    var accent = e.accent;

    e.header.style.cssText = [
      'padding:14px 18px', 'background:' + accent, 'color:#fff',
      'display:flex', 'align-items:center', 'justify-content:space-between', 'gap:16px',
      'flex-shrink:0',
    ].join(';');
    e.header.innerHTML = '';

    // Header icon button — transparent bg by default, darkens on hover (via .prw-hdr-btn)
    var hdrIconStyle = 'border:none;color:#fff;padding:7px;border-radius:8px;cursor:pointer;display:flex;';

    // Left side
    var leftWrap = el('div', { style: 'display:flex;align-items:center;gap:10px;min-width:0;flex:1;' });
    if (view === 'list') {
      leftWrap.innerHTML =
        '<span style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">' + ICON.chat + '</span>' +
        '<span style="font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(this.config.name || 'Pabbly Boards') + '</span>';
    } else {
      var backBtn = el('button', {
        'aria-label': 'Back',
        class: 'prw-hdr-btn',
        style: hdrIconStyle,
        html: ICON.back,
        onclick: function () { self._setView('list'); },
      });
      leftWrap.appendChild(backBtn);
      var titleText = view === 'new' ? 'Submit a Post'
        : view === 'search' ? 'Search'
        : (this.state.currentPost && this.state.currentPost.title) || '';
      var title = el('span', { style: 'font-size:15px;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' });
      title.textContent = titleText;
      leftWrap.appendChild(title);
    }
    e.header.appendChild(leftWrap);

    // Right side — more breathing room between buttons
    var right = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-shrink:0;' });
    if (view === 'list') {
      // New Post button (solid white, stays as-is — primary button)
      var newBtn = el('button', {
        style: 'background:#fff;color:' + accent + ';border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;',
        onclick: function () { self._setView('new'); },
      });
      newBtn.innerHTML = ICON.plus + '<span>New Post</span>';
      right.appendChild(newBtn);

      // Open in new tab
      var extBtn = el('button', {
        'aria-label': 'Open roadmap',
        class: 'prw-hdr-btn',
        style: hdrIconStyle,
        html: ICON.ext,
        onclick: function () { window.open(APP_URL + '/user/all-posts', '_blank', 'noopener'); },
      });
      right.appendChild(extBtn);

      // Search
      var searchBtn = el('button', {
        'aria-label': 'Search',
        class: 'prw-hdr-btn',
        style: hdrIconStyle,
        html: ICON.search,
        onclick: function () { self._setView('search'); },
      });
      right.appendChild(searchBtn);
    }
    var closeBtn = el('button', {
      'aria-label': 'Close',
      class: 'prw-hdr-btn',
      style: hdrIconStyle,
      html: ICON.close,
      onclick: function () { self.close(); },
    });
    right.appendChild(closeBtn);
    e.header.appendChild(right);

    // Search sub-bar
    e.searchBar.innerHTML = '';
    if (view === 'search') {
      var sbg = e.dark ? '#1f2937' : '#ffffff';
      e.searchBar.style.cssText = 'padding:12px 16px;background:' + sbg + ';border-bottom:1px solid ' + e.border + ';flex-shrink:0;';
      var input = el('input', {
        type: 'text',
        placeholder: 'Search posts by title, description, or tag…',
        value: self.state.searchQuery,
        class: 'prw-input',
        style: [
          'width:100%', 'padding:10px 14px',
          'border:1px solid ' + e.border, 'border-radius:8px', 'outline:none',
          'font-size:13px', 'box-sizing:border-box',
          'background:' + (e.dark ? '#0f172a' : '#fff'), 'color:' + e.text,
          'font-family:inherit',
        ].join(';'),
      });
      var timer = null;
      input.addEventListener('input', function () {
        self.state.searchQuery = input.value;
        clearTimeout(timer);
        timer = setTimeout(function () { self._loadPosts(); }, 300);
      });
      e.searchBar.appendChild(input);
      setTimeout(function () { input.focus(); }, 50);
    } else {
      e.searchBar.style.cssText = 'display:none;';
    }
  };

  // ============================================================
  // VIEW SWITCH
  // ============================================================
  Widget.prototype._setView = function (view, post) {
    this._hideHoverPopup();
    this.state.view = view;
    if (post) this.state.currentPost = post;
    this._renderHeader();
    this._renderContent();
    if (view === 'list' || view === 'search') this._loadPosts();
    if (view === 'detail' && post) this._loadPost(post.id);
  };

  // ============================================================
  // CONTENT — renders based on view
  // ============================================================
  Widget.prototype._renderContent = function () {
    var c = this.els.content;
    if (!c) return;
    c.innerHTML = '';
    var v = this.state.view;
    if (v === 'list' || v === 'search') c.appendChild(this._listView());
    else if (v === 'detail') c.appendChild(this._detailView());
    else if (v === 'new') c.appendChild(this._newPostView());
  };

  // ----------- LIST view (posts cards) -----------
  Widget.prototype._listView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:12px;' });

    if (this.state.posts === null) {
      wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:' + e.muted + ';">Loading…</div>';
      return wrap;
    }
    if (!this.state.posts.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:40px 20px;color:' + e.muted + ';">' +
        (this.state.view === 'search'
          ? 'No posts match your search.'
          : 'No posts yet. Be the first to submit feedback!') +
        '</div>';
      return wrap;
    }

    this.state.posts.forEach(function (p) {
      wrap.appendChild(self._postCard(p));
    });
    return wrap;
  };

  // Post card — mirrors the "All Posts" table row layout from the main app:
  // left-side compact horizontal vote button, then single-line title and
  // description (both truncated). Hover shows a custom floating card with
  // the full title + description + chips (like the main app's hover popup).
  Widget.prototype._postCard = function (p) {
    var self = this, e = this.els;
    var hasVoted = !!this.state.votedIds[p.id];
    // Fallback: if plain description is empty, strip content (rich HTML)
    var descClean = p.description ? stripHtml(p.description) : '';
    if (!descClean && p.content) descClean = stripHtml(p.content);

    var card = el('div', {
      style: [
        'background:' + (e.dark ? '#1f2937' : '#ffffff'),
        'border:1px solid ' + e.border,
        'border-radius:12px', 'padding:12px 14px', 'margin-bottom:10px',
        'cursor:pointer', 'transition:border-color 0.15s ease, box-shadow 0.15s ease',
        'display:flex', 'gap:12px', 'align-items:flex-start',
      ].join(';'),
      onclick: function () { self._setView('detail', p); },
    });
    var hoverTimer = null;
    card.addEventListener('mouseenter', function () {
      card.style.borderColor = e.accent;
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
      hoverTimer = setTimeout(function () { self._showHoverPopup(card, p, descClean); }, 400);
    });
    card.addEventListener('mouseleave', function () {
      card.style.borderColor = e.border;
      card.style.boxShadow = 'none';
      if (hoverTimer) clearTimeout(hoverTimer);
      self._hideHoverPopup();
    });
    // Click also dismisses the hover popup immediately (before navigating)
    card.addEventListener('click', function () {
      if (hoverTimer) clearTimeout(hoverTimer);
      self._hideHoverPopup();
    });

    // Compact horizontal vote button — matches app's upvote chip size
    var voteBtn = el('button', {
      'aria-label': 'Upvote',
      class: 'prw-vote-btn',
      style: [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:6px 12px', 'height:32px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + (e.dark ? '#0f172a' : '#fff'),
        'color:' + (hasVoted ? e.accent : e.text),
        'border-radius:8px', 'cursor:pointer',
        'font-size:13px', 'font-weight:600',
        'flex-shrink:0', 'line-height:1',
      ].join(';'),
      onclick: function (ev) { ev.stopPropagation(); self._toggleVote(p); },
      onmouseenter: function () {
        if (!hasVoted) { this.style.borderColor = e.accent; this.style.color = e.accent; }
      },
      onmouseleave: function () {
        if (!hasVoted) { this.style.borderColor = e.border; this.style.color = e.text; }
      },
    });
    voteBtn.innerHTML = ICON.up + '<span>' + (p.voteCount || 0) + '</span>';
    card.appendChild(voteBtn);

    // Right content
    var content = el('div', { style: 'flex:1;min-width:0;' });

    // Title — single line, truncated
    var titleEl = el('div', {
      style: [
        'font-size:14px', 'font-weight:600',
        'color:' + e.text, 'line-height:1.4', 'margin-bottom:2px',
        'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
      ].join(';'),
    });
    titleEl.textContent = p.title;
    content.appendChild(titleEl);

    // Description — single line, truncated
    if (descClean) {
      var desc = el('div', {
        style: [
          'font-size:12.5px', 'color:' + e.muted, 'line-height:1.45',
          'margin-bottom:8px',
          'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
        ].join(';'),
      });
      desc.textContent = descClean;
      content.appendChild(desc);
    }

    // Meta row: Board · Status · Comments (left → right)
    var meta = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' });

    if (p.board) {
      var boardEl = el('span', {
        style: 'font-size:12px;color:' + e.muted + ';font-weight:500;',
      });
      boardEl.textContent = p.board.name;
      meta.appendChild(boardEl);
    }

    if (p.status) {
      var sChip = el('span', {
        style: 'display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:' + statusBadgeBg(p.status, e.dark) + ';color:' + statusBadgeColor(p.status, e.dark) + ';',
      });
      sChip.textContent = prettyStatus(p.status);
      meta.appendChild(sChip);
    }

    var cc = (p._count && p._count.comments) || 0;
    var commentEl = el('span', {
      style: 'display:inline-flex;align-items:center;gap:3px;font-size:12px;color:' + e.muted + ';',
    });
    commentEl.innerHTML = ICON.comment + '<span>' + cc + '</span>';
    meta.appendChild(commentEl);

    content.appendChild(meta);
    card.appendChild(content);
    return card;
  };

  // Detail view — clean, readable layout. Title + vote button at top,
  // then rich post content, then comments section. No metadata sidebar
  // (board/status/etc. already shown on the list card).
  Widget.prototype._detailView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:26px 22px 16px;' });
    var post = this.state.currentPost;

    if (!post) {
      wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:' + e.muted + ';">Loading…</div>';
      return wrap;
    }

    var hasVoted = !!this.state.votedIds[post.id];

    // Title row: title on left, vote button on right
    var titleRow = el('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px;' });
    var titleEl = el('h2', {
      style: 'font-size:20px;font-weight:700;color:' + e.text + ';margin:0;line-height:1.4;flex:1;min-width:0;',
    });
    titleEl.textContent = post.title;
    titleRow.appendChild(titleEl);

    // Horizontal chip matching main app's upvote button (32px tall)
    var voteBtn = el('button', {
      'aria-label': 'Upvote',
      class: 'prw-vote-btn',
      style: [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:6px 12px', 'height:32px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + (e.dark ? '#0f172a' : '#fff'),
        'color:' + (hasVoted ? e.accent : e.text),
        'border-radius:8px', 'cursor:pointer',
        'font-size:13px', 'font-weight:600',
        'flex-shrink:0', 'line-height:1',
      ].join(';'),
      onclick: function () { self._toggleVote(post); },
      onmouseenter: function () {
        if (!hasVoted) { this.style.borderColor = e.accent; this.style.color = e.accent; }
      },
      onmouseleave: function () {
        if (!hasVoted) { this.style.borderColor = e.border; this.style.color = e.text; }
      },
    });
    voteBtn.innerHTML = ICON.up + '<span>' + (post.voteCount || 0) + '</span>';
    titleRow.appendChild(voteBtn);
    wrap.appendChild(titleRow);

    // Description / rich content — scoped class applies readable styles
    // (spacing, headings, lists, links, code blocks, images, etc.)
    var contentHtml = post.content || post.description || '';
    if (contentHtml) {
      var contentEl = el('div', {
        class: 'prw-post-content',
        style: 'color:' + e.text + ';margin-bottom:8px;',
      });
      if (post.content && /<[a-z][^>]*>/i.test(post.content)) {
        contentEl.innerHTML = post.content;
      } else {
        // Plain text — preserve line breaks
        contentEl.innerHTML = escapeHtml(stripHtml(contentHtml)).replace(/\n/g, '<br/>');
      }
      wrap.appendChild(contentEl);
    }

    // Comments section — directly below post content
    var commentsHost = el('div', { id: 'prw-comments-host' });
    wrap.appendChild(commentsHost);
    this._renderComments(commentsHost, post);

    return wrap;
  };

  // Render the comments section inside the given host element.
  // Loads comments asynchronously and includes a compose box.
  Widget.prototype._renderComments = function (host, post) {
    var self = this, e = this.els;

    var header = el('div', {
      style: 'display:flex;align-items:center;gap:8px;padding-top:20px;margin-top:6px;border-top:1px solid ' + e.border + ';margin-bottom:12px;',
    });
    header.innerHTML =
      '<span style="font-size:15px;font-weight:700;color:' + e.text + ';">Comments</span>' +
      '<span id="prw-cc-badge" style="font-size:12px;color:' + e.muted + ';">…</span>';
    host.appendChild(header);

    // Comments list (filled after fetch)
    var listEl = el('div', { id: 'prw-comments-list', style: 'display:flex;flex-direction:column;gap:10px;margin-bottom:14px;' });
    listEl.innerHTML = '<div style="font-size:12px;color:' + e.muted + ';padding:8px 0;">Loading comments…</div>';
    host.appendChild(listEl);

    // Compose box
    var compose = el('div', {
      style: 'border:1px solid ' + e.border + ';border-radius:10px;padding:10px;background:' + (e.dark ? '#0f172a' : '#fafafa') + ';',
    });
    var authed = isAuthed();
    var emailInput = null;
    if (!authed) {
      emailInput = el('input', {
        type: 'email', placeholder: 'Your registered email',
        value: self.state.voterEmail || '',
        class: 'prw-input',
        style: 'width:100%;padding:8px 10px;border:1px solid ' + e.border + ';border-radius:8px;font-size:13px;outline:none;background:' + (e.dark ? '#0f172a' : '#fff') + ';color:' + e.text + ';margin-bottom:8px;box-sizing:border-box;font-family:inherit;',
      });
      compose.appendChild(emailInput);
    }
    var textarea = el('textarea', {
      placeholder: 'Write a comment…',
      class: 'prw-input',
      style: 'width:100%;padding:8px 10px;border:1px solid ' + e.border + ';border-radius:8px;font-size:13px;outline:none;background:' + (e.dark ? '#0f172a' : '#fff') + ';color:' + e.text + ';min-height:60px;resize:vertical;box-sizing:border-box;font-family:inherit;',
    });
    compose.appendChild(textarea);

    // Attach row — paperclip button + hidden file input + selected chip
    var selectedFile = null;
    var fileInput = el('input', {
      type: 'file',
      style: 'display:none;',
      accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.rar,.7z,.jpg,.jpeg,.png,.gif,.webp,.svg',
    });
    compose.appendChild(fileInput);

    var attachRow = el('div', {
      style: 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:6px;color:' + e.muted + ';',
    });
    var attachBtn = el('button', {
      type: 'button',
      class: 'prw-attach-btn',
      style: 'color:' + e.muted + ';',
    });
    attachBtn.innerHTML = ICON.paperclip + '<span>Attach</span>';
    attachBtn.onclick = function () { fileInput.click(); };
    attachRow.appendChild(attachBtn);

    var chipEl = el('span', {
      class: 'prw-attach-chip',
      style: 'background:' + (e.dark ? '#0f172a' : '#fff') + ';color:' + e.text + ';display:none;',
    });
    attachRow.appendChild(chipEl);
    compose.appendChild(attachRow);

    function renderChip() {
      if (!selectedFile) { chipEl.style.display = 'none'; chipEl.innerHTML = ''; return; }
      var sizeStr = fmtBytes(selectedFile.size);
      chipEl.style.display = 'inline-flex';
      chipEl.innerHTML =
        ICON.file +
        '<span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(selectedFile.name) + '</span>' +
        (sizeStr ? '<span style="opacity:0.7;">' + sizeStr + '</span>' : '') +
        '<button type="button" data-prw-remove="1" aria-label="Remove attachment" style="background:transparent;border:none;padding:0 2px;cursor:pointer;color:inherit;display:inline-flex;align-items:center;">' + ICON.x + '</button>';
      var removeBtn = chipEl.querySelector('[data-prw-remove]');
      if (removeBtn) removeBtn.onclick = function () { selectedFile = null; fileInput.value = ''; renderChip(); };
    }

    fileInput.onchange = function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) { selectedFile = null; renderChip(); return; }
      if (f.size > 10 * 1024 * 1024) {
        msg.style.color = '#ef4444';
        msg.textContent = 'Attachment must be under 10 MB.';
        fileInput.value = '';
        return;
      }
      msg.textContent = '';
      selectedFile = f;
      renderChip();
    };

    var msg = el('div', { style: 'font-size:12px;margin-top:6px;min-height:16px;color:' + e.muted + ';' });
    compose.appendChild(msg);
    var btn = el('button', {
      style: 'margin-top:8px;padding:8px 14px;background:' + e.accent + ';color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;',
    });
    btn.textContent = 'Post Comment';
    compose.appendChild(btn);
    host.appendChild(compose);

    btn.onclick = function () {
      var content = textarea.value.trim();
      if (!content && !selectedFile) { msg.style.color = '#ef4444'; msg.textContent = 'Please write something or attach a file.'; return; }
      btn.disabled = true;
      msg.style.color = e.muted; msg.textContent = 'Posting…';

      // FormData so text fields + optional file ride the same request
      var fd = new FormData();
      if (content) fd.append('content', content);
      if (!authed && emailInput) fd.append('email', emailInput.value.trim());
      if (selectedFile) fd.append('attachment', selectedFile);

      var headers = {}; // NO Content-Type — browser sets multipart boundary
      if (authed) Object.assign(headers, authHeaders());

      fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(self.opts.token) + '/posts/' + encodeURIComponent(post.id) + '/comments', {
        method: 'POST', headers: headers, body: fd,
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok && res.d && res.d.success) {
            msg.style.color = e.accent; msg.textContent = 'Posted';
            textarea.value = '';
            selectedFile = null; fileInput.value = ''; renderChip();
            self._loadComments(post, listEl);
          } else if (res.d && res.d.code === 'USER_NOT_REGISTERED') {
            msg.style.color = '#ef4444';
            msg.innerHTML = (res.d.message || 'Not registered.') + ' <a href="' + APP_URL + '/register" target="_blank" rel="noopener" style="color:' + e.accent + ';font-weight:600;">Sign up here</a>.';
          } else {
            msg.style.color = '#ef4444';
            msg.textContent = (res.d && res.d.message) || 'Could not post comment.';
          }
        })
        .catch(function () {
          btn.disabled = false;
          msg.style.color = '#ef4444';
          msg.textContent = 'Network error. Please try again.';
        });
    };

    this._loadComments(post, listEl);
  };

  // Fetch + render the comment list (replaces contents of listEl).
  Widget.prototype._loadComments = function (post, listEl) {
    var self = this, e = this.els;
    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/posts/' + encodeURIComponent(post.id) + '/comments')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var comments = (data && data.data && data.data.comments) || [];
        // Update count badge
        var badge = self.els && self.els.panel && self.els.panel.querySelector('#prw-cc-badge');
        if (badge) badge.textContent = comments.length ? ('(' + comments.length + ')') : '(0)';
        listEl.innerHTML = '';
        if (!comments.length) {
          var empty = el('div', { style: 'font-size:13px;color:' + e.muted + ';padding:8px 0;' });
          empty.textContent = 'No comments yet. Be the first to share your thoughts.';
          listEl.appendChild(empty);
          return;
        }
        comments.forEach(function (c) {
          var row = el('div', {
            style: 'padding:10px 12px;border:1px solid ' + e.border + ';border-radius:10px;background:' + (e.dark ? '#1f2937' : '#ffffff') + ';',
          });
          var initial = ((c.author && c.author.name) || '?').charAt(0).toUpperCase();
          var officialBadge = c.isOfficial
            ? '<span style="margin-left:6px;padding:1px 6px;border-radius:4px;background:' + e.accent + ';color:#fff;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">Official</span>'
            : '';
          // Build attachment block — download link with original filename,
          // colored per file type to match the main app's CommentAttachment pill.
          var attachHtml = '';
          if (c.attachmentUrl) {
            var sizeStr = fmtBytes(c.attachmentSize);
            var pal = attachmentPalette(c.attachmentMime, c.attachmentName, e.dark);
            attachHtml =
              '<a class="prw-attach-link" href="' + escapeHtml(c.attachmentUrl) + '" target="_blank" rel="noopener" download="' + escapeHtml(c.attachmentName || '') + '" style="color:' + pal.color + ';border-color:' + pal.border + ';background:' + pal.background + ';">' +
                ICON.download +
                '<span class="prw-attach-name">' + escapeHtml(c.attachmentName || 'attachment') + '</span>' +
                (sizeStr ? '<span class="prw-attach-size">· ' + sizeStr + '</span>' : '') +
              '</a>';
          }

          var bodyText = stripHtml(c.content);
          var bodyHtml = bodyText
            ? '<div style="font-size:13px;color:' + e.text + ';line-height:1.55;white-space:pre-wrap;word-break:break-word;">' + escapeHtml(bodyText) + '</div>'
            : '';

          row.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
              '<span style="width:24px;height:24px;border-radius:50%;background:' + e.accent + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">' + escapeHtml(initial) + '</span>' +
              '<span style="font-size:13px;font-weight:600;color:' + e.text + ';">' + escapeHtml((c.author && c.author.name) || 'User') + '</span>' + officialBadge +
              '<span style="margin-left:auto;font-size:11px;color:' + e.muted + ';">' + fmtDate(c.createdAt) + '</span>' +
            '</div>' +
            bodyHtml +
            attachHtml;
          listEl.appendChild(row);
        });
      })
      .catch(function () {
        listEl.innerHTML = '<div style="font-size:12px;color:#ef4444;padding:8px 0;">Could not load comments.</div>';
      });
  };

  // New post form — only users already registered on the roadmap can submit.
  // Backend returns 403 with code=USER_NOT_REGISTERED when email isn't known.
  Widget.prototype._newPostView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:20px;' });

    // Floating-label field helper — matches the main app's Create Post dialog.
    // Placeholder is a single space (" ") so :placeholder-shown stays true until
    // the user types, keeping the label in the centered position.
    function floatField(opts) {
      var w = el('div', { class: 'prw-float' });
      var node = opts.textarea
        ? el('textarea', { id: opts.id, placeholder: ' ', class: 'prw-float-input' })
        : el('input', { id: opts.id, type: opts.type || 'text', placeholder: ' ', class: 'prw-float-input', value: opts.value || '' });
      if (opts.textarea && opts.minHeight) node.style.minHeight = opts.minHeight;
      var lbl = el('label', { class: 'prw-float-label' });
      lbl.setAttribute('for', opts.id);
      lbl.textContent = opts.label;
      w.appendChild(node);
      w.appendChild(lbl);
      if (opts.help) {
        var help = el('p', { class: 'prw-float-help' });
        help.textContent = opts.help;
        w.appendChild(help);
      }
      return { wrap: w, input: node };
    }

    var authed = isAuthed();

    // Info banner — tailored message depending on auth state
    var notice = el('div', {
      style: [
        'padding:10px 12px', 'border-radius:8px',
        'background:' + (e.dark ? 'rgba(5,150,105,0.12)' : '#f0fdf4'),
        'border:1px solid ' + (e.dark ? 'rgba(5,150,105,0.3)' : '#bbf7d0'),
        'color:' + (e.dark ? '#86efac' : '#15803d'),
        'font-size:12px', 'margin-bottom:14px', 'line-height:1.5',
      ].join(';'),
    });
    notice.innerHTML = authed
      ? 'Submitting as your signed-in roadmap account.'
      : 'Only registered roadmap users can submit feedback. Please use the email you signed up with.';
    wrap.appendChild(notice);

    var emailInput = null;
    if (!authed) {
      var emF = floatField({ id: 'prw-f-email', type: 'email', label: 'Registered Email', value: self.state.voterEmail || '', help: 'Use the email you signed up with.' });
      emailInput = emF.input;
      wrap.appendChild(emF.wrap);
    }

    var tF = floatField({ id: 'prw-f-title', label: 'Title *', help: 'Enter the title for your post.' });
    var titleInput = tF.input;
    wrap.appendChild(tF.wrap);

    var dF = floatField({ id: 'prw-f-desc', label: 'Description (optional)', textarea: true, help: 'Tell us more about what you need.' });
    var descInput = dF.input;
    wrap.appendChild(dF.wrap);

    var msg = el('div', { style: 'font-size:12px;margin:8px 0;min-height:16px;' });

    var btn = el('button', {
      style: 'width:100%;padding:11px 14px;background:' + e.accent + ';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;',
    });
    btn.textContent = 'Submit Feedback';
    btn.onclick = function () {
      msg.style.color = e.muted;
      msg.textContent = 'Submitting…';
      btn.disabled = true;
      var headers = { 'Content-Type': 'application/json' };
      if (authed) Object.assign(headers, authHeaders());
      var body = {
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
      };
      if (!authed && emailInput) body.email = emailInput.value.trim();
      fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(self.opts.token) + '/submit', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d, status: r.status }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok && res.d && res.d.success) {
            if (!authed && emailInput && emailInput.value.trim()) {
              self.state.voterEmail = emailInput.value.trim().toLowerCase();
              localStorage.setItem(self._lsKey('email'), self.state.voterEmail);
            }
            wrap.innerHTML =
              '<div style="text-align:center;padding:40px 20px;">' +
                '<div style="width:56px;height:56px;border-radius:50%;background:' + e.accent + ';margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;">' +
                  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</div>' +
                '<div style="font-size:17px;font-weight:700;color:' + e.text + ';margin-bottom:6px;">Thanks for your feedback!</div>' +
                '<div style="font-size:13px;color:' + e.muted + ';margin-bottom:20px;">We\'ll review it and get back to you.</div>' +
              '</div>';
            var back = el('button', {
              style: 'display:block;margin:0 auto;padding:8px 16px;background:transparent;border:1px solid ' + e.border + ';border-radius:8px;color:' + e.text + ';font-size:13px;font-weight:500;cursor:pointer;',
              onclick: function () { self._setView('list'); },
            });
            back.textContent = 'Back to posts';
            wrap.appendChild(back);
          } else if (res.d && res.d.code === 'USER_NOT_REGISTERED') {
            msg.innerHTML = '<div style="padding:10px 12px;border-radius:8px;background:' + (e.dark ? 'rgba(234,179,8,0.12)' : '#fef3c7') + ';border:1px solid ' + (e.dark ? 'rgba(234,179,8,0.3)' : '#fde68a') + ';color:' + (e.dark ? '#fde047' : '#a16207') + ';line-height:1.5;">' +
              (res.d.message || 'This email is not registered on our roadmap.') +
              ' <a href="' + APP_URL + '/register" target="_blank" rel="noopener" style="color:' + e.accent + ';font-weight:600;text-decoration:underline;">Sign up here</a>.' +
              '</div>';
          } else {
            msg.style.color = '#ef4444';
            msg.textContent = (res.d && res.d.message) || 'Could not submit. Please try again.';
          }
        })
        .catch(function () {
          btn.disabled = false;
          msg.style.color = '#ef4444';
          msg.textContent = 'Network error. Please try again.';
        });
    };
    wrap.appendChild(msg);
    wrap.appendChild(btn);
    return wrap;
  };

  // ============================================================
  // DATA LOADERS
  // ============================================================
  Widget.prototype._loadPosts = function () {
    var self = this;
    this.state.posts = null;
    this._renderContent();
    var q = this.state.view === 'search' ? this.state.searchQuery : '';
    var url = API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/posts';
    if (q) url += '?q=' + encodeURIComponent(q);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        self.state.posts = (data && data.data && data.data.posts) || [];
        self._renderContent();
      })
      .catch(function () {
        self.state.posts = [];
        self._renderContent();
      });
  };

  Widget.prototype._loadPost = function (postId) {
    var self = this;
    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/posts/' + encodeURIComponent(postId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && data.data && data.data.post) {
          self.state.currentPost = data.data.post;
          self._renderHeader();
          self._renderContent();
        }
      })
      .catch(function () { /* keep stub post */ });
  };

  // ============================================================
  // HOVER POPUP — mimics the main app's All Posts hover card.
  // Renders chips (board, type, status) + full title + full description.
  // ============================================================
  Widget.prototype._showHoverPopup = function (cardEl, post, descClean) {
    var e = this.els;
    if (!e) return;
    this._hideHoverPopup();

    var pop = document.createElement('div');
    pop.id = 'prw-hover-popup';
    pop.style.cssText = [
      'position:fixed', 'z-index:2147483700',
      'background:' + (e.dark ? '#1f2937' : '#ffffff'),
      'border:1px solid ' + e.border,
      'border-radius:12px',
      'padding:14px',
      'width:' + (cardEl.getBoundingClientRect().width) + 'px',
      'max-width:400px',
      'box-shadow:0 20px 40px rgba(0,0,0,0.15)',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'pointer-events:none',
      'opacity:0',
      'transform:translateY(-4px)',
      'transition:opacity 0.15s ease, transform 0.15s ease',
    ].join(';');

    // Chips row
    var chips = '';
    if (post.board) {
      chips += '<span style="display:inline-block;padding:3px 10px;border-radius:6px;background:' + (e.dark ? 'rgba(5,150,105,0.15)' : 'rgba(5,150,105,0.1)') + ';color:' + e.accent + ';font-size:11px;font-weight:600;margin-right:6px;">' + escapeHtml(post.board.name) + '</span>';
    }
    if (post.type) {
      var typeColors = { feature: '#3b82f6', bug: '#ef4444', improvement: '#f97316', integration: '#a855f7' };
      var tc = typeColors[post.type] || '#6b7280';
      chips += '<span style="display:inline-block;padding:3px 10px;border-radius:6px;background:' + tc + '1a;color:' + tc + ';font-size:11px;font-weight:600;margin-right:6px;text-transform:capitalize;">' + escapeHtml(post.type) + '</span>';
    }
    if (post.status) {
      chips += '<span style="display:inline-block;padding:3px 10px;border-radius:6px;background:' + statusBadgeBg(post.status, e.dark) + ';color:' + statusBadgeColor(post.status, e.dark) + ';font-size:11px;font-weight:600;">' + escapeHtml(prettyStatus(post.status)) + '</span>';
    }

    pop.innerHTML =
      (chips ? '<div style="margin-bottom:10px;">' + chips + '</div>' : '') +
      '<div style="font-size:14px;font-weight:700;color:' + e.text + ';line-height:1.4;margin-bottom:6px;">' + escapeHtml(post.title) + '</div>' +
      (descClean ? '<div style="font-size:13px;color:' + e.muted + ';line-height:1.5;">' + escapeHtml(descClean) + '</div>' : '');

    document.body.appendChild(pop);

    // Position — prefer above card; flip below if no space
    var r = cardEl.getBoundingClientRect();
    var popH = pop.getBoundingClientRect().height;
    var spaceAbove = r.top;
    var spaceBelow = window.innerHeight - r.bottom;
    var top;
    if (spaceAbove >= popH + 12 || spaceAbove > spaceBelow) {
      top = r.top - popH - 8;
    } else {
      top = r.bottom + 8;
    }
    pop.style.left = r.left + 'px';
    pop.style.top = Math.max(8, top) + 'px';

    requestAnimationFrame(function () {
      pop.style.opacity = '1';
      pop.style.transform = 'translateY(0)';
    });
    this._hoverPopupEl = pop;
  };
  Widget.prototype._hideHoverPopup = function () {
    var pop = this._hoverPopupEl;
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    this._hoverPopupEl = null;
  };

  // ============================================================
  // UPVOTE — prompts for email on first use, stored in localStorage
  // ============================================================
  Widget.prototype._toggleVote = function (post) {
    var self = this;
    var headers = { 'Content-Type': 'application/json' };
    var body = { postId: post.id };

    if (isAuthed()) {
      // Logged-in path — no email prompt needed
      Object.assign(headers, authHeaders());
    } else {
      // Fall back to email prompt for anonymous visitors on external sites
      var email = this.state.voterEmail;
      if (!email) {
        email = window.prompt('Enter your email to vote:');
        if (!email) return;
        email = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          alert('Please enter a valid email.');
          return;
        }
        this.state.voterEmail = email;
        localStorage.setItem(this._lsKey('email'), email);
      }
      body.email = email;
    }

    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/vote', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) return;
        if (data.data.voted) self.state.votedIds[post.id] = true;
        else delete self.state.votedIds[post.id];
        localStorage.setItem(self._lsKey('votes'), JSON.stringify(self.state.votedIds));

        // Update in-memory posts + current post
        post.voteCount = data.data.voteCount;
        if (self.state.posts) {
          self.state.posts.forEach(function (p) {
            if (p.id === post.id) p.voteCount = data.data.voteCount;
          });
        }
        if (self.state.currentPost && self.state.currentPost.id === post.id) {
          self.state.currentPost.voteCount = data.data.voteCount;
        }
        self._renderContent();
      })
      .catch(function () { /* ignore */ });
  };

  window.PabblyRoadmapWidget = Widget;
})();
