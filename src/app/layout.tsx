import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerInitializer from "./ServiceWorkerInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "nbrcd",
  description: "A philosophical chat application",
  icons: {
    icon: "/nbrcd_logo.png",
    apple: "/nbrcd_logo.png", // iPhone用アイコン
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body className={inter.className}>
        <ServiceWorkerInitializer />
        {children}
      </body>
    </html>
  );
}