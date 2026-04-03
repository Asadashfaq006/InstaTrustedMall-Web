import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlobalScanToggle from '@/components/scanner/GlobalScanToggle';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={
        isMobile
          ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : ''
      }>
        <Sidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto relative min-w-0">
        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 bg-white border-b border-border lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg tracking-tight">
              <span className="text-indigo-600 font-bold">Insta</span>
              <span className="text-text-primary font-bold">Mall</span>
            </h1>
          </div>
        )}
        {children}
        {/* Floating global scan toggle */}
        <div className="fixed bottom-6 right-6 z-[9990]">
          <GlobalScanToggle />
        </div>
      </main>
    </div>
  );
}
