# 위아즈 OMS 데모 — 빌드 사양서 v3

> **대상:** Claude Code. 이 문서만 보고 처음부터 끝까지 구현 가능하도록 작성됨.
> **목표:** 미팅 시연용 프론트 데모. 목(mock) 데이터 기반. 실제 API 연동 없음.
> **전제:** 모든 채널의 API 승인이 완료됐다고 가정한다. 따라서 아래 5개 기능은 전부 **정식 기능**으로 구현한다 (별도 "예정" 표시 없음).

---

## 0. 데모 스코프 (5개 기능 — 전부 정식)

| 기능 | 성격 | 주요 화면 |
|---|---|---|
| 주문 조회 | 읽기 | 주문 목록 · 상세 |
| 배송정보 | 읽기 | 목록/상세 + 엑셀 다운로드 |
| 클레임 조회 | 읽기 | 클레임 탭 + 전용 페이지 (조회만, 처리는 채널에서) |
| 주문확인 | 쓰기 | 주문 목록에서 일괄 처리 |
| 송장 업로드 | 쓰기 | 3단계 업로드 |

**중요 — 쓰기 기능은 정식이지만 "위험한 작업"이다.** 승인이 됐어도 주문확인·송장 등록은 되돌릴 수 없고 고객 알림이 나간다(예: ESM은 주문확인 후 취소가 판매자 승인 방식으로 바뀜). 따라서 **확인 모달 + 중복 클릭 방지**는 반드시 유지한다. 다만 문구에서 "2차 예정" 같은 표현은 빼고, 실제 부작용 경고("되돌릴 수 없음 / 고객 알림 발송")만 남긴다.

**클레임은 조회만 한다.** 취소·반품·교환이 들어온 것을 화면에서 보여주되, 실제 처리(승인·거부)는 하지 않는다. 클레임 상세에 "처리는 채널 판매자센터에서" 안내만 둔다. (채널마다 처리 지원 범위가 달라 조회로 통일)

**절대 규칙:**
1. 모든 데이터는 목이다. 실제 API 호출 없음. `data.ts` 상수 사용.
2. 화면에서 채널 분기 금지. `if (channel === "coupang")` 쓰지 말 것. 동작 차이는 주문 객체 플래그(`canConfirm`, `canShip`, `fulfillmentType`)로 처리.
3. 낙관적 업데이트 금지. 처리 결과 받은 뒤 상태 반영. (실패 시 화면이 거짓말 되면 안 됨)
4. 되돌릴 수 없는 작업(주문확인·송장 전송)엔 확인 모달 + 중복 클릭 방지.
5. 필터는 URL 쿼리스트링이 단일 소스. `useState`로 들지 말 것.
6. `localStorage`/`sessionStorage` 사용 금지.
7. 커스텀 Tailwind 토큰(`rounded-m`, `bg-slate-30`, `text-light`, `border-line`) 사용 금지. 기본 유틸리티만.

---

## 1. 기술 스택

- **Next.js 15.5** App Router
- **TypeScript**
- **Tailwind v4** (기본 유틸리티 클래스만)
- **shadcn/ui** — Dialog, Button, Badge, DropdownMenu, Tooltip, Tabs
- **react-coolicons** — 아이콘
- **sonner** — 토스트
- 상태: 로컬 `useState`(선택/모달/스텝), URL 쿼리스트링(목록 필터). 전역 상태 라이브러리·react-query 불필요(목데이터라서).

---

## 2. 라우팅 구조

```
app/
└─ wiaz/
   ├─ layout.tsx              # 사이드바 + 본문
   ├─ page.tsx                # ① 대시보드
   ├─ orders/
   │  ├─ page.tsx             # ② 주문 목록
   │  └─ [orderId]/page.tsx   # ③ 주문 상세
   ├─ claims/
   │  └─ page.tsx             # ④ 클레임 (조회 전용)
   ├─ shipping/
   │  ├─ page.tsx             # ⑤ 송장 업로드 (3단계)
   │  └─ _components/
   │     ├─ upload-step.tsx
   │     ├─ preview-step.tsx
   │     └─ done-step.tsx
   ├─ channels/
   │  └─ page.tsx             # ⑥ 채널 연동 상태
   └─ data.ts                 # 모든 목데이터·타입
```

진입점 `/wiaz`. 로그인 화면 제외.

---

