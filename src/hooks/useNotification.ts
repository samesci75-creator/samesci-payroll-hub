import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/contexts/AuthContext';

type NotificationAction = 'pointage' | 'validation' | 'paiement';

interface NotifyOptions {
  action: NotificationAction;
  details: string;
  chantier?: string;
}

/**
 * Hook to send email notifications to the RH admin (role: 'admin')
 * after actions performed by non-admin users.
 * Silently fails — does not block the main action.
 */
export const useNotification = () => {
  const { user } = useAuth();

  const notify = useCallback(
    async ({ action, details, chantier }: NotifyOptions) => {
      // Only notify if the acting user is NOT the admin (RH administratif)
      if (!user || user.role === 'admin') return;

      try {
        const { data, error } = await supabase.functions.invoke('notify-admin', {
          body: {
            action,
            actor_name: user.nom || user.email,
            actor_role: user.role,
            actor_email: user.email,
            details,
            chantier: chantier ?? null,
          },
        });

        if (error) {
          console.warn('[useNotification] Failed to send notification:', error.message);
        } else {
          console.info('[useNotification] Notification sent:', data);
        }
      } catch (err: any) {
        // Silently fail — notification must never block the main flow
        console.warn('[useNotification] Exception:', err?.message);
      }
    },
    [user]
  );

  return { notify };
};
