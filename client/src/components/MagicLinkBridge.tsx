import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import pushNotifications from '../services/pushNotification.service';

/**
 * Intercepts `?mt=<token>` on page load (from email "View in Roadmap" button).
 * Exchanges the magic token for a fresh session via /auth/magic-link — so the
 * email recipient is always signed in as themselves, even if a different user
 * was already logged in on the browser. Then strips `mt` from the URL.
 */
export default function MagicLinkBridge({ children }: { children: React.ReactNode }) {
  const [exchanging, setExchanging] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).has('mt');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!exchanging) return;

    const params = new URLSearchParams(window.location.search);
    const mt = params.get('mt');
    if (!mt) {
      setExchanging(false);
      return;
    }

    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000/api';

    (async () => {
      try {
        const res = await fetch(`${apiBase}/auth/magic-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: mt }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data?.success && data?.data) {
          const { user, accessToken, refreshToken } = data.data;
          const currentEmail = useAuthStore.getState().user?.email;
          useAuthStore.getState().login(user, accessToken, refreshToken);
          if (currentEmail && currentEmail !== user.email) {
            toast.success(`Signed in as ${user.name}`);
          }

          // Re-sync push subscription under the new user's ID. Backend upserts
          // by endpoint, so the same browser endpoint gets re-linked to this
          // user — future push notifications route correctly. Only runs if
          // permission is already granted (won't prompt).
          if (pushNotifications.isSupported() && pushNotifications.getPermission() === 'granted') {
            pushNotifications.subscribe().catch(() => {});
          }
        } else {
          toast.error(data?.message || 'This link has expired. Please sign in manually.');
        }
      } catch {
        toast.error('Could not verify the link. Please sign in manually.');
      } finally {
        const cleanParams = new URLSearchParams(window.location.search);
        cleanParams.delete('mt');
        const qs = cleanParams.toString();
        const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
        setExchanging(false);
      }
    })();
  }, [exchanging]);

  if (exchanging) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb', zIndex: 9999,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', margin: '0 auto 14px',
            border: '3px solid #d1d5db', borderTopColor: '#059669',
            borderRadius: '50%', animation: 'mlspin 0.8s linear infinite',
          }} />
          <style>{`@keyframes mlspin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>Signing you in…</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
