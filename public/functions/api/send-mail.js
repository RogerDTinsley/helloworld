export async function onRequestPost(context) {
  const { request, env } = context;

  // Basic CORS for same-origin + safety
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { email, workouts } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return new Response(JSON.stringify({ error: "No workouts provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Resend API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a clean HTML table of workouts
    const rows = workouts
      .map(
        (w) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${w.date || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.time || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.type || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.distance ?? ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.pace ?? ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.temp != null ? w.temp : ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.weather || ""}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.comments || ""}</td>
      </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;">
        <h1 style="color:#ff1493;">Your Workout Log</h1>
        <p>Here are all the workouts you have tracked:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#ff69b4;color:white;">
              <th style="padding:10px;border:1px solid #ddd;">Date</th>
              <th style="padding:10px;border:1px solid #ddd;">Time</th>
              <th style="padding:10px;border:1px solid #ddd;">Type</th>
              <th style="padding:10px;border:1px solid #ddd;">Distance (mi)</th>
              <th style="padding:10px;border:1px solid #ddd;">Pace (min/mi)</th>
              <th style="padding:10px;border:1px solid #ddd;">Temp (°F)</th>
              <th style="padding:10px;border:1px solid #ddd;">Weather</th>
              <th style="padding:10px;border:1px solid #ddd;">Comments</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p style="margin-top:24px;color:#666;font-size:0.9rem;">Sent from your Workout Tracker at bondslavetesting.org</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Workout Tracker <noreply@bondslavetesting.org>", // change to your verified domain sender once ready
        to: [email],
        subject: `Your Workout Log (${workouts.length} entries)`,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: resendData.message || "Resend API error" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}