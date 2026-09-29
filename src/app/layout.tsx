import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeChat | Random Audio Roulette",
  description: "Connect randomly and chat instantly with strangers around the world using just your voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
