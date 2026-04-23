# Security Asset Table — Technical Approach

**Version:** 1.0
**Audience:** Frontend engineering team
**Purpose:** Design rationale, structural specification, and implementation constraints for evaluation

---

## Overview

This document describes the architecture of a large-scale, grouped data table for a security asset inventory. The component manages 10,000+ rows, supports bulk selection across the full dataset (including unloaded data), optional single-level grouping, and must meet WCAG 2.2 compliance across NVDA, JAWS, VoiceOver macOS, and VoiceOver iOS.

The central design tension is that the three things this component needs most — scale, accessibility, and interaction richness — pull in different directions. Native `<table>` gives the best assistive technology support but cannot support row virtualisation. A fully-featured `role="grid"` with composite widget keyboard navigation breaks down when cells contain multiple interactive elements. This document records the specific trade-offs made and why.

---

## 1. Structural Decision: `role="grid"` over Native `<table>`

### Decision

The component uses a `<div>`-based structure with explicit ARIA roles, not a native `<table>`.

### Reasoning

At 10,000+ rows, DOM virtualisation is a hard requirement. The browser must be prevented from maintaining tens of thousands of live nodes simultaneously. Row virtualisation requires removing and reinserting rows arbitrarily as the user scrolls — and this requires rows to participate in a layout model where their position can be calculated without the browser performing a full table layout pass.

Native `<table>` does not support this. Table layout is calculated by the browser across all rows simultaneously to determine column widths. Rows cannot be positioned independently. Techniques that wrap `<tbody>` in a scroll container partially work but break column header alignment and require JavaScript to synchronise widths — at which point the native table semantics have been undermined while the structural constraints remain.

A `<div>`-based grid using CSS `grid-template-columns` on each row shares column widths via a single CSS custom property (`--col-template`) set on the container. Rows can be inserted or removed without triggering a global layout recalculation.

### ARIA Structure

```
div[role="grid"][aria-label="Security Assets"][aria-rowcount][aria-colcount]
  div[role="rowgroup"]                          ← thead equivalent
    div[role="row"]
      div[role="columnheader"][aria-sort]       ← one per visible column
  div[role="rowgroup"]                          ← tbody equivalent
    div[aria-hidden="true"].top-spacer          ← virtual scroll offset
    div[role="row"][aria-rowindex][aria-selected][tabindex="0"]
      div[role="gridcell"]                      ← one per visible column
    div[aria-hidden="true"]#sentinel            ← IntersectionObserver target
```

### Accessibility trade-off accepted

`role="grid"` is less consistently supported than native `<table>` in VoiceOver iOS. VoiceOver iOS does not reliably trigger table-navigation mode for custom grids, and may announce `aria-rowcount="-1"` literally as "negative one". Mitigation: `aria-rowcount` is set to the current loaded count rather than `-1`, and is updated as rows load. This means VoiceOver iOS users hear an accurate (if incomplete) count that grows as they scroll.

This trade-off is accepted. The alternative — native `<table>` — cannot support the scale requirements without introducing JavaScript column-width synchronisation that is equally fragile and harder to maintain.

---

## 2. ARIA Attributes — Full Specification

### Grid container

| Attribute | Value | Notes |
|---|---|---|
| `role` | `"grid"` | Signals interactive data grid to AT |
| `aria-label` | `"Security Assets"` | Identifies the grid |
| `aria-rowcount` | Current loaded count | Updated on each data load. Not `-1` — see VoiceOver iOS note above |
| `aria-colcount` | Count of visible columns | Updated when columns are shown/hidden |

### Column headers

| Attribute | Value | Notes |
|---|---|---|
| `role` | `"columnheader"` | Required on header cells |
| `aria-sort` | `"ascending"` \| `"descending"` \| `"none"` | Present only on sortable columns; updated on sort |

The `select` (checkbox) column header carries `aria-label="Select all rows"` rather than `aria-sort`.

### Data rows

| Attribute | Value | Notes |
|---|---|---|
| `role` | `"row"` | Required |
| `aria-rowindex` | Integer, 1-based | Reflects true position including virtualised-away rows. Must be updated on every DOM prune. |
| `aria-selected` | `"true"` \| `"false"` | Updated by `updateSelectionUI()` without re-rendering the row |
| `tabindex` | `"0"` | Rows are the focus unit; cells are not individually tab-reachable during normal navigation |

### Data cells

