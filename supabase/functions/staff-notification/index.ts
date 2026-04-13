import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { staff_id, title, body } = await req.json();

    // 🔹 Get staff push token
    const res = await fetch(
      `${Deno.env.get("https://gdhtydiycsgxcxestwin.supabase.co")}/rest/v1/staff_profile?id=eq.${staff_id}&select=push_token`,
      {
        headers: {
          apikey: Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaHR5ZGl5Y3NneGN4ZXN0d2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTQyMDUsImV4cCI6MjA4ODM3MDIwNX0.nbMCxiA4z35d3Mf7jjQ2PygmRZdIfDuweC3inm0sRC0")!,
          Authorization: `Bearer ${Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkaHR5ZGl5Y3NneGN4ZXN0d2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTQyMDUsImV4cCI6MjA4ODM3MDIwNX0.nbMCxiA4z35d3Mf7jjQ2PygmRZdIfDuweC3inm0sRC0")}`,
        },
      }
    );

    const data = await res.json();
    const push_token = data?.[0]?.push_token;

    if (!push_token) {
      return new Response(JSON.stringify({ error: "No push token" }), {
        status: 400,
      });
    }

    // 🔹 Send notification
    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: push_token,
        title,
        body,
      }),
    });

    const result = await expoRes.json();

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});