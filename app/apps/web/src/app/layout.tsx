import type { Metadata, Viewport } from "next";
import { Anuphan, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

// Display face for money figures and headlines: geometric Thai loopless with Latin numerals that read bold at size.
const display = Anuphan({ variable: "--font-anuphan", subsets: ["thai", "latin"], weight: ["600", "700"] });

const CONTRACT = `<!--
THESIS: Statement rows you can trust become a plan; refuses the generic expense-tracker pie dashboard.
OWN-WORLD: Brief-pinned Dime-like blue/sky. Glass for chrome (top bar, tab bar, dialogs, navy-tinted hero money card) over a soft blue-to-sky field with two blurred blobs; neumorphic soft cards, inputs and toggles; solid blue pill primary; Anuphan display numerals, IBM Plex Sans Thai UI.
STORY: See a statement get balance-checked row by row, understand where salary went, act: upload this month (streak +1).
FIRST VIEWPORT: Landing: headline + one primary pill left; right, a statement strip whose rows tick into a glass plan card. App: big net figure in the glass hero card first.
FORM: brief-pinned world (beats roll); seed eceb3424.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export const metadata: Metadata = {
  title: "FirstJobJab — Statement ของคุณ → แผนการเงิน",
  applicationName: "FirstJobJab",
  description: "FirstJobJab: อัปโหลด statement ธนาคาร แล้วรู้ว่าเงินเดือนไปไหน วางแผนออม ภาษี และความพร้อมยื่นกู้",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E4EDF8" },
    { media: "(prefers-color-scheme: dark)", color: "#172235" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plex.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
