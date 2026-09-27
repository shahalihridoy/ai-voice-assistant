import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinic Q&A",
  description: "Ask questions about the clinic.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
