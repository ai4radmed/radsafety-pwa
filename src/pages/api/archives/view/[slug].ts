import type { APIRoute } from 'astro';

export const prerender = false;
import { supabaseAnon } from '../../../../lib/supabase-server';
import { createLogger } from '../../../../lib/logger';

const logger = createLogger('archives-view-api');

/**
 * GET /api/archives/view/[slug]
 *
 * Slug 기반으로 자료실 파일을 조회하고 PDF를 직접 표시합니다.
 * - 조회수 자동 증가
 * - PDF 파일 URL로 리다이렉트
 * - 체크리스트에서 바로 PDF를 열 수 있도록 설계
 */
export const GET: APIRoute = async ({ params, redirect }) => {
    const { slug } = params;

    if (!slug) {
        logger.error('Slug가 제공되지 않음');
        return new Response(JSON.stringify({ error: 'No slug provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 1. Fetch archive by slug
        const { data, error } = await supabaseAnon
            .from('archives')
            .select('id, file_url, file_name, title')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            logger.error('자료를 찾을 수 없음', { slug, error });
            return new Response(
                JSON.stringify({
                    error: 'Archive not found',
                    message: `Slug "${slug}"에 해당하는 자료를 찾을 수 없습니다.`,
                }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // 2. Check if file exists
        if (!data.file_url) {
            logger.error('파일이 첨부되지 않음', { slug, title: data.title });
            return new Response(
                JSON.stringify({
                    error: 'No file attached',
                    message: `"${data.title}" 자료에 파일이 첨부되지 않았습니다.`,
                }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // 3. Increment view count (fire and forget - don't wait)
        supabaseAnon.rpc('increment_view_count', { archive_id: data.id }).then(({ error: rpcError }) => {
            if (rpcError) {
                logger.error('조회수 증가 실패', { id: data.id, error: rpcError });
            }
        });

        // 4. Get public URL
        const { data: publicUrlData } = supabaseAnon.storage.from('resources').getPublicUrl(data.file_url);

        if (!publicUrlData.publicUrl) {
            logger.error('Public URL 생성 실패', { slug, file_url: data.file_url });
            return new Response(
                JSON.stringify({
                    error: 'Failed to generate file URL',
                    message: '파일 URL 생성에 실패했습니다.',
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        logger.info('자료 조회 성공', { slug, title: data.title, file: data.file_name });

        // 5. Redirect to PDF file
        return redirect(publicUrlData.publicUrl, 302);
    } catch (err) {
        logger.error('예상치 못한 오류', { slug, error: err });
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: '서버 오류가 발생했습니다.',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
};
