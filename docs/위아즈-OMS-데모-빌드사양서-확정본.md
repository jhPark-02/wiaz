# 위아즈 OMS 데모 — 빌드 사양서 (확정본)

> **대상:** Claude Code. 이 문서만 보고 처음부터 끝까지 구현 가능하도록 작성됨.
> **목표:** 미팅 시연용 프론트 데모. 목(mock) 데이터 기반. 실제 API 연동 없음.
> **성격:** "조회·통합 기능"은 실제로 동작하게 만들고, "쓰기 기능(주문확인·송장)"은 화면은 있되 **2차 예정**으로 명확히 표시한다.

---

## 0. 이 데모의 스코프 (반드시 지킬 것)

실제 채널 API를 조사한 결과, **조회 기능은 전 채널 공통으로 되지만, 쓰기 기능(주문확인·클레임 처리)은 채널마다 지원 범위가 다르다.** (업계 솔루션도 동일) 따라서 데모는 이렇게 나눈다.

| 구분 | 기능 | 데모에서 |
|---|---|---|
| **1차 (지금 됨)** | 주문조회·배송정보·상세·통합대시보드·필터·검색·엑셀·동기화상태 | **실제로 동작하게 구현** |
| **2차 (예정)** | 주문확인·송장등록 | 화면은 만들되 **"2차 예정" 뱃지** + 목 시연만 |
| **제외** | 클레임 처리(취소·반품·교환)·정산 | 데모에 넣지 않음 (조회 화면에 "준비 중" 표기만) |

**절대 규칙:**
1. 모든 데이터는 목이다. 실제 API 호출 없음. `data.ts` 상수 사용.
2. 화면에서 채널 분기 금지. `if (channel === "coupang")` 쓰지 말 것. 동작 차이는 주문 객체의 플래그(`canConfirm`, `canShip`, `fulfillmentType`)로 처리.
3. 낙관적 업데이트 금지. 처리 결과 받은 뒤 상태 반영.
4. 되돌릴 수 없는 작업(주문확인·발송처리)엔 확인 모달 + 중복 클릭 방지.
5. 필터는 URL 쿼리스트링이 단일 소스. `useState`로 들지 말 것.
6. 2차 기능엔 반드시 시각적 "2차 예정" 표시. 미팅에서 "이건 지금 됩니다 / 이건 곧"이 한눈에 구분돼야 함.
7. `localStorage`/`sessionStorage` 사용 금지.
8. 커스텀 Tailwind 토큰(`rounded-m`, `bg-slate-30`, `text-light`, `border-line`) 사용 금지. 기본 유틸리티만.

---

## 1. 기술 스택

