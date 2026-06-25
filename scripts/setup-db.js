const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const SUPABASE_URL = 'https://vhrnlhlcgzoxeucgmpym.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocm5saGxjZ3pveGV1Y2dtcHltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgzODQxOCwiZXhwIjoyMDk3NDE0NDE4fQ.PlRw5Ueu_vpZ7I2JzDYnMVm6lbJ09d94vNhA1gZUDO8'

const s = createClient(SUPABASE_URL, SERVICE_KEY)

async function run() {
  console.log('=== STEP 1: 기존 데이터 전체 삭제 ===')

  const tables = ['assignments', 'push_subscriptions', 'staff', 'rooms', 'hotels']
  for (const t of tables) {
    const { error } = await s.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(t + ' 삭제:', error ? error.message : 'OK')
  }

  // Try to clear licenses if table exists
  await s.from('licenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const { data: usersData } = await s.auth.admin.listUsers()
  for (const user of usersData?.users ?? []) {
    const { error } = await s.auth.admin.deleteUser(user.id)
    console.log('auth 삭제:', user.email, error ? error.message : 'OK')
  }

  console.log('\n=== STEP 2: 라이선스 테이블 생성 시도 ===')

  // Create licenses table via Supabase Management API
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS licenses (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      key        TEXT        NOT NULL UNIQUE,
      used_at    TIMESTAMPTZ,
      hotel_id   UUID        REFERENCES hotels(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `

  // Try via pg-meta or direct Postgres connection through REST
  const pgMetaRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({ sql: createTableSQL }),
  })

  if (pgMetaRes.ok) {
    console.log('licenses 테이블 생성: OK')
  } else {
    // Try alternative endpoint
    const altRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: createTableSQL }),
    })

    if (altRes.ok) {
      console.log('licenses 테이블 생성 (pg/query): OK')
    } else {
      console.log('⚠️  licenses 테이블 자동 생성 실패 — Supabase 대시보드에서 수동 실행 필요')
      console.log('    SQL Editor → 아래 SQL 실행:')
      console.log('    ' + createTableSQL.trim().replace(/\n/g, '\n    '))
    }
  }

  console.log('\n=== STEP 3: 라이선스 키 3개 생성 ===')

  const keys = []
  for (let i = 0; i < 3; i++) {
    const p1 = crypto.randomBytes(3).toString('hex').toUpperCase()
    const p2 = crypto.randomBytes(3).toString('hex').toUpperCase()
    keys.push(`ROOMLY-${p1}-${p2}`)
  }

  const { error: licErr } = await s.from('licenses').insert(keys.map(k => ({ key: k })))
  if (licErr) {
    console.log('⚠️  라이선스 키 생성 실패 (테이블 없음):', licErr.message)
    console.log('   미리 생성한 키 (테이블 생성 후 직접 insert):')
    keys.forEach(k => console.log('  ', k))
  } else {
    console.log('라이선스 키 생성:')
    keys.forEach(k => console.log(' ', k))
  }

  console.log('\n=== STEP 4: 호텔 + 어드민 생성 ===')

  const { data: hotel, error: hotelErr } = await s
    .from('hotels')
    .insert({ name: 'Roomly 테스트 호텔', subscription_plan: 'starter' })
    .select('id')
    .single()
  if (hotelErr) { console.error('호텔 생성 실패:', hotelErr.message); process.exit(1) }
  console.log('호텔 생성:', hotel.id)

  const { data: authUser, error: authErr } = await s.auth.admin.createUser({
    email: 'baldeagle9603@gmail.com',
    password: '1234',
    email_confirm: true,
    app_metadata: { hotel_id: hotel.id, role: 'admin' },
  })
  if (authErr) { console.error('유저 생성 실패:', authErr.message); process.exit(1) }
  console.log('어드민 생성:', authUser.user.email)

  // Link license[0] to this hotel
  if (!licErr) {
    await s.from('licenses')
      .update({ used_at: new Date().toISOString(), hotel_id: hotel.id })
      .eq('key', keys[0])
    console.log('라이선스 연결:', keys[0])
  }

  console.log('\n=== STEP 5: 객실 30개 생성 ===')

  const now = new Date()
  function ci(h) { return new Date(now.getTime() + h * 3600000).toISOString() }

  const roomDefs = [
    // 1층 싱글x4 더블x2
    { number: '101', floor: 1, type: 'single', status: 'done',     checkin_time: null },
    { number: '102', floor: 1, type: 'single', status: 'done',     checkin_time: null },
    { number: '103', floor: 1, type: 'single', status: 'cleaning', checkin_time: ci(1.5) },
    { number: '104', floor: 1, type: 'single', status: 'dirty',    checkin_time: ci(1) },
    { number: '105', floor: 1, type: 'double', status: 'dirty',    checkin_time: null },
    { number: '106', floor: 1, type: 'double', status: 'inspect',  checkin_time: null },
    // 2층 싱글x2 더블x4
    { number: '201', floor: 2, type: 'single', status: 'done',     checkin_time: null },
    { number: '202', floor: 2, type: 'single', status: 'cleaning', checkin_time: ci(0.5) },
    { number: '203', floor: 2, type: 'double', status: 'dirty',    checkin_time: ci(3) },
    { number: '204', floor: 2, type: 'double', status: 'dirty',    checkin_time: null },
    { number: '205', floor: 2, type: 'double', status: 'done',     checkin_time: null },
    { number: '206', floor: 2, type: 'double', status: 'dirty',    checkin_time: null },
    // 3층 더블x4 스위트x2
    { number: '301', floor: 3, type: 'double', status: 'cleaning', checkin_time: ci(2) },
    { number: '302', floor: 3, type: 'double', status: 'dirty',    checkin_time: ci(1) },
    { number: '303', floor: 3, type: 'double', status: 'done',     checkin_time: null },
    { number: '304', floor: 3, type: 'double', status: 'inspect',  checkin_time: null },
    { number: '305', floor: 3, type: 'suite',  status: 'dirty',    checkin_time: ci(4) },
    { number: '306', floor: 3, type: 'suite',  status: 'done',     checkin_time: null },
    // 4층 더블x2 스위트x4
    { number: '401', floor: 4, type: 'double', status: 'dirty',    checkin_time: null },
    { number: '402', floor: 4, type: 'double', status: 'cleaning', checkin_time: ci(1.5) },
    { number: '403', floor: 4, type: 'suite',  status: 'dirty',    checkin_time: null },
    { number: '404', floor: 4, type: 'suite',  status: 'done',     checkin_time: null },
    { number: '405', floor: 4, type: 'suite',  status: 'inspect',  checkin_time: null },
    { number: '406', floor: 4, type: 'suite',  status: 'dirty',    checkin_time: ci(2.5) },
    // 5층 스위트x6
    { number: '501', floor: 5, type: 'suite',  status: 'done',     checkin_time: null },
    { number: '502', floor: 5, type: 'suite',  status: 'done',     checkin_time: null },
    { number: '503', floor: 5, type: 'suite',  status: 'dirty',    checkin_time: ci(5) },
    { number: '504', floor: 5, type: 'suite',  status: 'cleaning', checkin_time: ci(1) },
    { number: '505', floor: 5, type: 'suite',  status: 'dirty',    checkin_time: null },
    { number: '506', floor: 5, type: 'suite',  status: 'dirty',    checkin_time: null },
  ]

  const { data: rooms, error: roomsErr } = await s
    .from('rooms')
    .insert(roomDefs.map(r => ({ ...r, hotel_id: hotel.id })))
    .select('id, number, floor, status')
  if (roomsErr) { console.error('객실 생성 실패:', roomsErr.message); process.exit(1) }
  console.log('객실', rooms.length, '개 생성')

  console.log('\n=== STEP 6: 직원 4명 생성 ===')

  const staffDefs = [
    { name: '김미영', phone_number: '010-1000-2000' },
    { name: '이지수', phone_number: '010-1111-2222' },
    { name: '박수진', phone_number: '010-1222-2444' },
    { name: '최현주', phone_number: '010-1333-2666' },
  ]

  const { data: staffData, error: staffErr } = await s
    .from('staff')
    .insert(staffDefs.map(d => ({
      hotel_id: hotel.id,
      name: d.name,
      phone_number: d.phone_number,
      auth_id: crypto.randomUUID(),
      qr_version: 1,
    })))
    .select('id, name')
  if (staffErr) { console.error('직원 생성 실패:', staffErr.message); process.exit(1) }
  console.log('직원:', staffData.map(s => s.name).join(', '))

  console.log('\n=== STEP 7: 청소중 객실 배정 ===')

  const cleaningRooms = rooms.filter(r => r.status === 'cleaning')
  const assignData = cleaningRooms.map((room, i) => ({
    room_id: room.id,
    staff_id: staffData[i % staffData.length].id,
    assigned_at: new Date(now.getTime() - 20 * 60000).toISOString(),
    is_guest: false,
  }))

  const { error: assignErr } = await s.from('assignments').insert(assignData)
  console.log('배정:', assignErr ? assignErr.message : assignData.length + '건 OK')

  console.log('\n==========================================')
  console.log('✅ 셋업 완료!')
  console.log('==========================================')
  console.log('')
  console.log('🔐 로그인 정보:')
  console.log('   이메일: baldeagle9603@gmail.com')
  console.log('   비밀번호: 1234')
  console.log('')
  console.log('🏨 호텔: Roomly 테스트 호텔')
  console.log('   ID:', hotel.id)
  console.log('')
  const byStatus = {}
  rooms.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1 })
  console.log('📊 객실 현황:')
  Object.entries(byStatus).forEach(([k, v]) => console.log(`   ${k}: ${v}개`))
  console.log('')
  console.log('👥 직원 (4명):', staffData.map(s => s.name).join(', '))

  if (!licErr) {
    console.log('')
    console.log('🔑 미사용 라이선스 키 (2개):')
    keys.slice(1).forEach(k => console.log('  ', k))
  } else {
    console.log('')
    console.log('⚠️  licenses 테이블이 없어서 라이선스 키를 생성하지 못했습니다.')
    console.log('   Supabase SQL Editor에서 아래 SQL을 실행해주세요:')
    console.log('')
    console.log(`   CREATE TABLE licenses (
     id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     key        TEXT        NOT NULL UNIQUE,
     used_at    TIMESTAMPTZ,
     hotel_id   UUID        REFERENCES hotels(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );`)
    console.log('')
    console.log('   그 후 /super-admin 에서 라이선스 키를 생성하실 수 있습니다.')
  }
}

run().catch(console.error)
