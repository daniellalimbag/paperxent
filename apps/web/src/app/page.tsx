import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-100 px-4">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,139,111,0.18),transparent)]"
        aria-hidden
      />
      <div className="relative text-center max-w-lg">
        <h1 className="text-4xl font-bold text-paper-ink mb-3 tracking-tight">PaperXent</h1>
        <p className="text-paper-muted text-lg mb-10 leading-relaxed">
          Paper trading and portfolio analytics — practice strategies without risking capital.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-sage-600 text-white rounded-md hover:bg-sage-700 transition-colors shadow-sm font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-white text-paper-ink border border-paper-line rounded-md hover:bg-paper-50 transition-colors font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