| Attribute | Value | Notes |
|---|---|---|
| `role` | `"gridcell"` | Required |
| `data-col-id` | Column identifier string | Used by CSS for column show/hide and by JS for cell content lookup |

### Group header rows

Group headers are rendered as `role="row"` within the same `role="rowgroup"` as data rows — not in a separate rowgroup. This avoids AT announcing "entering group 1 of N" on every navigation step, which adds noise without value.

```
div[role="row"][tabindex="0"][data-group-id][aria-rowindex]
  div[role="gridcell"][aria-colspan="N"]
    input[type="checkbox"][aria-label="Select all in {label}"][aria-checked]
    button[aria-expanded="true|false"][aria-label="Collapse group {label}"]
    span  ← group label (not interactive)
    span  ← item count
    span  ← issue count summary
```

`aria-colspan` on the spanning gridcell informs AT that this cell covers the full column width. Support is partial — JAWS respects it; NVDA and VoiceOver may announce "1 of 1 cell". The group label text carries sufficient context to make this tolerable.

`aria-expanded` lives on the expand/collapse `<button>`, not on the row. AT behaviour is more predictable when `aria-expanded` is on the element that activates the change.

### Checkboxes

All checkboxes use native `<input type="checkbox">`. The `indeterminate` property (for tri-state group/header checkboxes) is set via the DOM property, not an attribute — `element.indeterminate = true`. `aria-checked="mixed"` is also set explicitly for AT compatibility, since the `indeterminate` DOM property is not universally reflected to the accessibility tree.

```js
function applyCheckboxState(el, state) {
  // state: 'checked' | 'unchecked' | 'mixed'
  el.checked = state === 'checked';
  el.indeterminate = state === 'mixed';
  el.setAttribute('aria-checked', state === 'mixed' ? 'mixed' : state === 'checked' ? 'true' : 'false');
}
```

### Live regions

Two live regions handle announcements:

```html
<!-- Load progress — not urgent, does not interrupt AT reading -->
<div role="status" aria-live="polite" aria-atomic="true" id="load-status"></div>

<!-- Selection changes and actions — similarly polite -->
<div class="sr-only" aria-live="polite" aria-atomic="true" id="announcer"></div>
```

`role="alert"` / `aria-live="assertive"` is not used. Loading and selection events are informational, not urgent. Interrupting AT mid-sentence for a row count update is hostile. The single exception is a destructive bulk action confirmation, which should use `role="alertdialog"`.

---

## 3. Keyboard Interaction Model

### Design decision: row-level navigation, not cell-level

The ARIA `grid` specification defines a composite widget where arrow keys navigate between individual cells. This model is appropriate for spreadsheet-style interfaces where every cell is a potential edit target. It is not appropriate here, because:

- Cells contain heterogeneous interactive elements (buttons, multi-value chips, progress bars)
- Arrow-key behaviour is ambiguous on interactive children (does ArrowLeft move to the previous cell, or move focus within a chip group?)
- The F2 "enter edit mode" convention is unknown to most users outside of spreadsheet tools

The implemented model: **rows are the navigation unit**.

| Key | Context | Behaviour |
|---|---|---|
| `Tab` | Any context | Moves between toolbar, grid (as single stop), and other page regions |
| `Tab` | Inside focused row | Moves to first interactive element within the row |
| `Escape` | Inside row element | Returns focus to the row |
| `ArrowDown` | Focused row | Focus next row (skips spacer and sentinel elements) |
| `ArrowUp` | Focused row | Focus previous row |
| `Space` | Focused data row | Toggle selection |
| `Space` | Focused group header row | Toggle group expand/collapse |
| `Enter` | Focused data row | Open asset detail panel |
| `Enter` | Focused group header row | Toggle expand/collapse |

Arrow key navigation does not load new data directly. The `IntersectionObserver` sentinel is positioned 200px before the end of loaded content. As the user arrows down toward the last loaded row, the sentinel enters the viewport and triggers the next load automatically. No manual "load more" button is required.

### Implementation note

Keyboard handling uses event delegation on the grid body element:

```js
gridBody.addEventListener('keydown', e => {
  const row = e.target.closest('[role="row"]');
  if (!row) return;

  // If focus is on an interactive child, only handle Escape
  if (e.target !== row && e.key === 'Escape') {
    e.preventDefault();
    row.focus();
    return;
  }

  // Row-level keys only when the row itself is focused
  if (e.target !== row) return;

  switch (e.key) {
    case 'ArrowDown': focusNextRow(row); e.preventDefault(); break;
    case 'ArrowUp':   focusPrevRow(row); e.preventDefault(); break;
    case ' ':         handleRowSpace(row); e.preventDefault(); break;
    case 'Enter':     handleRowEnter(row); e.preventDefault(); break;
  }
});
```

