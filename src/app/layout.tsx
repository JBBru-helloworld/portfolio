import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Joshua Bonham",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
