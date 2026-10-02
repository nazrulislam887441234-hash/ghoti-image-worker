export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const UPLOAD_ALLOWED = [
      "https://ghotimarket.com",
      "https://www.ghotimarket.com",
      "https://seller.ghotimarket.com",
      "https://admin.ghotimarket.com",
      "https://test.ghotimarket.com"
    ];
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer") || "";
    const isUploadAllowed = UPLOAD_ALLOWED.includes(origin);

    const corsHeaders = {
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (isUploadAllowed) corsHeaders["Access-Control-Allow-Origin"] = origin;
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/upload" && request.method === "POST") {
      if (!isUploadAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) return new Response("No file", { status: 400 });
      if (file.name.match(/\.(exe|sh|bat|js)$/i)) {
        return new Response("Executable not allowed", { status: 400 });
      }
      const key = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      const imageUrl = `https://image.ghotimarket.com/${key}`;
      return new Response(JSON.stringify({ url: imageUrl, key }), {
        headers: {...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. ছবি দেখা - ULTRA SECURE - শুধু admin + seller
    const key = url.pathname.slice(1);
    if (!key) return new Response("Ghoti Image Server Running 🎉", { headers: corsHeaders });

    // 🔒 NID Protection - কোনো টোকেন নেই, কোনো ফাঁক নেই
    const isAdmin = referer.startsWith("https://admin.ghotimarket.com") || origin === "https://admin.ghotimarket.com";
    const isSeller = referer.startsWith("https://seller.ghotimarket.com") || origin === "https://seller.ghotimarket.com";

    if (!isAdmin && !isSeller) {
      return new Response("Forbidden: NID Protected - Admin/Seller Only 🔒", { status: 403 });
    }

    const object = await env.IMAGES.get(key);
    if (!object) return new Response("Not Found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "private, no-store, no-cache",
        "Access-Control-Allow-Origin": isAdmin ? "https://admin.ghotimarket.com" : "https://seller.ghotimarket.com",
        "Vary": "Origin, Referer"
      }
    });
  }
}
