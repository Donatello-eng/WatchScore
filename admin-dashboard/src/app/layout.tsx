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
        <main style={{ padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
