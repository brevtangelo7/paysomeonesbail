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
    'Connecticut':   'northeast',
    'Maine':         'northeast',
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

  const ABBR_TO_NAME = {
    AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas',
    CA:'California', CO:'Colorado', CT:'Connecticut', DE:'Delaware',
    FL:'Florida', GA:'Georgia', HI:'Hawaii', ID:'Idaho',
    IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
    KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland',
    MA:'Massachusetts', MI:'Michigan', MN:'Minnesota', MS:'Mississippi',
    MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada',
    NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York',
    NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
    OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
    SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah',
    VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia',
    WI:'Wisconsin', WY:'Wyoming', DC:'District of Columbia',
  };

  /* ----------------------------------------------------------
     FUND LOGOS — map fund name → local image file
     ---------------------------------------------------------- */

  const FUND_LOGOS = {
    'Black Immigrants Bail Fund':
      { src: 'fundimages/blackimmigrantsbailfund.webp' },
    'LGBTQ Freedom Fund':
      { src: 'fundimages/lgbtqfund.webp' },
    'Pima Monthly Meeting Immigration Bond Fund':
      { src: 'fundimages/pimafund.png' },
    'CLUE Detained Immigrant Bond Fund':
      { src: 'fundimages/CLUE-LOGOSET-24.png' },
    'NorCal Resist Sacramento Region Bond Fund':
      { src: 'fundimages/norcal-resist-logo-art_2.jpg' },
    'Orange County Justice Fund':
      { src: 'fundimages/OC-Justice-Fund-logo-1536x1536-1-e1748369932676-1.png' },
    'Long Beach Justice Fund':
      { src: 'fundimages/ORALE_Full Color 1.avif' },
    'Familias Reunidas Immigration Bond Fund':
      { src: 'fundimages/familias reunidas.png' },
    'San Diego IRC \u2014 Borderlands Get Free Fund':
      { src: 'fundimages/SDIRC-LOGO-HORIZ_copy.png' },
    'Georgia Immigration Bond Fund':
      { src: 'fundimages/small-glahr-white-vector.png', dark: true },
    'Midwest Immigration Bond Fund':
      { src: 'fundimages/MIBF-Horizontal+logo-RGB-Full+color+yellow.webp' },
    'Prairielands Freedom Fund':
      { src: 'fundimages/prairielands freedom fund.webp' },
    'Connecticut Bail Fund':
      { src: 'fundimages/connecticut bail fund.png' },
    'Mainers for Humane Immigration \u2014 Freedom Fund':
      { src: 'fundimages/MHI+Banner+White+Font+(1).webp', dark: true },
    'Beyond Bail & Legal Defense Fund':
      { src: 'fundimages/beyondboston.webp' },
    'Las Vegas Family Unity Bond Fund':
      { src: 'fundimages/lasvegasfamilyunity bond fund.webp' },
    'The Fronterizx Fianza Fund':
      { src: 'fundimages/Contigo-logo-white.webp', dark: true },
    'AMOR Bond Fund':
      { src: 'fundimages/AMOR-Logo2en_Red.png' },
    'Community Fund for Bond and Legal Support':
      { src: 'fundimages/sanctuary philadelpha fund.png' },
    'Central Virginia Community Support Fund':
      { src: 'fundimages/central virgina bond fund.webp' },
  };

  function getFundLogoHtml(fund) {
    const entry = FUND_LOGOS[fund.name];
    if (!entry) return '';
    const darkClass = entry.dark ? ' fund-logo-zone--dark' : '';
    return `<div class="fund-logo-zone${darkClass}">` +
      `<img src="${esc(entry.src)}" alt="${esc(fund.name)} logo" loading="lazy"` +
      ` onerror="this.parentElement.style.display='none'">` +
      `</div>`;
  }

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

  function buildStateTags(fund, tagClass) {
    const abbrs = (fund.states && fund.states.length > 1)
      ? fund.states
      : [fund.stateAbbr || fund.state || ''];
    return abbrs.filter(Boolean).map(a => `<span class="${tagClass}">${esc(a)}</span>`).join('');
  }

  function buildFundCard(fund) {
    const stateLower = (fund.stateNames || fund.state || '').toLowerCase();

    let actionsHtml;
    if (fund.website) {
      const url = esc(fund.website);
      actionsHtml =
        `<a href="${url}" class="btn btn-donate" target="_blank" rel="noopener noreferrer">Give $5</a>`;
    } else {
      const q = encodeURIComponent((fund.name || '') + ' immigration bond fund');
      actionsHtml =
        `<a href="https://www.google.com/search?q=${q}" class="btn btn-search" target="_blank" rel="noopener noreferrer">Search Online</a>`;
    }

    const visitLink = fund.website
      ? ` <a href="${esc(fund.website)}" class="fund-desc-link" target="_blank" rel="noopener noreferrer">Visit site &rarr;</a>`
      : '';

    const descHtml = fund.description
      ? `<p class="fund-desc">${esc(fund.description)}${visitLink}</p>` : '';

    return (
      `<article class="fund-card"` +
      ` data-name="${esc(fund.name)}"` +
      ` data-state="${esc(stateLower)}"` +
      ` data-url-status="${fund.website ? 'confirmed' : 'unconfirmed'}">` +
      getFundLogoHtml(fund) +
      `<div class="fund-card-header">` +
      `<div class="fund-name">${esc(fund.name)}</div>` +
      `<div class="fund-tags">${buildStateTags(fund, 'fund-tag')}</div>` +
      `</div>` +
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
     FINDER — Quick Match + Map Directory
     ---------------------------------------------------------- */

  function initFinder(funds) {
    // Build lookups
    const byAbbr = {};
    const nationalFunds = [];
    funds.forEach(f => {
      if (f.state === 'National') { nationalFunds.push(f); return; }
      const abbrs = f.states || (f.stateAbbr ? [f.stateAbbr] : []);
      abbrs.forEach(abbr => {
        (byAbbr[abbr] = byAbbr[abbr] || []).push(f);
      });
    });

    // Cycling pools (scoped to finder, avoids name collision with future pools)
    const finderPools = {};
    function getFinderPool(id, source) {
      if (!finderPools[id]) finderPools[id] = { items: [...source].sort(() => Math.random() - 0.5), idx: 0 };
      return finderPools[id];
    }
    function advanceFinderPool(id) {
      const p = finderPools[id];
      if (!p) return null;
      p.idx = (p.idx + 1) % p.items.length;
      return p.items[p.idx];
    }

    // Card for Quick Match slot
    function buildQmCard(fund) {
      const tagLabel = fund.stateAbbr || fund.state || '';
      const url = fund.website ? esc(fund.website) : null;
      const visitLink = url
        ? ` <a href="${url}" class="fund-desc-link" target="_blank" rel="noopener noreferrer">Visit site &rarr;</a>`
        : '';
      const actions = url
        ? `<a href="${url}" class="btn btn-donate" target="_blank" rel="noopener noreferrer">Give $5</a>`
        : `<a href="https://www.google.com/search?q=${encodeURIComponent(fund.name + ' immigration bond')}" class="btn btn-search" target="_blank" rel="noopener noreferrer">Search Online</a>`;
      return getFundLogoHtml(fund) +
        `<div class="fund-card-header">` +
        `<div class="qm-fund-name">${esc(fund.name)}</div>` +
        `<div class="fund-tags">${buildStateTags(fund, 'qm-fund-tag')}</div>` +
        `</div>` +
        (fund.description ? `<p class="qm-fund-desc">${esc(fund.description)}${visitLink}</p>` : '') +
        `<div class="qm-fund-actions">${actions}</div>`;
    }

    // Card for Map result panel
    function buildStateFundCard(fund) {
      const tagLabel = fund.stateAbbr || fund.state || '';
      const url = fund.website ? esc(fund.website) : null;
      const visitLink = url
        ? ` <a href="${url}" class="fund-desc-link" target="_blank" rel="noopener noreferrer">Visit site &rarr;</a>`
        : '';
      const actions = url
        ? `<a href="${url}" class="btn btn-donate" target="_blank" rel="noopener noreferrer">Donate</a>`
        : `<a href="https://www.google.com/search?q=${encodeURIComponent(fund.name + ' immigration bond')}" class="btn btn-search" target="_blank" rel="noopener noreferrer">Search online</a>`;
      return `<div class="state-fund-card">` +
        getFundLogoHtml(fund) +
        `<div class="fund-card-header">` +
        `<div class="fund-name">${esc(fund.name)}</div>` +
        `<div class="fund-tags">${buildStateTags(fund, 'fund-tag')}</div>` +
        `</div>` +
        (fund.description ? `<p class="fund-desc">${esc(fund.description)}${visitLink}</p>` : '') +
        `<div class="fund-actions">${actions}</div>` +
        `</div>`;
    }

    /* ── Quick Match ── */
    const btnRandom       = document.getElementById('btn-random');
    const btnTexas        = document.getElementById('btn-texas');
    const resultRandom    = document.getElementById('qm-result-random');
    const resultTexas     = document.getElementById('qm-result-texas');
    const cardRandom      = document.getElementById('qm-card-random');
    const cardTexas       = document.getElementById('qm-card-texas');
    const pickAnotherRand = document.getElementById('btn-pick-another-random');
    const pickAnotherTex  = document.getElementById('btn-pick-another-texas');
    let randomPicked = false;

    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        if (resultTexas) resultTexas.classList.remove('visible');
        const pool = getFinderPool('qm-random', funds);
        if (!randomPicked) {
          randomPicked = true;
          btnRandom.innerHTML = '&#x1F3B2; Pick another fund for me';
          cardRandom.innerHTML = buildQmCard(pool.items[pool.idx]);
        } else {
          const next = advanceFinderPool('qm-random');
          if (next) cardRandom.innerHTML = buildQmCard(next);
        }
        if (resultRandom) resultRandom.classList.add('visible');
      });
    }

    if (pickAnotherRand) {
      pickAnotherRand.addEventListener('click', () => {
        const next = advanceFinderPool('qm-random');
        if (next) cardRandom.innerHTML = buildQmCard(next);
      });
    }

    let highActivityPicked = false;
    if (btnTexas) {
      btnTexas.addEventListener('click', () => {
        if (resultRandom) resultRandom.classList.remove('visible');
        const highActivityAbbrs = ['FL', 'GA', 'TX', 'MN', 'LA', 'CA', 'TN'];
        const highActivityFunds = [];
        highActivityAbbrs.forEach(abbr => {
          (byAbbr[abbr] || []).forEach(f => {
            if (!highActivityFunds.includes(f)) highActivityFunds.push(f);
          });
        });
        if (!highActivityFunds.length) return;
        const pool = getFinderPool('qm-texas', highActivityFunds);
        if (!highActivityPicked) {
          highActivityPicked = true;
          cardTexas.innerHTML = buildQmCard(pool.items[pool.idx]);
        } else {
          const next = advanceFinderPool('qm-texas');
          if (next) cardTexas.innerHTML = buildQmCard(next);
        }
        btnTexas.innerHTML = '&#x26A1; Another high ICE activity area';
        if (resultTexas) resultTexas.classList.add('visible');
      });
    }

    if (pickAnotherTex) {
      pickAnotherTex.addEventListener('click', () => {
        const next = advanceFinderPool('qm-texas');
        if (next) cardTexas.innerHTML = buildQmCard(next);
      });
    }

    /* ── Map Directory ── */
    const mapEl = document.getElementById('fund-map');
    if (!mapEl) return;

    function showStateFunds(abbr, stateName) {
      const panel = document.getElementById('map-result-panel');
      if (!panel) return;
      const stateFunds = byAbbr[abbr] || [];
      if (!stateFunds.length) {
        const pool = getFinderPool('map-national', nationalFunds);
        panel.innerHTML =
          `<div class="state-result-heading">${esc(stateName)} &mdash; no specific fund</div>` +
          `<p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1rem">No fund is specifically listed for ${esc(stateName)}. Here\u2019s a national fund that may be able to help:</p>` +
          `<div class="state-fund-list">${buildStateFundCard(pool.items[pool.idx])}</div>`;
        return;
      }
      panel.innerHTML =
        `<div class="state-result-heading">${esc(stateName)} &mdash; ${stateFunds.length} fund${stateFunds.length !== 1 ? 's' : ''}</div>` +
        `<div class="state-fund-list">${stateFunds.map(buildStateFundCard).join('')}</div>`;
    }

    fetch('usa.svg')
      .then(r => r.text())
      .then(raw => {
        mapEl.innerHTML = raw.replace(/<\?xml[^>]*\?>/g, '');
        let selectedAbbr = null;

        mapEl.querySelectorAll('path[id^="US-"]').forEach(path => {
          const abbr = path.id.slice(3);
          const stateFunds = byAbbr[abbr] || [];
          const hasFunds = stateFunds.length > 0;
          const stateName = ABBR_TO_NAME[abbr] || abbr;

          if (hasFunds) {
            path.classList.add('map-state--has-funds');
            path.setAttribute('tabindex', '0');
            path.setAttribute('role', 'button');
            path.setAttribute('aria-label', 'Find funds in ' + stateName);

            path.addEventListener('click', () => {
              if (selectedAbbr === abbr) return;
              selectedAbbr = abbr;
              mapEl.querySelectorAll('.map-state--selected')
                .forEach(p => p.classList.remove('map-state--selected'));
              path.classList.add('map-state--selected');
              showStateFunds(abbr, stateName);
            });
            path.addEventListener('keydown', e => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); path.click(); }
            });
          } else {
            path.classList.add('map-state--no-funds');
          }
        });

        // Default: select California on load
        const caPath = mapEl.querySelector('path#US-CA');
        if (caPath) {
          selectedAbbr = 'CA';
          caPath.classList.add('map-state--selected');
          showStateFunds('CA', 'California');
        }
      })
      .catch(err => console.error('Failed to load map SVG:', err));
  }

  /* ----------------------------------------------------------
     RECENT ICE ACTIVITY — live news + fund pairing
     ---------------------------------------------------------- */

  function timeAgo(date) {
    const diffMs   = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return diffDays + ' days ago';
    const weeks = Math.floor(diffDays / 7);
    if (weeks < 5)     return weeks === 1 ? '1 week ago' : weeks + ' weeks ago';
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : months + ' months ago';
  }

  function cleanTitle(title, sourceName) {
    // Strip trailing " - Source Name" appended by Google News
    if (sourceName) {
      const suffix = new RegExp('\\s*[-–—]\\s*' + sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
      title = title.replace(suffix, '');
    }
    return title.trim();
  }

  function cleanDescription(desc, sourceName) {
    // Decode common HTML entities left by RSS stripping
    desc = desc.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    // Strip trailing "  Source Name" artifact Google News appends
    if (sourceName) {
      const suffix = new RegExp('\\s{2,}' + sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i');
      desc = desc.replace(suffix, '');
    }
    return desc.trim();
  }

  function renderIcePair(article, fund) {
    const glyphSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`;
    const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>`;

    const pubDate   = article.pubDate ? new Date(article.pubDate) : null;
    const recency   = pubDate ? timeAgo(pubDate) : '';
    const dateLabel = pubDate ? pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const title       = cleanTitle(article.title || '', article.sourceName);
    const description = cleanDescription(article.description || '', article.sourceName);
    const domain      = esc(article.domain || '');
    const sourceName  = esc(article.sourceName || 'News');
    const logoSrc     = `https://logo.clearbit.com/${domain}`;
    const faviconSrc  = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    const fundUrl  = fund.website ? esc(fund.website) : null;
    const ctaHref  = fundUrl || `https://www.google.com/search?q=${encodeURIComponent(fund.name + ' immigration bond')}`;
    const fundState = esc(fund.stateAbbr || fund.state || '');

    const logoEntry = FUND_LOGOS[fund.name];
    let glyphHtml;
    if (logoEntry) {
      const darkExtra = logoEntry.dark ? ' has-logo--dark' : '';
      glyphHtml = `<div class="ice-fund-glyph has-logo${darkExtra}">` +
        `<img src="${esc(logoEntry.src)}" alt="${esc(fund.name)} logo" loading="lazy"` +
        ` onerror="this.parentElement.style.display='none'">` +
        `</div>`;
    } else {
      glyphHtml = `<div class="ice-fund-glyph">${glyphSvg}</div>`;
    }

    return `<div class="ice-pair">
      <article class="ice-news-card">
        <div class="ice-news-masthead">
          <span class="ice-news-source-row">
            <img class="ice-news-outlet-logo"
                 src="${logoSrc}"
                 alt="${sourceName}"
                 onerror="this.src='${faviconSrc}'; this.onerror=null;">
            ${sourceName}
          </span>
          <span>${esc(dateLabel)}</span>
        </div>
        ${recency ? `<div class="ice-news-recency">${esc(recency)}</div>` : ''}
        <div class="ice-rule-deco"></div>
        <div class="ice-news-headline">${esc(title)}</div>
        ${description ? `<p class="ice-news-dek">${esc(description)}</p>` : ''}
        <div class="ice-news-byline">
          <a class="ice-news-read-link" href="${esc(article.link)}" target="_blank" rel="noopener noreferrer">
            Read full article &#x2197;
          </a>
        </div>
      </article>
      <div class="ice-connector" aria-hidden="true">
        <div class="ice-connector-badge">${arrowSvg}</div>
        <div class="ice-connector-caption">Fund nearby</div>
      </div>
      <div class="ice-fund-card">
        <div class="ice-fund-masthead">
          <span class="ice-fund-label">Local bond fund</span>
          <span>${fundState}</span>
        </div>
        <div class="ice-fund-top">
          ${glyphHtml}
          <div>
            <div class="ice-fund-donate-label">Donate to</div>
            <div class="ice-fund-name">${esc(fund.name)}</div>
          </div>
        </div>
        ${fund.description ? `<p class="ice-fund-desc">${esc(fund.description)}</p>` : ''}
        <a href="${ctaHref}" class="ice-fund-cta" target="_blank" rel="noopener noreferrer">
          Pay Someone&rsquo;s Bail <span class="ice-cta-arrow">&#x2197;</span>
        </a>
        <div class="ice-fund-fine">
          <span>100% goes to the fund</span>
          <span>Non-profit</span>
        </div>
      </div>
    </div>`;
  }

  async function initIceActivity() {
    const listEl = document.getElementById('ice-activity-list');
    if (!listEl) return;

    // Loading skeleton
    listEl.innerHTML = `<div class="ice-loading-state" aria-live="polite" aria-busy="true">
      <div class="ice-loading-card ice-loading-news"></div>
      <div class="ice-loading-card ice-loading-fund"></div>
    </div>`;

    try {
      const resp = await fetch('/api/ice-activity');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (data.error || !data.article || !data.fund) {
        throw new Error(data.error || 'Incomplete response');
      }

      listEl.innerHTML = renderIcePair(data.article, data.fund);
    } catch (err) {
      console.warn('ICE activity feed unavailable:', err.message);
      listEl.innerHTML = `<p class="ice-activity-loading">
        Latest enforcement news temporarily unavailable —
        <a href="https://news.google.com/search?q=ICE+immigration+enforcement" target="_blank" rel="noopener noreferrer">search Google News</a>
        for recent activity.
      </p>`;
    }
  }

  /* ----------------------------------------------------------
     FUND DIRECTORY — fetch, render, then init interactive features
     ---------------------------------------------------------- */

  async function loadFunds() {
    const root = document.getElementById('fund-directory-root');

    try {
      const resp = await fetch('immigration-bail-funds.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const funds = await resp.json();
      const donatableFunds = funds.filter(f => f.directDonate !== false);
      renderDirectory(donatableFunds);
      initFinder(donatableFunds);
      initHeroRotation(donatableFunds);
      initIceActivity();
    } catch (err) {
      console.error('Failed to load fund directory:', err);
      if (root) root.innerHTML =
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
     HERO — rotating state name
     ---------------------------------------------------------- */

  function initHeroRotation(funds) {
    const seen = new Set();
    const places = funds
      .map(f => f.state || '')
      .filter(p => p && p !== 'National' && !seen.has(p) && seen.add(p))
      .map(p => p + '.');
    if (!places.length) return;

    const heroPlaceEl = document.getElementById('hero-place');
    if (!heroPlaceEl) return;
    heroPlaceEl.textContent = places[0];
    let heroIdx = 0;
    setInterval(() => {
      heroPlaceEl.style.opacity = '0';
      heroPlaceEl.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        heroIdx = (heroIdx + 1) % places.length;
        heroPlaceEl.textContent = places[heroIdx];
        heroPlaceEl.style.opacity = '1';
        heroPlaceEl.style.transform = 'translateY(0)';
      }, 250);
    }, 2800);
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
