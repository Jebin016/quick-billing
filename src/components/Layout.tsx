import React from 'react';
import { LayoutDashboard, Package, History, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'checkout' | 'inventory' | 'history';
  setActiveTab: (tab: 'checkout' | 'inventory' | 'history') => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const navItems = [
    { id: 'checkout', label: 'Checkout', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'history', label: 'History', icon: History },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-secondary pb-20 md:pb-0">
      {/* Sidebar (Desktop) / Top Bar (Mobile) */}
      <aside className="w-full md:w-64 bg-primary text-secondary p-4 md:p-6 flex flex-row md:flex-col items-center md:items-stretch justify-between md:justify-start gap-8 sticky top-0 z-50 md:relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-accent rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight">QuickScan</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                activeTab === item.id 
                  ? "bg-accent text-white shadow-lg" 
                  : "hover:bg-accent/20 text-secondary/80 hover:text-secondary"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-all duration-200 md:mt-auto"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </aside>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary border-t border-white/10 flex justify-around items-center p-2 z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200",
              activeTab === item.id 
                ? "text-accent" 
                : "text-secondary/60"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
