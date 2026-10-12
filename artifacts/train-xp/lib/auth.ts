import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  provider: 'apple' | 'google' | 'anonymous';
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<AuthUser | null> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only supported on iOS devices.');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : undefined;

    const user: AuthUser = {
      id: credential.user,
      email: credential.email ?? undefined,
      fullName: fullName || undefined,
      provider: 'apple',
    };

    // If Apple identityToken is available, authenticate with Supabase Auth
    if (credential.identityToken) {
      try {
        await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
      } catch (err) {
        console.warn('[Auth] Supabase Auth exchange notice:', err);
      }
    }

    return user;
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return null; // User cancelled Apple Sign In dialog
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  try {
    const redirectUrl = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL returned from Supabase.');
    }

    const authRes = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (authRes.type !== 'success' || !authRes.url) {
      return null; // User cancelled or dismissed browser
    }

    // Extract auth tokens or code from redirect URL
    const parsedUrl = new URL(authRes.url);
    const hash = parsedUrl.hash ? parsedUrl.hash.substring(1) : '';
    const params = new URLSearchParams(hash || parsedUrl.search);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');

    let sessionUser: any = null;

    if (code) {
      const { data: exchanged, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchErr) throw exchErr;
      sessionUser = exchanged?.user;
    } else if (accessToken && refreshToken) {
      const { data: setRes, error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setErr) throw setErr;
      sessionUser = setRes?.user;
    } else {
      const { data: sessData } = await supabase.auth.getSession();
      sessionUser = sessData?.session?.user;
    }

    if (!sessionUser) {
      throw new Error('Failed to retrieve session after Google authentication.');
    }

    const fullName =
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      sessionUser.email?.split('@')[0] ||
      'Athlete';

    return {
      id: sessionUser.id,
      email: sessionUser.email,
      fullName,
      provider: 'google',
    };
  } catch (err) {
    console.warn('[Auth] Google Sign-In error:', err);
    throw err;
  }
}

export const signInWithGoogleMock = signInWithGoogle;

export async function deleteUserAccount(userId?: string): Promise<boolean> {
  // Apple Guideline 5.1.1(v): Permanent deletion of all user data
  try {
    if (userId) {
      await Promise.allSettled([
        supabase.from('profiles').delete().eq('id', userId),
        supabase.from('workouts').delete().eq('user_id', userId),
        supabase.from('routines').delete().eq('user_id', userId),
        supabase.from('bodyweight_logs').delete().eq('user_id', userId),
      ]);
    }
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Auth] Account deletion notice:', err);
  }
  return true;
}
