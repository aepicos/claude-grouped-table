/* === CONSTANTS === */

const PAGE_SIZE = 100;
const MAX_DOM_ROWS = 500;
const PRUNE_BATCH = 100;

const ROW_HEIGHT = { comfortable: 64, compact: 40 };
const HEADER_HEIGHT = 40;
const GROUP_HEADER_HEIGHT = 56;

const COLUMNS = [
  { id: 'select',      label: '',             width: 48,  sticky: true,  visible: true,  sortable: false, resizable: false },
  { id: 'name',        label: 'Asset name',   width: 280, sticky: true,  visible: true,  sortable: true,  resizable: true  },
  { id: 'assetClass',  label: 'Class',        width: 80,  sticky: false, visible: true,  sortable: true,  resizable: true  },
  { id: 'issueCounts', label: 'Issues',       width: 200, sticky: false, visible: true,  sortable: false, resizable: true  },
  { id: 'riskScore',   label: 'Score',        width: 100, sticky: false, visible: true,  sortable: true,  resizable: true  },
  { id: 'coverage',    label: 'Coverage',     width: 180, sticky: false, visible: true,  sortable: false, resizable: true  },
  { id: 'team',        label: 'Team',         width: 130, sticky: false, visible: true,  sortable: true,  resizable: true  },
  { id: 'source',      label: 'Source',       width: 130, sticky: false, visible: true,  sortable: false, resizable: true  },
  { id: 'type',        label: 'Type',         width: 140, sticky: false, visible: false, sortable: true,  resizable: true  },
  { id: 'environment', label: 'Environment',  width: 110, sticky: false, visible: false, sortable: true,  resizable: true  },
  { id: 'lastScan',    label: 'Last scan',    width: 120, sticky: false, visible: false, sortable: false, resizable: true  },
  { id: 'visibility',  label: 'Visibility',   width: 100, sticky: false, visible: false, sortable: true,  resizable: true  },
  { id: 'actions',     label: '',             width: 56,  sticky: false, visible: true,  sortable: false, resizable: false },
];

/* === DATA GENERATOR === */

const NAMES = [
  'auth-service','payment-api','user-service','notification-svc','reporting-api',
  'search-svc','ml-inference','data-pipeline','config-service','gateway-api',
  'frontend-app','admin-console','billing-svc','analytics-api','asset-manager',
  'secret-manager','cert-rotator','log-aggregator','event-bus','scheduler-svc',
  'cache-service','queue-worker','batch-processor','file-storage','image-resize',
  'email-service','sms-gateway','push-notification','webhook-relay','rate-limiter',
  'feature-flags','ab-testing','session-svc','token-service','audit-log',
  'compliance-checker','vuln-scanner','dep-tracker','sbom-generator','policy-engine',
  'k8s-operator','helm-chart','terraform-module','ansible-role','docker-base-img',
  'nginx-proxy','haproxy-lb','istio-config','envoy-filter','otel-collector'
];

const TEAMS = [
  'Platform','Security','Frontend','Backend','Mobile','Data','DevOps',
  'Identity','Payments','Infrastructure','Compliance','ML Platform'
];

const CLASS_CYCLE = ['A','B','C','C','D','B','C','D','B','C','A','C','D','B','C','D','C','B','D','C'];

const TYPES = ['Repository','Container image','Package','API','Web application','SBOM'];
const ENVS = ['Production','Staging','Development','Testing'];
const VISIBILITIES = ['Public','Private','Internal'];

const COVERAGE_TYPES = ['SCM','SAST','Secrets','DAST','Container','IaC'];
const SOURCE_TYPES = ['SCM','CLI','CI/CD','Docker','Registry','API'];

const LAST_SCAN_LABELS = [
  'just now','15 min ago','1 hour ago','3 hours ago','6 hours ago','12 hours ago',
  '1 day ago','2 days ago','5 days ago','8 days ago','14 days ago','21 days ago','30+ days ago'
];

const NAME_SUFFIXES = ['','-v2','-prod','-staging','-svc','-api','-worker','-gateway',''];

const REFERENCE_DATE = new Date('2026-04-20');

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getBitmaskSubset(arr, bitmask) {
  const result = [];
  for (let j = 0; j < arr.length; j++) {
    if (bitmask & (1 << j)) result.push(arr[j]);
  }
  return result;
}

function generateDataset() {
  const items = [];
  for (let i = 0; i < 10473; i++) {
    const assetClass = CLASS_CYCLE[i % CLASS_CYCLE.length];

    let riskBase;
    if (assetClass === 'A') riskBase = 80;
    else if (assetClass === 'B') riskBase = 55;
    else if (assetClass === 'C') riskBase = 30;
    else riskBase = 10;

    const riskScore = Math.min(100, Math.max(0, riskBase + (i % 20)));

    let critIssues, highIssues, medIssues, lowIssues;
    if (assetClass === 'A') {
      critIssues = (i % 7) + 2;
      highIssues = (i % 8) + 3;
      medIssues  = (i % 10) + 5;
      lowIssues  = (i % 15) + 8;
    } else if (assetClass === 'B') {
      critIssues = i % 5;
      highIssues = (i % 6) + 1;
      medIssues  = (i % 9) + 2;
      lowIssues  = (i % 12) + 4;
    } else if (assetClass === 'C') {
      critIssues = i % 3;
      highIssues = i % 4;
      medIssues  = (i % 7) + 1;
      lowIssues  = (i % 10) + 2;
    } else {
      critIssues = 0;
      highIssues = i % 2;
      medIssues  = i % 4;
      lowIssues  = (i % 8) + 1;
    }

    const nameBase = NAMES[i % NAMES.length];
    const cycle = Math.floor(i / NAMES.length);
    const suffix = NAME_SUFFIXES[i % NAME_SUFFIXES.length];
    const namePart = cycle > 0 ? String(cycle).padStart(2, '0') : '';
    const name = nameBase + (namePart ? '-' + namePart : '') + suffix;

    const coverageMask = i % 64;
    const coverage = getBitmaskSubset(COVERAGE_TYPES, coverageMask || 1);

    const sourceMask = (i * 7) % 64;
    const source = getBitmaskSubset(SOURCE_TYPES, sourceMask || 1);

    let activityStatus;
    const actMod = i % 10;
    if (actMod < 7) activityStatus = 'Active';
    else if (actMod < 9) activityStatus = 'Inactive';
    else activityStatus = 'Stale';

    const daysAgo = 10473 - i;
    const firstSeenDate = new Date(REFERENCE_DATE);
    firstSeenDate.setDate(firstSeenDate.getDate() - daysAgo);
    const firstSeen = formatDate(firstSeenDate);

    const lastScan = LAST_SCAN_LABELS[i % LAST_SCAN_LABELS.length];

    items.push({
      id: 'asset-' + String(i + 1).padStart(5, '0'),
      name,
      assetClass,
      type: TYPES[i % TYPES.length],
      issues: { critical: critIssues, high: highIssues, medium: medIssues, low: lowIssues },
      riskScore,
      coverage,
      team: TEAMS[i % TEAMS.length],
      source,
      environment: ENVS[(i * 3) % ENVS.length],
      firstSeen,
      lastScan,
      visibility: VISIBILITIES[i % 3],
      activityStatus,
    });
  }
  return items;
}

