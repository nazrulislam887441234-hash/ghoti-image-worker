export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // শুধু আপনার ২টা ডোমেইন Allow - বাকি সব Block
    const ALLOWED_ORIGINS = [
      "https://ghotimarket.com",
      "https://www.ghotimarket.com",
      "https://seller.ghotimarket.com"
    ];

    const origin = request.headers.get("Origin");
    const isAllowed = ALLOWED_ORIGINS.includes(origin);

    const corsHeaders = {
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (isAllowed) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. আপলোড - শুধু আপনার সাইট পারবে
    if (url.pathname === "/upload" && request.method === "POST") {
      // লোকাল ফাইল বা অন্য লিংক থেকে Block
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden: Only ghotimarket.com allowed" }), { 
          status: 403, headers: { "Content-Type": "application/json" } 
        });
      }

      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) return new Response("No file", { status: 400 });

      // ফাইল টাইপ চেক - শুধু ছবি
      if (!file.type.startsWith("image/")) {
        return new Response("Only image allowed", { status: 400 });
      }

      const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      const imageUrl = `https://image.ghotimarket.com/${key}`;
      return new Response(JSON.stringify({ url: imageUrl, key }), {
        headers: {...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. ছবি দেখা - সবাই দেখতে পারবে (ফ্রি)
    const key = url.pathname.slice(1);
    if (!key) return new Response("Ghoti Image Server Running 🎉", { headers: corsHeaders });

    const object = await env.IMAGES.get(key);
    if (!object) return new Response("Not Found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*" // ছবি দেখা সবার জন্য Allow
      }
    });
  }
}
