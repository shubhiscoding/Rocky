'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PrivyInterface, usePrivy } from '@privy-io/react-auth';
import useSWR from 'swr';

import { getUserData } from '@/server/actions/user';
import { NeurUser, PrismaUser, PrivyUser } from '@/types/db';

type NeurUserInterface = Omit<PrivyInterface, 'user' | 'ready'> & {
  isLoading: boolean;
  user: NeurUser | null;
};

function loadFromCache(): NeurUser | null {
  try {
    const cached = localStorage.getItem('rocky-user-data');
    if (cached) return JSON.parse(cached);
    return null;
  } catch {
    return null;
  }
}

function saveToCache(data: NeurUser | null) {
  try {
    if (data) {
      localStorage.setItem('rocky-user-data', JSON.stringify(data));
    } else {
      localStorage.removeItem('rocky-user-data');
    }
  } catch {
    // ignore
  }
}

async function fetchUserData(privyUser: PrivyUser): Promise<NeurUser | null> {
  try {
    const response = await getUserData();
    if (response?.data?.success && response?.data?.data) {
      const prismaUser: PrismaUser = response.data.data;
      return { ...prismaUser, privyUser: privyUser as PrivyUser } as NeurUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function useUser(): NeurUserInterface {
  const { ready, user: privyUser, ...privyRest } = usePrivy();
  const [initialCachedUser, setInitialCachedUser] = useState<NeurUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    setInitialCachedUser(loadFromCache());
  }, []);

  const swrKey = ready && privyUser?.id ? `user-${privyUser.id}` : null;

  const fetcher = useCallback(async (): Promise<NeurUser | null> => {
    if (!ready || !privyUser) return null;
    return fetchUserData(privyUser as PrivyUser);
  }, [ready, privyUser]);

  const { data: neurUser, isValidating: swrLoading } = useSWR<NeurUser | null>(
    swrKey,
    fetcher,
    {
      fallbackData: initialCachedUser,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  useEffect(() => {
    if (neurUser) saveToCache(neurUser);
  }, [neurUser]);

  const isLoading = swrLoading && !initialCachedUser;

  const extendedLogout = useCallback(async () => {
    router.push('/refresh');
    try {
      await privyRest.logout();
      saveToCache(null);
      router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [privyRest, router]);

  return {
    ...privyRest,
    isLoading: isLoading || neurUser == null,
    user: neurUser || null,
    logout: extendedLogout,
  };
}
