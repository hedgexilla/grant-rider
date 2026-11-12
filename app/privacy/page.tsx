export const metadata = {
  title: "Granted Copilot Privacy Policy"
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px", lineHeight: 1.6 }}>
      <h1>Granted Copilot Privacy Policy</h1>
      <p>Last updated: November 11, 2026</p>

      <h2>What the extension does</h2>
      <p>
        Granted Copilot fills grant application forms with details from your Granted founder
        profile. You review every answer and submit the form yourself. The extension never submits
        a form for you.
      </p>

      <h2>Data the extension uses</h2>
      <ul>
        <li>
          <strong>Your founder profile</strong> (company name, founder name, industry, locations,
          funding needs and draft answers), downloaded from the Granted dashboard you connect it to.
        </li>
        <li>
          <strong>Your dashboard address and password</strong>, used only to download your profile.
        </li>
        <li>
          <strong>Form field labels on the page you are viewing</strong>, read in your browser to
          decide which answer goes in which field.
        </li>
      </ul>

      <h2>Where data is stored and sent</h2>
      <p>
        Your profile, dashboard address and password are stored locally in your browser using
        Chrome extension storage. The extension sends requests only to the Granted dashboard you
        configure. It does not collect browsing history, does not read the contents of pages beyond
        form field labels, and does not send page content to Abena DMS or anyone else.
      </p>

      <h2>Sharing and sale</h2>
      <p>
        We do not sell or share your data with third parties, and we do not use it for advertising
        or credit decisions.
      </p>

      <h2>Removing your data</h2>
      <p>
        Removing the extension from Chrome deletes everything it stored. Questions:{" "}
        <a href="mailto:shariftarver@gmail.com">shariftarver@gmail.com</a>.
      </p>
    </main>
  );
}
