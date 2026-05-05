import { Space_Grotesk, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const monoFont = Source_Code_Pro({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Campus Notification Inbox",
  description: "Priority notification inbox with filters and pagination",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