## 3. 데이터 모델 (`app/wiaz/data.ts`)

### 3.1 타입

```ts
export type OrderStatus =
  | "new" | "confirmed" | "preparing" | "shipping"
  | "delivered" | "cancelled" | "returned" | "exchanged"
  | "delayed" | "sync_failed"

export type FulfillmentType = "SELLER" | "FULFILLMENT"

export type ChannelValue =
  | "coupang" | "naver" | "gmarket" | "auction"
  | "toss" | "cafe24" | "eleven" | "temu" | "grip" | "kakao"

export type ClaimType = "cancel" | "return" | "exchange"
export type ClaimStatus = "requested" | "collecting" | "completed"

export interface OrderItem {
  name: string
  option?: string
  quantity: number
  price: number
}

export interface TimelineEntry {
  status: string       // "주문확인"
  at: string           // "2026-07-27 14:32"
  by?: string          // "김운영" | "시스템"
}

export interface Order {
  id: string                 // 주문번호. 항상 string
  channel: ChannelValue
  partner: string            // 거래처/브랜드 (바디프로젝트 등)
  customer: string
  phone: string              // 안심번호 케이스 포함
  address: string
  product: string            // 대표 상품명 (목록용)
  quantity: number           // 총 수량
  items: OrderItem[]
  status: OrderStatus
  trackingNumber?: string
  courier?: string
  orderedAt: string          // "2026-07-27 09:12"
  timeline: TimelineEntry[]

  // UI 동작 결정 플래그
  fulfillmentType: FulfillmentType
  canConfirm: boolean        // status==="new" && SELLER 인 것만 true
  canShip: boolean           // status==="confirmed"||"preparing" && SELLER 인 것만 true
  addressChanged?: boolean
  syncStatus: "success" | "pending" | "failed"
  syncFailReason?: string
}

// 클레임 (조회 전용) — 주문에서 파생하거나 별도 목록으로 관리
export interface Claim {
  id: string                 // 클레임 ID (string)
  orderId: string            // 원 주문번호
  channel: ChannelValue
  partner: string
  customer: string
  product: string
  type: ClaimType            // 취소 / 반품 / 교환
  status: ClaimStatus        // 요청 / 수거중 / 완료
  reason: string             // 사유 (예: "단순 변심", "상품 불량")
  requestedAt: string
}
```

### 3.2 채널 메타 (카카오 포함 10개)

```ts
export const CHANNELS: { value: ChannelValue; label: string; dotColor: string }[] = [
  { value: "coupang", label: "쿠팡",        dotColor: "bg-rose-500" },
  { value: "naver",   label: "스마트스토어", dotColor: "bg-green-500" },
  { value: "gmarket", label: "G마켓",        dotColor: "bg-emerald-600" },
  { value: "auction", label: "옥션",         dotColor: "bg-red-600" },
  { value: "eleven",  label: "11번가",       dotColor: "bg-orange-500" },
  { value: "kakao",   label: "카카오",        dotColor: "bg-yellow-500" },
  { value: "toss",    label: "토스쇼핑",      dotColor: "bg-blue-500" },
  { value: "cafe24",  label: "카페24",       dotColor: "bg-slate-700" },
  { value: "temu",    label: "테무",         dotColor: "bg-amber-500" },
  { value: "grip",    label: "그립",         dotColor: "bg-fuchsia-500" },
]

export function getChannel(v: ChannelValue) {
  return CHANNELS.find((c) => c.value === v) ?? CHANNELS[0]
}
```

### 3.3 상태 메타 (색 규칙 고정)

```ts
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  new:        { label: "신규주문",   badge: "bg-slate-100 text-slate-700" },
  confirmed:  { label: "주문확인",   badge: "bg-blue-100 text-blue-700" },
  preparing:  { label: "상품준비중", badge: "bg-blue-100 text-blue-700" },
  shipping:   { label: "배송중",     badge: "bg-blue-100 text-blue-700" },
  delivered:  { label: "배송완료",   badge: "bg-green-100 text-green-700" },
  cancelled:  { label: "취소",       badge: "bg-red-100 text-red-700" },
  returned:   { label: "반품",       badge: "bg-red-100 text-red-700" },
  exchanged:  { label: "교환",       badge: "bg-red-100 text-red-700" },
  delayed:    { label: "발송지연",   badge: "bg-amber-100 text-amber-700" },
  sync_failed:{ label: "전송실패",   badge: "bg-amber-100 text-amber-700" },
}

export const CLAIM_TYPE_META: Record<ClaimType, { label: string; badge: string }> = {
  cancel:   { label: "취소", badge: "bg-red-100 text-red-700" },
  return:   { label: "반품", badge: "bg-orange-100 text-orange-700" },
  exchange: { label: "교환", badge: "bg-purple-100 text-purple-700" },
}

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string }> = {
  requested:  { label: "요청" },
  collecting: { label: "수거중" },
  completed:  { label: "완료" },
}
```

