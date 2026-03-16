'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

console.log('[FCM] Hook usePushNotifications initialized (module loaded)');

export const usePushNotifications = () => {
    console.log('[FCM] usePushNotifications() called (hook rendered)');
    const { user, loading } = useAuth();

    useEffect(() => {
        console.log('[FCM] useEffect triggered. user:', user?.id ?? 'null', '| loading:', loading);

        if (loading) {
            console.log('[FCM] Auth still loading — skipping setup');
            return;
        }
        if (!user) {
            console.log('[FCM] No authenticated user — skipping FCM setup');
            return;
        }
        console.log('[FCM] User authenticated:', user.id);

        const setupPushNotifications = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('[FCM] Starting setup...');

                const platform = Capacitor.getPlatform();
                console.log('[FCM] getPlatform():', platform);
                console.log('[FCM] isNativePlatform():', Capacitor.isNativePlatform());

                const isNative = platform === 'android' || platform === 'ios';
                if (!isNative) {
                    console.warn('[FCM] ⚠️ Not android/ios — skipping FCM. Platform:', platform);
                    return;
                }

                console.log('[FCM] Requesting permissions...');
                let permStatus = await PushNotifications.requestPermissions();
                console.log('[FCM] Permission status:', JSON.stringify(permStatus));

                if (permStatus.receive !== 'granted') {
                    console.warn('[FCM] ⚠️ Permission NOT granted. Status:', permStatus.receive);
                    return;
                }

                console.log('[FCM] ✅ Permission granted. Removing old listeners...');
                await PushNotifications.removeAllListeners();

                console.log('[FCM] Adding registration listener...');
                await PushNotifications.addListener('registration', async (token) => {
                    console.log('[FCM] Registration event fired');
                    console.log('[FCM] Token value:', token.value);
                    
                    try {
                        console.log('[FCM] Requesting user from supabase.auth.getUser()...');
                        const { data: { user } } = await supabase.auth.getUser();
                        console.log('[FCM] user_id from getUser():', user?.id ?? 'NULL (not logged in)');

                        console.log('[FCM] Upserting FCM token to Supabase fcm_tokens table...');
                        const { data: upsertData, error: upsertError } = await supabase
                            .from('fcm_tokens')
                            .upsert(
                                {
                                    token: token.value,
                                    user_id: user?.id ?? null,
                                    platform: 'android',
                                },
                                { onConflict: 'token' }
                            )
                            .select();
                        
                        console.log('[FCM] Upsert result — data:', JSON.stringify(upsertData));
                        console.log('[FCM] Upsert result — error:', JSON.stringify(upsertError));

                        if (upsertError) {
                            console.error('[FCM] ❌ Error saving FCM token to Supabase:', JSON.stringify(upsertError));
                        } else {
                            console.log('[FCM] ✅ FCM token saved successfully. user_id:', user?.id);
                        }
                    } catch (err) {
                        console.error('[FCM] Exception while saving token:', JSON.stringify(err));
                    }
                });

                await PushNotifications.addListener('registrationError', (err) => {
                    console.error('[FCM] ❌ Registration error from FCM:', JSON.stringify(err));
                });

                await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('[FCM] Push notification received:', JSON.stringify(notification));
                    toast.success(`${notification.title || 'New Notification'}\n${notification.body || ''}`, {
                        duration: 5000,
                        position: 'top-center',
                        icon: '🔔'
                    });
                });

                await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                    console.log('[FCM] Action performed:', notification.actionId, JSON.stringify(notification.notification));
                });

                console.log('[FCM] Calling PushNotifications.register()...');
                await PushNotifications.register();
                console.log('[FCM] register() called — waiting for registration event...');

            } catch (error) {
                console.error('[FCM] ❌ Setup error:', JSON.stringify(error));
            }
        };

        setupPushNotifications();

        return () => {
            if (Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
        };
    }, [user, loading]);
};