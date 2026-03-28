# JobHunt AI — Page Design Spec (Desktop-first)

## Global Styles (All pages)
- Layout system: CSS Grid for page scaffolding (header/content), Flexbox for component alignment.
- Design tokens:
  - Background: #0B1220 (page), #111A2E (cards)
  - Text: #E6EAF2 (primary), #AAB3C5 (muted)
  - Accent: #6D5EF6 (primary), #22C55E (success), #EF4444 (danger)
  - Border: rgba(255,255,255,0.08), radius 12px
  - Typography: 14/16/18 body scale; 24/32 headings; monospace for keyword chips optional
  - Buttons: solid primary + subtle secondary; hover = +6% brightness; disabled = 40% opacity
  - Links: accent color; underline on hover
- Responsive behavior:
  - Desktop (≥1024px): 2-column wizard layout
  - Tablet (768–1023px): stacked with sticky actions row
  - Mobile (≤767px): single column, collapsible panels (optional)
- App shell:
  - Top nav: logo left; nav links (Wizard, Library); auth area right (Sign in / User menu)
  - Toasts: bottom-right for save/delete/errors

---

## Page: Resume Optimization Wizard (Home)
### Meta Information
- Title: “JobHunt AI — Resume Optimization Wizard”
- Description: “Tailor your resume to a job post, edit results, download PDF, and save versions.”
- Open Graph: title + short description; no sensitive user data in OG.

### Page Structure
- Desktop layout: 12-col grid; left 7 cols (inputs + editor), right 5 cols (actions + preview/keywords).
- Sticky action panel on the right: Generate, Regenerate, Save, Download PDF.

### Sections & Components
1. Header bar (global)
2. Wizard Stepper (horizontal)
   - Steps: Job Post → Resume → Optimize → Edit & Export
   - Shows completion states and enables back navigation.
3. Job Post Panel
   - Inputs: Job Title (optional), Company (optional), URL (optional), Job description textarea (required)
   - Actions: “Save job post” (enabled after sign-in) and “Clear”
4. Resume Panel
   - Upload area: drag/drop + browse; supported types hint; progress state
   - Alternative: “Start from blank” button
   - Extracted text preview (read-only) with “Replace upload” action
5. Optimize Panel
   - Options: tone (segmented control), length (1-page/2-page)
   - Primary CTA: “Generate optimized resume”
   - Loading state: skeleton blocks + cancel disabled
   - Error state: inline alert with retry
6. Editor Panel
   - Two modes:
     - Structured sections (accordion per section)
     - Plain text (single editor)
   - Keyword highlighting: optional toggle using extractedKeywords
   - Unsaved changes indicator
7. Right Sidebar
   - Keyword chips: extracted keywords, click to highlight in editor
   - Export card:
     - PDF template selector (single default)
     - “Download PDF” button
   - Save card:
     - Resume title input
     - “Save” button; if signed out, shows “Sign in to save” prompt

---

## Page: My Library
### Meta Information
- Title: “JobHunt AI — My Library”
- Description: “View, reopen, and delete saved resumes and job posts.”

### Page Structure
- Desktop: split view with tabs on the left and detail pane on the right.
  - Left: list + search
  - Right: selected item details

### Sections & Components
1. Header bar (global)
2. Library Tabs
   - Tabs: Resumes | Job Posts
3. List Toolbar
   - Search input (client-side filter)
   - Sort: Updated desc (default)
4. Items List (cards)
   - Resume card: title, linked job title/company (if present), updated time, actions (Open, Delete)
   - Job post card: title/company, created time, actions (View, Delete)
5. Detail Pane
   - Resume detail:
     - Metadata, linked job post summary
     - Buttons: “Open in Wizard”, “Download PDF”, “Delete”
   - Job post detail:
     - Full description, URL (if set), “Delete”
6. Delete Confirmation Modal
   - Requires explicit confirmation; shows what will be removed (resume record + optional stored PDF).

---

## Page: Sign in / Create account
### Meta Information
- Title: “JobHunt AI — Sign in”
- Description: “Sign in to save and manage your resumes and job posts.”

### Page Structure
- Centered auth card on a simple background; max width 420px.

### Sections & Components
1. Auth Card
   - Tabs: Sign in | Create account
   - Fields: email, password
   - Primary button: submit
   - Secondary: “Forgot password?” (opens reset form)
2. States
   - Inline field validation
   - Error banner for auth failures
   - Loading spinner on submit
3. Post-auth behavior
   - Redirect to Wizard; show toast “Signed in”.
