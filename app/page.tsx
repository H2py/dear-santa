'use client';

import { useMemo, useRef, useState } from 'react';

type Letter = {
  id: number;
  childName: string;
  age: number;
  region: string;
  wishTitle: string;
  wishDetail: string;
  targetAmount: number;
  fundedPercent: number;
  helpedCount: number;
  completed: boolean;
};

type SantaPass = {
  id: number;
  letterId: number;
  childName: string;
  region: string;
  season: string;
  createdAt: string;
  completed: boolean;
  updates: { id: number; at: string; text: string }[];
};

type Activity = {
  id: number;
  letterId: number;
  childName: string;
  region: string;
  createdAt: string;
  type: 'funded' | 'update';
  text: string;
};

const initialLetters: Letter[] = [
  {
    id: 1,
    childName: '지우',
    age: 9,
    region: '서울',
    wishTitle: '태어나서 처음 가져보는 자기만의 책상',
    wishDetail:
      '공부를 침대에서 하다 보니 허리도 아프고 집중이 잘 안 돼요. 작은 책상이 있으면 좋겠어요.',
    targetAmount: 80000,
    fundedPercent: 40,
    helpedCount: 5,
    completed: false,
  },
  {
    id: 2,
    childName: '하늘',
    age: 11,
    region: '경기/인천',
    wishTitle: '눈 오는 날 신고 나갈 운동화',
    wishDetail:
      '발이 많이 커져서 운동화가 다 작아요. 체육 시간에 운동화를 빌려 신기도 해요.',
    targetAmount: 60000,
    fundedPercent: 70,
    helpedCount: 8,
    completed: false,
  },
  {
    id: 3,
    childName: '유나',
    age: 7,
    region: '전라',
    wishTitle: '동생과 나눠 먹을 큰 초콜릿 상자',
    wishDetail:
      '동생이 초콜릿을 정말 좋아하는데, 큰 상자를 한 번도 받아 본 적이 없어요.',
    targetAmount: 30000,
    fundedPercent: 100,
    helpedCount: 15,
    completed: true,
  },
  {
    id: 4,
    childName: '민준',
    age: 10,
    region: '경상',
    wishTitle: '축구를 배울 수 있는 학원 1개월 이용권',
    wishDetail:
      '학교 운동장에서 친구들과 축구할 때 너무 즐거운데, 제대로 배우고 싶어요.',
    targetAmount: 90000,
    fundedPercent: 30,
    helpedCount: 3,
    completed: false,
  },
];

const maxInitialLetterId = initialLetters.reduce(
  (max, letter) => (letter.id > max ? letter.id : max),
  0
);

type StarPosition = {
  id: number;
  top: string;
  left: string;
  delay: string;
};

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const regionAnchors: Record<string, { top: number; left: number }> = {
  seoul: { top: 32, left: 45 },
  '서울': { top: 32, left: 45 },
  '경기': { top: 33, left: 43 },
  incheon: { top: 34, left: 40 },
  '인천': { top: 34, left: 40 },
  '강원': { top: 28, left: 58 },
  gangwon: { top: 28, left: 58 },
  '충청': { top: 45, left: 46 },
  daejeon: { top: 48, left: 47 },
  '대전': { top: 48, left: 47 },
  '전라': { top: 63, left: 44 },
  '전라남도': { top: 68, left: 42 },
  '전라북도': { top: 60, left: 45 },
  '경상': { top: 60, left: 60 },
  busan: { top: 69, left: 63 },
  '부산': { top: 69, left: 63 },
  daegu: { top: 57, left: 58 },
  '대구': { top: 57, left: 58 },
  ulsan: { top: 66, left: 63 },
  '경상북도': { top: 55, left: 59 },
  '경상남도': { top: 63, left: 60 },
  jeju: { top: 92, left: 47 },
  '제주': { top: 92, left: 47 },
  default: { top: 52, left: 50 },
};

function normalizeRegion(region: string) {
  return region.replace(/\s+/g, '').split(/[\/,]/)[0].toLowerCase();
}

function anchorForRegion(region: string) {
  const key = normalizeRegion(region);
  return regionAnchors[key] || regionAnchors[region] || regionAnchors.default;
}