> 색 규칙: 초록=완료, 파랑=진행, 빨강=클레임/취소, 주황=주의. **사이드바 액센트를 초록으로 쓰지 말 것.**

### 3.4 상태 탭

```ts
export const ORDER_STATUS_TABS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "신규주문", statuses: ["new"] },
  { label: "주문확인", statuses: ["confirmed"] },
  { label: "배송준비", statuses: ["preparing"] },
  { label: "배송중",   statuses: ["shipping"] },
  { label: "배송완료", statuses: ["delivered"] },
  { label: "클레임",   statuses: ["cancelled", "returned", "exchanged"] },
  { label: "전송실패", statuses: ["sync_failed"] },
]
```

### 3.5 목 주문 `ORDERS` (30건 내외)

**포함 조건:**
- 10개 채널 골고루 (카카오 포함)
- 거래처 4개(바디프로젝트/일품미식/원시인/위아즈) 섞기
- 상태 다양 (new 8~10건, 나머지 각 2~4건, 클레임 상태 cancelled/returned/exchanged 합쳐 4~5건)
- `fulfillmentType: "FULFILLMENT"` **4건** (쿠팡·네이버·11번가·토스 하나씩)
- `syncStatus: "failed"` **2건** (`syncFailReason` 포함, 예: "채널 인증 만료", "일시적 오류")
- `addressChanged: true` **1건** (쿠팡)
- 안심번호 `phone` **2건** (쿠팡·카카오, 예: "0504-1234-5678")
- 플래그 규칙:
  - `canConfirm = status === "new" && fulfillmentType === "SELLER"`
  - `canShip = (status === "confirmed" || status === "preparing") && fulfillmentType === "SELLER"`
- 각 주문 `timeline` 2~3개, `items` 1~2개

### 3.6 목 클레임 `CLAIMS` (8~10건)

**포함 조건:**
- `type` 세 종류(cancel·return·exchange) 골고루
- `status` 세 종류(requested·collecting·completed) 섞기
- 여러 채널·거래처에 분산
- 일부는 `orderId`가 `ORDERS`의 실제 주문과 연결되게 (상세에서 원주문 링크 가능하도록). 나머지는 독립이어도 됨
- `reason` 예시: "단순 변심", "상품 불량", "오배송", "사이즈 교환", "색상 변경"

> 클레임 데이터는 `ORDERS`와 별도 배열로 둔다. (주문 목록의 클레임 탭은 `status`가 cancelled/returned/exchanged인 주문을 보여주고, 클레임 전용 페이지는 `CLAIMS` 배열을 보여준다. 둘은 관점이 다르다 — 탭은 "클레임 상태가 된 주문", 전용 페이지는 "클레임 요청 상세". 데모에선 둘 다 목데이터로 채운다.)

### 3.7 채널 연동 목데이터

