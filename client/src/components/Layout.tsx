export function Layout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden grid grid-cols-[260px_1fr]">
      <aside className="h-screen overflow-y-auto border-bg-border bg-bg">{sidebar}</aside>

      {/* Scrollable content area */}
      <main className="h-screen overflow-y-auto px-2">
        <div className="mx-auto w-full max-w-[1100px] py-6">{children}</div>
      </main>
    </div>
  );
}
