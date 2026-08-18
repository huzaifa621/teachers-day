import './globals.css';

export const metadata = {
  title: "Teachers' Day Postcard Portal",
  icons: { icon: '/masai_logo.png' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
