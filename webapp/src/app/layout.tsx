import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const noto = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto", display: "swap" });
const mincho = Shippori_Mincho({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-mincho", display: "swap" });

export const metadata: Metadata = {
  title: { default: "こいまち｜AIが相性で選ぶ、近くの出会い", template: "%s｜こいまち" },
  description: "恋愛タイプ診断と価値観・趣味・距離から、AIがあなたと相性のいい人を紹介するマッチングアプリ。全員年齢確認済み。",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${noto.variable} ${mincho.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
