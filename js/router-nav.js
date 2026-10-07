(function (global) {
  'use strict';
  var DocForge = global.DocForge || {};

  function currentFile() {
    var path = global.location.pathname || '';
    var parts = path.split('/');
    return (parts[parts.length - 1] || 'index.html').toLowerCase();
  }

  function hrefFile(href) {
    if (!href) return '';
    var clean = href.split('?')[0].split('#')[0];
    var parts = clean.split('/');
    return (parts[parts.length - 1] || '').toLowerCase();
  }

  DocForge.nav = {
    markActive: function (root) {
      root = root || document;
      var file = currentFile();
      Array.prototype.forEach.call(root.querySelectorAll('[data-nav]'), function (link) {
        var href = link.getAttribute('href') || '';
        var match = hrefFile(href) === file;
        link.classList.toggle('is-active', match);
        if (match) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    },
    bindToolsMenu: function () {
      var dropdown = document.querySelector('[data-tools-dropdown]');
      if (!dropdown) return;
      var toggle = dropdown.querySelector('[data-tools-toggle]');
      if (!toggle) return;

      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        dropdown.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', dropdown.classList.contains('is-open') ? 'true' : 'false');
      });

      document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          dropdown.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    },
    renderToolsMenu: function (container, depth) {
      if (!container || !DocForge.config) return;
      depth = depth || 0;
      var prefix = '';
      for (var i = 0; i < depth; i++) prefix += '../';
      var byGroup = DocForge.config.toolsByGroup();
      container.innerHTML = DocForge.config.groups
        .map(function (group) {
          var tools = byGroup[group.id] || [];
          if (!tools.length) return '';
          return (
            '<div>' +
            '<div class="nav__group-label">' +
            group.label +
            '</div>' +
            tools
              .map(function (tool) {
                return (
                  '<a href="' +
                  prefix +
                  tool.path +
                  '" data-nav>' +
                  tool.title +
                  '</a>'
                );
              })
              .join('') +
            '</div>'
          );
        })
        .join('');
    },
    renderFooterGroups: function (container, depth) {
      if (!container || !DocForge.config) return;
      depth = depth || 0;
      var prefix = '';
      for (var i = 0; i < depth; i++) prefix += '../';
      var byGroup = DocForge.config.toolsByGroup();
      container.innerHTML = DocForge.config.groups
        .map(function (group) {
          var tools = byGroup[group.id] || [];
          return (
            '<div>' +
            '<h3>' +
            group.label +
            '</h3>' +
            '<ul>' +
            tools
              .map(function (tool) {
                return (
                  '<li><a href="' +
                  prefix +
                  tool.path +
                  '">' +
                  tool.title +
                  '</a></li>'
                );
              })
              .join('') +
            '</ul></div>'
          );
        })
        .join('');
    },
    renderHomeGrid: function (container) {
      if (!container || !DocForge.config) return;
      var byGroup = DocForge.config.toolsByGroup();
      var html = '';
      var index = 0;
      DocForge.config.groups.forEach(function (group) {
        var tools = byGroup[group.id] || [];
        if (!tools.length) return;
        html += '<div class="group-label">' + group.label + '</div>';
        tools.forEach(function (tool) {
          html +=
            '<a class="tool-card" style="--i:' +
            index +
            '" href="' +
            tool.path +
            '">' +
            '<div class="tool-card__icon" data-icon="' +
            tool.icon +
            '"></div>' +
            '<div class="tool-card__title">' +
            tool.title +
            '</div>' +
            '<div class="tool-card__desc">' +
            tool.short +
            '</div>' +
            '</a>';
          index += 1;
        });
      });
      container.innerHTML = html;
      if (DocForge.ui && DocForge.ui.icons) DocForge.ui.icons.paint(container);
    },
    renderRelated: function (container, toolId, depth) {
      if (!container || !DocForge.config) return;
      var tool = DocForge.config.getTool(toolId);
      if (!tool) return;
      depth = typeof depth === 'number' ? depth : 2;
      var prefix = '';
      for (var i = 0; i < depth; i++) prefix += '../';
      var related = (tool.related || [])
        .map(function (id) {
          return DocForge.config.getTool(id);
        })
        .filter(Boolean);
      container.innerHTML = related
        .map(function (item, index) {
          return (
            '<a class="tool-card" style="--i:' +
            index +
            '" href="' +
            prefix +
            item.path +
            '">' +
            '<div class="tool-card__icon" data-icon="' +
            item.icon +
            '"></div>' +
            '<div class="tool-card__title">' +
            item.title +
            '</div>' +
            '<div class="tool-card__desc">' +
            item.short +
            '</div>' +
            '</a>'
          );
        })
        .join('');
      if (DocForge.ui && DocForge.ui.icons) DocForge.ui.icons.paint(container);
    }
  };

  global.DocForge = DocForge;
})(typeof window !== 'undefined' ? window : globalThis);