const DATASET = generateDataset();
console.assert(DATASET.length === 10473, 'Dataset must have 10473 items, got: ' + DATASET.length);

/* === MOCK API === */

function fetchPage(cursor, signal) {
  cursor = cursor || 0;
  return new Promise((resolve, reject) => {
    const delay = 200 + (cursor === 0 ? 100 : 0);
    const t = setTimeout(() => {
      const slice = DATASET.slice(cursor, cursor + PAGE_SIZE);
      resolve({
        items: slice,
        nextCursor: cursor + slice.length,
        hasMore: cursor + slice.length < DATASET.length,
      });
    }, delay);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
}

function getGroupKey(item, groupBy) {
  return String(item[groupBy]);
}

function computeGroups(groupBy) {
  const map = new Map();
  for (const item of DATASET) {
    const key = getGroupKey(item, groupBy);
    if (!map.has(key)) {
      map.set(key, { id: key, label: key, count: 0, issues: { critical: 0, high: 0, medium: 0, low: 0 } });
    }
    const g = map.get(key);
    g.count++;
    g.issues.critical += item.issues.critical;
    g.issues.high += item.issues.high;
    g.issues.medium += item.issues.medium;
    g.issues.low += item.issues.low;
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function fetchGroupMetadata(groupBy) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(computeGroups(groupBy));
    }, 300);
  });
}

function fetchGroupPage(groupId, groupBy, cursor) {
  cursor = cursor || 0;
  return new Promise(resolve => {
    setTimeout(() => {
      const groupItems = DATASET.filter(item => getGroupKey(item, groupBy) === groupId);
      const slice = groupItems.slice(cursor, cursor + PAGE_SIZE);
      resolve({
        items: slice,
        nextCursor: cursor + slice.length,
        hasMore: cursor + slice.length < groupItems.length,
      });
    }, 250);
  });
}

/* === STATE === */

const state = {
  // Data (ungrouped)
  items: [],
  cursor: 0,
  hasMore: true,
  loading: false,
  abortController: null,

  // Grouping
  groupBy: null,
  groups: [],

  // Selection
  selMode: 'none',
  selIncluded: new Set(),
  selExcluded: new Set(),

  // Columns (cloned from COLUMNS at init)
  columns: [],

  // Sort
  sortCol: null,
  sortDir: 'asc',

  // View
  density: 'comfortable',

  // DOM windowing (ungrouped)
  domRows: [],
  prunedTop: 0,
};

/* === COLUMN LAYOUT === */

function computeColTemplate() {
  return state.columns
    .filter(c => c.visible)
    .map(c => c.width + 'px')
    .join(' ');
}

function applyColTemplate() {
  const grid = document.getElementById('grid');
  const tpl = computeColTemplate();
  grid.style.setProperty('--col-template', tpl);

  const visibleCount = state.columns.filter(c => c.visible).length;
  grid.setAttribute('aria-colcount', String(visibleCount));
}

function toggleColVisibility(colId) {
  const col = state.columns.find(c => c.id === colId);
  if (!col || col.sticky) return;
  col.visible = !col.visible;

  applyColTemplate();

  // Toggle display via class on grid
  const grid = document.getElementById('grid');
  const cls = 'hide-col-' + colId;
  if (!col.visible) {
    grid.classList.add(cls);
    // Inject CSS rule if not already present
    ensureHideColRule(colId);
  } else {
    grid.classList.remove(cls);
  }

  // Re-render header to update
  renderHeader();
}

// Maintain a style element for hide-col rules
let hideColStyleEl = null;
const hiddenColRules = new Set();

function ensureHideColRule(colId) {
  if (hiddenColRules.has(colId)) return;
  if (!hideColStyleEl) {
    hideColStyleEl = document.createElement('style');
    document.head.appendChild(hideColStyleEl);
  }
  hideColStyleEl.textContent += `\n#grid.hide-col-${colId} [data-col-id="${colId}"] { display: none; }`;
  hiddenColRules.add(colId);
}

/* === RENDER — HEADER === */

function renderHeader() {
  const headerRow = document.getElementById('header-row');
  headerRow.innerHTML = '';

  const visibleCols = state.columns.filter(c => c.visible);
  let colIndex = 1;

  for (const col of visibleCols) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'columnheader');
    cell.setAttribute('data-col-id', col.id);
    cell.setAttribute('aria-colindex', String(colIndex++));
    cell.className = 'cell';

    if (col.sticky) {
      cell.style.position = 'sticky';
      if (col.id === 'select') cell.style.left = '0';
      if (col.id === 'name') cell.style.left = '48px';
    }

    if (col.id === 'select') {
      // Header checkbox (tri-state)
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'header-checkbox';
      cb.setAttribute('aria-label', 'Select all visible rows');
      cb.addEventListener('change', () => {
        if (state.selMode === 'all') {
          deselectAll();
        } else {
          selectAll();
        }
      });
      cell.appendChild(cb);
    } else if (col.label) {
      if (col.sortable) {
        cell.classList.add('sortable');
        cell.setAttribute('tabindex', '0');

        const sortDir = state.sortCol === col.id ? state.sortDir : 'none';
        cell.setAttribute('aria-sort', sortDir === 'none' ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending');

        const btn = document.createElement('button');
        btn.className = 'col-sort-btn';
        btn.setAttribute('aria-label', `Sort by ${col.label}`);
        btn.textContent = col.label;

        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        btn.appendChild(indicator);

        btn.addEventListener('click', () => handleSort(col.id));
        cell.appendChild(btn);
      } else {
        cell.textContent = col.label;
      }
    }

    headerRow.appendChild(cell);
  }
}

