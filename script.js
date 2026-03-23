/* ============================================================
   PAY SOMEONE'S BAIL — script.js
   Features:
   - Real-time search filter (name or state)
   - Sticky nav active region highlight (IntersectionObserver)
   - Mobile hamburger toggle
   - Back-to-top button
   - Collapsible regions on mobile
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     HAMBURGER / MOBILE NAV
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
  const regionSections = document.querySelectorAll('.region-section');
  const navRegionLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  if (regionSections.length && navRegionLinks.length) {
    // Build a map of section id → nav link
    const linkMap = {};
    navRegionLinks.forEach(link => {
      const id = link.getAttribute('href').replace('#', '');
      linkMap[id] = link;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.id;
          const link = linkMap[id];
          if (!link) return;
          if (entry.isIntersecting) {
            // Remove active from all, add to this one
            navRegionLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      },
      {
        rootMargin: '-60px 0px -60% 0px', // trigger when section is near top of viewport
        threshold: 0,
      }
    );

    regionSections.forEach(section => observer.observe(section));
  }

  /* ----------------------------------------------------------
     COLLAPSIBLE REGIONS (mobile)
     ---------------------------------------------------------- */
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
      if (!isMobile()) return; // only collapsible on mobile

      const isCollapsed = body.classList.toggle('collapsed');
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        header.setAttribute('aria-expanded', String(!isCollapsed));
      }
    }

    header.addEventListener('click', toggleRegion);

    // Keyboard support
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleRegion();
      }
    });

    // On resize: ensure regions are uncollapsed when switching to desktop
    window.addEventListener('resize', () => {
      if (!isMobile()) {
        body.classList.remove('collapsed');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }
    }, { passive: true });
  });

  /* ----------------------------------------------------------
     SEARCH FILTER
     ---------------------------------------------------------- */
  const searchInput  = document.getElementById('search-input');
  const searchClear  = document.getElementById('search-clear');
  const noResults    = document.getElementById('no-results');
  const allCards     = document.querySelectorAll('.fund-card');
  const allRegions   = document.querySelectorAll('.region-section');
  const allStateGroups = document.querySelectorAll('.state-group');

  if (!searchInput) return;

  function normalize(str) {
    return str.toLowerCase().trim();
  }

  function filterFunds(query) {
    const q = normalize(query);

    // Show/hide clear button
    if (searchClear) {
      searchClear.style.display = q ? 'block' : 'none';
    }

    if (!q) {
      // Reset: show everything
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

    // Filter cards
    allCards.forEach(card => {
      const name  = normalize(card.dataset.name  || '');
      const state = normalize(card.dataset.state || '');
      const matches = name.includes(q) || state.includes(q);
      card.classList.toggle('hidden', !matches);
      if (matches) totalVisible++;
    });

    // Hide state groups with no visible cards
    allStateGroups.forEach(group => {
      const visibleCards = group.querySelectorAll('.fund-card:not(.hidden)');
      group.classList.toggle('hidden', visibleCards.length === 0);
    });

    // Hide regions with no visible cards; expand visible ones
    allRegions.forEach(region => {
      const visibleCards = region.querySelectorAll('.fund-card:not(.hidden)');
      const hasResults   = visibleCards.length > 0;
      region.classList.toggle('hidden', !hasResults);

      if (hasResults) {
        // Ensure region body is visible when there are results
        const body = region.querySelector('.region-body');
        if (body) body.classList.remove('collapsed');
      }
    });

    // No results message
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

})();