function buildStarPositionsFromLetters(letters: Letter[]): StarPosition[] {
  const completed = letters.filter((l) => l.completed);
  return completed.map((letter, idx) => {
    const base = anchorForRegion(letter.region);
    const jitterSeed = idx + 1;
    const jitterTop = (pseudoRandom(jitterSeed) - 0.5) * 3; // +/-1.5%
    const jitterLeft = (pseudoRandom(jitterSeed + 5) - 0.5) * 3;
    const top = clamp(base.top + jitterTop, 8, 92);
    const left = clamp(base.left + jitterLeft, 8, 92);
    const delay = 0.3 + pseudoRandom(jitterSeed * 2) * 1.5;
    return {
      id: letter.id,
      top: `${top}%`,
      left: `${left}%`,
      delay: `${delay.toFixed(2)}s`,
    };
  });
}

export default function HomePage() {
  const [view, setView] = useState<'main' | 'santa' | 'child' | 'passes' | 'activity'>(
    'main'
  );
  const [letters, setLetters] = useState<Letter[]>(initialLetters);
  const [totalSantas, setTotalSantas] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // 새 기능: 내 산타 패스 / 활동 피드
  const [passes, setPasses] = useState<SantaPass[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const idCounterRef = useRef<number>(maxInitialLetterId);
  const nextId = () => {
    idCounterRef.current += 1;
    return idCounterRef.current;
  };

  // 통계
  const openCount = useMemo(
    () => letters.filter((l) => !l.completed).length,
    [letters]
  );
  const completedCount = useMemo(
    () => letters.filter((l) => l.completed).length,
    [letters]
  );

  const helpedKidsCount = completedCount; // 별 개수 = 완료된 소원 개수
  const seasonLabel = '2025 Winter'; // 하드코딩 시즌 레이블 (나중에 동적 가능)
  const starScale = Math.min(1 + totalSantas * 0.02, 2.4);
  const starSize = 8 * starScale;
  const starGlow = 18 * starScale;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  function handleFund(id: number) {
    setLetters((prev) => {
      const next = prev.map((letter) => ({ ...letter }));
      const target = next.find((l) => l.id === id);
      if (!target) return prev;

      setTotalSantas((v) => v + 1);
      target.helpedCount += 1;

      // 산타 패스 & 활동 로그 업데이트 helper
      const now = new Date().toISOString();
      const passTextBase = `「${target.wishTitle}」 소원에 산타로 참여했어요.`;
      const newActivityBase: Partial<Activity> = {
        letterId: target.id,
        childName: target.childName,
        region: target.region,
        createdAt: now,
      };
      const makeUpdate = (text: string) => ({ id: nextId(), at: now, text });

      let message = '';

      if (target.completed) {
        // 이미 완료된 소원에 추가 기여
        message = '이미 이뤄진 소원이에요. 그래도 마음은 잘 전달됐어요. 💛';

        setActivities((prevAct) => [
          {
            id: nextId(),
            type: 'update',
            text: `${target.childName}의 소원(완료)에 추가로 마음을 보탰어요.`,
            ...(newActivityBase as any),
          },
          ...prevAct,
        ]);

        // 패스 타임라인에 업데이트 메시지만 푸시
        setPasses((prevPasses) => {
          const exists = prevPasses.find((p) => p.letterId === target.id);
          if (!exists) return prevPasses;
          return prevPasses.map((p) =>
            p.letterId === target.id
              ? {
                  ...p,
                  updates: [
                    makeUpdate('완료된 소원에 추가로 마음을 보탰어요. 💛'),
                    ...p.updates,
                  ],
                }
              : p
          );
        });
      } else {
        target.fundedPercent += 25;
        if (target.fundedPercent >= 100) {
          target.fundedPercent = 100;
          target.completed = true;
          message = '이 소원이 모두 채워졌어요! 산타 인증서가 발급됩니다. 🎅';

          // 산타 패스 생성 or 업데이트
          setPasses((prevPasses) => {
            const existing = prevPasses.find((p) => p.letterId === target.id);
            if (existing) {
              return prevPasses.map((p) =>
                p.letterId === target.id
                  ? {
                      ...p,
                      completed: true,
                      updates: [
                        makeUpdate('소원이 모두 채워졌어요. 🎄'),
                        ...p.updates,
                      ],
                    }
                  : p
              );
            }

            const newPass: SantaPass = {
              id: nextId(),
              letterId: target.id,
              childName: target.childName,
              region: target.region,
              season: seasonLabel,
              createdAt: now,
              completed: true,
              updates: [
                makeUpdate('소원이 모두 채워졌어요. 🎄'),
                makeUpdate(passTextBase),
              ],
            };
            return [newPass, ...prevPasses];
          });

          setActivities((prevAct) => [
            {
              id: nextId(),
              type: 'funded',
              text: `${target.childName}의 소원이 모두 채워졌어요!`,
              ...(newActivityBase as any),
            },
            ...prevAct,
          ]);
        } else {
          message = '이 소원을 함께 채웠어요. 산타 인증서에 기록될 거예요. ✨';

          // 아직 완료 전이지만 pass 타임라인에 참여 기록 남길 수 있음
          setPasses((prevPasses) => {
            const existing = prevPasses.find((p) => p.letterId === target.id);
            if (!existing) {
              const newPass: SantaPass = {
                id: nextId(),
                letterId: target.id,
                childName: target.childName,
                region: target.region,
                season: seasonLabel,
                createdAt: now,
                completed: false,
                updates: [makeUpdate(passTextBase)],
              };
              return [newPass, ...prevPasses];
            }
            return prevPasses.map((p) =>
              p.letterId === target.id
                ? {
                    ...p,
                    updates: [makeUpdate(passTextBase), ...p.updates],
                  }
                : p
            );
          });

          setActivities((prevAct) => [
            {
              id: nextId(),
              type: 'update',
              text: `${target.childName}의 소원에 산타가 한 명 더 참여했어요.`,
              ...(newActivityBase as any),
            },
            ...prevAct,
          ]);
        }
      }

      showToast(message);
      return next;
    });
  }

  function handleChildSubmit(formData: FormData) {
    const childName = (formData.get('childName') as string)?.trim();
    const age = Number(formData.get('age'));
    const region = formData.get('region') as string;
    const wishTitle = (formData.get('wishTitle') as string)?.trim();
    const wishDetail = (formData.get('wishDetail') as string)?.trim();
    const targetAmount = Number(formData.get('targetAmount')) || 0;

    if (!childName || !age || !region || !wishTitle || !wishDetail) return;

    const newLetter: Letter = {
      id: nextId(),
      childName,
      age,
      region,
      wishTitle,
      wishDetail,
      targetAmount,
      fundedPercent: 0,
      helpedCount: 0,
      completed: false,
    };

    setLetters((prev) => [newLetter, ...prev]);
    showToast('편지가 잘 도착했어요. 곧 산타들이 읽을 거예요. 🎄');
    setView('santa');
  }

  const stars = useMemo(
    () => buildStarPositionsFromLetters(letters),
    [letters]
  );

  return (
    <div className="app-root">
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => setView('main')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div className="brand-mark">
            <div className="brand-mark-inner">🎄</div>
          </div>
          <div>
            <div className="brand-name">TAEJU SANTA</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              크리스마스 소원을 잇는 산타 프로젝트
            </div>
          </div>
        </button>
        <div className="header-meta">
          <div className="badge-pill">
            <span>③ 산타 되기</span>
            <span style={{ opacity: 0.9 }}>기부 크라우드 펀딩 + NFT 인증서</span>
          </div>
          <div>연탄 나르기처럼 가볍게, NFT로 남기는 오늘의 산타 기록 🎅</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setView('passes')}
            >
              내 산타 패스 보기
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => setView('activity')}
            >
              활동 소식 보기
            </button>
          </div>
        </div>
      </header>

      {/* 메인 선택 화면 */}
      <main
        className={`view ${view === 'main' ? 'view--active' : ''}`}
        id="view-main"
      >
        <section className="hero-card">
          <div>
            <div className="hero-copy-eyebrow">산타 미션 ③</div>
            <h1 className="hero-copy-title">
              보육원 아이들의 <span>크리스마스 소원</span>을
              <br />
              함께 이루는 산타가 되어주세요.
            </h1>
            <p className="hero-copy-subtitle">
              앱 안에서 아이들의 크리스마스 소원 편지를 읽고, 여러 명이 크라우드
              펀딩으로 한 소원을 함께 채워주는 구조입니다. 소원이 이뤄지면 각
              참여자에게는 NFT 형태의 ‘산타 인증서’가 발급돼요.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-primary"
                id="btn-main-child"
                onClick={() => setView('child')}
              >
                아이 편지 쓰기
              </button>
              <button
                className="btn btn-outline"
                id="btn-main-santa"
                onClick={() => setView('santa')}
              >
                산타가 되기
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-card">
              <div className="hero-visual-card-header">
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  오늘의 산타 현황
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-subtle)',
                  }}
                >
                  NFT 인증서 자동 발급
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-subtle)',
                }}
              >
                <span>
                  완료된 소원 <strong id="summary-completed">{completedCount}</strong>개
                </span>
                <span>
                  참여 산타 <strong id="summary-santas">{totalSantas}</strong>명
                </span>
              </div>
              <div className="hero-visual-room">
                <div className="tiny-tree">
                  <div className="cone" />
                  <div className="trunk" />
                  <div className="star" />
                </div>
                <div className="tiny-fireplace">
                  <div className="fire" />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    fontSize: '0.78rem',
                    textAlign: 'right',
                    color: 'var(--text-subtle)',
                    maxWidth: 120,
                  }}
                >
                  트리 아래 지도 위에
                  <br />
                  별들이 하나씩 켜지고 있어요.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 산타 뷰 */}
      <main
        className={`view ${view === 'santa' ? 'view--active' : ''}`}
        id="view-santa"
      >
        <div className="view-header">
          <div className="view-header-main">
            <div className="view-title">
              산타가 될 편지를 고르고, 함께 채워주세요.
            </div>
            <div className="view-subtitle">
              왼쪽에서 아이들의 편지를 고르고, 오른쪽 대한민국 지도에서 지금까지
              도와준 아이들의 수를 확인할 수 있어요.
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setView('main')}>
            ← 메인으로 돌아가기
          </button>
        </div>

        <section className="santa-layout">
          <div className="santa-letters">
            <div className="panel-header">
              <div>
                <div className="panel-header-title">
                  아이들의 크리스마스 소원 편지
                </div>
                <div className="panel-header-sub">
                  한 소원당 여러 산타가 함께 참여할 수 있어요.
                </div>
              </div>
              <div className="pill-counter">
                남은 소원 <span id="count-open-letters">{openCount}</span>개
              </div>
            </div>
            <div className="letter-list" id="letter-list">
              {letters.map((letter) => (
                <button
                  key={letter.id}
                  type="button"
                  className="letter-card"
                  onClick={() => handleFund(letter.id)}
                >
                  <div className="letter-main">
                    <div>{letter.wishTitle}</div>
                    <div className="letter-meta">
                      <span>{letter.region}</span>
                      <span>
                        {letter.childName} ({letter.age}세)
                      </span>
                    </div>
                    <div className="letter-wish">{letter.wishDetail}</div>
                  </div>
                  <div className="letter-side">
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(letter.fundedPercent, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="funding-label">
                      {letter.targetAmount
                        ? `${(letter.targetAmount / 1000).toLocaleString(
                            'ko-KR'
                          )}천 원 목표`
                        : '목표 금액 미기입'}{' '}
                      · 현재 {letter.fundedPercent}%
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        className={
                          'chip' + (letter.completed ? ' chip-success' : '')
                        }
                      >
                        {letter.completed ? '소원 완료' : '산타 기다리는 중'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-subtle)',
                        }}
                      >
                        참여 산타 {letter.helpedCount}명
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-subtle)',
                marginTop: 4,
              }}
            >
              * “이 소원 함께 이루기”를 누르면, 이 소원에 산타로 참여한 것으로
              기록됩니다.
            </div>
          </div>

          <aside className="santa-map">
            <div className="map-header">
              <div>
                지금까지 <strong id="helped-count">{helpedKidsCount}</strong>명의
                아이에게
                <br />
                산타가 다녀갔어요.
              </div>
              <div className="badge-pill" style={{ fontSize: '0.78rem' }}>
                <span>별 하나 = 한 아이의 소원</span>
              </div>
            </div>
            <div className="map-caption">
              아이들이 살고 있는 지역을 기반으로, 지도 위에 별이
              하나씩 켜집니다.
            </div>

            <div className="map-body">
              <div className="korea-outline" />
              <div id="map-stars-container">
                {stars.map((s) => (
                  <div
                    key={s.id}
                    className="map-star"
                    style={{
                      top: s.top,
                      left: s.left,
                      animationDelay: s.delay,
                      width: `${starSize}px`,
                      height: `${starSize}px`,
                      boxShadow: `0 0 ${starGlow}px rgba(250, 204, 21, 0.9)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* 아이 편지 쓰기 뷰 */}
      <main
        className={`view ${view === 'child' ? 'view--active' : ''}`}
        id="view-child"
      >
        <div className="view-header">
          <div className="view-header-main">
            <div className="view-title">
              크리스마스에 받고 싶은 소원을 적어주세요.
            </div>
            <div className="view-subtitle">
              이 편지는 산타가 되고 싶은 사람들이 읽고, 여러 명이 함께 조금씩
              크라우드 펀딩으로 도와줄 거예요.
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setView('main')}>
            ← 메인으로 돌아가기
          </button>
        </div>

        <section className="child-form-card">
          <div className="child-copy">
            <div className="child-copy-title">
              당신의 크리스마스 소원은 무엇인가요?
            </div>
            <p className="child-copy-text">
              꼭 물건이 아니어도 괜찮아요. 따뜻한 코트, 책, 장난감, 운동화, 학원
              수강권, 가족과의 식사, 무엇이든 지금 가장 갖고 싶은 소원을
              들려주세요.
            </p>
            <p className="child-copy-note">
              편지는 실명 대신 초기만 공개되고, 산타가 되려는 사람에게만 상세 내용이
              보여요. 나중에 소원이 이뤄지면, 그 사실도 앱 안에서 확인할 수 있어요.
            </p>
          </div>

          <form
            className="child-form"
            id="child-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleChildSubmit(new FormData(e.currentTarget));
              e.currentTarget.reset();
            }}
          >
            <div className="field-group">
              <label className="field-label">
                이름 또는 닉네임
                <span className="hint">(실명 대신 닉네임도 괜찮아요)</span>
              </label>
              <input
                name="childName"
                placeholder="예: 지우, 하늘이, 코코"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">나이</label>
              <input
                name="age"
                type="number"
                min={1}
                max={18}
                placeholder="예: 9"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                지역
                <span className="hint">(현재 살고 있는 곳)</span>
              </label>
              <select name="region" required>
                <option value="">지역을 선택해주세요</option>
                <option value="서울">서울</option>
                <option value="경기/인천">경기/인천</option>
                <option value="강원">강원</option>
                <option value="충청">충청</option>
                <option value="전라">전라</option>
                <option value="경상">경상</option>
                <option value="제주">제주</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">
                받고 싶은 크리스마스 소원
                <span className="hint">(한 문장으로)</span>
              </label>
              <input
                name="wishTitle"
                placeholder="예: 눈 오는 날 신고 나갈 새 운동화, 동생과 함께 나눠먹을 초콜릿 상자"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                조금 더 자세한 이야기
                <span className="hint">(산타가 이해하기 쉽도록)</span>
              </label>
              <textarea
                name="wishDetail"
                placeholder="왜 이 소원을 갖게 되었는지, 지금 어떤 상황인지, 산타에게 하고 싶은 말을 적어주세요."
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                대략 필요한 금액
                <span className="hint">(대략적인 추정치여도 괜찮아요)</span>
              </label>
              <input
                name="targetAmount"
                type="number"
                min={0}
                step={1000}
                placeholder="예: 50000 (숫자만)"
              />
            </div>

            <div className="child-form-actions">
              <button
                type="reset"
                className="btn-ghost"
                style={{ border: '1px solid rgba(148, 163, 184, 0.7)' }}
              >
                다시 쓸래요
              </button>
              <button type="submit" className="btn btn-primary">
                편지 보내기 ✨
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* 내 산타 패스 뷰 */}
      <main
        className={`view ${view === 'passes' ? 'view--active' : ''}`}
        id="view-passes"
      >
        <div className="view-header">
          <div className="view-header-main">
            <div className="view-title">내 산타 패스</div>
            <div className="view-subtitle">
              내가 산타가 되어 도왔던 아이들의 소원과, 그 이후의 이야기를 모아 둔
              공간이에요.
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setView('main')}>
            ← 메인으로 돌아가기
          </button>
        </div>

        <section
          className="child-form-card"
          style={{ gridTemplateColumns: '1fr' }}
        >
          {passes.length === 0 ? (
            <div
              style={{
                fontSize: '0.86rem',
                color: 'var(--text-subtle)',
                padding: '4px 2px',
              }}
            >
              아직 산타 패스가 없어요. 먼저 아이들의 소원을 채워주면, 여기에서
              기록을 볼 수 있어요. 🎅
            </div>
          ) : (
            <div className="pass-grid">
              {passes.map((pass) => (
                <article key={pass.id} className="pass-card">
                  <div className="pass-card-header">
                    <div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-subtle)',
                          marginBottom: 2,
                        }}
                      >
                        {pass.season}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {pass.childName}의 크리스마스 소원
                      </div>
                    </div>
                    <span
                      className={'chip' + (pass.completed ? ' chip-success' : '')}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {pass.completed ? '소원 완료' : '진행 중'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-subtle)',
                      marginBottom: 4,
                    }}
                  >
                    지역: {pass.region} · 처음 산타가 된 날:{' '}
                    {new Date(pass.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <div className="pass-timeline">
                    {pass.updates.map((u) => (
                      <div key={u.id}>
                        <span
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--text-subtle)',
                            marginRight: 4,
                          }}
                        >
                          {new Date(u.at).toLocaleDateString('ko-KR')}
                        </span>
                        <span>{u.text}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 활동 피드 뷰 */}
      <main
        className={`view ${view === 'activity' ? 'view--active' : ''}`}
        id="view-activity"
      >
        <div className="view-header">
          <div className="view-header-main">
            <div className="view-title">산타 이후의 이야기들</div>
            <div className="view-subtitle">
              소원이 채워진 이후의 소식과, 산타들의 참여로 쌓이는 활동들을 한눈에
              볼 수 있어요.
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setView('main')}>
            ← 메인으로 돌아가기
          </button>
        </div>

        <section
          className="child-form-card"
          style={{ gridTemplateColumns: '1.1fr 1.2fr' }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
              활동 피드
            </div>
            <div className="activity-list">
              {activities.length === 0 ? (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-subtle)',
                    padding: '4px 2px',
                  }}
                >
                  아직 업데이트된 소식이 없어요. 소원이 채워지면 이곳에 소식이
                  쌓여요. 🎁
                </div>
              ) : (
                activities.map((a) => (
                  <article key={a.id} className="activity-item">
                    <div style={{ marginBottom: 4 }}>{a.text}</div>
                    <div className="activity-item-meta">
                      <span>
                        {a.childName} · {a.region}
                      </span>
                      <span>
                        {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
              이 페이지의 역할
            </div>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-subtle)',
                lineHeight: 1.7,
              }}
            >
              사랑의 열매처럼, 한 번의 기부로 끝나는 것이 아니라, 그 이후의 이야기까지
              함께 볼 수 있는 공간입니다. <br />
              <br />
              실제 서비스에서는 보육원/기관이 올린 사진, 아이들의 그림, 감사 메시지가
              이곳에 쌓이고, 각각의 활동은 산타 패스와도 연결됩니다.
            </p>
          </div>
        </section>
      </main>

      {/* 토스트 */}
      <div
        className={`toast ${toast ? '' : 'toast--hidden'}`}
        style={{
          opacity: toast ? 1 : 0,
          transform: toast
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(6px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <span>✨</span>
        <span id="toast-text">{toast ?? '완료되었습니다.'}</span>
      </div>
    </div>
  );
}
