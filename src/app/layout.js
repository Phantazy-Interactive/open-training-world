import './globals.css';

export const metadata = {
  title: 'Open Training World',
  description: 'A gamified 2D cycling world connecting indoor training apps',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white antialiased">{children}</body>
    </html>
  );
}
