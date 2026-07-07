import { NextResponse } from 'next/server'

// Swagger UI (T-203) — swagger-ui-dist 에셋을 public/swagger/에 내장해 서빙 (CDN 의존 없음).
// 스펙은 /api/v1/docs/openapi.json 에서 가져온다. "Try it out"으로 실제 호출 가능.
const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roomly API 문서</title>
  <link rel="stylesheet" href="/swagger/swagger-ui.css" />
  <style>body { margin: 0 } .topbar { display: none }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/docs/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      persistAuthorization: true,
    })
  </script>
</body>
</html>`

export async function GET() {
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
