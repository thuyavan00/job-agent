export function Layout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-bg-border bg-bg">{sidebar}</aside>

      {/* Center wrapper */}
      <main className="px-2">
        <div className="mx-auto w-full max-w-[1100px] py-6">{children}</div>
      </main>
    </div>
  );
}
