import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "How MobileTechJoint uses cookies and similar technologies.",
};

// See about/page.tsx for why this is needed: the shared SiteFooter reads
// runtime-only env vars the build step never has, so a fully static page
// would bake those in as empty forever without a revalidate window.
export const revalidate = 60;

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Notice" updated="28 October 2026">
      <p>
        This Cookie Notice explains how MobileTechJoint (&quot;MTJ,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) uses cookies and similar technologies when you visit
        or interact with our website. Any personal data collected through these technologies is
        handled in line with our <a href="/privacy-policy">Privacy Notice</a> and applicable data
        protection laws, including the Nigeria Data Protection Act, 2023.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help
        websites function properly, remember your preferences, understand how visitors use the
        site, and, where enabled, support advertising and personalised experiences. Similar
        technologies may include pixels, tags, and local storage.
      </p>

      <h2>How we use cookies</h2>
      <p>Depending on the features available on our website, MTJ may use cookies for the following purposes:</p>
      <ul>
        <li>
          <strong>Essential cookies</strong> — help the website operate, keep shopping-cart items
          in place, support checkout, and maintain website security. These cookies are necessary
          for core services.
        </li>
        <li>
          <strong>Preference cookies</strong> — remember choices such as your preferred settings
          to make your next visit easier.
        </li>
        <li>
          <strong>Analytics and performance cookies</strong> — help us understand how visitors use
          the website, which pages or products are popular, and where the website may need
          improvement.
        </li>
        <li>
          <strong>Advertising and marketing cookies</strong> — where enabled, help measure
          advertising performance and show relevant promotions on our website or other platforms.
        </li>
      </ul>

      <h2>Third-party cookies</h2>
      <p>
        Some cookies may be set by third-party services used on our website, such as analytics,
        payment, embedded content, or advertising providers. These providers may process
        information according to their own privacy policies. We encourage you to review those
        policies where applicable.
      </p>

      <h2>Managing your cookie preferences</h2>
      <p>
        You can manage or disable cookies through your browser settings, and some browsers allow
        you to delete cookies already stored on your device. Disabling certain cookies may affect
        website features, including shopping-cart functions, checkout, or saved preferences.
        Where a cookie preference or consent tool is provided on our website, you can use it to
        manage optional cookies. Essential cookies may remain necessary for the website to
        function.
      </p>

      <h2>Personal data and cookies</h2>
      <p>
        Cookies may collect information such as your device or browser details, pages visited,
        approximate usage patterns, and interactions with website features. Where this
        information identifies or can reasonably be linked to you, we handle it as personal data
        in accordance with our Privacy Notice and applicable law.
      </p>

      <h2>Changes to this notice</h2>
      <p>
        We may update this Cookie Notice from time to time to reflect changes in our website, the
        technologies we use, or legal requirements. Any updated version will be published on this
        page with a revised effective or updated date.
      </p>

      <h2>Contact us</h2>
      <p>
        If you have questions about this Cookie Notice or how MTJ handles information, please{" "}
        <a href="/contact">contact us</a>.
      </p>
    </LegalPage>
  );
}
