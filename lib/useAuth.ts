import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

type AuthSnapshot = {
  user: User | null;
  loading: boolean;
};

const AUTH_CACHE_TTL_MS = 60 * 1000;

let authSnapshot: AuthSnapshot = {
  user: null,
  loading: true,
};

let lastAuthSyncAt = 0;
let inFlightAuthRequest: Promise<void> | null = null;
const subscribers = new Set<(snapshot: AuthSnapshot) => void>();

function notifySubscribers() {
  subscribers.forEach((subscriber) => {
    subscriber(authSnapshot);
  });
}

function setAuthSnapshot(next: AuthSnapshot) {
  authSnapshot = next;
  notifySubscribers();
}

async function syncAuth(force = false): Promise<void> {
  const cacheIsFresh = Date.now() - lastAuthSyncAt < AUTH_CACHE_TTL_MS;
  if (!force && cacheIsFresh) {
    return;
  }

  if (inFlightAuthRequest) {
    return inFlightAuthRequest;
  }

  inFlightAuthRequest = (async () => {
    setAuthSnapshot({ ...authSnapshot, loading: true });

    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setAuthSnapshot({ user: data.user, loading: false });
      } else {
        setAuthSnapshot({ user: null, loading: false });
      }
    } catch (error) {
      setAuthSnapshot({ user: null, loading: false });
    } finally {
      lastAuthSyncAt = Date.now();
      inFlightAuthRequest = null;
    }
  })();

  return inFlightAuthRequest;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(authSnapshot.user);
  const [loading, setLoading] = useState(authSnapshot.loading);

  useEffect(() => {
    const onSnapshotChange = (snapshot: AuthSnapshot) => {
      setUser(snapshot.user);
      setLoading(snapshot.loading);
    };

    subscribers.add(onSnapshotChange);
    onSnapshotChange(authSnapshot);

    syncAuth(false);

    return () => {
      subscribers.delete(onSnapshotChange);
    };
  }, []);

  const checkAuth = async () => {
    await syncAuth(true);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao fazer login');
    }

    await syncAuth(true);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    lastAuthSyncAt = Date.now();
    setAuthSnapshot({ user: null, loading: false });
  };

  return { user, loading, login, logout, checkAuth };
}
