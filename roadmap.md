# Zeta Xmas Tree – 구현 현황 & 상세 요구사항 매핑

현재 구현 상태와 원래 기획 스펙(상세)을 한 번에 볼 수 있도록 정리한 “개발 기준 문서”입니다.

## 1) 기획 핵심 요구사항 (요약)
- 코어 메커닉: 10 슬롯 트리, 무료 가챠 3장, (결제 기반) 프리미엄 업로드 $1, 삭제 $0.5, 좋아요 5개 한도(트리당 1), 완료 트리만 리더보드(좋아요 desc → 완료 시각 asc).
- 바이럴/레퍼럴: 트리 퍼머링크 `?ref=<userId>&tree_id=<treeId>`/invite code, 더블 사이드 리워드(양쪽 티켓/할인).
- 경제/결제: 뽑기권 구매, 프리미엄 업로드 결제, 삭제 결제, 상금 분배(트리 50% / 오너먼트 균등 50%), 지갑 연결 후 claim.
- UX 플로우: 친구 트리 랜딩 → 오너먼트 달기 → 내 트리 생성/공유 → 리더보드/내 활동 탭.

## 2) 현재 구현된 것 (코드 기준)
- 세션: 게스트 생성 `POST /api/auth/guest`, 티켓 3장 초기화.
- 트리: 생성/내 목록/단일 조회 (`/api/trees`, `/api/trees/:id`), shareCode 부여.
- 오너먼트: 부착 (`/api/trees/:id/ornaments`, 슬롯 유니크, 채우면 COMPLETED 전환), 삭제 (`/api/ornaments/:id`), Audit + Payment stub 기록.
- 좋아요: `/api/trees/:id/like` (1트리 1회, 총 5회 제한, likeCount 반영).
- 리더보드: `/api/leaderboard` (COMPLETED만, 좋아요 desc → 완료 asc).
- 가챠: `/api/gacha/draw` (티켓 차감, 플레이스홀더 이미지 반환).
- 마이: `/api/me` (티켓/좋아요/내 트리/내 오너먼트 요약).
- 레퍼럴: 코드 생성·목록 (`/api/referrals`), 코드 사용 (`/api/referrals/use`, 자기추천 차단, 양쪽 티켓 +1).
- 결제: `/api/payments` (유료 업로드/삭제/티켓 구매용, SUCCESS 즉시 처리).
- 프론트 화면: 홈, 트리 상세, 트리 생성, 내 정보, 리더보드, 공유 CTA (오너먼트 UI는 텍스트 슬롯, 업로드/애니메이션 미구현).

## 3) 데이터 모델 (Prisma)
- 코어: User, Tree, Ornament, Like, Referral, Quest, QuestCompletion, Reward.
- 확장/로깅: Payment, OrnamentAudit, RewardClaim.
- 제약: 오너먼트 슬롯 유니크, 좋아요 유니크, inviteCode/shareCode/referral code 유니크.

## 4) 미구현/보완 상세 TODO (기획 매핑)
1. **지갑·상금 수령**: RewardClaim API/페이지, 지갑 주소+txHash 기록, claim status 업데이트, 상금 분배(트리 50% / 오너먼트 균등 50%) 로직 반영.
2. **결제 실구현**: Stripe/온체인 영수증 검증, 금액/통화 설정, 실패/취소 처리, 티켓 구매 플로우 UI와 티켓 잔액 동기화.
3. **프리미엄 업로드**: 파일 업로드 UI, 스토리지(S3/Supabase) 연동, 파일 검증/리사이즈, 서명 URL, 업로드→ornament 생성 원스텝.
4. **가챠 고도화**: 가챠 결과 메타데이터(희귀도/이미지) 저장, 유료 티켓 구매 경로, 실시간 티켓 표시.
5. **레퍼럴/공유 트래킹**: shareCode 기반 퍼머링크 처리(`?ref`/`?invite`/`tree_id`), referrer 쿠키 일관성, 이벤트 로그/메트릭 테이블.
6. **친구 트리 랜딩 UX**: 오너먼트 달기 CTA, 뽑기/드래그 애니메이션, 완료 후 CTA(내 오너먼트 보기/내 트리 만들기) 구현.
7. **탭/피드**: 트리 피드(인기·친구 참여), 리더보드, 내 활동 탭 구조; 친구 참여 트리 추천 로직.
8. **오너먼트 관리 정책**: 삭제 시 트리 상태(완료→미완성) 처리 기준, “버려진 오너먼트 박스” 옵션 여부 결정 및 구현.
9. **보안/레이트리밋**: 입력 검증 강화, abuse 방지, 공용 API 에러/429 처리, 서버 액세스/행동 로그.
10. **테스트**: 슬롯 충돌, 좋아요 한도, 레퍼럴 자기추천 차단, 결제 stub/실결제, 리더보드 정렬, 트리 완료 전환 등 유닛/통합 테스트.
11. **비밀정보**: `.env.local` 실키 제거 및 회수·재발급.

## 5) 빠른 파일 맵
- API 클라이언트: `src/lib/api-client.ts`
- 트리/오너먼트/좋아요/리더보드: `app/api/trees/**`, `app/api/leaderboard/route.ts`
- 가챠: `app/api/gacha/draw/route.ts`
- 결제: `app/api/payments/route.ts`
- 레퍼럴: `app/api/referrals/**`
- 스키마: `prisma/schema.prisma`
- 화면: `app/page.tsx`, `app/(main)/tree/[id]/page.tsx`, `app/(main)/leaderboard/page.tsx`, `app/(main)/me/page.tsx`, `app/tree/new/page.tsx`