/* === RENDER — CELLS === */

function getCellContent(col, item) {
  const wrapper = document.createDocumentFragment();

  switch (col.id) {
    case 'select': {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('aria-label', `Select ${item.name}`);
      cb.checked = isSelected(item.id);
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleItem(item.id);
      });
      wrapper.appendChild(cb);
      break;
    }

    case 'name': {
      const inner = document.createElement('div');
      inner.className = 'asset-name-cell';

      const btn = document.createElement('button');
      btn.className = 'asset-name-primary';
      btn.setAttribute('aria-label', `Open ${item.name}`);
      btn.textContent = item.name;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPanel(item);
      });

      const secondary = document.createElement('span');
      secondary.className = 'asset-name-secondary';
      secondary.textContent = 'docker.io/org/' + item.name;

      inner.appendChild(btn);
      inner.appendChild(secondary);
      wrapper.appendChild(inner);
      break;
    }

    case 'assetClass': {
      const badge = document.createElement('span');
      badge.className = `class-badge class-badge--${item.assetClass.toLowerCase()}`;
      badge.textContent = item.assetClass;
      wrapper.appendChild(badge);
      break;
    }

    case 'issueCounts': {
      const counts = document.createElement('div');
      counts.className = 'issue-counts';

      const severities = [
        { key: 'critical', label: 'C', iconCls: 'issue-icon--critical', countCls: 'issue-count--critical' },
        { key: 'high',     label: 'H', iconCls: 'issue-icon--high',     countCls: 'issue-count--high'     },
        { key: 'medium',   label: 'M', iconCls: 'issue-icon--medium',   countCls: 'issue-count--medium'   },
        { key: 'low',      label: 'L', iconCls: 'issue-icon--low',      countCls: 'issue-count--low'      },
      ];

      for (const s of severities) {
        const item_wrap = document.createElement('div');
        item_wrap.className = 'issue-item';

        const icon = document.createElement('div');
        icon.className = `issue-icon ${s.iconCls}`;
        icon.textContent = s.label;
        icon.setAttribute('aria-hidden', 'true');

        const countSpan = document.createElement('span');
        countSpan.className = s.countCls;
        countSpan.textContent = String(item.issues[s.key]);
        countSpan.setAttribute('aria-label', `${item.issues[s.key]} ${s.key}`);

        item_wrap.appendChild(icon);
        item_wrap.appendChild(countSpan);
        counts.appendChild(item_wrap);
      }

      wrapper.appendChild(counts);
      break;
    }

    case 'riskScore': {
      const score = item.riskScore;
      let scoreClass;
      if (score >= 80) scoreClass = 'critical';
      else if (score >= 60) scoreClass = 'high';
      else if (score >= 40) scoreClass = 'medium';
      else scoreClass = 'low';

      const badge = document.createElement('span');
      badge.className = `score-badge score-badge--${scoreClass}`;
      badge.textContent = String(score);
      badge.setAttribute('aria-label', `Risk score: ${score}`);
      wrapper.appendChild(badge);
      break;
    }

    case 'coverage': {
      const COVERAGE_ABBREV = {
        'SCM': 'SCM',
        'SAST': 'SAT',
        'Secrets': 'SEC',
        'DAST': 'DST',
        'Container': 'CTR',
        'IaC': 'IaC',
      };

      const grid = document.createElement('div');
      grid.className = 'coverage-grid';

      for (const covType of COVERAGE_TYPES) {
        const isActive = item.coverage.includes(covType);
        const icon = document.createElement('div');
        icon.className = `coverage-icon ${isActive ? 'coverage-icon--active' : 'coverage-icon--empty'}`;
        icon.textContent = COVERAGE_ABBREV[covType] || covType.slice(0, 3);
        icon.title = covType;
        grid.appendChild(icon);
      }

      wrapper.appendChild(grid);
      break;
    }

    case 'team': {
      const span = document.createElement('span');
      span.textContent = item.team;
      span.style.color = 'var(--text-2)';
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      span.style.whiteSpace = 'nowrap';
      wrapper.appendChild(span);
      break;
    }

    case 'source': {
      const list = document.createElement('div');
      list.className = 'tags-list';

      const maxVisible = 3;
      const visible = item.source.slice(0, maxVisible);
      const overflow = item.source.length - visible.length;

      for (const src of visible) {
        const tag = document.createElement('span');
        tag.className = 'tag-badge';
        tag.textContent = src;
        list.appendChild(tag);
      }

      if (overflow > 0) {
        const more = document.createElement('span');
        more.className = 'tags-overflow';
        more.textContent = `+${overflow}`;
        list.appendChild(more);
      }

      wrapper.appendChild(list);
      break;
    }

    case 'type': {
      const span = document.createElement('span');
      span.textContent = item.type;
      span.style.color = 'var(--text-2)';
      span.style.overflow = 'hidden';
      span.style.textOverflow = 'ellipsis';
      wrapper.appendChild(span);
      break;
    }

    case 'environment': {
      const badge = document.createElement('span');
      badge.className = `env-badge env-badge--${item.environment.toLowerCase().replace(' ', '-')}`;
      badge.textContent = item.environment;
      wrapper.appendChild(badge);
      break;
    }

    case 'lastScan': {
      const span = document.createElement('span');
      span.textContent = item.lastScan;
      span.style.fontSize = '12px';
      span.style.color = 'var(--text-2)';
      wrapper.appendChild(span);
      break;
    }

    case 'visibility': {
      const span = document.createElement('span');
      span.textContent = item.visibility;
      span.style.fontSize = '12px';
      span.style.color = 'var(--text-2)';
      wrapper.appendChild(span);
      break;
    }

    case 'actions': {
      const btn = document.createElement('button');
      btn.className = 'row-action-btn';
      btn.setAttribute('aria-label', `More actions for ${item.name}`);
      btn.setAttribute('aria-haspopup', 'menu');
      btn.textContent = '⋯';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        announce(`Actions menu for ${item.name} (not implemented in demo)`);
      });
      wrapper.appendChild(btn);
      break;
    }
  }

  return wrapper;
}