`e.preventDefault()` on Space prevents the browser's default page-scroll behaviour when a row is focused.

---

## 4. Data Loading Strategy

### Cursor-based, scroll-triggered, with DOM windowing

**Loading trigger:** `IntersectionObserver` watches a sentinel element positioned at the end of the loaded content. `rootMargin: '200px'` means loading begins before the user reaches the last row, eliminating visible loading gaps during normal scroll.

**Batch size:** 100 items per request. Large enough to amortise request overhead; small enough that the 200ms mock latency is not perceptible during scroll.

**DOM cap:** Maximum 500 rows in the DOM at any time. When the count exceeds 600, the oldest 100 rows are pruned:

```js
function pruneTopRows() {
  const body = document.getElementById('grid-body');
  const rows = body.querySelectorAll('[role="row"].data-row');
  if (rows.length <= MAX_DOM_ROWS) return;

  const toPrune = rows.length - MAX_DOM_ROWS;
  const rh = ROW_HEIGHT[state.density];

  for (let i = 0; i < toPrune; i++) {
    rows[i].remove();
    state.prunedTop++;
  }

  // Update spacer so scroll position is preserved
  document.getElementById('top-spacer').style.height = (state.prunedTop * rh) + 'px';

  // Re-index remaining rows
  body.querySelectorAll('[role="row"].data-row').forEach((row, i) => {
    row.setAttribute('aria-rowindex', state.prunedTop + i + 1);
  });
}
```

`aria-rowindex` **must** be updated synchronously after every prune. If it drifts, screen reader users hear incorrect row positions. This is the highest-risk maintenance point in the implementation.

**Row heights are fixed.** Comfortable mode: 52px. Compact mode: 36px. These values are constants, not measured at runtime. Variable-height rows would require either a two-pass measurement strategy (render off-screen, measure, reposition) or a position-lookup table — both are significantly more complex and fragile. The density toggle re-calculates the top spacer height using the new constant: `state.prunedTop × newRowHeight`.

**Back to top:** Resets `state.prunedTop = 0`, clears all rows from the grid body, resets the cursor, and calls `loadMore()` from the beginning. There is no mechanism to scroll back to an arbitrary pruned position — this is an accepted limitation.

### Grouped mode loading

When grouping is active, the loading model changes:

1. A single `fetchGroupMetadata(groupBy)` request returns all group labels, item counts, and aggregate metrics. This is typically fast and small (one row per group).
2. Group header rows are rendered immediately. No item rows are in the DOM.
3. When a group is expanded, `fetchGroupPage(groupId, groupBy, cursor)` loads that group's items. Each group maintains its own cursor.
4. Groups with more than 500 items use the same DOM windowing within the group's rows.
5. Groups with more than 500 items do not show a "load more" button — they show a "View all in filtered view" link that navigates to a standalone filtered view of just that group.

---

## 5. Selection Model

### Intention-based, not DOM-based

Selection state is never derived from the DOM (checkbox `checked` state, row classes). It lives entirely in a state object:

```js
state.selection = {
  mode: 'none',        // 'none' | 'some' | 'all'
  included: new Set(), // item IDs — used when mode='some'
  excluded: new Set(), // item IDs — used when mode='all'
};
```

This model supports "select all across the full dataset including unloaded items" without loading all item IDs. Setting `mode='all'` means "everything except `excluded`". The server resolves the full selection at bulk-action time.

```js
function isSelected(id) {
  if (state.selection.mode === 'none') return false;
  if (state.selection.mode === 'all')  return !state.selection.excluded.has(id);
  return state.selection.included.has(id);
}
```

### Updating the UI without re-rendering

`updateSelectionUI()` patches only the affected DOM nodes — it does not call `renderTable()` or reconstruct rows. On a selection change, it:

1. Updates `aria-selected` on every visible row whose state changed
2. Sets `checked` and `indeterminate` on visible row checkboxes
3. Recomputes and applies tri-state to group-level checkboxes
4. Recomputes and applies tri-state to the header-level checkbox
5. Updates the selection status bar text and bulk action button enabled state
6. Fires the `aria-live` announcer with a description of the change

Re-rendering rows on every selection event at this scale would be noticeably slow (100–500 DOM writes vs 1–5).

