
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
    // Also fetch author info from profiles
    const { data, error } = await supabase
        .from("archives")
        .select(`
            id, title, category, content_html, file_url, author, created_at,
            profiles (real_name, nickname)
        `)
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

    // Determine Display Author
    // Priority: Explicit author field > Profile real_name > Profile nickname > "관리자"
    const profile = data.profiles; // Single object or null
    // Note: Due to join, profiles might be an array if not 1:1, but here user_id is FK so it returns single object or null if .single() is used incorrectly or RLS.
    // However, supabase-js returns object for single join logic if not array mode.
    // Let's safe check based on type. Usually it's an object.

    let profileName = null;
    if (profile) {
        profileName = profile.real_name || profile.nickname;
    }

    const displayAuthor = data.author || profileName || "관리자";

    return new Response(
        JSON.stringify({
            ...data,
            display_author: displayAuthor,
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
