
import type { APIRoute } from "astro";

export const prerender = false;
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ params, request }) => {
    const { id } = params;

    if (!id) {
        return new Response(JSON.stringify({ error: "No ID provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Fetch archive by ID
    // Select necessary fields: content_html (for markdown view) and file_url (for download)
    const { data, error } = await supabase
        .from("archives")
        .select("id, title, category, content_html, file_url, author, created_at")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Archive API Error:", error);
        return new Response(JSON.stringify({ error: "Archive not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Construct public URL if file exists
    let publicFileUrl = null;
    if (data.file_url) {
        const { data: publicUrlData } = supabase.storage
            .from("resources")
            .getPublicUrl(data.file_url);
        publicFileUrl = publicUrlData.publicUrl;
    }

    return new Response(
        JSON.stringify({
            ...data,
            public_file_url: publicFileUrl,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Cache control: cache for 1 minute to ensure speed but allow updates
                "Cache-Control": "public, max-age=60",
            },
        }
    );
};