### "Select all" UX

When the user activates "Select all in this view" (after checking the header checkbox, a confirmation link appears):

- `state.selection.mode` → `'all'`
- `state.selection.excluded` → cleared
- Status bar shows: `"All items in this view selected"` — not a number, because the API may not provide a total count
- Bulk action confirmation dialogs include: `"This action will apply to all assets matching your current filters, including those not yet loaded."`

This warning is mandatory for destructive actions. It is not optional configuration for the consuming team.

---

## 6. Column Layout

### CSS custom property approach

All rows (header and data) share a single CSS custom property for column widths:

```js
function applyColTemplate() {
  const template = state.columns
    .filter(c => c.visible)
    .map(c => c.width + 'px')
    .join(' ');
  document.getElementById('grid').style.setProperty('--col-template', template);
}
```

Every `.header-row` and `.data-row` uses `grid-template-columns: var(--col-template)`. When columns are shown, hidden, or resized, one property update reflows the entire grid instantly. No per-row width updates, no `<colgroup>` synchronisation, no JavaScript layout measurement.

### Column show/hide

Hidden columns use a CSS class on the grid container rather than inline styles on every cell:

```js
function setColumnVisible(colId, visible) {
  const grid = document.getElementById('grid');
  grid.classList.toggle(`hide-col-${colId}`, !visible);
  applyColTemplate(); // recalculate --col-template without hidden column
}
```

The corresponding CSS:
```css
#grid.hide-col-type     [data-col-id="type"]     { display: none; }
#grid.hide-col-environment [data-col-id="environment"] { display: none; }
/* etc. */
```

This means toggling a column is one class change on one element, not N `style.display` writes across potentially hundreds of visible rows.

### Sticky columns

The `select` and `name` columns are always visible and always sticky. They cannot be hidden or reordered — enforced by the component, not configurable by consumers.

```css
[data-col-id="select"] {
  position: sticky;
  left: 0;
  z-index: 2;
  background: inherit; /* inherits from .data-row which has explicit background */
}

[data-col-id="name"] {
  position: sticky;
  left: 48px; /* width of select column */
  z-index: 2;
  background: inherit;
}
```

**Critical:** `.data-row` must have an explicit `background` value for `inherit` to produce a solid colour. Without it, sticky cells are transparent and scrolling content bleeds through. The explicit value:

```css
.data-row {
  background: var(--bg);
}
```

Hover and selected states override this on the row, and `inherit` on sticky cells picks up the override correctly.

### Sticky group headers

```css
.group-header-row {
  position: sticky;
  top: var(--header-h); /* 41px — height of the column header row */
  z-index: 5;           /* above sticky column cells (z-index: 2), below column header (z-index: 10) */
  background: var(--surface-2);
}
```

Group headers pin beneath the column header as the user scrolls through a group's items. When the next group header scrolls into view, it naturally displaces the previous one — standard browser `position: sticky` behaviour. No JavaScript is involved.

### z-index layering

| Element | z-index | Reason |
|---|---|---|
| Column header row | 10 | Must sit above all content including sticky group headers |
| Sticky column header cells | 3 | Above sticky data cells in same column |
| Group header rows | 5 | Above sticky data cells, below column header |
| Sticky data cells | 2 | Above sibling data cells in same row |
| Focused rows | 1 (relative) | Focus ring must not be clipped by adjacent rows |

---

## 7. Focus Management

### Detail panel

Opening the asset detail panel moves focus to the panel's close button. Closing the panel returns focus to the row that triggered it. The triggering row element is stored in state before the panel opens:

```js
state.panelTriggerEl = document.activeElement;
```

On close:
```js
if (state.panelTriggerEl && document.contains(state.panelTriggerEl)) {
  state.panelTriggerEl.focus();
}
```

### Group collapse

If focus is within an item row when its group is collapsed, focus must move to the group header's expand button. Focus disappearing into a void is a WCAG 2.1 Level A failure (2.4.3 Focus Order).

```js
function collapseGroup(groupId) {
  const body = document.getElementById(`group-body-${groupId}`);
  const expandBtn = document.querySelector(`[data-group-id="${groupId}"] .group-toggle`);
  const focusWasInside = body && body.contains(document.activeElement);

  // Remove item rows
  body.querySelectorAll('[role="row"].data-row').forEach(r => r.remove());

  if (focusWasInside && expandBtn) expandBtn.focus();
}
```

### Loading during keyboard navigation

