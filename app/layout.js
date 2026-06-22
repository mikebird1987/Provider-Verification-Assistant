export const metadata = {
  title: "Provider Verification Assistant",
  description: "Search the CMS/NPPES NPI Registry.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
