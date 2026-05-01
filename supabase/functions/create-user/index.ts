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

    console.log("Supabase URL:", supabaseUrl);
    console.log("Service Role Key exists:", !!serviceRoleKey);

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !caller) {
      console.error("Auth error:", userErr);
      throw new Error("Unauthorized");
    }
    console.log("Caller ID:", caller.id);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles, error: rolesErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    
    console.log("User roles in DB:", roles);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      console.error("Access denied for roles:", roles);
      throw new Error("Admin access required (role 'admin' not found in user_roles)");
    }

    const { email, password, nom, role } = await req.json();
    console.log("Creating user:", email, "with role:", role);

    // Create user
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nom },
    });
    
    if (createErr) {
      console.error("Admin creation error:", createErr);
      throw createErr;
    }

    // Assign role if provided
    if (role && newUser.user) {
      console.log("Assigning role:", role, "to user:", newUser.user.id);
      const { error: roleInsertErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });
      if (roleInsertErr) console.error("Role assignment error:", roleInsertErr);
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Global function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
