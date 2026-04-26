# Implementation TODO

## Phase: Dashboard Improvements

- [x] 1. script.js — Add debounce + validation utilities
- [x] 2. admin.js — Debounced search + form validation + year validation
- [x] 3. index.html — Add <noscript> fallback
- [x] 4. admin.html — Add <noscript> fallback
- [x] 5. style.css — Noscript styles + admin responsive improvements

## Details

### script.js changes
- Add `debounce(fn, delay)` utility
- Add `validateLength(value, min, max)`
- Add `validateYear(dateString)` — checks 4-digit year >= current year
- Add `validateNumber(value, min, max)`
- Expose all via `DashboardUtils`

### admin.js changes
- Replace `updateSearch` with debounced version
- In `saveItem()`: validate title (2-200), content/description (2-2000), subject/category (0-100), date year (4 digits >= current year), duration (1-480), totalMarks (1-10000)
- Add `minlength`, `maxlength`, `min`, `max` HTML5 attributes to form templates

### HTML changes
- Add `<noscript>` block with fallback message in both `index.html` and `admin.html`

### style.css changes
- Add `.noscript-fallback` styles
- Make `.search-shell` full-width on mobile
- Improve modal padding on small screens
- Ensure `.pagination-bar` and `.record-card-actions` wrap properly
