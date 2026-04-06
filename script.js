/* ============================================================
   PAY SOMEONE'S BAIL — script.js
   Features:
   - Fund directory rendered dynamically from immigration-bail-funds.json
   - Real-time search filter (name or state)
   - Sticky nav active region highlight (IntersectionObserver)
   - Mobile hamburger toggle
   - Back-to-top button
   - Collapsible regions on mobile
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     FUND DIRECTORY — region config & state→region map
     ---------------------------------------------------------- */

  const REGIONS = [
    { id: 'national',  label: 'National',  emoji: '&#127758;' },
    { id: 'west',      label: 'West',      emoji: '&#127774;' },
    { id: 'midwest',   label: 'Midwest',   emoji: '&#127807;' },
    { id: 'northeast', label: 'Northeast', emoji: '&#127961;&#65039;' },
    { id: 'southeast', label: 'Southeast', emoji: '&#127803;' },
    { id: 'southwest', label: 'Southwest', emoji: '&#127774;' },
  ];

  const STATE_REGION = {
    'National':      'national',
    'Arizona':       'west',
    'California':    'west',
    'Colorado':      'west',
    'Nevada':        'west',
    'New Mexico':    'west',
    'Washington':    'west',
    'Illinois':      'midwest',
    'Indiana':       'midwest',
    'Iowa':          'midwest',
    'Kentucky':      'midwest',
    'Michigan':      'midwest',
    'Wisconsin':     'midwest',
    'Massachusetts': 'northeast',
    'New Hampshire': 'northeast',
    'New Jersey':    'northeast',
    'New York':      'northeast',
    'Pennsylvania':  'northeast',
    'Rhode Island':  'northeast',
    'Vermont':       'northeast',
    'Georgia':       'southeast',
    'Virginia':      'southeast',
    'Texas':         'southwest',
  };

  /* ----------------------------------------------------------
     FUND DIRECTORY — HTML rendering helpers
     ---------------------------------------------------------- */

  function esc(val) {
    return String(val == null ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildFundCard(fund) {
    const stateLower = (fund.state || '').toLowerCase();
    const tagLabel   = fund.stateAbbr || fund.state || '';

    let actionsHtml;
    if (fund.website) {
      const url = esc(fund.website);
      actionsHtml =
        `<a href="${url}" class="btn btn-donate" target="_blank" rel="noopener noreferrer">Donate Now</a>` +
        `<a href="${url}" class="btn btn-learn" target="_blank" rel="noopener noreferrer">Learn More</a>`;
    } else {
      const q = encodeURIComponent((fund.name || '') + ' immigration bond fund');
      actionsHtml =
        `<a href="https://www.google.com/search?q=${q}" class="btn btn-search" target="_blank" rel="noopener noreferrer">Search Online</a>`;
    }

    const descHtml = fund.description
      ? `<p class="fund-desc">${esc(fund.description)}</p>` : '';

    return (
      `<article class="fund-card"` +
      ` data-name="${esc(fund.name)}"` +
      ` data-state="${esc(stateLower)}"` +
      ` data-url-status="${fund.website ? 'confirmed' : 'unconfirmed'}">` +
      `<div class="fund-name">${esc(fund.name)}</div>` +
      `<span class="fund-tag">${esc(tagLabel)}</span>` +
      descHtml +
      `<div class="fund-actions">${actionsHtml}</div>` +
      `</article>`
    );
  }

  function buildRegion(region, funds) {
    if (!funds || funds.length === 0) return '';

    // Group funds by state, preserving order of first appearance
    const stateOrder = [];
    const stateMap   = {};
    funds.forEach(fund => {
      const s = fund.state || 'Unknown';
      if (!stateMap[s]) { stateMap[s] = []; stateOrder.push(s); }
      stateMap[s].push(fund);
    });

    const stateGroupsHtml = stateOrder.map(stateName => {
      const heading = stateName === 'National' ? 'Nationwide Coverage' : stateName;
      const cards   = stateMap[stateName].map(buildFundCard).join('');
      return (
        `<div class="state-group">` +
        `<h3>${esc(heading)}</h3>` +
        `<div class="fund-grid">${cards}</div>` +
        `</div>`
      );
    }).join('');

    const id    = esc(region.id);
    const label = esc(region.label);
    return (
      `<section class="region-section" id="${id}" aria-labelledby="${id}-heading">` +
        `<div class="region-header" tabindex="0" role="button" aria-controls="${id}-body">` +
          `<h2 id="${id}-heading">${region.emoji} ${label}</h2>` +
          `<button class="region-toggle" aria-expanded="true" aria-controls="${id}-body"` +
          ` aria-label="Collapse ${label} region" tabindex="-1">&#9660;</button>` +
        `</div>` +
        `<div class="region-body" id="${id}-body">` +
          stateGroupsHtml +
        `</div>` +
      `</section>`
    );
  }

  function renderDirectory(funds) {
    // Bucket each fund into its region
    const regionFunds = {};
    REGIONS.forEach(r => { regionFunds[r.id] = []; });

    funds.forEach(fund => {
      const rid = STATE_REGION[fund.state] || 'national';
      if (regionFunds[rid]) regionFunds[rid].push(fund);
    });

    const html = REGIONS
      .map(r => buildRegion(r, regionFunds[r.id]))
      .filter(Boolean)
      .join('');

    const root = document.getElementById('fund-directory-root');
    if (root) root.innerHTML = html;
  }

  /* ----------------------------------------------------------
     FUND DIRECTORY — fetch, render, then init interactive features
     ---------------------------------------------------------- */

  async function loadFunds() {
    const root = document.getElementById('fund-directory-root');
    if (!root) return;

    try {
      const resp = await fetch('immigration-bail-funds.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const funds = await resp.json();
      renderDirectory(funds);
    } catch (err) {
      console.error('Failed to load fund directory:', err);
      root.innerHTML =
        '<p style="text-align:center;padding:2rem 1rem;color:#666">' +
        'Unable to load fund directory. Please refresh the page.</p>';
    }

    // These features query .fund-card / .region-section elements,
    // so they must run after the directory is in the DOM.
    initCollapsibleRegions();
    initStickyNav();
    initSearch();
  }

  /* ----------------------------------------------------------
     HAMBURGER / MOBILE NAV
     (does not depend on fund cards — init immediately)
     ---------------------------------------------------------- */

  const hamburger = document.querySelector('.hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close nav when a link is tapped on mobile
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----------------------------------------------------------
     BACK TO TOP
     (does not depend on fund cards — init immediately)
     ---------------------------------------------------------- */

  const backToTop = document.getElementById('back-to-top');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ----------------------------------------------------------
     STICKY NAV — active region highlight
     ---------------------------------------------------------- */

  function initStickyNav() {
    const regionSections = document.querySelectorAll('.region-section');
    const navRegionLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    if (!regionSections.length || !navRegionLinks.length) return;

    const linkMap = {};
    navRegionLinks.forEach(link => {
      const id = link.getAttribute('href').replace('#', '');
      linkMap[id] = link;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id   = entry.target.id;
          const link = linkMap[id];
          if (!link) return;
          if (entry.isIntersecting) {
            navRegionLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      },
      {
        rootMargin: '-60px 0px -60% 0px',
        threshold: 0,
      }
    );

    regionSections.forEach(section => observer.observe(section));
  }

  /* ----------------------------------------------------------
     COLLAPSIBLE REGIONS (mobile)
     ---------------------------------------------------------- */

  function initCollapsibleRegions() {
    const regionHeaders = document.querySelectorAll('.region-header');

    regionHeaders.forEach(header => {
      const bodyId = header.getAttribute('aria-controls');
      const body   = bodyId ? document.getElementById(bodyId) : null;
      const toggle = header.querySelector('.region-toggle');

      if (!body) return;

      function isMobile() {
        return window.innerWidth <= 640;
      }

      function toggleRegion() {
        if (!isMobile()) return;

        const isCollapsed = body.classList.toggle('collapsed');
        if (toggle) {
          toggle.setAttribute('aria-expanded', String(!isCollapsed));
          header.setAttribute('aria-expanded', String(!isCollapsed));
        }
      }

      header.addEventListener('click', toggleRegion);

      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleRegion();
        }
      });

      window.addEventListener('resize', () => {
        if (!isMobile()) {
          body.classList.remove('collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
      }, { passive: true });
    });
  }

  /* ----------------------------------------------------------
     SEARCH FILTER
     ---------------------------------------------------------- */

  function initSearch() {
    const searchInput    = document.getElementById('search-input');
    const searchClear    = document.getElementById('search-clear');
    const noResults      = document.getElementById('no-results');
    const allCards       = document.querySelectorAll('.fund-card');
    const allRegions     = document.querySelectorAll('.region-section');
    const allStateGroups = document.querySelectorAll('.state-group');

    if (!searchInput) return;

    function normalize(str) {
      return str.toLowerCase().trim();
    }

    function filterFunds(query) {
      const q = normalize(query);

      if (searchClear) {
        searchClear.style.display = q ? 'block' : 'none';
      }

      if (!q) {
        allCards.forEach(card => card.classList.remove('hidden'));
        allStateGroups.forEach(group => group.classList.remove('hidden'));
        allRegions.forEach(region => region.classList.remove('hidden'));
        if (noResults) noResults.style.display = 'none';

        // Re-expand collapsed regions on mobile after clear
        allRegions.forEach(region => {
          const body = region.querySelector('.region-body');
          if (body) body.classList.remove('collapsed');
          const toggle = region.querySelector('.region-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');
        });

        return;
      }

      let totalVisible = 0;

      allCards.forEach(card => {
        const name    = normalize(card.dataset.name  || '');
        const state   = normalize(card.dataset.state || '');
        const matches = name.includes(q) || state.includes(q);
        card.classList.toggle('hidden', !matches);
        if (matches) totalVisible++;
      });

      allStateGroups.forEach(group => {
        const visibleCards = group.querySelectorAll('.fund-card:not(.hidden)');
        group.classList.toggle('hidden', visibleCards.length === 0);
      });

      allRegions.forEach(region => {
        const visibleCards = region.querySelectorAll('.fund-card:not(.hidden)');
        const hasResults   = visibleCards.length > 0;
        region.classList.toggle('hidden', !hasResults);

        if (hasResults) {
          const body = region.querySelector('.region-body');
          if (body) body.classList.remove('collapsed');
        }
      });

      if (noResults) {
        noResults.style.display = totalVisible === 0 ? 'block' : 'none';
      }
    }

    searchInput.addEventListener('input', () => {
      filterFunds(searchInput.value);
    });

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        filterFunds('');
        searchInput.focus();
      });
    }

    // Keyboard shortcut: '/' focuses search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ----------------------------------------------------------
     BOOTSTRAP
     ---------------------------------------------------------- */

  loadFunds();

})();
