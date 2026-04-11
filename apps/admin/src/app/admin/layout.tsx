import Sidebar from '@/components/admin/Sidebar';
import AuthGuard from '@/components/admin/AuthGuard';
import { ToastProvider } from '@/components/admin/Toast';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ToastProvider>
        <div className={styles.layout}>
          <Sidebar />
          <main className={styles.main}>{children}</main>
        </div>
      </ToastProvider>
    </AuthGuard>
  );
}