When the user arrows down to the last loaded row, the sentinel enters the viewport and loading begins. The user's focus remains on the last row. New rows are appended to the DOM below. The user can continue pressing `ArrowDown` — `focusNextRow()` will find the newly appended row on the next keypress.

---

## 8. Code Requirements and Constraints for Implementing Teams

The following are non-negotiable constraints. They exist to maintain accessibility and performance correctness across teams that consume this component.

### Must

- **Fixed row heights.** Comfortable: 52px. Compact: 36px. These values are exported constants. Do not allow content to expand row height. Overflow is `hidden` on cells. If content cannot fit, use a tooltip or detail panel.
- **`aria-rowindex` accuracy.** After every DOM prune, every visible row's `aria-rowindex` must equal `prunedTop + domIndex + 1`. Write a test for this.
- **Selection state in JS, not DOM.** `isSelected(id)` is the authority. DOM checkboxes and `aria-selected` are projections of this state, updated by `updateSelectionUI()` after every state change.
- **Bulk action confirmation for `mode='all'`.** Any destructive bulk action (archive, delete) when `selection.mode === 'all'` must show a confirmation that names the scope explicitly: "all assets matching current filters, including those not yet loaded." This is not optional UX.
- **`aria-live` announcements for load events.** Screen reader users must be informed when new rows load. Use `role="status"` (polite). Do not use `role="alert"`.
- **Focus return on panel close.** The triggering element must receive focus when any modal, panel, or dialog closes.

### Must not

- **Do not re-render the full grid on selection changes.** `updateSelectionUI()` patches the DOM. A full `renderTable()` call on every checkbox click will be perceptibly slow at this scale.
- **Do not remove the `select` or `name` column.** They are always visible and always the leftmost sticky columns. Column visibility UI must not offer these as toggleable.
- **Do not set `aria-rowcount="-1"`.** Update it to the loaded count instead. `-1` has known rendering bugs in VoiceOver iOS.
- **Do not implement cell-level arrow-key navigation.** The row is the navigation unit. Attempting to add cell-level navigation while cells contain mixed interactive content will produce an inconsistent and likely inaccessible experience.
- **Do not use `aria-live="assertive"` for load or selection events.** It interrupts AT reading. Reserve `assertive` for genuine errors.

### Should

- **Use event delegation** on the grid body for row interactions (click, keydown). Attaching event listeners to thousands of individual rows degrades performance and creates listener-management complexity.
- **Test with NVDA + Firefox and VoiceOver macOS + Safari** as the primary AT targets. JAWS + Chrome is a secondary target. VoiceOver iOS is tertiary but should not be actively broken.
- **Write an `aria-rowindex` invariant test** that fires after every prune operation and asserts correctness. This is the most likely ARIA regression vector.
- **Document density constants** in the component's public API. Any consuming team that overrides row heights in CSS will break DOM windowing calculations.

---

## 9. Known Limitations

These are intentional, documented decisions — not oversights.

| Limitation | Reason |
|---|---|
| No back-navigation through pruned rows (other than "Back to top") | Required by DOM windowing. Implementing "load previous" adds a second pagination model and symmetric spacer logic with significant complexity. |
| No total item count displayed | The API does not guarantee a total count. Displaying a stale or estimated count is worse than displaying none. |
| No column drag-and-drop reorder | The accessibility cost of drag-and-drop across N columns with no native keyboard equivalent is not justified in a design system component that must be audited. Column visibility toggle is the supported customisation. |
| No cell-level arrow-key navigation | Mixed interactive cell content (chips, buttons, progress bars) makes the composite widget keyboard model ambiguous and error-prone. Row-level navigation is sufficient for this use case. |
| Groups over 500 items do not expand inline | The expandable-section pattern is not the right UI for 500+ items. A dedicated filtered view is provided instead. |
| VoiceOver iOS `role="grid"` support is partial | This is a browser/AT limitation. Mitigation (accurate `aria-rowcount`, descriptive labels) is applied. A native `<table>` alternative would require abandoning DOM windowing. |

---

## 10. Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, ARIA landmark regions, toolbar, grid skeleton, live regions |
| `styles.css` | Dark theme, CSS custom properties, sticky layout, density variants, column hide/show rules |
| `app.js` | Data generator (10,473 deterministic items), mock cursor-based API, state, rendering, DOM windowing, selection model, keyboard navigation, grouping, column management |

The implementation is self-contained and requires no build step. Open `index.html` in a browser.
