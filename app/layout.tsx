import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "热点资源建议 MVP",
  description: "面向游戏运营和活动策划的区域热点资源建议工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
