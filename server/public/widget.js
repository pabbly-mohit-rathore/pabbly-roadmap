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
        else if (k === 'onclick') e.onclick = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
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
    chat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    comment: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
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

    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(token))
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
      })
      .catch(function (err) {
        console.error('[PabblyRoadmapWidget] failed to load config:', err);
      });
  };

  Widget.prototype._mountTrigger = function () {
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
    this.isOpen = true;
    this.state.view = this.config.showSubmissionFormOnly ? 'new' : 'list';
    this._renderShell();
    if (this.state.view === 'list') this._loadPosts();
  };

  Widget.prototype.close = function () {
    document.body.style.overflow = '';
    this.isOpen = false;
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
    var text = dark ? '#ffffff' : '#111827';
    var muted = dark ? '#9ca3af' : '#6b7280';
    var softBg = dark ? '#1f2937' : '#ffffff';

    // Backdrop — transparent so page behind stays clearly visible (no dim/blur).
    // Still captures outside clicks so user can dismiss by clicking off the panel.
    var backdrop = el('div', {
      style: [
        'position:fixed', 'inset:0', 'z-index:2147483600',
        'background:transparent',
      ].join(';'),
      onclick: function (e) { if (e.target === backdrop) self.close(); },
    });

    // Panel position per type/openFrom
    //   modal   → full-height edge drawer (matches app's right-side user info drawer)
    //   popover → centered dialog box (traditional modal — screen center)
    var panelStyle = [];
    var from = cfg.openFrom || 'right';
    if (cfg.type === 'popover') {
      // Centered dialog box
      panelStyle.push(
        'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
        'width:' + Math.min(560, width) + 'px', 'max-height:88vh',
        'border-radius:14px'
      );
    } else {
      // modal → edge drawer — no border-radius, single border-left/right/top/bottom
      // matches admin user info drawer styling from the main app
      panelStyle.push('width:' + width + 'px', 'height:100vh', 'top:0');
      if (from === 'left') {
        panelStyle.push('left:0', 'border-right:1px solid ' + border);
      } else if (from === 'top') {
        panelStyle.push('left:0', 'right:0', 'width:auto', 'height:auto', 'max-height:88vh', 'top:0', 'border-bottom:1px solid ' + border);
      } else if (from === 'bottom') {
        panelStyle.push('left:0', 'right:0', 'width:auto', 'height:auto', 'max-height:88vh', 'bottom:0', 'top:auto', 'border-top:1px solid ' + border);
      } else {
        // right (default)
        panelStyle.push('right:0', 'border-left:1px solid ' + border);
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
      style: 'flex:1;overflow-y:auto;background:' + softBg + ';',
    });

    panel.appendChild(header);
    panel.appendChild(searchBar);
    panel.appendChild(content);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    this.els = {
      backdrop: backdrop, panel: panel, header: header, searchBar: searchBar, content: content,
      accent: accent, bg: bg, border: border, text: text, muted: muted, softBg: softBg, dark: dark,
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
      'padding:14px 16px', 'background:' + accent, 'color:#fff',
      'display:flex', 'align-items:center', 'justify-content:space-between', 'gap:10px',
      'flex-shrink:0',
    ].join(';');
    e.header.innerHTML = '';

    // Left side
    var leftWrap = el('div', { style: 'display:flex;align-items:center;gap:10px;min-width:0;flex:1;' });
    if (view === 'list') {
      leftWrap.innerHTML =
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;">' + ICON.chat + '</span>' +
        '<span style="font-size:16px;font-weight:700;">' + escapeHtml(this.config.name || 'Feedback') + '</span>';
    } else {
      var backBtn = el('button', {
        'aria-label': 'Back',
        style: 'background:rgba(255,255,255,0.18);border:none;color:#fff;padding:7px;border-radius:8px;cursor:pointer;display:flex;',
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

    // Right side
    var right = el('div', { style: 'display:flex;align-items:center;gap:6px;flex-shrink:0;' });
    if (view === 'list') {
      // New Post button
      var newBtn = el('button', {
        style: 'background:#fff;color:' + accent + ';border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;',
        onclick: function () { self._setView('new'); },
      });
      newBtn.innerHTML = ICON.plus + '<span>New Post</span>';
      right.appendChild(newBtn);

      // Open in new tab
      var extBtn = el('button', {
        'aria-label': 'Open roadmap',
        style: 'background:rgba(255,255,255,0.18);border:none;color:#fff;padding:7px;border-radius:8px;cursor:pointer;display:flex;',
        html: ICON.ext,
        onclick: function () { window.open(APP_URL + '/user/all-posts', '_blank', 'noopener'); },
      });
      right.appendChild(extBtn);

      // Search
      var searchBtn = el('button', {
        'aria-label': 'Search',
        style: 'background:rgba(255,255,255,0.18);border:none;color:#fff;padding:7px;border-radius:8px;cursor:pointer;display:flex;',
        html: ICON.search,
        onclick: function () { self._setView('search'); },
      });
      right.appendChild(searchBtn);
    }
    var closeBtn = el('button', {
      'aria-label': 'Close',
      style: 'background:rgba(255,255,255,0.18);border:none;color:#fff;padding:7px;border-radius:8px;cursor:pointer;display:flex;',
      html: ICON.close,
      onclick: function () { self.close(); },
    });
    right.appendChild(closeBtn);
    e.header.appendChild(right);

    // Search sub-bar
    e.searchBar.innerHTML = '';
    if (view === 'search') {
      var sbg = e.dark ? '#1e293b' : '#ffffff';
      e.searchBar.style.cssText = 'padding:12px 16px;background:' + sbg + ';border-bottom:1px solid ' + e.border + ';flex-shrink:0;';
      var input = el('input', {
        type: 'text',
        placeholder: 'Search posts by title, description, or tag…',
        value: self.state.searchQuery,
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
  // left-side vote button (boxed, with count), then title + meta + chips.
  Widget.prototype._postCard = function (p) {
    var self = this, e = this.els;
    var hasVoted = !!this.state.votedIds[p.id];

    var card = el('div', {
      style: [
        'background:' + (e.dark ? '#1e293b' : '#ffffff'),
        'border:1px solid ' + e.border,
        'border-radius:12px', 'padding:14px', 'margin-bottom:10px',
        'cursor:pointer', 'transition:border-color 0.15s ease, box-shadow 0.15s ease',
        'display:flex', 'gap:12px', 'align-items:flex-start',
      ].join(';'),
      onclick: function () { self._setView('detail', p); },
    });
    card.addEventListener('mouseenter', function () { card.style.borderColor = e.accent; card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; });
    card.addEventListener('mouseleave', function () { card.style.borderColor = e.border; card.style.boxShadow = 'none'; });

    // Vote button on left — app's upvote column style
    var voteBtn = el('button', {
      style: [
        'display:inline-flex', 'flex-direction:column', 'align-items:center',
        'justify-content:center', 'gap:2px',
        'min-width:48px', 'padding:8px 4px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + (e.dark ? '#0f172a' : '#fff'),
        'color:' + (hasVoted ? e.accent : e.text),
        'border-radius:8px', 'cursor:pointer',
        'font-size:13px', 'font-weight:600',
        'flex-shrink:0',
      ].join(';'),
      onclick: function (ev) { ev.stopPropagation(); self._toggleVote(p); },
    });
    voteBtn.innerHTML = ICON.up + '<span>' + (p.voteCount || 0) + '</span>';
    card.appendChild(voteBtn);

    // Right content
    var content = el('div', { style: 'flex:1;min-width:0;' });

    var titleEl = el('div', {
      style: [
        'font-size:15px', 'font-weight:600',
        'color:' + e.text, 'line-height:1.35', 'margin-bottom:4px',
        'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
      ].join(';'),
    });
    titleEl.textContent = p.title;
    content.appendChild(titleEl);

    if (p.description) {
      var desc = el('div', {
        style: [
          'font-size:13px', 'color:' + e.muted, 'line-height:1.5',
          'margin-bottom:10px',
          'display:-webkit-box', '-webkit-line-clamp:2', '-webkit-box-orient:vertical', 'overflow:hidden',
        ].join(';'),
      });
      desc.textContent = stripHtml(p.description);
      content.appendChild(desc);
    }

    // Chips row: status + board + comments (tags only if present)
    var chips = el('div', { style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' });

    // Status badge — app's pill style
    if (p.status) {
      var sBg = statusBadgeBg(p.status, e.dark);
      var sColor = statusBadgeColor(p.status, e.dark);
      var statusChip = el('span', {
        style: 'display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:' + sBg + ';color:' + sColor + ';',
      });
      statusChip.textContent = prettyStatus(p.status);
      chips.appendChild(statusChip);
    }

    if (p.board) {
      var boardChip = el('span', {
        style: 'font-size:12px;color:' + e.muted + ';font-weight:500;',
      });
      boardChip.textContent = p.board.name;
      chips.appendChild(boardChip);
    }

    // Tags (max 2)
    (p.tags || []).slice(0, 2).forEach(function (t) {
      var tag = t.tag || t;
      if (!tag) return;
      var c = tag.color || '#6366f1';
      var chip = el('span', {
        style: 'display:inline-block;padding:2px 8px;border-radius:4px;background:' + c + '1a;color:' + c + ';font-size:11px;font-weight:600;',
      });
      chip.textContent = tag.name;
      chips.appendChild(chip);
    });

    // Comments count — push to right
    var cc = (p._count && p._count.comments) || 0;
    if (cc > 0) {
      var commentChip = el('span', {
        style: 'display:inline-flex;align-items:center;gap:3px;font-size:12px;color:' + e.muted + ';margin-left:auto;',
      });
      commentChip.innerHTML = ICON.comment + '<span>' + cc + '</span>';
      chips.appendChild(commentChip);
    }

    content.appendChild(chips);
    card.appendChild(content);
    return card;
  };

  // Detail view — mirrors the main app's Post Detail page layout.
  // Title + vote button top-right. Content flows inline (no nested card).
  // Metadata (author/board/type/status/tags) listed below content.
  Widget.prototype._detailView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:22px 20px;' });
    var post = this.state.currentPost;

    if (!post) {
      wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:' + e.muted + ';">Loading…</div>';
      return wrap;
    }

    var hasVoted = !!this.state.votedIds[post.id];

    // Title row: title on left, vote button on right
    var titleRow = el('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px;' });
    var titleEl = el('h2', {
      style: 'font-size:22px;font-weight:700;color:' + e.text + ';margin:0;line-height:1.3;flex:1;min-width:0;',
    });
    titleEl.textContent = post.title;
    titleRow.appendChild(titleEl);

    var voteBtn = el('button', {
      style: [
        'display:inline-flex', 'flex-direction:column', 'align-items:center',
        'justify-content:center', 'gap:2px',
        'min-width:52px', 'padding:8px 4px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + (e.dark ? '#0f172a' : '#fff'),
        'color:' + (hasVoted ? e.accent : e.text),
        'border-radius:8px', 'cursor:pointer',
        'font-size:13px', 'font-weight:600', 'flex-shrink:0',
      ].join(';'),
      onclick: function () { self._toggleVote(post); },
    });
    voteBtn.innerHTML = ICON.up + '<span>' + (post.voteCount || 0) + '</span>';
    titleRow.appendChild(voteBtn);
    wrap.appendChild(titleRow);

    // Description / rich content — inline, no wrapping card
    var contentHtml = post.content || post.description || '';
    if (contentHtml) {
      var contentEl = el('div', {
        style: 'font-size:14px;color:' + e.text + ';line-height:1.7;margin-bottom:22px;',
      });
      if (post.content && /<[a-z][^>]*>/i.test(post.content)) {
        contentEl.innerHTML = post.content;
      } else {
        contentEl.textContent = stripHtml(contentHtml);
      }
      wrap.appendChild(contentEl);
    }

    // Metadata rows (label / value) — styled like the app's sidebar meta cards
    var meta = el('div', { style: 'display:flex;flex-direction:column;gap:8px;padding-top:18px;border-top:1px solid ' + e.border + ';' });

    function metaRow(label, valueNode) {
      var row = el('div', {
        style: [
          'display:flex', 'align-items:center', 'justify-content:space-between', 'gap:12px',
          'padding:10px 12px', 'border-radius:10px',
          'background:' + (e.dark ? 'rgba(30,41,59,0.5)' : 'rgba(249,250,251,0.8)'),
          'border:1px solid ' + (e.dark ? '#334155' : '#f3f4f6'),
        ].join(';'),
      });
      var l = el('div', { style: 'font-size:11px;font-weight:600;color:' + e.muted + ';letter-spacing:0.5px;text-transform:uppercase;' });
      l.textContent = label;
      row.appendChild(l);
      row.appendChild(valueNode);
      return row;
    }

    // Created date
    var dateVal = el('div', { style: 'font-size:13px;color:' + e.text + ';font-weight:500;' });
    dateVal.textContent = fmtDate(post.createdAt);
    meta.appendChild(metaRow('POST CREATED', dateVal));

    // Author
    if (post.author) {
      var authorVal = el('div', { style: 'display:flex;align-items:center;gap:8px;' });
      var initial = (post.author.name || '?').charAt(0).toUpperCase();
      authorVal.innerHTML =
        '<span style="width:26px;height:26px;border-radius:50%;background:' + e.accent + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">' + escapeHtml(initial) + '</span>' +
        '<span style="font-size:13px;color:' + e.text + ';font-weight:500;">' + escapeHtml(post.author.name) + '</span>';
      meta.appendChild(metaRow('AUTHOR', authorVal));
    }

    // Board
    if (post.board) {
      var boardVal = el('div', { style: 'font-size:13px;color:' + e.text + ';font-weight:500;' });
      boardVal.textContent = post.board.name;
      meta.appendChild(metaRow('BOARD', boardVal));
    }

    // Status
    if (post.status) {
      var sChip = el('span', {
        style: 'display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:' + statusBadgeBg(post.status, e.dark) + ';color:' + statusBadgeColor(post.status, e.dark) + ';',
      });
      sChip.textContent = prettyStatus(post.status);
      meta.appendChild(metaRow('STATUS', sChip));
    }

    // Tags
    if (post.tags && post.tags.length > 0) {
      var tagsWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:240px;' });
      post.tags.forEach(function (t) {
        var tag = t.tag || t;
        if (!tag) return;
        var c = tag.color || '#6366f1';
        var chip = el('span', {
          style: 'padding:2px 8px;border-radius:4px;background:' + c + '1a;color:' + c + ';font-size:11px;font-weight:600;',
        });
        chip.textContent = tag.name;
        tagsWrap.appendChild(chip);
      });
      meta.appendChild(metaRow('TAGS', tagsWrap));
    }

    wrap.appendChild(meta);

    // Comments count + external link
    var footer = el('div', { style: 'display:flex;align-items:center;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid ' + e.border + ';' });
    var cc = (post._count && post._count.comments) || post.commentCount || 0;
    var commentBadge = el('div', {
      style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;color:' + e.muted + ';',
    });
    commentBadge.innerHTML = ICON.comment + '<span>' + cc + (cc === 1 ? ' comment' : ' comments') + '</span>';
    footer.appendChild(commentBadge);

    var openLink = el('a', {
      href: APP_URL + '/user/posts/' + (post.slug || post.id),
      target: '_blank',
      rel: 'noopener',
      style: 'margin-left:auto;color:' + e.accent + ';font-size:12px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;',
    });
    openLink.innerHTML = 'View in Roadmap ' + ICON.ext;
    footer.appendChild(openLink);
    wrap.appendChild(footer);

    return wrap;
  };

  // New post form — only users already registered on the roadmap can submit.
  // Backend returns 403 with code=USER_NOT_REGISTERED when email isn't known.
  Widget.prototype._newPostView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:20px;' });

    var inputBase = [
      'width:100%', 'padding:10px 12px',
      'border:1px solid ' + e.border, 'border-radius:8px',
      'font-size:13px', 'outline:none', 'box-sizing:border-box',
      'background:' + (e.dark ? '#0f172a' : '#fff'), 'color:' + e.text,
      'font-family:inherit',
    ].join(';');
    var labelStyle = 'font-size:11px;color:' + e.muted + ';font-weight:600;display:block;margin-bottom:4px;';
    var fieldWrap = 'margin-bottom:14px;';

    function field(label, inputNode) {
      var w = el('div', { style: fieldWrap });
      var l = el('label', { style: labelStyle });
      l.textContent = label;
      w.appendChild(l);
      w.appendChild(inputNode);
      return w;
    }

    // Info banner — only existing users can post
    var notice = el('div', {
      style: [
        'padding:10px 12px', 'border-radius:8px',
        'background:' + (e.dark ? 'rgba(5,150,105,0.12)' : '#f0fdf4'),
        'border:1px solid ' + (e.dark ? 'rgba(5,150,105,0.3)' : '#bbf7d0'),
        'color:' + (e.dark ? '#86efac' : '#15803d'),
        'font-size:12px', 'margin-bottom:14px', 'line-height:1.5',
      ].join(';'),
    });
    notice.innerHTML = 'Only registered roadmap users can submit feedback. Please use the email you signed up with.';
    wrap.appendChild(notice);

    var emailInput = el('input', { type: 'email', placeholder: 'Your registered email', value: self.state.voterEmail || '', style: inputBase });
    var titleInput = el('input', { type: 'text', placeholder: 'What would you like to request?', style: inputBase });
    var descInput  = el('textarea', { placeholder: 'Tell us more about what you need…', style: inputBase + ';min-height:120px;resize:vertical;' });

    wrap.appendChild(field('Registered Email', emailInput));
    wrap.appendChild(field('Title', titleInput));
    wrap.appendChild(field('Description (optional)', descInput));

    var msg = el('div', { style: 'font-size:12px;margin:8px 0;min-height:16px;' });

    var btn = el('button', {
      style: 'width:100%;padding:11px 14px;background:' + e.accent + ';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;',
    });
    btn.textContent = 'Submit Feedback';
    btn.onclick = function () {
      msg.style.color = e.muted;
      msg.textContent = 'Submitting…';
      btn.disabled = true;
      fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(self.opts.token) + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          title: titleInput.value.trim(),
          description: descInput.value.trim(),
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d, status: r.status }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok && res.d && res.d.success) {
            if (emailInput.value.trim()) {
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
  // UPVOTE — prompts for email on first use, stored in localStorage
  // ============================================================
  Widget.prototype._toggleVote = function (post) {
    var self = this;
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
    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, email: email }),
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