/* === RENDER — ROWS === */

function renderRow(item, rowIndex) {
  const row = document.createElement('div');
  row.setAttribute('role', 'row');
  row.setAttribute('aria-rowindex', String(rowIndex));
  row.setAttribute('aria-selected', isSelected(item.id) ? 'true' : 'false');
  row.setAttribute('tabindex', '0');
  row.setAttribute('data-id', item.id);
  row.className = 'data-row';

  for (const col of state.columns) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('data-col-id', col.id);
    cell.className = 'cell';

    if (!col.visible) {
      cell.style.display = 'none';
    }

    if (col.sticky) {
      cell.style.position = 'sticky';
      cell.style.zIndex = '2';
      if (col.id === 'select') cell.style.left = '0';
      if (col.id === 'name') cell.style.left = '48px';
    }

    cell.appendChild(getCellContent(col, item));
    row.appendChild(cell);
  }

  return row;
}

function renderGroupHeaderRow(group) {
  const row = document.createElement('div');
  row.setAttribute('role', 'row');
  row.className = 'group-header-row';
  row.setAttribute('data-group-id', group.id);
  row.setAttribute('tabindex', '0');
  row.setAttribute('aria-expanded', 'false');

  const visibleCount = state.columns.filter(c => c.visible).length;

  const outerCell = document.createElement('div');
  outerCell.setAttribute('role', 'gridcell');
  outerCell.setAttribute('aria-colspan', String(visibleCount));
  outerCell.className = 'group-header-cell';

  // Checkbox
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'group-checkbox';
  cb.setAttribute('aria-label', `Select all in ${group.label}`);
  cb.setAttribute('aria-checked', 'false');
  cb.addEventListener('change', (e) => {
    e.stopPropagation();
    toggleGroupItems(group.id);
  });

  // Chevron toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'group-toggle';
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.setAttribute('aria-label', `Expand group ${group.label}`);
  // SVG chevron right
  toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleGroupExpand(group.id, row);
  });

  // Left section: name + count
  const leftDiv = document.createElement('div');
  leftDiv.className = 'group-header-cell__left';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'group-header-cell__name';
  nameSpan.textContent = group.label;

  const countSpan = document.createElement('span');
  countSpan.className = 'group-header-cell__count';
  countSpan.textContent = `(${group.count} assets)`;

  leftDiv.appendChild(nameSpan);
  leftDiv.appendChild(countSpan);

  // Right section: critical count + score range
  const rightDiv = document.createElement('div');
  rightDiv.className = 'group-header-cell__right';

  const critMetric = document.createElement('span');
  critMetric.className = 'group-header-cell__metric';
  critMetric.style.color = 'var(--critical)';
  critMetric.textContent = `${group.issues.critical}c critical`;

  const scoreMetric = document.createElement('span');
  scoreMetric.className = 'group-header-cell__metric';
  scoreMetric.textContent = `Issues: ${group.issues.high}h ${group.issues.medium}m`;

  rightDiv.appendChild(critMetric);
  rightDiv.appendChild(scoreMetric);

  outerCell.appendChild(cb);
  outerCell.appendChild(toggleBtn);
  outerCell.appendChild(leftDiv);
  outerCell.appendChild(rightDiv);
  row.appendChild(outerCell);

  // Click on row toggles group
  row.addEventListener('click', () => toggleGroupExpand(group.id, row));
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleGroupExpand(group.id, row);
    }
  });

  return row;
}

function renderGroupSentinel(groupId) {
  const sentinel = document.createElement('div');
  sentinel.className = 'sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.setAttribute('data-group-sentinel', groupId);
  return sentinel;
}

/* === DOM WINDOWING === */

function appendRows(items) {
  const gridBody = document.getElementById('grid-body');
  const sentinel = document.getElementById('sentinel');

  const startIndex = state.prunedTop + state.domRows.length + 1; // 1-based rowindex

  const frag = document.createDocumentFragment();
  for (let i = 0; i < items.length; i++) {
    const rowEl = renderRow(items[i], startIndex + i);
    frag.appendChild(rowEl);
    state.domRows.push(items[i]);
  }

  gridBody.insertBefore(frag, sentinel);

  // Update aria-rowcount
  const grid = document.getElementById('grid');
  grid.setAttribute('aria-rowcount', String(state.items.length));

  // Update total count badge
  updateTotalCountBadge();

  // Prune if needed
  if (state.domRows.length > MAX_DOM_ROWS + PRUNE_BATCH) {
    pruneTopRows();
  }
}

function pruneTopRows() {
  const gridBody = document.getElementById('grid-body');
  const topSpacer = document.getElementById('top-spacer');

  // Find data rows (not spacer, not sentinel)
  const allRows = gridBody.querySelectorAll('[role="row"].data-row');
  const toPrune = Math.min(PRUNE_BATCH, allRows.length);

  for (let i = 0; i < toPrune; i++) {
    allRows[i].remove();
  }

  state.domRows.splice(0, toPrune);
  state.prunedTop += toPrune;

  // Update top spacer height
  topSpacer.style.height = (state.prunedTop * ROW_HEIGHT[state.density]) + 'px';

  // Update aria-rowindex on remaining rows
  updateRowIndices();

  // Show back-to-top button
  document.getElementById('back-to-top').classList.remove('hidden');
}

function updateRowIndices() {
  const gridBody = document.getElementById('grid-body');
  const allRows = gridBody.querySelectorAll('[role="row"].data-row');
  allRows.forEach((row, i) => {
    row.setAttribute('aria-rowindex', String(state.prunedTop + i + 1));
  });
}

function updateTotalCountBadge() {
  const badge = document.getElementById('total-count-badge');
  if (badge) {
    const total = state.items.length;
    badge.textContent = total.toLocaleString() + ' assets';
  }
}

function resetGrid() {
  state.items = [];
  state.cursor = 0;
  state.hasMore = true;
  state.domRows = [];
  state.prunedTop = 0;

  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }

  const gridBody = document.getElementById('grid-body');
  const topSpacer = document.getElementById('top-spacer');

  // Remove all data rows
  const rows = gridBody.querySelectorAll('[role="row"].data-row');
  rows.forEach(r => r.remove());

  topSpacer.style.height = '0';

  const grid = document.getElementById('grid');
  grid.setAttribute('aria-rowcount', '-1');

  updateTotalCountBadge();
  document.getElementById('back-to-top').classList.add('hidden');
}

