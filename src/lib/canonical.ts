/**
 * 표준(canonical) URL 계산.
 *
 * 같은 페이지가 `/guide` 와 `/guide/` 두 주소로 열리는데, 표준 태그가 요청 경로를 그대로 따라가면
 * 두 주소가 서로 다른 표준을 주장한다(GSC "중복 페이지, Google에서 사용자와 다른 표준을 선택함").
 * sitemap 이 싣는 형태(슬래시로 끝남)로 통일한다. 리다이렉트는 하지 않는다 — 주소는 둘 다 열린다.
 */
export function canonicalUrl(pathname: string, site: URL | string | undefined): URL {
    const lastSegment = pathname.split('/').pop() ?? '';
    // 파일 경로(/rss.xml 등)는 슬래시를 붙이지 않는다.
    const isFile = lastSegment.includes('.');
    const normalized = pathname.endsWith('/') || isFile ? pathname : `${pathname}/`;
    return new URL(normalized, site);
}
