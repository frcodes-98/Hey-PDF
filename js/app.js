(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function initTheme() {
    var key = (DocForge.config && DocForge.config.themeStorageKey) || 'docforge-theme';
    var saved = null;
    try {
      saved = localStorage.getItem(key);
    } catch (e) {}
    var theme = saved || 'light';
    applyTheme(theme);

    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try {
          localStorage.setItem(key, next);
        } catch (e) {}
      });
    }
  }

  function depthFromBody() {
    var depth = document.body && document.body.getAttribute('data-depth');
    return depth ? Number(depth) : 0;
  }

  function boot() {
    var depth = depthFromBody();
    initTheme();

    if (DocForge.ui && DocForge.ui.icons) DocForge.ui.icons.paint(document);

    var toolsMenu = document.querySelector('[data-tools-menu]');
    if (toolsMenu && DocForge.nav) DocForge.nav.renderToolsMenu(toolsMenu, depth);

    var footerGroups = document.querySelector('[data-footer-groups]');
    if (footerGroups && DocForge.nav) DocForge.nav.renderFooterGroups(footerGroups, depth);

    var homeGrid = document.querySelector('[data-home-tools]');
    if (homeGrid && DocForge.nav) DocForge.nav.renderHomeGrid(homeGrid);

    var related = document.querySelector('[data-related-tools]');
    var toolId = document.body.getAttribute('data-tool');
    if (related && toolId && DocForge.nav) DocForge.nav.renderRelated(related, toolId, depth);

    if (DocForge.nav) {
      DocForge.nav.bindToolsMenu();
      DocForge.nav.markActive(document);
    }

    var brandNodes = document.querySelectorAll('[data-brand]');
    Array.prototype.forEach.call(brandNodes, function (node) {
      node.textContent = (DocForge.config && DocForge.config.brand) || 'DocForge';
    });
  }

  var booted = false;

  function start() {
    if (booted || !document.body) return;
    booted = true;
    boot();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('DOMContentLoaded', start);

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