/* === LOADING === */

function updateLoadStatus(msg) {
  document.getElementById('load-status').textContent = msg;
}

async function loadMore() {
  if (state.loading || !state.hasMore) return;
  if (state.groupBy) return; // grouped mode uses per-group loading

  state.loading = true;
  state.abortController = new AbortController();

  updateLoadStatus('Loading assets…');
  updateNextBtn();

  try {
    const result = await fetchPage(state.cursor, state.abortController.signal);
    state.items.push(...result.items);
    state.cursor = result.nextCursor;
    state.hasMore = result.hasMore;

    appendRows(result.items);

    const loaded = state.items.length;
    const total = DATASET.length;
    updateLoadStatus(
      result.hasMore
        ? `Loaded ${loaded.toLocaleString()} of ${total.toLocaleString()} assets`
        : `All ${total.toLocaleString()} assets loaded`
    );

    announce(`Loaded ${result.items.length} assets. ${loaded.toLocaleString()} total loaded.`);
  } catch (err) {
    if (err.name !== 'AbortError') {
      updateLoadStatus('Error loading assets. Please try again.');
      console.error('Load error:', err);
    }
  } finally {
    state.loading = false;
    state.abortController = null;
    updateNextBtn();
  }
}

function updateNextBtn() {
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.disabled = state.loading || !state.hasMore;
  }
}

async function loadGroupMeta(groupBy) {
  updateLoadStatus('Loading groups…');
  const groups = await fetchGroupMetadata(groupBy);

  state.groups = groups.map(g => ({
    ...g,
    expanded: false,
    items: [],
    cursor: 0,
    hasMore: true,
    loading: false,
  }));

  renderGroupHeaders();
  updateLoadStatus(`${groups.length} groups loaded`);
  announce(`Grouped by ${groupBy}. ${groups.length} groups.`);
}

async function loadGroupItems(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group || group.loading || !group.hasMore) return;

  group.loading = true;

  try {
    const result = await fetchGroupPage(groupId, state.groupBy, group.cursor);
    group.items.push(...result.items);
    group.cursor = result.nextCursor;
    group.hasMore = result.hasMore;

    // Find the group body element and append rows
    const groupBodyEl = document.querySelector(`[data-group-body="${groupId}"]`);
    if (groupBodyEl) {
      const sentinel = groupBodyEl.querySelector(`[data-group-sentinel="${groupId}"]`);
      const frag = document.createDocumentFragment();
      const startIndex = group.items.length - result.items.length + 1;

      for (let i = 0; i < result.items.length; i++) {
        const rowEl = renderRow(result.items[i], startIndex + i);
        frag.appendChild(rowEl);
      }

      groupBodyEl.insertBefore(frag, sentinel);

      // Setup observer for this group if more items
      if (group.hasMore) {
        setupGroupObserver(groupId, sentinel);
      } else {
        const loadingEl = groupBodyEl.querySelector('.group-loading');
        if (loadingEl) loadingEl.remove();
      }
    }
  } catch (err) {
    console.error('Group load error:', err);
  } finally {
    group.loading = false;
  }
}

/* === GROUPING === */

function renderGroupHeaders() {
  const gridBody = document.getElementById('grid-body');
  const sentinel = document.getElementById('sentinel');

  // Remove existing group rows
  const existing = gridBody.querySelectorAll('.group-header-row, [data-group-body]');
  existing.forEach(el => el.remove());

  const frag = document.createDocumentFragment();

  for (const group of state.groups) {
    const headerRow = renderGroupHeaderRow(group);
    frag.appendChild(headerRow);
  }

  gridBody.insertBefore(frag, sentinel);

  const grid = document.getElementById('grid');
  grid.setAttribute('aria-rowcount', String(state.groups.length));
}

function toggleGroupExpand(groupId, headerRow) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;

  const toggleBtn = headerRow.querySelector('.group-toggle');
  const isExpanded = headerRow.getAttribute('aria-expanded') === 'true';

  if (isExpanded) {
    // Collapse: remove group body
    headerRow.setAttribute('aria-expanded', 'false');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
    group.expanded = false;

    const bodyEl = document.querySelector(`[data-group-body="${groupId}"]`);
    if (bodyEl) bodyEl.remove();
  } else {
    // Expand: create group body and load items
    headerRow.setAttribute('aria-expanded', 'true');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
    group.expanded = true;

    const bodyEl = document.createElement('div');
    bodyEl.setAttribute('data-group-body', groupId);
    bodyEl.className = 'group-body';

    const loadingEl = document.createElement('div');
    loadingEl.className = 'group-loading';
    loadingEl.textContent = 'Loading…';
    bodyEl.appendChild(loadingEl);

    const groupSentinel = renderGroupSentinel(groupId);
    bodyEl.appendChild(groupSentinel);

    headerRow.insertAdjacentElement('afterend', bodyEl);

    // Load first page of group items
    loadGroupItems(groupId);
    announce(`Group ${group.label} expanded. ${group.count} assets.`);
  }
}

function applyGrouping(groupBy) {
  state.groupBy = groupBy;

  // Clear flat mode state
  const gridBody = document.getElementById('grid-body');

  const rows = gridBody.querySelectorAll('[role="row"].data-row, .group-header-row, [data-group-body]');
  rows.forEach(r => r.remove());

  const topSpacer = document.getElementById('top-spacer');
  topSpacer.style.height = '0';
  state.prunedTop = 0;
  state.domRows = [];
  state.groups = [];

  // Disable main sentinel observer — grouped mode uses per-group
  if (state._mainObserver) {
    state._mainObserver.disconnect();
  }

  loadGroupMeta(groupBy);
}

function clearGrouping() {
  state.groupBy = null;
  state.groups = [];

  const gridBody = document.getElementById('grid-body');
  const existing = gridBody.querySelectorAll('.group-header-row, [data-group-body]');
  existing.forEach(el => el.remove());

  resetGrid();

  // Re-setup main observer
  setupObserver();
  loadMore();
}

