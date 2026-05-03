import "./globals.css";

export const metadata = {
  title: "Channel Scope",
  description:
    "AI-powered YouTube channel analytics with channel audit, video breakdowns, and competitor insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