```ts
export type ConnStatus = "connected" | "pending" | "not_connected"

export const CONN_META: Record<ConnStatus, { label: string; dot: string }> = {
  connected:     { label: "연결됨",   dot: "bg-green-500" },
  pending:       { label: "승인 대기", dot: "bg-amber-500" },
  not_connected: { label: "미연결",   dot: "bg-slate-300" },
}

export interface ChannelConn {
  status: ConnStatus
  lastSyncedAt: string | null
  keyExpiresInDays: number | null   // 쿠팡만 숫자
}

// 승인 완료 전제이므로 대부분 connected. 데모 현실감을 위해 일부만 대기/미연결 유지.
export const CHANNEL_CONNECTIONS: Record<ChannelValue, ChannelConn> = {
  coupang: { status: "connected", lastSyncedAt: "2026-07-27 14:25", keyExpiresInDays: 45 },
  naver:   { status: "connected", lastSyncedAt: "2026-07-27 14:22", keyExpiresInDays: null },
  gmarket: { status: "connected", lastSyncedAt: "2026-07-27 14:20", keyExpiresInDays: null },
  auction: { status: "connected", lastSyncedAt: "2026-07-27 14:20", keyExpiresInDays: null },
  eleven:  { status: "connected", lastSyncedAt: "2026-07-27 14:28", keyExpiresInDays: null },
  kakao:   { status: "connected", lastSyncedAt: "2026-07-27 14:18", keyExpiresInDays: null },
  toss:    { status: "connected", lastSyncedAt: "2026-07-27 14:15", keyExpiresInDays: null },
  cafe24:  { status: "connected", lastSyncedAt: "2026-07-27 14:30", keyExpiresInDays: null },
  temu:    { status: "connected", lastSyncedAt: "2026-07-27 14:10", keyExpiresInDays: null },
  grip:    { status: "connected", lastSyncedAt: "2026-07-27 14:12", keyExpiresInDays: null },
}
```

### 3.8 헬퍼

```ts
export function orderTotal(o: Order) {
  return o.items.reduce((s, it) => s + it.price * it.quantity, 0)
}
```

---

## 4. 화면 사양

### ① 대시보드 `/wiaz`

**A. 오늘 처리 카드 4개** (가로):
- 신규주문 / 발송지연 / 클레임 / 전송실패, 각 건수.
- **클릭 → 해당 필터로 이동** (신규주문 → `/wiaz/orders?status=new`, 클레임 → `/wiaz/claims`).

**B. 채널 연동 상태 패널:**
- `CHANNELS` 순회, 각 채널 점+라벨+상태.
- connected 초록 / pending 주황 / not_connected 회색. (승인 전제라 대부분 초록)
- 쿠팡은 키 만료 `D-45` 표기(≤30이면 주황).
- 우측 상단: "마지막 동기화 N분 전" + `[지금 동기화]` → 누르면 **"동기화를 요청했습니다"** 토스트.

### ② 주문 목록 `/wiaz/orders` (중심 화면)

**필터 (URL 단일 소스):**
- `channel`: 단일 드롭다운 (전체 + 10채널)
- `status`: 상태 탭 연동, 콤마 인코딩(`cancelled,returned,exchanged`)
- `fulfillment`: 드롭다운 (전체/셀러발송/풀필먼트), **기본값 SELLER**

URL 읽기 `useSearchParams`, 쓰기 `router.replace`(push 아님), 경로는 `usePathname()`.

**상태 탭:** `ORDER_STATUS_TABS` + "전체". 각 탭 건수 뱃지. **건수는 채널·발송주체 필터 적용 후, 상태 필터 적용 전 기준**(= baseFiltered).

**테이블 컬럼:**
```
[체크박스] 채널 · 주문번호 · 주문자 · 상품명 · 수량 · 상태 · 결제금액 · 주문일자
```
- 채널: 점+라벨. FULFILLMENT면 옆에 "풀필먼트" 뱃지(보라).
- `syncStatus==="failed"` 행: 배경 강조 + 경고 아이콘.
- 주문번호: teal + hover 밑줄.
- **행 클릭 → 상세 / 체크박스 클릭 → 선택** (클릭영역 분리, `e.stopPropagation()`).
- 결제금액: `orderTotal(o)`, tabular-nums.

**선택 & 일괄 작업 바** (선택 시 하단 고정):
```
N건 선택됨 | 주문확인 | 발송처리(송장입력) | 엑셀 다운로드 | 선택 해제
```
- **엑셀 다운로드:** 선택 주문 CSV. BOM 붙여 한글 안 깨지게. 컬럼: 주문번호/채널/발송주체/주문자/상품명/수량/상태/송장번호/결제금액/주문일자.
- **주문확인:** 선택 중 `canConfirm===true`인 것만 대상. 대상 0건이면 토스트 에러. 있으면 확인 모달.
- **발송처리:** `canShip===true`인 건만 `/wiaz/shipping?orders=...`로. 풀필먼트·미확인은 안 넘김.
- **선택 해제.**

