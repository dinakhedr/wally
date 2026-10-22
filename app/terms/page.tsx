import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service · Wally" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="22 October 2026">
      <p>By signing in to Wally you agree to these simple terms.</p>

      <h2>The service</h2>
      <p>
        Wally is a free, personal tool for tracking your own expenses and income. It is provided as-is, without any
        warranty, and may change or stop at any time.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Totals, insights and tips in Wally are for your own information only. They are not financial, tax or investment
        advice, and you are responsible for your own money decisions.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Use Wally only for your own records and keep your Google account secure.</li>
        <li>Don’t try to access other people’s data or disrupt the service.</li>
        <li>Your data stays yours. See the <a className="font-semibold text-violet" href="/privacy">privacy policy</a>.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        Wally is run on a best-effort basis. It is not liable for lost data or for decisions made using it, so keep
        your own copy of anything important.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a className="font-semibold text-violet" href="mailto:dina.khedr@gmail.com">dina.khedr@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
