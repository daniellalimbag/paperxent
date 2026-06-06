export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper-100 text-paper-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-8">
        <header className="flex items-center justify-between border-b border-paper-line pb-5">
          <span className="text-lg font-semibold tracking-wide">PaperXent</span>
          <span className="text-sm text-paper-muted">Platform scaffold</span>
        </header>

        <div className="max-w-3xl py-20">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-sage-700">
            Paper trading and analytics
          </p>
          <h1 className="text-5xl font-semibold leading-tight text-paper-ink md:text-7xl">
            A quiet desk for testing strategy before capital is on the line.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-paper-muted">
            The architecture is ready for market data, simulated orders, portfolios, and risk
            reporting. Business logic intentionally starts blank.
          </p>
        </div>

        <div className="grid gap-4 border-t border-paper-line pt-5 text-sm text-paper-muted md:grid-cols-3">
          <span>Next.js App Router</span>
          <span>Express API</span>
          <span>PostgreSQL, Prisma, Redis</span>
        </div>
      </section>
    </main>
  );
}
