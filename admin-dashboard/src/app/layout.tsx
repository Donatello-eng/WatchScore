import "./globals.css";

export const metadata = { title: "Watch Admin" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            minHeight: "100vh",
          }}
        >
          <aside style={{ padding: 16, borderRight: "1px solid #eee" }}>
            <h2>Admin</h2>
            <nav>
              <a href="/admin/sessions">Sessions</a>
            </nav>
          </aside>
          <main style={{ padding: 24 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
