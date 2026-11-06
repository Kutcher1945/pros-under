'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, Suspense, useEffect, useState, useSyncExternalStore } from 'react';

import styles from '@/components/login/login.module.css';
import { currentUser, homeFor } from '@/lib/access';
import { safeNextPath } from '@/lib/auth';
import { signIn, useOpeka } from '@/lib/store';

const LoginMap = dynamic(() => import('@/components/login/LoginMap').then((m) => m.LoginMap), { ssr: false });

// Emergency-light red/blue dots drifting over the map, as on the ДТП login.
const LIGHT_RED = '#ff2d2d';
const LIGHT_BLUE = '#2979ff';
const DOTS: { axis: 'x' | 'y'; offset: string; duration: number; delay: number; color: string }[] = [
  { axis: 'x', offset: '8%', duration: 9, delay: 0, color: LIGHT_BLUE },
  { axis: 'x', offset: '17%', duration: 12.5, delay: 2.5, color: LIGHT_RED },
  { axis: 'x', offset: '27%', duration: 7.5, delay: 5, color: LIGHT_BLUE },
  { axis: 'x', offset: '38%', duration: 11, delay: 1, color: LIGHT_RED },
  { axis: 'y', offset: '14%', duration: 10, delay: 0.5, color: LIGHT_RED },
  { axis: 'y', offset: '32%', duration: 8, delay: 3, color: LIGHT_BLUE },
  { axis: 'y', offset: '58%', duration: 12, delay: 1.5, color: LIGHT_BLUE },
  { axis: 'y', offset: '80%', duration: 9.5, delay: 4, color: LIGHT_RED },
];

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** OS «reduce motion» setting (as on the ДТП login). */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

function Hero() {
  const reducedMotion = useReducedMotion();
  return (
    <div className={styles.hero}>
      {/* Flashing emergency lights: muted down, and replaced by a still city
          map for people who ask their OS to reduce motion. */}
      {reducedMotion ? (
        <div className={styles.heroMap}>
          <LoginMap zoom={12} withDistricts />
        </div>
      ) : (
        <video className={styles.heroVideo} autoPlay muted loop playsInline preload="auto" poster="/login_poster.jpg" aria-hidden="true">
          <source src="/login_video.mp4" type="video/mp4" />
        </video>
      )}
      <div aria-hidden="true" className={styles.heroShadeSide} />
      <div aria-hidden="true" className={styles.heroShadeBottom} />
      <div className={styles.heroText}>
        <h2>Опека</h2>
        <p>Единый реестр дел несовершеннолетних города Алматы</p>
        <div className={styles.heroStats}>
          <span>Карточки и документы</span>
          <span>Замечания и сроки</span>
          <span>Надзор прокуратуры</span>
        </div>
      </div>
    </div>
  );
}

function PanelBackdrop() {
  return (
    <>
      <LoginMap zoom={13} />
      <div aria-hidden="true" className={styles.scrim} />
      <div aria-hidden="true" className={styles.glowBlue} />
      <div aria-hidden="true" className={styles.glowRed} />
      <div aria-hidden="true" className={styles.dots}>
        {DOTS.map((d, i) => (
          <span
            key={i}
            className={`${styles.dot} ${d.axis === 'x' ? styles.dotX : styles.dotY}`}
            style={{
              ...(d.axis === 'x' ? { top: d.offset } : { left: d.offset }),
              background: d.color,
              boxShadow: `0 0 5px 1px ${d.color}, 0 0 12px 3px ${d.color}`,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>
      <div aria-hidden="true" className={styles.bottomGlow} />
    </>
  );
}

function LoginForm() {
  const snapshot = useOpeka();
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const signedIn = snapshot.status === 'ready' && snapshot.state ? currentUser(snapshot.state, snapshot.userId) : undefined;

  // Already signed in in this tab: skip the form.
  useEffect(() => {
    if (signedIn) router.replace(safeNextPath(params.get('next'), homeFor(signedIn.role)));
  }, [signedIn, params, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!login.trim() || !password) return setError('Введите имя пользователя и пароль.');
    setIsPending(true);
    setError(null);
    // On success the store loads the workspace and the effect above redirects.
    const problem = await signIn(login.trim(), password);
    setIsPending(false);
    if (problem) setError(problem);
  }

  return (
    <div className={styles.page}>
      <Hero />
      <div className={styles.panel}>
        <PanelBackdrop />
        <div className={styles.form}>
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed local /public asset, as on the ДТП login */}
          <img src="/logo_sc.png" alt="Ситуационный центр" className={styles.logo} />
          <h1>Вход в систему</h1>
          <p className={styles.lead}>Вход для уполномоченных сотрудников</p>

          <form onSubmit={handleSubmit} noValidate>
            <label className={styles.label} htmlFor="username">
              Имя пользователя
            </label>
            <input id="username" name="username" autoComplete="username" className={styles.input} value={login} onChange={(e) => setLogin(e.target.value)} disabled={isPending} required />

            <label className={`${styles.label} ${styles.gap}`} htmlFor="password">
              Пароль
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
              />
              <button type="button" className={styles.eye} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                <EyeIcon off={showPassword} />
              </button>
            </div>

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}

            <button type="submit" className={styles.submit} disabled={isPending}>
              {isPending ? 'Вхожу…' : 'Войти'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
