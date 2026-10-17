// app/components/LegalLinks.tsx
// Small footer strip. Server component, so it works for signed-out visitors too.
import Link from "next/link";

export function LegalLinks(): React.JSX.Element {
  return (
    <footer className="relative z-10 border-t px-4 py-4 text-center text-xs opacity-70">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/terms" className="underline-offset-2 hover:underline">
          Terms of Use
        </Link>
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
      </nav>
      <p className="mt-1">You must be 18 or older to use this site.</p>
    </footer>
  );
}
