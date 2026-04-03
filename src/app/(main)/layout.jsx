'use client';

import AppLayout from '@/components/layout/AppLayout';
import ScannerProvider from '@/providers/ScannerProvider';

export default function MainLayout({ children }) {
  return (
    <ScannerProvider>
      <AppLayout>{children}</AppLayout>
    </ScannerProvider>
  );
}
