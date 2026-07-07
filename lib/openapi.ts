// Roomly 공개 API OpenAPI 3.0 스펙 (T-203)
// GET /api/v1/docs (Swagger UI) 와 /api/v1/docs/openapi.json 에서 서빙된다.

const roomSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    number: { type: 'string', example: '101' },
    floor: { type: 'integer', example: 1 },
    type: { type: 'string', enum: ['single', 'double', 'suite', 'other'] },
    status: { type: 'string', enum: ['dirty', 'cleaning', 'done', 'inspect'] },
    checkinTime: { type: 'string', format: 'date-time', nullable: true },
  },
} as const

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', description: '사람이 읽을 수 있는 메시지' },
    code: { type: 'string', description: '기계용 에러 코드' },
  },
} as const

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Roomly Public API',
      version: '1.0.0',
      description:
        'PMS·외부 시스템 연동용 REST API. 관리자 설정(/admin/settings)에서 발급한 API 키를 ' +
        '`Authorization: Bearer <key>` 헤더로 전달한다. 키당 100회/분 rate limit.',
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'http',
          scheme: 'bearer',
          description: '관리자 설정에서 발급한 API 키',
        },
      },
      schemas: {
        Room: roomSchema,
        Error: errorSchema,
      },
    },
    security: [{ apiKey: [] }],
    paths: {
      '/api/v1/rooms': {
        get: {
          summary: '객실 목록 조회',
          responses: {
            '200': {
              description: '객실 배열',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Room' } } } },
            },
            '401': {
              description: 'API 키 없음/무효',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      },
      '/api/v1/rooms/{id}': {
        patch: {
          summary: '객실 상태/체크인 시간 변경',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['dirty', 'cleaning', 'done', 'inspect'] },
                    checkin_time: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '변경된 객실',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } },
            },
            '400': { description: '변경할 필드 없음', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'API 키 없음/무효', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '404': { description: '객실 없음 (타 호텔 포함)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/assignments': {
        get: {
          summary: '활성 배정 목록 조회',
          responses: {
            '200': {
              description: '배정 배열',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        assignedAt: { type: 'string', format: 'date-time' },
                        isGuest: { type: 'boolean' },
                        staff: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                          },
                        },
                        room: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            number: { type: 'string' },
                            floor: { type: 'integer' },
                            status: { type: 'string', enum: ['dirty', 'cleaning', 'done', 'inspect'] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'API 키 없음/무효', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  }
}
