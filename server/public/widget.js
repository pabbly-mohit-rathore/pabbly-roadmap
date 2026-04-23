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
  // ============================================================
  Widget.prototype._renderShell = function () {
    var self = this, cfg = this.config;
    var dark = cfg.theme === 'dark';
    var accent = cfg.accentColor || '#059669';
    var width = cfg.widgetWidth || 460;
    var bg = dark ? '#0f172a' : '#ffffff';
    var border = dark ? '#334155' : '#e5e7eb';
    var text = dark ? '#e2e8f0' : '#111827';
    var muted = dark ? '#94a3b8' : '#6b7280';
    var softBg = dark ? '#1e293b' : '#f9fafb';

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
    //   modal   → full-height drawer (slides in from openFrom edge)
    //   popover → small floating popover dialog anchored near a corner
    var panelStyle = [];
    var from = cfg.openFrom || 'right';
    if (cfg.type === 'popover') {
      // Small floating popover — fixed max height, anchored to a corner
      panelStyle.push('width:' + Math.min(420, width) + 'px', 'max-height:560px', 'border-radius:14px');
      if (from === 'left')        panelStyle.push('left:20px', 'bottom:20px');
      else if (from === 'top')    panelStyle.push('top:20px', 'left:50%', 'transform:translateX(-50%)');
      else if (from === 'bottom') panelStyle.push('bottom:20px', 'left:50%', 'transform:translateX(-50%)');
      else                        panelStyle.push('right:20px', 'bottom:20px'); // right (default)
    } else {
      // modal → edge drawer (full height, full width on top/bottom)
      panelStyle.push('width:' + width + 'px', 'height:100vh', 'top:0');
      if (from === 'left') {
        panelStyle.push('left:0', 'border-radius:0 14px 14px 0');
      } else if (from === 'top') {
        panelStyle.push('left:0', 'right:0', 'width:auto', 'height:auto', 'max-height:88vh', 'top:0', 'border-radius:0 0 14px 14px');
      } else if (from === 'bottom') {
        panelStyle.push('left:0', 'right:0', 'width:auto', 'height:auto', 'max-height:88vh', 'bottom:0', 'top:auto', 'border-radius:14px 14px 0 0');
      } else {
        // right (default)
        panelStyle.push('right:0', 'border-radius:14px 0 0 14px');
      }
    }

    var panel = el('div', {
      style: [
        'position:fixed', panelStyle.join(';'),
        'background:' + bg, 'color:' + text,
        'box-shadow:0 24px 48px rgba(0,0,0,0.2)',
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

  Widget.prototype._postCard = function (p) {
    var self = this, e = this.els;
    var hasVoted = !!this.state.votedIds[p.id];
    var voteBg = hasVoted ? e.accent : (e.dark ? '#1e293b' : '#ffffff');
    var voteColor = hasVoted ? '#fff' : e.text;
    var tags = (p.tags || []).slice(0, 2);

    var card = el('div', {
      style: [
        'background:' + (e.dark ? '#1e293b' : '#ffffff'),
        'border:1px solid ' + e.border,
        'border-radius:12px', 'padding:14px', 'margin-bottom:10px',
        'cursor:pointer', 'transition:border-color 0.15s ease, box-shadow 0.15s ease',
      ].join(';'),
      onclick: function () { self._setView('detail', p); },
    });
    card.addEventListener('mouseenter', function () { card.style.borderColor = e.accent; card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; });
    card.addEventListener('mouseleave', function () { card.style.borderColor = e.border; card.style.boxShadow = 'none'; });

    // Top row: date + Open link
    var topRow = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;' });
    topRow.innerHTML =
      '<span style="font-size:11px;color:' + e.muted + ';">' + fmtDate(p.createdAt) + '</span>' +
      '<span style="font-size:11px;color:' + e.accent + ';font-weight:600;display:inline-flex;align-items:center;gap:3px;">' + ICON.ext + ' Open</span>';
    card.appendChild(topRow);

    // Title
    var titleEl = el('div', {
      style: 'font-size:14px;font-weight:700;color:' + e.text + ';margin-bottom:4px;line-height:1.4;',
    });
    titleEl.textContent = p.title;
    card.appendChild(titleEl);

    // Description (2-line clamp)
    if (p.description) {
      var desc = el('div', {
        style: [
          'font-size:13px', 'color:' + e.muted, 'line-height:1.5',
          'margin-bottom:10px',
          'display:-webkit-box', '-webkit-line-clamp:2', '-webkit-box-orient:vertical', 'overflow:hidden',
        ].join(';'),
      });
      desc.textContent = stripHtml(p.description);
      card.appendChild(desc);
    }

    // Bottom row: vote + board + tags + comments
    var bottom = el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' });

    // Vote chip (clickable)
    var voteChip = el('button', {
      style: [
        'display:inline-flex', 'align-items:center', 'gap:4px',
        'padding:4px 10px', 'border-radius:20px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + voteBg, 'color:' + voteColor,
        'font-size:12px', 'font-weight:600', 'cursor:pointer',
      ].join(';'),
      onclick: function (ev) { ev.stopPropagation(); self._toggleVote(p); },
    });
    voteChip.innerHTML = ICON.up + '<span>' + (p.voteCount || 0) + '</span>';
    bottom.appendChild(voteChip);

    // Board chip
    if (p.board) {
      var boardChip = el('span', {
        style: [
          'display:inline-flex', 'align-items:center', 'gap:4px',
          'padding:4px 10px', 'border-radius:20px',
          'background:' + (e.dark ? '#0f172a' : '#f3f4f6'),
          'color:' + e.muted,
          'font-size:12px', 'font-weight:500',
        ].join(';'),
      });
      boardChip.textContent = p.board.name;
      bottom.appendChild(boardChip);
    }

    // Tags
    tags.forEach(function (t) {
      var tag = t.tag || t;
      if (!tag) return;
      var c = tag.color || '#6366f1';
      var chip = el('span', {
        style: [
          'display:inline-flex', 'align-items:center',
          'padding:3px 8px', 'border-radius:4px',
          'background:' + c + '22',
          'color:' + c, 'border:1px solid ' + c,
          'font-size:11px', 'font-weight:600',
        ].join(';'),
      });
      chip.textContent = tag.name;
      bottom.appendChild(chip);
    });

    // Comments
    var cc = (p._count && p._count.comments) || 0;
    var commentChip = el('span', {
      style: [
        'display:inline-flex', 'align-items:center', 'gap:4px',
        'padding:4px 10px', 'border-radius:20px',
        'background:' + (e.dark ? '#0f172a' : '#f3f4f6'),
        'color:' + e.muted,
        'font-size:12px', 'font-weight:500',
        'margin-left:auto',
      ].join(';'),
    });
    commentChip.innerHTML = ICON.comment + '<span>' + cc + '</span>';
    bottom.appendChild(commentChip);

    card.appendChild(bottom);
    return card;
  };

  // ----------- DETAIL view -----------
  Widget.prototype._detailView = function () {
    var self = this, e = this.els;
    var wrap = el('div', { style: 'padding:20px;' });
    var post = this.state.currentPost;

    if (!post) {
      wrap.innerHTML = '<div style="text-align:center;padding:40px 0;color:' + e.muted + ';">Loading…</div>';
      return wrap;
    }

    // Date + status + open
    var topRow = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;' });
    var status = el('span', {
      style: 'font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;color:#fff;background:' + statusColor(post.status) + ';',
    });
    status.textContent = prettyStatus(post.status);
    topRow.innerHTML = '<span style="font-size:12px;color:' + e.muted + ';">' + fmtDate(post.createdAt) + '</span>';
    topRow.appendChild(status);
    wrap.appendChild(topRow);

    // Title
    var titleEl = el('h2', {
      style: 'font-size:20px;font-weight:700;color:' + e.text + ';margin:0 0 14px 0;line-height:1.3;',
    });
    titleEl.textContent = post.title;
    wrap.appendChild(titleEl);

    // Author + board
    var metaRow = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;' });
    if (post.author) {
      var authorChip = el('div', { style: 'display:flex;align-items:center;gap:6px;font-size:12px;color:' + e.muted + ';' });
      authorChip.innerHTML = '<span style="width:22px;height:22px;border-radius:50%;background:' + e.accent + ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">' +
        escapeHtml((post.author.name || '?').charAt(0).toUpperCase()) + '</span>' +
        '<span>' + escapeHtml(post.author.name) + '</span>';
      metaRow.appendChild(authorChip);
    }
    if (post.board) {
      var boardChip = el('span', {
        style: 'font-size:12px;padding:3px 8px;border-radius:6px;background:' + (e.dark ? '#1e293b' : '#f3f4f6') + ';color:' + e.muted + ';',
      });
      boardChip.textContent = post.board.name;
      metaRow.appendChild(boardChip);
    }
    wrap.appendChild(metaRow);

    // Description / content
    var contentHtml = post.content || post.description || '';
    if (contentHtml) {
      var contentEl = el('div', {
        style: 'font-size:14px;color:' + e.text + ';line-height:1.7;padding:14px;background:' + (e.dark ? '#1e293b' : '#ffffff') + ';border:1px solid ' + e.border + ';border-radius:10px;margin-bottom:18px;',
      });
      // Show rich content if present; otherwise stripped text
      if (post.content && /<[a-z][^>]*>/i.test(post.content)) {
        contentEl.innerHTML = post.content;
      } else {
        contentEl.textContent = stripHtml(contentHtml);
      }
      wrap.appendChild(contentEl);
    }

    // Tags
    if (post.tags && post.tags.length > 0) {
      var tagsWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;' });
      post.tags.forEach(function (t) {
        var tag = t.tag || t;
        if (!tag) return;
        var c = tag.color || '#6366f1';
        var chip = el('span', {
          style: 'padding:3px 10px;border-radius:4px;background:' + c + '22;color:' + c + ';border:1px solid ' + c + ';font-size:11px;font-weight:600;',
        });
        chip.textContent = tag.name;
        tagsWrap.appendChild(chip);
      });
      wrap.appendChild(tagsWrap);
    }

    // Upvote + comments count row
    var actions = el('div', { style: 'display:flex;align-items:center;gap:12px;padding-top:14px;border-top:1px solid ' + e.border + ';' });
    var hasVoted = !!this.state.votedIds[post.id];
    var voteBtn = el('button', {
      style: [
        'display:inline-flex', 'align-items:center', 'gap:6px',
        'padding:8px 16px', 'border-radius:8px',
        'border:1px solid ' + (hasVoted ? e.accent : e.border),
        'background:' + (hasVoted ? e.accent : (e.dark ? '#1e293b' : '#fff')),
        'color:' + (hasVoted ? '#fff' : e.text),
        'font-size:13px', 'font-weight:600', 'cursor:pointer',
      ].join(';'),
      onclick: function () { self._toggleVote(post); },
    });
    voteBtn.innerHTML = ICON.up + '<span>' + (post.voteCount || 0) + ' Upvotes</span>';
    actions.appendChild(voteBtn);

    var cc = (post._count && post._count.comments) || post.commentCount || 0;
    var commentBadge = el('div', {
      style: 'display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:' + (e.dark ? '#1e293b' : '#f3f4f6') + ';color:' + e.muted + ';font-size:13px;font-weight:500;',
    });
    commentBadge.innerHTML = ICON.comment + '<span>' + cc + ' Comments</span>';
    actions.appendChild(commentBadge);

    var openLink = el('a', {
      href: APP_URL + '/user/posts/' + (post.slug || post.id),
      target: '_blank',
      rel: 'noopener',
      style: 'margin-left:auto;color:' + e.accent + ';font-size:12px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;',
    });
    openLink.innerHTML = 'Open full view ' + ICON.ext;
    actions.appendChild(openLink);

    wrap.appendChild(actions);
    return wrap;
  };

  // ----------- NEW POST view -----------
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

    var nameInput  = el('input', { type: 'text', placeholder: 'Your name', style: inputBase });
    var emailInput = el('input', { type: 'email', placeholder: 'you@example.com', value: self.state.voterEmail || '', style: inputBase });
    var titleInput = el('input', { type: 'text', placeholder: 'What would you like to request?', style: inputBase });
    var descInput  = el('textarea', { placeholder: 'Tell us more about what you need…', style: inputBase + ';min-height:110px;resize:vertical;' });

    wrap.appendChild(field('Your Name', nameInput));
    wrap.appendChild(field('Email', emailInput));
    wrap.appendChild(field('Title', titleInput));
    wrap.appendChild(field('Description (optional)', descInput));

    var msg = el('div', { style: 'font-size:12px;margin:8px 0;color:' + e.muted + ';min-height:16px;' });

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
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          title: titleInput.value.trim(),
          description: descInput.value.trim(),
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
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