function setupGroupObserver(groupId, sentinel) {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      const group = state.groups.find(g => g.id === groupId);
      if (group && !group.loading && group.hasMore) {
        loadGroupItems(groupId);
      }
    }
  }, { rootMargin: '200px' });
  obs.observe(sentinel);
}

/* === SELECTION MODEL === */

function isSelected(id) {
  if (state.selMode === 'none') return false;
  if (state.selMode === 'all') return !state.selExcluded.has(id);
  return state.selIncluded.has(id);
}

function toggleItem(id) {
  if (state.selMode === 'all') {
    if (state.selExcluded.has(id)) state.selExcluded.delete(id);
    else state.selExcluded.add(id);
  } else {
    state.selMode = 'some';
    if (state.selIncluded.has(id)) {
      state.selIncluded.delete(id);
      if (state.selIncluded.size === 0) state.selMode = 'none';
    } else {
      state.selIncluded.add(id);
    }
  }
  updateSelectionUI();
}

function toggleGroupItems(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;

  // If group items are loaded, toggle them
  const groupItems = group.items;
  if (groupItems.length === 0) return;

  const allSelected = groupItems.every(item => isSelected(item.id));

  for (const item of groupItems) {
    if (allSelected) {
      // Deselect all in group
      if (state.selMode === 'all') {
        state.selExcluded.add(item.id);
      } else {
        state.selIncluded.delete(item.id);
      }
    } else {
      // Select all in group
      if (state.selMode === 'all') {
        state.selExcluded.delete(item.id);
      } else {
        state.selMode = 'some';
        state.selIncluded.add(item.id);
      }
    }
  }

  if (state.selMode === 'some' && state.selIncluded.size === 0) {
    state.selMode = 'none';
  }

  updateSelectionUI();
}

function selectAll() {
  state.selMode = 'all';
  state.selExcluded.clear();
  updateSelectionUI();
}

function deselectAll() {
  state.selMode = 'none';
  state.selIncluded.clear();
  state.selExcluded.clear();
  updateSelectionUI();
}

function getSelectionDescription() {
  if (state.selMode === 'none') return '0 items selected';
  if (state.selMode === 'all') {
    const exc = state.selExcluded.size;
    return exc > 0
      ? `All items selected (${exc} excluded)`
      : 'All items in this view selected';
  }
  return `${state.selIncluded.size} items selected`;
}

function getSelectedCount() {
  if (state.selMode === 'none') return 0;
  if (state.selMode === 'all') return DATASET.length - state.selExcluded.size;
  return state.selIncluded.size;
}

function updateSelectionUI() {
  const count = getSelectedCount();
  const hasSelection = count > 0;

  // Update all visible row checkboxes
  const gridBody = document.getElementById('grid-body');
  const rows = gridBody.querySelectorAll('[role="row"].data-row');
  for (const row of rows) {
    const id = row.getAttribute('data-id');
    const sel = isSelected(id);
    row.setAttribute('aria-selected', sel ? 'true' : 'false');
    const cb = row.querySelector('[data-col-id="select"] input[type="checkbox"]');
    if (cb) cb.checked = sel;
  }

  // Update header checkbox
  const headerCb = document.getElementById('header-checkbox');
  if (headerCb) {
    if (state.selMode === 'all' && state.selExcluded.size === 0) {
      headerCb.checked = true;
      headerCb.indeterminate = false;
    } else if (state.selMode === 'none') {
      headerCb.checked = false;
      headerCb.indeterminate = false;
    } else {
      headerCb.checked = false;
      headerCb.indeterminate = true;
    }
  }

  // Update selection bar
  const selBar = document.getElementById('selection-bar');
  const selCount = document.getElementById('selection-count');
  const selectAllBtn = document.getElementById('select-all-btn');
  const bulkBtn = document.getElementById('bulk-action-btn');

  if (hasSelection) {
    selBar.classList.remove('hidden');
    selCount.textContent = getSelectionDescription();
    selectAllBtn.style.display = state.selMode === 'all' ? 'none' : '';
    bulkBtn.disabled = false;
  } else {
    selBar.classList.add('hidden');
    bulkBtn.disabled = true;
  }

  // Update group checkboxes
  const groupCbs = document.querySelectorAll('.group-checkbox');
  for (const gcb of groupCbs) {
    const groupRow = gcb.closest('[data-group-id]');
    if (!groupRow) continue;
    const groupId = groupRow.getAttribute('data-group-id');
    const group = state.groups.find(g => g.id === groupId);
    if (!group || group.items.length === 0) continue;

    const allSel = group.items.every(item => isSelected(item.id));
    const someSel = group.items.some(item => isSelected(item.id));
    gcb.checked = allSel;
    gcb.indeterminate = !allSel && someSel;
    gcb.setAttribute('aria-checked', allSel ? 'true' : someSel ? 'mixed' : 'false');
  }

  // Update floating bulk bar
  const floatingBar = document.getElementById('floating-bulk-bar');
  const floatingCount = document.getElementById('floating-selection-count');

  if (floatingBar) {
    floatingBar.classList.toggle('hidden', !hasSelection);
  }
  if (floatingCount) {
    floatingCount.textContent = getSelectionDescription();
  }
}

/* === SORT === */

function handleSort(colId) {
  if (state.sortCol === colId) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortCol = colId;
    state.sortDir = 'asc';
  }

  renderHeader();
  announce(`Sorted by ${colId} ${state.sortDir === 'asc' ? 'ascending' : 'descending'}`);
}

/* === KEYBOARD NAV === */

