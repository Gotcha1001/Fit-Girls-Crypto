// components/LegalPage.tsx
// Shared shell for /privacy and /terms. Server component, no client JS.
import Link from "next/link";

interface LegalPageProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalPage({
  title,
  updated,
  children,
}: LegalPageProps): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm opacity-60">Last updated: {updated}</p>
      </div>
      <div className="space-y-8 text-sm leading-relaxed">{children}</div>
      <p className="border-t pt-4 text-xs opacity-70">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}