**주문확인 모달 (정식 기능 · 위험 작업 경고 유지):**
```
제목: 주문확인 처리
본문: 선택한 N건 중 M건을 주문확인 처리합니다. (M=canConfirm 개수, N-M은 대상 아님 안내)
경고 박스(주황):
  ⚠ 처리 후에는 되돌릴 수 없습니다.
  ⚠ 고객에게 '배송준비중' 알림이 발송되고, 구매자의 즉시 취소가 제한됩니다.
버튼: [취소] [주문확인 처리]
```
- 처리 시: 대상 중 1건 실패 처리(데모), 나머지 성공. **결과 모달**:
```
처리 완료: 성공 X건 / 실패 Y건
- 주문 {id}  {사유}
```
- 성공 주문은 `status→confirmed`, timeline 추가.
- **처리 후 선택은 실패 건만 남김** (재시도 흐름).
- 처리 중 버튼 disabled(중복 클릭 방지).

**페이지네이션:** 30건이면 없어도 됨. 무한스크롤 금지.

### ③ 주문 상세 `/wiaz/orders/[orderId]`

섹션:
1. 주문 정보: 번호·채널·거래처·주문일시·상태 뱃지
2. 수취인·배송지: 이름/연락처/주소. **`addressChanged`면 "배송지 변경됨" 주황 배지**
3. 상품 항목: `items` 항목 단위 나열
4. 결제: `orderTotal`
5. 처리 이력: `timeline` 타임라인
6. (접힘) 채널 원본 데이터: 목 JSON 한 덩어리

없는 id면 "주문을 찾을 수 없습니다".

### ④ 클레임 `/wiaz/claims` (조회 전용 — 신규)

**목적:** 취소·반품·교환 요청을 한 화면에서 조회. **처리 버튼 없음.**

**상단 타입 탭:** 전체 / 취소 / 반품 / 교환. (건수 뱃지)

**필터:** 채널 드롭다운(전체 + 10채널), 상태 드롭다운(전체/요청/수거중/완료). URL 쿼리스트링 단일 소스.

**테이블 컬럼:**
```
채널 · 클레임유형 · 주문번호 · 주문자 · 상품명 · 사유 · 상태 · 요청일자
```
- 클레임유형: `CLAIM_TYPE_META` 뱃지 (취소 빨강/반품 주황/교환 보라).
- 상태: `CLAIM_STATUS_META` 라벨.
- 주문번호: 클릭 시 해당 주문 상세로 이동(`/wiaz/orders/{orderId}`) — 원주문이 `ORDERS`에 있으면.

**하단 또는 상단 안내 배너 (회색/정보):**
```
ℹ 클레임 조회는 전 채널 지원됩니다. 실제 처리(승인·거부)는 각 채널 판매자센터에서 진행합니다.
```

> 이 화면이 "조회는 우리가 통합, 처리는 채널에서"를 보여주는 핵심. 처리 버튼을 절대 넣지 말 것. 조회·확인 용도.

### ⑤ 송장 업로드 `/wiaz/shipping` (정식 기능)

**3단계 상태머신** `upload → preview → done` (useState).

**upload (`UploadStep`):**
- 파일 선택 input(파싱 생략, 파일명만).
- `?orders=` 넘어온 건수 안내.
- "검증하기" → preview (파일명 없으면 토스트 에러).

**preview (`PreviewStep`) — 핵심:**
- 검증 결과 **성공/실패 분리** (목):
```
검증 결과: 성공 N건 / 실패 M건
실패 내역:
  행 12  송장번호가 중복되었습니다
  행 27  상품준비중 상태가 아닙니다
  행 33  존재하지 않는 주문번호입니다
[실패 건 다운로드] [N건 확정 전송]
```
- 실패 사유 위 3종 순환. 성공 0이면 확정 버튼 disabled.
- "확정 전송" → done(스피너, 중복 클릭 방지).

**done (`DoneStep`):**
- "N건 발송처리가 완료되었습니다".
- "새 업로드" → upload 리셋(파일명 초기화).

### ⑥ 채널 연동 `/wiaz/channels`

**연동 상태 테이블:**
```
채널 · 연동 상태 · 키 만료 · 마지막 동기화 · [재동기화]
```
- 상태 점+라벨. 키 만료는 쿠팡만 D-45(≤30 주황), 나머지 `-`.
- 재동기화 버튼: `connected`일 때만 활성. 누르면 "동기화를 요청했습니다" 토스트.

---

## 5. 레이아웃 / 사이드바 `app/wiaz/layout.tsx`