function handleGridKeydown(e) {
  const row = e.target.closest('[role="row"]');
  if (!row) return;

  const gridBody = document.getElementById('grid-body');

  switch (e.key) {
    case 'ArrowDown': {
      e.preventDefault();
      let next = row.nextElementSibling;
      while (next) {
        if (
          next.getAttribute('role') === 'row' &&
          !next.getAttribute('aria-hidden') &&
          next.classList.contains('data-row') ||
          next.classList.contains('group-header-row')
        ) {
          focusRow(next);
          break;
        }
        next = next.nextElementSibling;
      }
      break;
    }

    case 'ArrowUp': {
      e.preventDefault();
      let prev = row.previousElementSibling;
      while (prev) {
        if (
          prev.getAttribute('role') === 'row' &&
          !prev.getAttribute('aria-hidden') &&
          (prev.classList.contains('data-row') || prev.classList.contains('group-header-row'))
        ) {
          focusRow(prev);
          break;
        }
        prev = prev.previousElementSibling;
      }
      break;
    }

    case ' ': {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      if (row.classList.contains('data-row')) {
        const id = row.getAttribute('data-id');
        toggleItem(id);
      } else if (row.classList.contains('group-header-row')) {
        const groupId = row.getAttribute('data-group-id');
        toggleGroupExpand(groupId, row);
      }
      break;
    }

    case 'Enter': {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      e.preventDefault();
      if (row.classList.contains('data-row')) {
        const id = row.getAttribute('data-id');
        const item = state.items.find(it => it.id === id) ||
          state.groups.flatMap(g => g.items).find(it => it.id === id);
        if (item) openPanel(item);
      } else if (row.classList.contains('group-header-row')) {
        const groupId = row.getAttribute('data-group-id');
        toggleGroupExpand(groupId, row);
      }
      break;
    }

    case 'Tab': {
      // Let natural tab handle focus movement within row
      break;
    }

    case 'Escape': {
      // If focus is inside a row's interactive element, move focus to the row
      if (e.target !== row) {
        e.preventDefault();
        row.focus();
      }
      break;
    }
  }
}

function focusRow(rowEl) {
  rowEl.focus();
  // Scroll into view if needed
  rowEl.scrollIntoView({ block: 'nearest' });
}

/* === DENSITY === */

function setDensity(density) {
  state.density = density;

  const grid = document.getElementById('grid');
  grid.classList.remove('comfortable', 'compact');
  grid.classList.add(density);

  // Update top spacer height for new density
  const topSpacer = document.getElementById('top-spacer');
  topSpacer.style.height = (state.prunedTop * ROW_HEIGHT[density]) + 'px';

  // Update button states
  document.getElementById('density-comfortable').classList.toggle('active', density === 'comfortable');
  document.getElementById('density-compact').classList.toggle('active', density === 'compact');
  document.getElementById('density-comfortable').setAttribute('aria-pressed', density === 'comfortable' ? 'true' : 'false');
  document.getElementById('density-compact').setAttribute('aria-pressed', density === 'compact' ? 'true' : 'false');

  announce(`Row density set to ${density}`);
}

/* === DETAIL PANEL === */

function openPanel(item) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  const backdrop = document.getElementById('backdrop');

  content.innerHTML = '';
  content.appendChild(buildPanelContent(item));

  panel.setAttribute('aria-hidden', 'false');
  backdrop.classList.remove('hidden');

  // Focus close button
  const closeBtn = document.getElementById('detail-close');
  setTimeout(() => closeBtn.focus(), 50);
  announce(`Asset details panel opened for ${item.name}`);
}

function closePanel() {
  const panel = document.getElementById('detail-panel');
  const backdrop = document.getElementById('backdrop');

  panel.setAttribute('aria-hidden', 'true');
  backdrop.classList.add('hidden');
  announce('Asset details panel closed');
}

function buildPanelContent(item) {
  const frag = document.createDocumentFragment();

  const h2 = document.createElement('h2');
  h2.textContent = item.name;
  frag.appendChild(h2);

  const subtitle = document.createElement('p');
  subtitle.className = 'detail-subtitle';
  subtitle.textContent = `${item.type} · ${item.id}`;
  frag.appendChild(subtitle);

  // Risk overview section
  const riskSection = document.createElement('div');
  riskSection.className = 'detail-section';

  const riskH3 = document.createElement('h3');
  riskH3.textContent = 'Risk Overview';
  riskSection.appendChild(riskH3);

  const rows = [
    { label: 'Risk Score', value: `${item.riskScore} / 100` },
    { label: 'Asset Class', value: item.assetClass },
    { label: 'Critical Issues', value: String(item.issues.critical) },
    { label: 'High Issues', value: String(item.issues.high) },
    { label: 'Medium Issues', value: String(item.issues.medium) },
    { label: 'Low Issues', value: String(item.issues.low) },
  ];

  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const label = document.createElement('span');
    label.className = 'detail-label';
    label.textContent = r.label;
    const val = document.createElement('span');
    val.className = 'detail-value';
    val.textContent = r.value;
    row.appendChild(label);
    row.appendChild(val);
    riskSection.appendChild(row);
  }

  frag.appendChild(riskSection);

  // Metadata section
  const metaSection = document.createElement('div');
  metaSection.className = 'detail-section';

  const metaH3 = document.createElement('h3');
  metaH3.textContent = 'Metadata';
  metaSection.appendChild(metaH3);

  const metaRows = [
    { label: 'Team', value: item.team },
    { label: 'Environment', value: item.environment },
    { label: 'Visibility', value: item.visibility },
    { label: 'Activity Status', value: item.activityStatus },
    { label: 'First Seen', value: item.firstSeen },
    { label: 'Last Scan', value: item.lastScan },
    { label: 'Coverage', value: item.coverage.join(', ') || 'None' },
    { label: 'Source', value: item.source.join(', ') || 'None' },
  ];

  for (const r of metaRows) {
    const row = document.createElement('div');
    row.className = 'detail-row';
    const label = document.createElement('span');
    label.className = 'detail-label';
    label.textContent = r.label;
    const val = document.createElement('span');
    val.className = 'detail-value';
    val.textContent = r.value;
    row.appendChild(label);
    row.appendChild(val);
    metaSection.appendChild(row);
  }

  frag.appendChild(metaSection);

  return frag;
}

/* === ANNOUNCER === */

function announce(msg) {
  const announcer = document.getElementById('announcer');
  announcer.textContent = '';
  // Timeout allows screen reader to pick up the change
  setTimeout(() => {
    announcer.textContent = msg;
  }, 50);
}

/* === COLUMN TOGGLE PANEL === */

function buildColPanel() {
  const panel = document.getElementById('col-toggle-panel');
  panel.innerHTML = '';

  const h3 = document.createElement('h3');
  h3.textContent = 'Columns';
  panel.appendChild(h3);

  for (const col of state.columns) {
    if (col.sticky || col.id === 'actions') continue; // skip sticky and actions

    const labelEl = document.createElement('label');
    labelEl.className = 'col-vis-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = col.visible;
    cb.setAttribute('data-col-id', col.id);
    cb.addEventListener('change', () => toggleColVisibility(col.id));

    labelEl.appendChild(cb);
    labelEl.appendChild(document.createTextNode(col.label));
    panel.appendChild(labelEl);
  }
}

