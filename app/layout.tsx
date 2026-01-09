import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OK AI Community",
  description: "AI 개발 일지를 공유하고 교류하는 커뮤니티",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
