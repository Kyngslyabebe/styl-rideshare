'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Car, Users, MapPin, CreditCard,
  Tag, Key, Settings, Menu, X, MessageSquare, ShieldAlert, Heart, Megaphone, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', Icon: LayoutDashboard },
  { label: 'Drivers', href: '/admin/drivers', Icon: Car },
  { label: 'Riders', href: '/admin/riders', Icon: Users },
  { label: 'Rides', href: '/admin/rides', Icon: MapPin },
  { label: 'Payments', href: '/admin/payments', Icon: CreditCard },
  { label: 'Promos', href: '/admin/promos', Icon: Tag },
  { label: 'Subscriptions', href: '/admin/subscriptions', Icon: Key },
  { label: 'Ride Flags', href: '/admin/flags', Icon: ShieldAlert },
  { label: 'Favorites', href: '/admin/favorites', Icon: Heart },
  { label: 'Support Tickets', href: '/admin/tickets', Icon: MessageSquare },
  { label: 'Marketing', href: '/admin/marketing', Icon: Megaphone },
  { label: 'Settings', href: '/admin/settings', Icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button type="button" className={styles.hamburger} onClick={() => setOpen(!open)} aria-label="Menu">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay on mobile */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <img src="/logo-dark.svg" alt="STYL" className={styles.logoImg} />
          <span className={styles.logoText}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => setOpen(false)}
              >
                <item.Icon size={18} strokeWidth={2} />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} strokeWidth={2} />
          <span className={styles.navLabel}>Log out</span>
        </button>
      </aside>
    </>
  );
}