/* === INTERSECTION OBSERVER === */

function setupObserver() {
  const sentinel = document.getElementById('sentinel');
  if (!sentinel) return;

  if (state._mainObserver) {
    state._mainObserver.disconnect();
  }

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !state.loading && state.hasMore && !state.groupBy) {
      loadMore();
    }
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
  state._mainObserver = observer;
}

/* === EVENTS === */

function attachEvents() {
  // Grid body keyboard navigation (delegated)
  const gridBody = document.getElementById('grid-body');
  gridBody.addEventListener('keydown', handleGridKeydown);

  // Density buttons
  document.getElementById('density-comfortable').addEventListener('click', () => setDensity('comfortable'));
  document.getElementById('density-compact').addEventListener('click', () => setDensity('compact'));

  // Group by select
  document.getElementById('group-by-select').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === '') {
      if (state.groupBy !== null) clearGrouping();
    } else {
      applyGrouping(val);
    }
  });

  // Column toggle button
  const colToggleBtn = document.getElementById('col-toggle-btn');
  const colPanel = document.getElementById('col-toggle-panel');

  colToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !colPanel.classList.contains('hidden');
    colPanel.classList.toggle('hidden', isOpen);
    colToggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    if (!isOpen) {
      buildColPanel();
    }
  });

  // Bulk action button
  const bulkBtn = document.getElementById('bulk-action-btn');
  const bulkMenu = document.getElementById('bulk-action-menu');

  bulkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !bulkMenu.classList.contains('hidden');
    bulkMenu.classList.toggle('hidden', isOpen);
    bulkBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });

  // Bulk action menu items
  bulkMenu.addEventListener('click', (e) => {
    const menuItem = e.target.closest('[role="menuitem"]');
    if (!menuItem) return;
    const action = menuItem.getAttribute('data-action');
    const count = getSelectedCount();
    announce(`${action} action triggered for ${count} selected items`);
    bulkMenu.classList.add('hidden');
    bulkBtn.setAttribute('aria-expanded', 'false');
  });

  // Selection bar buttons
  document.getElementById('select-all-btn').addEventListener('click', () => selectAll());
  document.getElementById('deselect-btn').addEventListener('click', () => deselectAll());

  // Floating bulk bar — deselect button
  const floatingDeselectBtn = document.getElementById('floating-deselect-btn');
  if (floatingDeselectBtn) {
    floatingDeselectBtn.addEventListener('click', () => deselectAll());
  }

  // Floating bulk bar — action buttons
  const floatingBar = document.getElementById('floating-bulk-bar');
  if (floatingBar) {
    floatingBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.floating-bulk-bar__btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const count = getSelectedCount();
      announce(`${action} action triggered for ${count} selected items`);
      console.log(`Bulk action: ${action} on ${count} items`);
    });
  }

  // Detail panel close
  document.getElementById('detail-close').addEventListener('click', closePanel);

  // Backdrop close
  document.getElementById('backdrop').addEventListener('click', closePanel);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const panel = document.getElementById('detail-panel');
      if (panel.getAttribute('aria-hidden') === 'false') {
        closePanel();
        return;
      }
      // Close dropdowns
      const colPanel = document.getElementById('col-toggle-panel');
      if (!colPanel.classList.contains('hidden')) {
        colPanel.classList.add('hidden');
        document.getElementById('col-toggle-btn').setAttribute('aria-expanded', 'false');
        document.getElementById('col-toggle-btn').focus();
        return;
      }
      const bulkMenuEl = document.getElementById('bulk-action-menu');
      if (!bulkMenuEl.classList.contains('hidden')) {
        bulkMenuEl.classList.add('hidden');
        document.getElementById('bulk-action-btn').setAttribute('aria-expanded', 'false');
        document.getElementById('bulk-action-btn').focus();
      }
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    const colPanel = document.getElementById('col-toggle-panel');
    if (!colPanel.classList.contains('hidden')) {
      colPanel.classList.add('hidden');
      document.getElementById('col-toggle-btn').setAttribute('aria-expanded', 'false');
    }
    const bulkMenuEl = document.getElementById('bulk-action-menu');
    if (!bulkMenuEl.classList.contains('hidden')) {
      bulkMenuEl.classList.add('hidden');
      document.getElementById('bulk-action-btn').setAttribute('aria-expanded', 'false');
    }
  });

  // Pagination: next button loads more
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!state.loading && state.hasMore && !state.groupBy) {
        loadMore();
      }
    });
  }

  // Pagination: prev button is disabled (cursor-based, no back navigation)
  // prev-btn stays disabled, no action needed

  // Back to top
  document.getElementById('back-to-top').addEventListener('click', () => {
    resetGrid();
    setupObserver();
    loadMore();
    const wrapper = document.getElementById('grid-scroll-wrapper');
    wrapper.scrollTop = 0;
    document.getElementById('back-to-top').classList.add('hidden');
    announce('Reloaded from the beginning');
  });

  // Horizontal scroll detection for sticky shadow
  const wrapper = document.getElementById('grid-scroll-wrapper');
  wrapper.addEventListener('scroll', () => {
    if (wrapper.scrollLeft > 0) {
      wrapper.classList.add('scrolled-x');
    } else {
      wrapper.classList.remove('scrolled-x');
    }
  }, { passive: true });
}

/* === INIT === */

function init() {
  // Clone columns from COLUMNS
  state.columns = COLUMNS.map(c => ({ ...c }));

  // Apply initial column template
  applyColTemplate();

  // Apply initial density class
  const grid = document.getElementById('grid');
  grid.classList.add('comfortable');

  // Render header
  renderHeader();

  // Attach events
  attachEvents();

  // Apply any initially hidden columns
  for (const col of state.columns) {
    if (!col.visible && !col.sticky) {
      ensureHideColRule(col.id);
      grid.classList.add('hide-col-' + col.id);
    }
  }

  // Initialize next button state
  updateNextBtn();

  // Setup intersection observer and start loading
  setupObserver();
  loadMore();
}

document.addEventListener('DOMContentLoaded', init);
