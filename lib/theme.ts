/**
 * 디자인 토큰 — 화면 13곳에 각자 복사돼 있던 팔레트의 단일 출처.
 *
 * 이 앱은 인라인 스타일 기반이라 색상을 상수로 공유한다.
 * 색을 바꿀 때는 여기만 고치면 된다.
 */

export const C = {
  bg:       '#0B1215',
  bgMid:    '#111518',
  surface:  '#17171B',
  card:     '#1A1C20',
  border:   '#212427',
  borderHi: '#2a2d32',
  /** 랜딩 페이지 전용 미세 변형 (기존 톤 유지) */
  borderAlt:'#262626',
  text:     '#F2F3F4',
  textMid:  '#8A8F98',
  textDim:  '#4A4F58',
  accent:   '#5e6ad2',
  accentHi: '#818cf8',
  gold:     '#C9A465',
  green:    '#34d399',
  amber:    '#fbbf24',
  red:      '#f87171',
  violet:   '#818cf8',
} as const

/** 사이드 네비게이션 전용 팔레트 (본문보다 한 단계 어둡다) */
export const NAV = {
  bg:         '#0f1011',
  hover:      '#141516',
  active:     '#1c1d1e',
  border:     '#23252a',
  text:       '#8a8f98',
  textHover:  '#d0d6e0',
  textActive: '#f7f8f8',
  iconDim:    '#4a4d54',
  section:    '#3d4046',
  accent:     '#5e6ad2',
} as const

// ── 공통 스타일 프리셋 ──────────────────────────────────────

export const inputSt: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 13,
  color: C.text,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export const selectSt: React.CSSProperties = {
  ...inputSt,
  cursor: 'pointer',
}

export const cardSt: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 20,
}

export const chipSt: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  border: `1px solid ${C.border}`,
  transition: 'all 0.15s',
  fontFamily: 'inherit',
}

export const primaryButtonSt: React.CSSProperties = {
  padding: '11px 18px',
  background: C.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export const secondaryButtonSt: React.CSSProperties = {
  padding: '11px 18px',
  background: C.card,
  color: C.textMid,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

/** 입력 요소 포커스 시 테두리 강조 — onFocus/onBlur 핸들러 쌍 */
export const focusBorder = {
  onFocus: (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = C.accent
  },
  onBlur: (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = C.border
  },
}
