import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { TopLoader } from "@/components/TopLoader";
import { Toaster } from "@/components/shadcn/sonner";
import { TooltipProvider } from "@/components/shadcn/tooltip";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const CONTRACT = `<!--
THESIS: Statement rows you can trust become a plan; refuses the soft pastel finance-app look (glass, blobs, pills, puffy cards).
OWN-WORLD: Modern minimal white + blue on shadcn/ui primitives: light cool-blue canvas, white bordered panels, 1px hairlines, 8-10px corners, labelled sections, right-aligned tabular numbers; blue only for primary action, active nav, links, focus, key figures. One family: IBM Plex Sans Thai.
STORY: See every statement row balance-checked, read where salary went, act: upload this month (streak +1).
FIRST VIEWPORT: Landing: headline + primary button left, a bordered statement-check table + plan summary right. App: page header with primary action right; overview stat strip first.
FORM: brief-pinned (beats roll); seed eceb3424.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export const metadata: Metadata = {
  title: "FirstJobJab — Statement ของคุณ → แผนการเงิน",
  applicationName: "FirstJobJab",
  description: "FirstJobJab: อัปโหลด statement ธนาคาร แล้วรู้ว่าเงินเดือนไปไหน วางแผนออม ภาษี และความพร้อมยื่นกู้",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" data-scroll-behavior="smooth" className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <TopLoader />
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
