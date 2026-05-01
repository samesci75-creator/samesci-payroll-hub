import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, actor_name, actor_role, details, chantier } = await req.json();

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all admin (RH administratif) emails from user_roles + auth.users
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) throw rolesError;
    if (!adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles.map((r: any) => r.user_id);

    // Get admin emails from auth.users
    const adminEmails: string[] = [];
    for (const uid of adminUserIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content based on action
    const actionLabels: Record<string, { subject: string; emoji: string; color: string }> = {
      pointage: {
        subject: "🗓️ Nouveau Pointage Enregistré — SAMES CI",
        emoji: "📋",
        color: "#2196F3",
      },
      validation: {
        subject: "✅ Pointages Validés — SAMES CI",
        emoji: "✅",
        color: "#4CAF50",
      },
      paiement: {
        subject: "💰 Paiement Enregistré — SAMES CI",
        emoji: "💰",
        color: "#FF9800",
      },
    };

    const { subject, emoji, color } = actionLabels[action] ?? {
      subject: "📣 Notification SAMES CI",
      emoji: "📣",
      color: "#607D8B",
    };

    const roleLabels: Record<string, string> = {
      chef_chantier: "Chef de Chantier",
      directeur: "Directeur des Travaux",
      caisse: "Caisse",
      admin: "RH Administratif",
    };

    const now = new Date().toLocaleString("fr-FR", {
      timeZone: "Africa/Abidjan",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:12px;">
                <span style="font-size:32px;">${emoji}</span>
                <div style="text-align:left;">
                  <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">SAMES CI</p>
                  <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:1px;">SYSTÈME DE GESTION DU PERSONNEL</p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Alert badge -->
          <tr>
            <td style="padding:0 40px;">
              <div style="margin:-20px auto 0;background:${color};border-radius:8px;padding:14px 24px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:400px;">
                <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
                  ${subject.replace(/[^\w\s—éèêëàâîïôùûüç'.,!]/g, "").trim()}
                </p>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
                Bonjour,
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.7;">
                Une action a été effectuée sur l'application <strong>SAMES CI</strong> et nécessite votre attention en tant qu'administrateur RH.
              </p>

              <!-- Details card -->
              <div style="background:#f8f9fa;border:1px solid #e8eaf0;border-left:4px solid ${color};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="color:#888;font-size:12px;text-transform:uppercase;font-weight:600;">Effectué par</span><br/>
                      <span style="color:#222;font-size:14px;font-weight:700;">${actor_name}</span>
                      <span style="color:#777;font-size:12px;"> — ${roleLabels[actor_role] ?? actor_role}</span>
                    </td>
                  </tr>
                  ${chantier ? `
                  <tr>
                    <td style="padding:6px 0;border-top:1px solid #e8eaf0;">
                      <span style="color:#888;font-size:12px;text-transform:uppercase;font-weight:600;">Chantier</span><br/>
                      <span style="color:#222;font-size:14px;font-weight:600;">${chantier}</span>
                    </td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td style="padding:6px 0;border-top:1px solid #e8eaf0;">
                      <span style="color:#888;font-size:12px;text-transform:uppercase;font-weight:600;">Détails</span><br/>
                      <span style="color:#222;font-size:14px;">${details}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-top:1px solid #e8eaf0;">
                      <span style="color:#888;font-size:12px;text-transform:uppercase;font-weight:600;">Date &amp; Heure</span><br/>
                      <span style="color:#555;font-size:13px;">${now}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:0;color:#777;font-size:13px;line-height:1.6;">
                Connectez-vous à l'application SAMES CI pour consulter les détails et prendre les actions nécessaires.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:20px 40px;border-top:1px solid #e8eaf0;text-align:center;">
              <p style="margin:0;color:#aaa;font-size:11px;">
                Ce message a été envoyé automatiquement par le système SAMES CI.<br/>
                © ${new Date().getFullYear()} SAMES CI — Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email to each admin using Supabase's internal SMTP / Resend
    const sendResults = [];
    for (const email of adminEmails) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          from: "SAMES CI <notifications@sames-ci.app>",
          to: [email],
          subject,
          html: htmlBody,
        }),
      });

      const result = await res.json();
      sendResults.push({ email, status: res.status, result });
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: adminEmails, results: sendResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("notify-admin error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