- **Next.js 15.5** App Router
- **TypeScript**
- **Tailwind v4** (기본 유틸리티 클래스만)
- **shadcn/ui** — Dialog, Button, Badge, DropdownMenu, Tooltip
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
   ├─ shipping/
   │  ├─ page.tsx             # ④ 송장 업로드 (2차 예정 표시)
   │  └─ _components/
   │     ├─ upload-step.tsx
   │     ├─ preview-step.tsx
   │     └─ done-step.tsx
   ├─ channels/
   │  └─ page.tsx             # ⑤ 채널 연동 상태 + 기능 지원 현황
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
  | "toss" | "cafe24" | "eleven" | "temu" | "grip"

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
```

### 3.2 채널 메타

```ts
export const CHANNELS: { value: ChannelValue; label: string; dotColor: string }[] = [
  { value: "coupang", label: "쿠팡",        dotColor: "bg-rose-500" },
  { value: "naver",   label: "스마트스토어", dotColor: "bg-green-500" },
  { value: "gmarket", label: "G마켓",        dotColor: "bg-emerald-600" },
  { value: "auction", label: "옥션",         dotColor: "bg-red-600" },
  { value: "toss",    label: "토스쇼핑",      dotColor: "bg-blue-500" },
  { value: "cafe24",  label: "카페24",       dotColor: "bg-slate-700" },
  { value: "eleven",  label: "11번가",       dotColor: "bg-orange-500" },
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
```

> 색 규칙: 초록=완료, 파랑=진행, 빨강=클레임, 주황=주의. **사이드바 액센트를 초록으로 쓰지 말 것.**

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
- 9개 채널 골고루
- 거래처 4개(바디프로젝트/일품미식/원시인/위아즈) 섞기
- 상태 다양 (new 8~10건, 나머지 상태 각 2~4건)
- `fulfillmentType: "FULFILLMENT"` **4건** (쿠팡·네이버·11번가·토스 하나씩)
- `syncStatus: "failed"` **2건** (`syncFailReason` 포함, 예: "채널 인증 만료", "일시적 오류")
- `addressChanged: true` **1건** (쿠팡)
- 안심번호 `phone` **2건** (쿠팡·카카오형, 예: "0504-1234-5678")
- 플래그 규칙 준수:
  - `canConfirm = status === "new" && fulfillmentType === "SELLER"`
  - `canShip = (status === "confirmed" || status === "preparing") && fulfillmentType === "SELLER"`
- 각 주문 `timeline` 2~3개, `items` 1~2개

### 3.6 채널 연동 + 기능 지원 목데이터

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
  // 기능 지원 현황 (기능 매트릭스용)
  features: {
    orderRead: boolean      // 주문조회 (1차)
    shipInfo: boolean       // 배송정보 (1차)
    confirm: boolean        // 주문확인 (2차)
    invoice: boolean        // 송장등록 (2차)
    claim: "full" | "read" | "none"  // 클레임
  }
}

export const CHANNEL_CONNECTIONS: Record<ChannelValue, ChannelConn> = {
  cafe24:  { status: "connected", lastSyncedAt: "2026-07-27 14:30", keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"read" } },
  eleven:  { status: "connected", lastSyncedAt: "2026-07-27 14:28", keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"full" } },
  coupang: { status: "connected", lastSyncedAt: "2026-07-27 14:25", keyExpiresInDays: 45,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"full" } },
  naver:   { status: "connected", lastSyncedAt: "2026-07-27 14:22", keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"full" } },
  toss:    { status: "pending", lastSyncedAt: null, keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"read" } },
  grip:    { status: "pending", lastSyncedAt: null, keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"none" } },
  gmarket: { status: "pending", lastSyncedAt: null, keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"full" } },
  auction: { status: "pending", lastSyncedAt: null, keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"full" } },
  temu:    { status: "not_connected", lastSyncedAt: null, keyExpiresInDays: null,
             features: { orderRead:true, shipInfo:true, confirm:true, invoice:true, claim:"read" } },
}
```

### 3.7 헬퍼

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
- **클릭 → 해당 필터로 주문목록 이동** (예: 신규주문 → `/wiaz/orders?status=new`).

**B. 채널 연동 상태 패널:**
- `CHANNELS` 순회, 각 채널 점+라벨+상태.
- connected 초록 / pending 주황("승인 대기") / not_connected 회색.
- 쿠팡은 키 만료 `D-45` 표기(≤30이면 주황).
- 우측 상단: "마지막 동기화 N분 전" + `[지금 동기화]` → 누르면 **"동기화를 요청했습니다"** 토스트(완료 아님).

> 이 패널이 미팅 신뢰 포인트. 연결4/대기4/미연결1이 정직하게 보이는 게 핵심.

### ② 주문 목록 `/wiaz/orders` (중심 화면 — 1차, 실제 동작)

**필터 (URL 단일 소스):**
- `channel`: 단일 드롭다운 (전체 + 9채널)
- `status`: 상태 탭 연동, 콤마 인코딩(`cancelled,returned,exchanged`)
- `fulfillment`: 드롭다운 (전체/셀러발송/풀필먼트), **기본값 SELLER**

URL 읽기는 `useSearchParams`, 쓰기는 `router.replace`(push 아님 — 히스토리 안 쌓이게). 경로는 `usePathname()`으로.

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
N건 선택됨 | 주문확인 [2차] | 발송처리(송장입력) [2차] | 엑셀 다운로드 | 선택 해제
```
- **엑셀 다운로드 (1차, 실제 동작):** 선택 주문 CSV. BOM 붙여 한글 안 깨지게. 컬럼: 주문번호/채널/발송주체/주문자/상품명/수량/상태/송장번호/결제금액/주문일자.
- **주문확인 [2차 뱃지]:** 버튼 옆 작은 "2차" 뱃지. 클릭하면 확인 모달(아래). 대상은 `canConfirm===true`인 것만.
- **발송처리 [2차 뱃지]:** `canShip===true`인 건만 `/wiaz/shipping?orders=...`로. 풀필먼트·미확인은 안 넘김.
- **선택 해제.**

> 2차 뱃지 스타일: `bg-amber-100 text-amber-700` 작은 라운드 라벨 "2차". 미팅에서 "이건 곧"이 보이게.

**주문확인 모달** (2차 기능이지만 데모 시연은 됨):
```
제목: 주문확인 처리  [2차 예정]
본문: 선택한 N건 중 M건을 주문확인 처리합니다. (M=canConfirm 개수, N-M은 대상 아님 안내)
안내 박스(주황):
  ⚠ 이 기능은 2차 적용 예정입니다. 채널별로 지원 범위를 검증 후 제공합니다.
  ⚠ 실제 적용 시 고객에게 '배송준비중' 알림이 발송되고 되돌릴 수 없습니다.
버튼: [취소] [주문확인 처리 (데모)]
```
- 처리 시(데모): 대상 중 1건 실패 처리, 나머지 성공. **결과 모달**:
```
처리 완료: 성공 X건 / 실패 Y건
- 주문 {id}  {사유}
```
- 성공 주문은 `status→confirmed`, timeline 추가.
- **처리 후 선택은 실패 건만 남김** (재시도 흐름).
- 처리 중 버튼 disabled(중복 클릭 방지).

**페이지네이션:** 30건이면 없어도 됨. 무한스크롤 금지.

### ③ 주문 상세 `/wiaz/orders/[orderId]` (1차)

섹션:
1. 주문 정보: 번호·채널·거래처·주문일시·상태 뱃지
2. 수취인·배송지: 이름/연락처/주소. **`addressChanged`면 "배송지 변경됨" 주황 배지**
3. 상품 항목: `items` 항목 단위 나열
4. 결제: `orderTotal`
5. 처리 이력: `timeline` 타임라인
6. (접힘) 채널 원본 데이터: 목 JSON 한 덩어리

없는 id면 "주문을 찾을 수 없습니다".

### ④ 송장 업로드 `/wiaz/shipping` (2차 — 화면 상단에 배너)

**페이지 최상단 배너:** `이 기능은 2차 적용 예정입니다. 아래는 미리보기 데모입니다.` (주황 박스)

**3단계 상태머신** `upload → preview → done` (useState):

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
- "확정 전송" → done(스피너).

**done (`DoneStep`):**
- "N건 발송처리가 완료되었습니다 (데모)".
- "새 업로드" → upload 리셋(파일명 초기화).

### ⑤ 채널 연동 + 기능 지원 현황 `/wiaz/channels` (미팅 핵심 화면)

두 블록.

**A. 연동 상태 테이블:**
```
채널 · 연동 상태 · 키 만료 · 마지막 동기화 · [재동기화]
```
- 상태 점+라벨. 키 만료는 쿠팡만 D-45(≤30 주황), 나머지 `-`.
- 재동기화 버튼: `connected`일 때만 활성. 누르면 "동기화를 요청했습니다" 토스트.

**B. 기능 지원 매트릭스 (이게 "공통 기능"을 보여주는 화면):**
```
              주문   배송   | 주문   송장   | 클레임
              조회   정보   | 확인   등록   | 조회/처리
              (1차)  (1차)  | (2차)  (2차)  |
쿠팡           ●     ●      |  ●     ●      |  처리
스마트스토어    ●     ●      |  ●     ●      |  처리
G마켓          ●     ●      |  ●     ●      |  처리
옥션           ●     ●      |  ●     ●      |  처리
11번가         ●     ●      |  ●     ●      |  처리
카페24         ●     ●      |  ●     ●      |  조회
토스쇼핑        ●     ●      |  ●     ●      |  조회
그립           ●     ●      |  ●     ●      |  준비중
테무           ●     ●      |  ●     ●      |  조회
```
- 1차 컬럼(주문조회·배송정보): **진한 초록 채움 ●**. "지금 됩니다".
- 2차 컬럼(주문확인·송장): **연한 회색/점선 ○ + 상단에 '2차 예정' 헤더**. "곧".
- 클레임: `features.claim` 값에 따라 "처리"(full) / "조회"(read) / "준비중"(none).
- 표 상단에 구분 범례: `● 지금 제공  ○ 2차 예정`.
- `CHANNEL_CONNECTIONS[ch].features` 값으로 렌더 (하드코딩 말고 데이터 기반).

> 이 매트릭스가 "조회는 전 채널 다 되고, 쓰기는 순차 적용"을 한 화면으로 보여주는 미팅 도구. 색으로 1차/2차가 갈려서, "보여준 건 되고 안 되는 건 약속 안 함"이 시각적으로 명확.

---

## 5. 레이아웃 / 사이드바 `app/wiaz/layout.tsx`

- 좌측 고정 사이드바 `w-72`, 다크 배경(`bg-slate-900` 또는 `bg-teal-800` — **초록 아님**), 본문 `bg-slate-50`.
- 상단: 로고 자리 + "통합 주문 관리 시스템".
- 메뉴 (flat):
```
대시보드     → /wiaz          (ChartPie)
주문 목록    → /wiaz/orders    (ListUnordered)
송장 업로드  → /wiaz/shipping  (FileUpload)   ※ 옆에 작은 "2차" 뱃지
채널 연동    → /wiaz/channels  (Settings)
```
- active: `/wiaz`는 정확히 일치, 나머지 `pathname.startsWith(href)`.
- 하단: 프로필(홍길동 / 운영 관리자) + 로그아웃.
- **로그아웃은 `<button>`으로 감쌀 것**(SVG에 onClick 직접 금지, 키보드 접근).
- 커스텀 토큰 금지, `rounded-lg` 등 기본만.

---

## 6. 시연 시나리오 (이 흐름대로 동작하게)

1. **대시보드**: 오늘 처리 건수 + 채널 연동(연결4/대기4/미연결1) 확인.
2. "신규주문" 카드 클릭 → 주문목록 필터 이동.
3. **주문 목록(1차, 실제 동작)**: 채널·발송주체 필터, 상태 탭 전환. 풀필먼트 뱃지·전송실패 행 확인. **엑셀 다운로드 실제로 됨.**
4. 필터 바꿔도 선택 유지 시연.
5. 주문 클릭 → **상세**: 처리 이력 타임라인, (쿠팡) 배송지 변경 배지.
6. 신규주문 선택 → **주문확인 [2차]**: 모달에 "2차 예정" 안내 → 데모 처리 → 성공/실패 결과 → 실패 건만 재선택.
7. **송장 업로드 [2차]**: 상단 2차 배너 → 업로드 → 검증 성공/실패 → 완료.
8. **채널 연동 화면**: 연동 상태 + **기능 매트릭스**로 "조회는 전 채널 지금, 쓰기는 2차"를 한눈에.

**미팅 멘트(참고):**
- 3번에서: "9개 채널 주문을 한 화면에서 보고, 배송정보를 엑셀로 바로 내려받습니다. 지금 실제로 되는 기능입니다."
- 8번에서: "조회·배송정보는 전 채널 지금 제공됩니다(초록). 주문확인·송장 같은 처리 기능은 채널마다 지원 범위가 달라서 검증 후 순차 적용합니다(2차 예정)."

---

## 7. 데모에 넣지 말 것

- ❌ "실시간 주문 알림" (실제 최소 10분 지연)
- ❌ "과거 전체 기간 조회" (채널마다 31~90일 상한)
- ❌ 발송 대기 목록에 풀필먼트 섞기 (기본 필터 제외)
- ❌ 낙관적 상태 반영
- ❌ 클레임 처리(취소·반품·교환) 실행 버튼 (조회 표기만)
- ❌ 정산 화면
- ❌ localStorage/sessionStorage

---

## 8. 완료 기준 (Definition of Done)

- [ ] 5개 라우트(+상세) 전부 이동 가능, 빈 화면 없음
- [ ] 주문 목록: 필터 3종 URL 반영, 새로고침·뒤로가기해도 유지
- [ ] 상태 탭 건수가 채널·발송주체 필터에 연동
- [ ] 선택이 필터 넘어가도 유지, 처리 후 실패 건만 재선택
- [ ] **엑셀 다운로드 실제 동작** (CSV, 한글 안 깨짐)
- [ ] 풀필먼트 뱃지·전송실패 행·배송지변경 배지 목데이터로 표시
- [ ] 주문확인·송장에 "2차 예정" 표시 명확
- [ ] 송장 업로드 3단계, preview 성공/실패 분리
- [ ] 대시보드 카드 클릭 → 필터 이동
- [ ] 채널 연동: 연결/대기/미연결 3상태 + 쿠팡 키 만료
- [ ] **기능 매트릭스: 1차(초록 채움)/2차(회색 점선) 시각 구분**
- [ ] 커스텀 토큰 미사용, 로그아웃 button, hover/cursor 처리
- [ ] 콘솔 에러 없음
```
