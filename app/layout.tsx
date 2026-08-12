import { AuthProvider } from '@/contexts/auth-context';
// استورد ملف الـ CSS إذا كان موجوداً لديك، مثلاً:
// import './globals.css'; 

export const metadata = {
  title: 'MrCash',
  description: 'Rewards and Offerwalls platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
