# Chrome Web Store submission: copy and paste

Upload `dist/granted-copilot.zip` at https://chrome.google.com/webstore/devconsole

## Store listing tab
- **Name:** Granted Copilot: Grant Application Autofill (taken from the zip)
- **Summary:** Fills grant application forms from your Granted founder profile. You review every answer and submit on the grant site.
- **Category:** Productivity (Workflow & Planning)
- **Language:** English
- **Description:**

  Granted Copilot saves hours on grant applications.

  Open a grant from your Granted dashboard and the extension fills the application with your
  company details and draft answers: company name, founder, industry, locations, focus areas,
  problem statement, solution, impact and use of funds.

  You stay in control. Every field is highlighted so you can review it, and you press the grant
  site's own Submit button. The extension never submits for you.

  Works on most grant portals, including Grants.gov, Submittable, Typeform and custom forms.
  Requires a Granted dashboard account.

- **Icon:** `extension/icons/icon-128.png`
- **Screenshots:** at least one at 1280×800. Use `dist/screenshot-1280x800.png` if present;
  otherwise take one of a filled-in grant form.

## Privacy tab
- **Single purpose:** Fill grant application forms with the user's saved founder profile so they can review and submit them.
- **Permission justifications:**
  - `storage`: saves the user's founder profile and dashboard settings locally.
  - `tabs`: finds the active tab to fill and opens the dashboard.
  - `scripting`: adds the form-filling script to a tab when the user clicks Autofill.
  - `sidePanel`: shows the profile and answer helper in Chrome's side panel.
  - `contextMenus`: adds "Autofill Grant Form" to the right-click menu.
  - Host permission (all sites): grant applications are hosted on many different websites, so
    the extension must be able to detect and fill forms on whichever site the user is applying on.
- **Remote code:** No, I am not using remote code.
- **Data usage:** check "Personally identifiable information" and "Authentication information".
  Check all three certifications (not sold, not used for unrelated purposes, not used for credit).
- **Privacy policy URL:** https://grant-rider.vercel.app/privacy

## Distribution tab
- **Visibility:** Unlisted (only people with the link can install)
- **Regions:** All regions

Review usually takes 1–3 business days; the all-sites permission can make it take longer.
After approval, send your cofounder the store link plus `extension/INSTALL.md`.
