import { LoginButton } from "./LoginButton";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { error, deleted } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={96} height={96} className="rounded-[26px] shadow-lg shadow-violet/30" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Wally</h1>
      <p className="mt-2 text-muted">Knows where your money goes.</p>

      <div className="mt-10 w-full">
        <LoginButton />
        {error && <p className="mt-4 text-sm text-coral">Sign-in didn’t work. Please try again.</p>}
        {deleted && <p className="mt-4 text-sm text-muted">Your account and all its data have been deleted.</p>}
      </div>

      <p className="mt-8 max-w-xs text-xs text-muted">
        Your data is private to your account. Nobody else — not even friends using Wally — can see it.
      </p>
      <p className="mt-4 flex gap-4 text-xs font-semibold text-muted">
        <a href="/privacy" className="hover:text-violet">Privacy policy</a>
        <a href="/terms" className="hover:text-violet">Terms of service</a>
      </p>
    </main>
  );
}