- 좌측 고정 사이드바 `w-72`, 다크 배경(`bg-slate-900` 또는 `bg-teal-800` — **초록 아님**), 본문 `bg-slate-50`.
- 상단: 로고 자리 + "통합 주문 관리 시스템".
- 메뉴 (flat):
```
대시보드     → /wiaz          (ChartPie)
주문 목록    → /wiaz/orders    (ListUnordered)
클레임       → /wiaz/claims    (아이콘: 적절히, 예 Undo 또는 AlertCircle 계열)
송장 업로드  → /wiaz/shipping  (FileUpload)
채널 연동    → /wiaz/channels  (Settings)
```
- active: `/wiaz`는 정확히 일치, 나머지 `pathname.startsWith(href)`.
- 하단: 프로필(홍길동 / 운영 관리자) + 로그아웃.
- **로그아웃은 `<button>`으로 감쌀 것**(SVG에 onClick 직접 금지, 키보드 접근).
- 커스텀 토큰 금지, `rounded-lg` 등 기본만.

---

## 6. 시연 시나리오

1. **대시보드**: 오늘 처리 건수 + 채널 연동(대부분 연결됨) 확인.
2. "신규주문" 카드 클릭 → 주문목록 필터 이동.
3. **주문 목록**: 채널·발송주체 필터, 상태 탭 전환. 풀필먼트 뱃지·전송실패 행 확인. 엑셀 다운로드 실제 동작.
4. 필터 바꿔도 선택 유지 시연.
5. 신규주문 선택 → **주문확인**: 경고 모달 → 처리 → 성공/실패 결과 → 실패 건만 재선택.
6. 주문 클릭 → **상세**: 처리 이력 타임라인, (쿠팡) 배송지 변경 배지.
7. **클레임 화면**: 취소·반품·교환 조회. 타입 탭 전환. "처리는 채널에서" 안내 확인.
8. **송장 업로드**: 업로드 → 검증 성공/실패 → 완료.
9. **채널 연동**: 연동 상태 + 쿠팡 키 만료.

**미팅 멘트(참고):**
- 3번: "10개 채널 주문을 한 화면에서 보고, 배송정보를 엑셀로 바로 내려받습니다."
- 5번: "주문확인·발송처리 같은 처리 기능도 여기서 바로 됩니다. 되돌릴 수 없는 작업이라 확인 단계를 거칩니다."
- 7번: "클레임은 전 채널을 한 화면에서 조회합니다. 실제 처리는 채널에서 하시고, 여기선 무엇이 들어왔는지 통합해서 봅니다."

---

## 7. 데모에 넣지 말 것

- ❌ "실시간 주문 알림" (실제 최소 10분 지연)
- ❌ "과거 전체 기간 조회" (채널마다 31~90일 상한)
- ❌ 발송 대기 목록에 풀필먼트 섞기 (기본 필터 제외)
- ❌ 낙관적 상태 반영
- ❌ **클레임 처리(승인·거부) 버튼** — 조회만. 처리 버튼 넣지 말 것
- ❌ 정산 화면
- ❌ localStorage/sessionStorage

---

## 8. 완료 기준 (Definition of Done)

- [ ] 6개 라우트(+주문 상세) 전부 이동 가능, 빈 화면 없음
- [ ] 주문 목록: 필터 3종 URL 반영, 새로고침·뒤로가기해도 유지
- [ ] 상태 탭 건수가 채널·발송주체 필터에 연동
- [ ] 선택이 필터 넘어가도 유지, 처리 후 실패 건만 재선택
- [ ] 엑셀 다운로드 실제 동작 (CSV, 한글 안 깨짐)
- [ ] 풀필먼트 뱃지·전송실패 행·배송지변경 배지 목데이터로 표시
- [ ] 주문확인: 경고 모달(되돌릴 수 없음/고객 알림) → 성공/실패 결과
- [ ] **클레임 화면: 타입 탭·필터·조회 동작, "처리는 채널에서" 안내, 처리 버튼 없음**
- [ ] 송장 업로드 3단계, preview 성공/실패 분리
- [ ] 대시보드 카드 클릭 → 해당 화면 이동 (클레임 카드 → 클레임 페이지)
- [ ] 채널 연동: 상태 + 쿠팡 키 만료
- [ ] 커스텀 토큰 미사용, 로그아웃 button, hover/cursor 처리
- [ ] 콘솔 에러 없음
```
