import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Home, Users, Trophy, LogOut, Menu, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    return <>{children}</>;
  }

  const navigation = [
    { name: 'Início', href: '/', icon: Home },
    { name: 'Partidas', href: '/games', icon: Trophy },
    ...(user.role === 'admin'
      ? [{ name: 'Usuários', href: '/admin/users', icon: Users }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-icon.png" 
                alt="Gardenal" 
                width={32} 
                height={32}
                className="rounded"
              />
              <h1 className="text-lg font-bold text-primary-600">
                Gardenal Domino
              </h1>
            </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-white pt-16">
            <nav className="px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                <Settings className="mr-3 h-5 w-5" />
                Configurações
              </Link>

              <Button
                variant="ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-start px-4 py-3 text-base font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </Button>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="px-4">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{user.role}</p>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3 w-full">
              <Image 
                src="/logo-icon.png" 
                alt="Gardenal" 
                width={40} 
                height={40}
                className="rounded"
              />
              <h1 className="text-lg font-bold text-primary-600">Gardenal Domino</h1>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 overflow-y-auto">
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              <Link
                href="/settings"
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Settings className="mr-3 h-5 w-5" />
                Configurações
              </Link>
            </nav>

            <div className="flex-shrink-0 border-t border-gray-200">
              <div className="px-4 py-4">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{user.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
