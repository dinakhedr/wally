import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Wally" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="22 October 2026">
      <p>
        Wally is a personal expense tracker run by Dina Khedr for herself, friends and family. This page explains what
        Wally stores and how it is used.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From Google sign-in:</strong> your name, email address and profile picture. Wally does not get your
          Google password and cannot read your Gmail, Drive or any other Google data.
        </li>
        <li>
          <strong>What you enter:</strong> expenses, income, categories, budgets, bills, installments and savings goals.
        </li>
        <li>
          <strong>Your time zone</strong>, stored in a cookie so “today” matches your phone.
        </li>
      </ul>

      <h2>How it is used</h2>
      <p>
        Only to run Wally for you: showing your spending, budgets and insights. Your data is never sold, shared with
        advertisers, or used for anything else. There are no ads and no third-party tracking.
      </p>

      <h2>Who can see it</h2>
      <p>
        Only you. Every record is tied to your account and the database enforces that no other user can read or change
        it. Data is stored with Supabase and the app is hosted on Vercel, who process it only to provide those services.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any entry inside the app. To delete your whole account and everything in it, email{" "}
        <a className="font-semibold text-violet" href="mailto:dina.khedr@gmail.com">dina.khedr@gmail.com</a> and it will
        be removed within 30 days.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a className="font-semibold text-violet" href="mailto:dina.khedr@gmail.com">dina.khedr@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
