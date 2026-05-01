import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("MY_SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    
    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) throw new Error("Admin access required");

    const { userId } = await req.json();
    if (!userId) throw new Error("Missing userId");
    if (userId === caller.id) throw new Error("Cannot delete yourself");

    console.log("Deleting user:", userId);

    // Delete from auth (cascades to profiles & user_roles)
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error("Delete error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Global delete function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
