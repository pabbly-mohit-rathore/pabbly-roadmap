/*!
 * Pabbly Roadmap Embed Widget
 *
 * Self-contained vanilla JS. Served from the backend at /widget.js.
 * Third-party sites embed this to render a feedback widget that talks
 * back to this roadmap's public API endpoints.
 *
 * Usage in host page:
 *   <script src="https://pabbly-roadmap.onrender.com/widget.js"></script>
 *   <script>
 *     const w = new window.PabblyRoadmapWidget({ token: "XXXX" });
 *     w.init();
 *   </script>
 */
(function () {
  'use strict';
  if (window.PabblyRoadmapWidget) return; // idempotent

  // Derive API base URL from the <script> tag that loaded this file.
  var scriptEl = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var scriptSrc = (scriptEl && scriptEl.src) || '';
  var API_BASE = scriptSrc.replace(/\/widget\.js.*$/, '') || window.location.origin;

  // ---------- helpers ----------
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
  function prettyStatus(s) {
    var map = {
      under_review: 'Under Review', planned: 'Planned',
      in_progress: 'In Progress', live: 'Live', hold: 'On Hold',
    };
    return map[s] || s;
  }
  function statusColor(s) {
    var map = {
      under_review: '#eab308', planned: '#a855f7', in_progress: '#f97316',
      live: '#22c55e', hold: '#ef4444',
    };
    return map[s] || '#6b7280';
  }

  // ---------- constructor ----------
  function Widget(opts) {
    this.opts = opts || {};
    this.config = null;
    this.posts = [];
    this.isOpen = false;
    this.activeTab = 'posts';
    this.panelEl = null;
    this.backdropEl = null;
    this.triggerEl = null;
  }

  Widget.prototype.init = function () {
    var self = this;
    var token = this.opts.token;
    if (!token) {
      console.error('[PabblyRoadmapWidget] token is required');
      return;
    }
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

  // Inject the default floating trigger button unless hidden / custom selector is used
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
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        'transition:transform 0.15s ease',
      ].join(';'),
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>',
      onclick: function () { self.open(); },
    });
    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });
    document.body.appendChild(btn);
    this.triggerEl = btn;
  };

  Widget.prototype.open = function () {
    if (this.isOpen) return;
    this.isOpen = true;
    this.activeTab = this.config.showSubmissionFormOnly ? 'submit' : 'posts';
    this._render();
    if (this.activeTab === 'posts') this._loadPosts();
  };

  Widget.prototype.close = function () {
    document.body.style.overflow = '';
    this.isOpen = false;
    if (this.backdropEl && this.backdropEl.parentNode) this.backdropEl.parentNode.removeChild(this.backdropEl);
    this.backdropEl = null;
    this.panelEl = null;
  };

  // Update only the active tab styling + body content — does NOT re-render
  // the full shell (which would stack another backdrop on top each click).
  Widget.prototype._setTab = function (tab) {
    this.activeTab = tab;
    if (this.panelEl) {
      var dark = this.config.theme === 'dark';
      var accent = this.config.accentColor || '#059669';
      var muted = dark ? '#94a3b8' : '#6b7280';
      var btns = this.panelEl.querySelectorAll('[data-prw-tab]');
      for (var i = 0; i < btns.length; i++) {
        var active = btns[i].getAttribute('data-prw-tab') === tab;
        btns[i].style.color = active ? accent : muted;
        btns[i].style.borderBottom = '2px solid ' + (active ? accent : 'transparent');
      }
    }
    this._renderBody();
    if (tab === 'posts') this._loadPosts();
  };

  // Render the widget shell
  Widget.prototype._render = function () {
    var self = this;
    var cfg = this.config;
    var dark = cfg.theme === 'dark';
    var accent = cfg.accentColor || '#059669';
    var width = cfg.widgetWidth || 400;
    var bg = dark ? '#0f172a' : '#ffffff';
    var border = dark ? '#334155' : '#e5e7eb';
    var text = dark ? '#e2e8f0' : '#111827';
    var muted = dark ? '#94a3b8' : '#6b7280';
    var softBg = dark ? '#1e293b' : '#f9fafb';

    // Backdrop
    this.backdropEl = el('div', {
      style: [
        'position:fixed', 'inset:0', 'z-index:2147483600',
        'background:rgba(0,0,0,0.35)',
      ].join(';'),
      onclick: function (e) { if (e.target === self.backdropEl) self.close(); },
    });

    // Panel
    var panelStyle = [];
    if (cfg.type === 'modal') {
      panelStyle.push('top:50%', 'left:50%', 'transform:translate(-50%,-50%)');
      panelStyle.push('width:' + Math.min(540, width) + 'px', 'max-height:85vh');
    } else {
      // popover — openFrom = left/right/top/bottom
      var from = cfg.openFrom || 'right';
      panelStyle.push('width:' + width + 'px');
      if (from === 'right')      panelStyle.push('right:20px', 'top:20px', 'bottom:20px');
      else if (from === 'left')  panelStyle.push('left:20px', 'top:20px', 'bottom:20px');
      else if (from === 'top')   panelStyle.push('top:20px', 'left:50%', 'transform:translateX(-50%)', 'max-height:85vh');
      else                       panelStyle.push('bottom:20px', 'left:50%', 'transform:translateX(-50%)', 'max-height:85vh');
    }
    var panel = el('div', {
      style: [
        'position:absolute', panelStyle.join(';'),
        'background:' + bg, 'color:' + text,
        'border:1px solid ' + border, 'border-radius:14px',
        'box-shadow:0 24px 48px rgba(0,0,0,0.25)',
        'display:flex', 'flex-direction:column', 'overflow:hidden',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        'font-size:14px',
      ].join(';'),
    });

    // Header
    var header = el('div', {
      style: [
        'padding:16px 18px', 'border-bottom:1px solid ' + border,
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'background:' + accent, 'color:#fff',
      ].join(';'),
    });
    header.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>' +
        '</div>' +
        '<div style="font-size:15px;font-weight:700;">' + escapeHtml(cfg.name || 'Feedback') + '</div>' +
      '</div>';
    var closeBtn = el('button', {
      'aria-label': 'Close',
      style: 'background:rgba(255,255,255,0.2);border:none;color:#fff;padding:6px;border-radius:6px;cursor:pointer;display:flex;',
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      onclick: function () { self.close(); },
    });
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Tabs (only if not submit-only)
    if (!cfg.showSubmissionFormOnly) {
      var tabsEl = el('div', {
        style: 'display:flex;border-bottom:1px solid ' + border + ';background:' + softBg + ';',
      });
      var tabs = [{ k: 'posts', label: 'Feature Requests' }, { k: 'submit', label: 'Submit' }];
      tabs.forEach(function (t) {
        var isActive = self.activeTab === t.k;
        var btn = el('button', {
          'data-prw-tab': t.k,
          style: [
            'flex:1', 'padding:10px 12px', 'font-size:12px', 'font-weight:600',
            'background:transparent', 'border:none', 'cursor:pointer',
            'color:' + (isActive ? accent : muted),
            'border-bottom:2px solid ' + (isActive ? accent : 'transparent'),
          ].join(';'),
          onclick: (function (tabKey) {
            return function () { self._setTab(tabKey); };
          })(t.k),
        });
        btn.textContent = t.label;
        tabsEl.appendChild(btn);
      });
      panel.appendChild(tabsEl);
    }

    // Body
    var body = el('div', {
      id: 'prw-body',
      style: 'padding:18px;overflow-y:auto;flex:1;min-height:240px;',
    });
    panel.appendChild(body);

    // Footer
    var footer = el('div', {
      style: 'padding:10px 18px;border-top:1px solid ' + border + ';font-size:11px;color:' + muted + ';text-align:center;',
      html: 'Powered by <span style="color:' + accent + ';font-weight:600;">Pabbly Roadmap</span>',
    });
    panel.appendChild(footer);

    this.backdropEl.appendChild(panel);
    this.panelEl = panel;
    document.body.appendChild(this.backdropEl);
    document.body.style.overflow = 'hidden';

    // Render body content
    this._renderBody();
  };

  Widget.prototype._renderBody = function () {
    if (!this.panelEl) return;
    var body = this.panelEl.querySelector('#prw-body');
    if (!body) return;
    body.innerHTML = '';
    if (this.activeTab === 'posts') body.appendChild(this._postsView());
    else body.appendChild(this._submitView());
  };

  Widget.prototype._postsView = function () {
    var self = this;
    var dark = this.config.theme === 'dark';
    var accent = this.config.accentColor || '#059669';
    var text = dark ? '#e2e8f0' : '#111827';
    var muted = dark ? '#94a3b8' : '#6b7280';
    var border = dark ? '#334155' : '#e5e7eb';
    var softBg = dark ? '#1e293b' : '#f9fafb';

    var wrap = el('div');
    if (this.posts === 'loading') {
      wrap.innerHTML = '<div style="text-align:center;padding:32px 0;color:' + muted + ';">Loading…</div>';
      return wrap;
    }
    if (!this.posts.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:32px 0;color:' + muted + ';">No feature requests yet. Be the first to submit!</div>';
      return wrap;
    }
    this.posts.forEach(function (p) {
      var row = el('div', {
        style: [
          'display:flex', 'align-items:flex-start', 'gap:12px', 'padding:12px',
          'border:1px solid ' + border, 'border-radius:10px', 'margin-bottom:8px',
        ].join(';'),
      });
      row.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;min-width:40px;padding:6px 8px;border:1px solid ' + border + ';border-radius:6px;background:' + softBg + ';">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + accent + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>' +
          '<span style="font-size:12px;font-weight:700;color:' + text + ';margin-top:2px;">' + (p.voteCount || 0) + '</span>' +
        '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:13px;font-weight:600;color:' + text + ';margin-bottom:4px;">' + escapeHtml(p.title) + '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<span style="font-size:11px;color:#fff;background:' + statusColor(p.status) + ';padding:2px 6px;border-radius:4px;">' + prettyStatus(p.status) + '</span>' +
            (p.board ? '<span style="font-size:11px;color:' + muted + ';">' + escapeHtml(p.board.name) + '</span>' : '') +
            '<span style="font-size:11px;color:' + muted + ';">' + (p._count && p._count.comments || 0) + ' comments</span>' +
          '</div>' +
        '</div>';
      wrap.appendChild(row);
    });
    return wrap;
  };

  Widget.prototype._submitView = function () {
    var self = this;
    var dark = this.config.theme === 'dark';
    var accent = this.config.accentColor || '#059669';
    var text = dark ? '#e2e8f0' : '#111827';
    var muted = dark ? '#94a3b8' : '#6b7280';
    var border = dark ? '#334155' : '#e5e7eb';
    var softBg = dark ? '#1e293b' : '#f9fafb';

    var wrap = el('div');
    var inputStyle = [
      'width:100%', 'padding:10px 12px',
      'border:1px solid ' + border, 'border-radius:8px',
      'font-size:13px', 'background:' + (dark ? '#0f172a' : '#fff'),
      'color:' + text, 'outline:none', 'box-sizing:border-box',
      'font-family:inherit',
    ].join(';');
    var labelStyle = 'font-size:11px;color:' + muted + ';font-weight:600;display:block;margin-bottom:4px;';
    var fieldWrap = 'margin-bottom:12px;';

    function field(label, inputNode) {
      var w = el('div', { style: fieldWrap });
      var l = el('label', { style: labelStyle });
      l.textContent = label;
      w.appendChild(l);
      w.appendChild(inputNode);
      return w;
    }

    var nameInput  = el('input', { type: 'text', placeholder: 'Your name', style: inputStyle });
    var emailInput = el('input', { type: 'email', placeholder: 'you@example.com', style: inputStyle });
    var titleInput = el('input', { type: 'text', placeholder: 'What would you like to request?', style: inputStyle });
    var descInput  = el('textarea', { placeholder: 'Tell us more about what you need…', style: inputStyle + ';min-height:90px;resize:vertical;' });

    wrap.appendChild(field('Your Name', nameInput));
    wrap.appendChild(field('Email', emailInput));
    wrap.appendChild(field('Title', titleInput));
    wrap.appendChild(field('Description (optional)', descInput));

    var msg = el('div', { style: 'font-size:12px;margin:8px 0;color:' + muted + ';min-height:16px;' });

    var btn = el('button', {
      style: [
        'width:100%', 'padding:10px 14px',
        'background:' + accent, 'color:#fff',
        'border:none', 'border-radius:8px',
        'font-size:13px', 'font-weight:600', 'cursor:pointer',
      ].join(';'),
    });
    btn.textContent = 'Submit Feedback';
    btn.onclick = function () {
      msg.style.color = muted;
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
            wrap.innerHTML =
              '<div style="text-align:center;padding:28px 12px;">' +
                '<div style="width:48px;height:48px;border-radius:50%;background:' + accent + ';margin:0 auto 14px;display:flex;align-items:center;justify-content:center;color:#fff;">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</div>' +
                '<div style="font-size:16px;font-weight:700;color:' + text + ';margin-bottom:6px;">Thanks for your feedback!</div>' +
                '<div style="font-size:13px;color:' + muted + ';">We\'ll review it and get back to you.</div>' +
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

  Widget.prototype._loadPosts = function () {
    var self = this;
    this.posts = 'loading';
    this._renderBody();
    fetch(API_BASE + '/api/embed-widgets/public/' + encodeURIComponent(this.opts.token) + '/posts')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        self.posts = (data && data.data && data.data.posts) || [];
        self._renderBody();
      })
      .catch(function () {
        self.posts = [];
        self._renderBody();
      });
  };

  window.PabblyRoadmapWidget = Widget;
})();
