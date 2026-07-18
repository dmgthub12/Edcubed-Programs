import "./globals.css";

export const metadata = {
  title: "edcubed Programs",
  description: "edcubed student programs portal"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
