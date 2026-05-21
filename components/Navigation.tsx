'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Calendar, PlusCircle } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Tổng quan',
      href: '/',
      icon: Home,
    },
    {
      label: 'Thành viên',
      href: '/members',
      icon: Users,
    },
    {
      label: 'Sự kiện',
      href: '/activities',
      icon: Calendar,
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white/70 dark:bg-zinc-900/75 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl shadow-zinc-200/10 dark:shadow-black/20 px-6 py-3 transition-all duration-300">
      <ul className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 group relative transition-all duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium scale-105'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
                      : 'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-wide">{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
