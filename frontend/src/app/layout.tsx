import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "תקציב משפחתי",
  description: "מעקב הוצאות משפחתי חודשי",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-heebo bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster
          position="bottom-right"
          richColors
          dir="rtl"
          toastOptions={{
            style: { fontFamily: "Heebo, sans-serif" },
          }}
        />
      </body>
    </html>
  );
}
