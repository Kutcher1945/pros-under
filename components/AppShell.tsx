'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { canOpenPage, currentUser, homeFor, initials, navFor, type PageId, ROLE_LABELS } from '@/lib/access';
import { isoDay } from '@/lib/dates';
import { reloadWorkspace, signOut, useOpeka } from '@/lib/store';
import { incomingCount } from '@/lib/views';

import { Icon, type IconName } from './Icon';
import { APP_ROOT_ID } from './Modal';
import { type Session, SessionContext, useSession } from './Session';
import styles from './sidebar.module.css';
import { ThemeToggle } from './ThemeToggle';
import { Note, ui } from './ui';

const LOGIN_PATH = '/login';

// Set by «Выйти» so the signed-out redirect below goes to a plain /login —
// without ?next=, which would send the next person to this user's page.
let isExplicitSignOut = false;
const TODAY_REFRESH_MS = 60_000;

const NAV_ICONS: Record<PageId, IconName> = {
  overview: 'grid',
  registry: 'folder',
  signals: 'bell',
  tasks: 'clock',
  users: 'users',
  settings: 'settings',
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className={styles.brand}>
      <Image aria-hidden src="/logo_sc_small.png" alt="" width={38} height={38} priority />
      <span>
        <span className={styles.brandName}>Опека</span>
        <span className={styles.brandSub}>Реестр и надзор</span>
      </span>
    </Link>
  );
}

function Sidebar() {
  const { state, me } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const incoming = incomingCount(state, me);

  function logout() {
    isExplicitSignOut = true;
    void signOut();
    router.replace(LOGIN_PATH);
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <Brand href={homeFor(me.role)} />
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={isMenuOpen}
          aria-controls="sidebar-drawer"
          aria-label={isMenuOpen ? 'Скрыть меню' : 'Показать меню'}
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          <Icon name={isMenuOpen ? 'x' : 'menu'} />
        </button>
      </div>

      <div id="sidebar-drawer" className={clsx(styles.drawer, isMenuOpen && styles.drawerOpen)}>
        <div className={styles.navLabel}>Рабочее пространство</div>
        <nav className={styles.nav} aria-label="Разделы">
          {navFor(me.role).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.navItem}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon name={NAV_ICONS[item.id]} />
              {item.label}
              {item.id === 'signals' && incoming > 0 && (
                <span className={styles.navCount} aria-label={`${incoming} входящих`}>
                  {incoming}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.spacer} />

      <div className={clsx(styles.drawer, isMenuOpen && styles.drawerOpen)}>
        <div className={styles.workspace}>
          <span className={styles.online} aria-hidden />
          Рабочее пространство
          <strong>{me.org}</strong>
        </div>
        <div className={styles.userCard}>
          <span className={styles.userAvatar} aria-hidden>
            {initials(me.name)}
          </span>
          <span className={styles.userText}>
            <strong>{me.name}</strong>
            <span>{ROLE_LABELS[me.role]}</span>
          </span>
        </div>
        <div className={styles.userActions}>
          <button type="button" className={clsx(styles.logout, 'app-header-btn')} onClick={logout}>
            <Icon name="logout" />
            Выйти
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function Crumb() {
  const { me } = useSession();
  const pathname = usePathname();
  const item = navFor(me.role).find((n) => isActive(pathname, n.href));
  const isCard = pathname.startsWith('/registry/');
  return (
    <p className={styles.crumb}>
      Рабочее пространство / <b>{item?.label ?? ''}</b>
      {isCard && <b> / Карточка дела</b>}
    </p>
  );
}

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <span style={{ color: 'var(--ink-mute)', fontSize: 13 }} role="status">
        Загрузка…
      </span>
    </div>
  );
}

function Notice({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className={ui.panel} style={{ maxWidth: 480, padding: 24 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>{title}</h1>
        <p style={{ margin: '0 0 18px', color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.6 }}>{text}</p>
        <div className={ui.actions}>{children}</div>
      </div>
    </div>
  );
}

function SignedInShell({ children }: { children: ReactNode }) {
  const snapshot = useOpeka();
  const router = useRouter();
  const [today, setToday] = useState(isoDay);
  const me = snapshot.state ? currentUser(snapshot.state, snapshot.userId) : undefined;
  const isSignedOut = snapshot.status === 'signed-out' || (snapshot.status === 'ready' && !me);

  // Keeps deadlines, overdue marks and date limits right after midnight.
  useEffect(() => {
    const timer = setInterval(() => setToday(isoDay()), TODAY_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // No session (or the profile was blocked): sign in first, then come back here.
  useEffect(() => {
    if (!isSignedOut) {
      isExplicitSignOut = false;
      return;
    }
    if (isExplicitSignOut) return;
    const back = window.location.pathname + window.location.search;
    router.replace(back === '/' ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(back)}`);
  }, [isSignedOut, router]);

  async function leave() {
    isExplicitSignOut = true;
    await signOut();
    router.replace(LOGIN_PATH);
  }

  if (snapshot.status === 'no-access') {
    return (
      <Notice title="Нет доступа к «Опеке»" text={`${snapshot.error ?? ''} Обратитесь к администратору системы.`}>
        <button type="button" className={clsx(ui.btn, ui.primary)} onClick={leave}>
          Войти под другой учётной записью
        </button>
      </Notice>
    );
  }
  if (snapshot.status === 'error' && !snapshot.state) {
    return (
      <Notice title="Не удалось загрузить данные" text={snapshot.error ?? 'Сервер недоступен.'}>
        <button type="button" className={clsx(ui.btn, ui.primary)} onClick={() => void reloadWorkspace()}>
          Повторить
        </button>
        <button type="button" className={ui.btn} onClick={leave}>
          Выйти
        </button>
      </Notice>
    );
  }
  if (!snapshot.state || !me) return <Loading />;

  const session: Session = { state: snapshot.state, me, today };
  return (
    <SessionContext.Provider value={session}>
      <div id={APP_ROOT_ID} className={styles.frame}>
        <Sidebar />
        <div className={styles.content}>
          <Crumb />
          {snapshot.error && <Note warn>Данные могли устареть: {snapshot.error}</Note>}
          <main>{children}</main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}

/** Sidebar frame and session for every screen except the login page. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === LOGIN_PATH) return children;
  return <SignedInShell>{children}</SignedInShell>;
}

/** Sends a role that may not open this page to its own home, like the prototype. */
export function RoleGate({ page, children }: { page: PageId; children: ReactNode }) {
  const { me } = useSession();
  const router = useRouter();
  const allowed = canOpenPage(me.role, page);
  useEffect(() => {
    if (!allowed) router.replace(homeFor(me.role));
  }, [allowed, me.role, router]);
  return allowed ? children : null;
}

export function HomeRedirect() {
  const { me } = useSession();
  const router = useRouter();
  useEffect(() => {
    router.replace(homeFor(me.role));
  }, [me.role, router]);
  return null;
}
