import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { rows, filename } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucune donnée reçue." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const row of rows) {
      // Expected CSV columns: Matricule, Nom, Date, Present (1/0 or Oui/Non)
      const matricule = row["Matricule"] || row["matricule"] || "";
      const nom = row["Nom"] || row["nom_prenom"] || row["Nom_Prenom"] || "";
      const dateStr = row["Date"] || row["date_pointage"] || row["Date_Pointage"] || "";
      const presentRaw = row["Present"] || row["present"] || row["Présent"] || "1";

      if (!matricule || !dateStr) {
        errors++;
        continue;
      }

      const present = ["1", "oui", "true", "yes"].includes(
        String(presentRaw).toLowerCase().trim()
      );

      // Find or create personnel by matricule
      let { data: personnel } = await supabase
        .from("personnel")
        .select("id")
        .eq("matricule", matricule)
        .maybeSingle();

      if (!personnel) {
        // Auto-create personnel entry
        const { data: newP, error: insertErr } = await supabase
          .from("personnel")
          .insert({ matricule, nom_prenom: nom || matricule })
          .select("id")
          .single();

        if (insertErr) {
          errors++;
          continue;
        }
        personnel = newP;
      }

      // Insert pointage (skip duplicates via unique constraint)
      const { error: pointageErr } = await supabase.from("pointages").insert({
        personnel_id: personnel.id,
        date_pointage: dateStr,
        present,
      });

      if (pointageErr) {
        if (pointageErr.code === "23505") {
          duplicates++;
        } else {
          errors++;
        }
      } else {
        imported++;
      }
    }

    return new Response(
      JSON.stringify({
        total: rows.length,
        imported,
        duplicates,
        errors,
        message: `Fichier "${filename || "csv"}" traité avec succès.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
