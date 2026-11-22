// 恋愛タイプ診断 LP（Instagram 広告の受け皿）
// 診断データ・規約文面はアプリと共通のファイルを読み込む
import {
  AXES,
  bestMatchCode,
  LIKERT,
  LOVE_TYPES,
  loveType,
  QUESTIONS,
  scoreAnswers,
  TYPE_GROUPS,
  typeCode,
  typeGradient,
  type Axis,
  type AxisScores,
} from '../../app/src/lib/diagnosis';
import { LEGAL } from '../../app/src/lib/legal';

declare const __APP_STORE_URL__: string;
declare const __PLAY_STORE_URL__: string;
declare const __META_PIXEL_ID__: string;

const app = document.getElementById('app')!;
const AXIS_KEYS = Object.keys(AXES) as Axis[];
const grad = (code: string | null, deg = 135) => {
  const [a, b] = typeGradient(code);
  return `linear-gradient(${deg}deg, ${a}, ${b})`;
};

// ------------------------------------------------------------
// 計測（Meta ピクセル）。ID 未設定なら何もしない
// ------------------------------------------------------------
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
function initPixel() {
  if (!__META_PIXEL_ID__) return;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  } as Fbq;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  n.push = n;
  w.fbq = w._fbq = n;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', __META_PIXEL_ID__);
  n('track', 'PageView');
}
function track(event: string, params?: Record<string, unknown>, custom = true) {
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (fbq) fbq(custom ? 'trackCustom' : 'track', event, params);
}

// ------------------------------------------------------------
// 状態
// ------------------------------------------------------------
let answers: number[] = [];
let index = 0;
const MINE_KEY = 'koimachi_my_result';

function safeSession(get: true): string | null;
function safeSession(get: false, value: string): void;
function safeSession(get: boolean, value?: string) {
  try {
    if (get) return sessionStorage.getItem(MINE_KEY);
    sessionStorage.setItem(MINE_KEY, value!);
  } catch {
    return null;
  }
}

/** 結果を URL に入れる: ?r=PLTS.60.40.30.20（シェアされたリンクでも同じ結果を表示） */
function encodeResult(s: AxisScores) {
  return `${typeCode(s)}.${AXIS_KEYS.map((a) => s[a]).join('.')}`;
}
function decodeResult(r: string | null): { code: string; scores: AxisScores } | null {
  if (!r) return null;
  const [code, ...nums] = r.split('.');
  if (!LOVE_TYPES[code] || nums.length !== 4) return null;
  const vals = nums.map((n) => Math.max(-100, Math.min(100, Math.round(Number(n)))));
  if (vals.some((v) => Number.isNaN(v))) return null;
  const scores = Object.fromEntries(AXIS_KEYS.map((a, i) => [a, vals[i]])) as AxisScores;
  if (typeCode(scores) !== code) return null;
  return { code, scores };
}

function go(params: string) {
  history.pushState(null, '', params || location.pathname);
  route();
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------
// 画面
// ------------------------------------------------------------
function renderLanding() {
  const emojis = Object.entries(LOVE_TYPES)
    .map(([code, t]) => `<span style="background:${grad(code)}">${t.emoji}</span>`)
    .join('');
  const tiles = Object.entries(LOVE_TYPES)
    .map(
      ([code, t]) => `
      <div class="type-tile" style="background:${grad(code)}">
        <div class="e">${t.emoji}</div>
        <div><div class="n">${t.name}</div><div class="c">${code}</div></div>
      </div>`,
    )
    .join('');

  app.innerHTML = `
    <section class="hero fade">
      <div class="eyebrow">LOVE TYPE CHECK</div>
      <h1>あなたの恋愛タイプは<br>16タイプのどれ？</h1>
      <p>20の質問に答えるだけ。<br>恋愛のクセと、相性のいいタイプがわかります。</p>
      <div class="tags"><span class="tag">✓ 無料</span><span class="tag">✓ 登録不要</span><span class="tag">✓ 約3分</span></div>
      <div class="emoji-grid">${emojis}</div>
      <button class="btn btn-white" id="start">診断をはじめる</button>
    </section>

    <h2 class="section-title">診断でわかること</h2>
    <div class="card steps">
      <div class="step"><b>1</b><div>情熱・リード・距離感・テンポの<strong>4つの恋愛バランス</strong></div></div>
      <div class="step"><b>2</b><div>16タイプの中の<strong>あなたの恋愛タイプ</strong></div></div>
      <div class="step"><b>3</b><div>あなたと<strong>相性のいいタイプ</strong></div></div>
    </div>

    <h2 class="section-title">16の恋愛タイプ</h2>
    <div class="types">${tiles}</div>

    <div style="margin-top:24px"><button class="btn btn-primary" id="start2">無料で診断する</button></div>
  `;
  const start = () => {
    answers = [];
    index = 0;
    track('StartDiagnosis');
    go('?q');
  };
  document.getElementById('start')!.onclick = start;
  document.getElementById('start2')!.onclick = start;
}

function renderQuestion() {
  const q = QUESTIONS[index];
  const sizes = [56, 46, 36, 46, 56];
  const buttons = LIKERT.map((o, i) => {
    const c = o.value === 3 ? '#C9BCC6' : o.value > 3 ? 'var(--primary)' : 'var(--disagree)';
    const on = answers[index] === o.value;
    return `<button aria-label="${o.label.replace('\n', '')}" data-v="${o.value}" class="${on ? 'on' : ''}"
      style="--c:${c};width:${sizes[i]}px;height:${sizes[i]}px">${on ? '✓' : ''}</button>`;
  }).join('');

  app.innerHTML = `
    <div class="progress"><div class="bar"><i style="width:${((index + 1) / QUESTIONS.length) * 100}%"></i></div><span>${index + 1}/${QUESTIONS.length}</span></div>
    <div class="card question fade">
      <div class="q">Q${index + 1}</div>
      <h2>${q.text}</h2>
    </div>
    <div class="scale">${buttons}</div>
    <div class="scale-labels"><span style="color:var(--primary)">あてはまる</span><span style="color:var(--disagree)">あてはまらない</span></div>
    ${index > 0 ? '<button class="back" id="back">← ひとつ前に戻る</button>' : ''}
  `;
  app.querySelectorAll<HTMLButtonElement>('.scale button').forEach((b) => {
    b.onclick = () => {
      answers[index] = Number(b.dataset.v);
      b.classList.add('on');
      b.textContent = '✓';
      setTimeout(() => {
        if (index + 1 < QUESTIONS.length) {
          index++;
          renderQuestion();
        } else {
          const scores = scoreAnswers(answers);
          const r = encodeResult(scores);
          safeSession(false, r);
          track('CompleteDiagnosis', { love_type: typeCode(scores) });
          go(`?r=${r}`);
        }
      }, 180);
    };
  });
  const back = document.getElementById('back');
  if (back) back.onclick = () => {
    index--;
    renderQuestion();
  };
}

function storeButtons() {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const btns = [
    __APP_STORE_URL__ && { url: __APP_STORE_URL__, label: ' App Store でダウンロード', ios: true },
    __PLAY_STORE_URL__ && { url: __PLAY_STORE_URL__, label: '▶ Google Play でダウンロード', ios: false },
  ].filter(Boolean) as { url: string; label: string; ios: boolean }[];
  if (btns.length === 0) return '<p class="notice" style="color:#fff">アプリは近日公開予定です</p>';
  btns.sort((a, b) => Number(b.ios === ios) - Number(a.ios === ios));
  return btns
    .map((b, i) => `<a class="btn ${i === 0 ? 'btn-white' : 'btn-ghost'}" href="${b.url}" data-store>${b.label}</a>`)
    .join('');
}

function renderResult(code: string, scores: AxisScores) {
  const t = loveType(code)!;
  const [c1, c2] = typeGradient(code);
  const bestCode = bestMatchCode(code);
  const best = loveType(bestCode)!;
  const mine = safeSession(true) === encodeResult(scores);

  const bars = AXIS_KEYS.map((a) => {
    const left = Math.round((scores[a] + 100) / 2);
    const lw = scores[a] >= 0;
    return `<div class="axis" style="--tc:${c2}">
      <div class="labels"><span>${lw ? `<b>${AXES[a].left} ${left}%</b>` : `${AXES[a].left} ${left}%`}</span>
      <span>${!lw ? `<b>${100 - left}% ${AXES[a].right}</b>` : `${100 - left}% ${AXES[a].right}`}</span></div>
      <div class="track"><i style="width:${left}%;background:linear-gradient(90deg,${c1},${c2})"></i></div></div>`;
  }).join('');

  app.innerHTML = `
    ${mine ? '' : '<p class="small" style="text-align:center;margin-bottom:10px">シェアされた診断結果です</p>'}
    <section class="result-hero fade" style="background:${grad(code)}">
      <div class="lead">${mine ? 'あなたの' : ''}恋愛タイプは…</div>
      <div class="icon">${t.emoji}</div>
      <h1>${t.name}</h1>
      <div class="code">${code}</div>
      <div class="small" style="color:#fff;opacity:.9">${TYPE_GROUPS[code.slice(0, 2)].label}グループ</div>
      <div class="catch">「${t.catch}」</div>
      <p class="desc">${t.description}</p>
    </section>

    <div class="card" style="margin-top:16px"><strong style="font-size:18px">恋愛バランス</strong>${bars}</div>

    <div class="card best" style="margin-top:16px">
      <div class="icon" style="background:${grad(bestCode)}">${best.emoji}</div>
      <div><p class="small">💘 相性のいいタイプ</p><strong style="font-size:18px">${best.name}</strong>
      <p class="small">恋愛のテンポや距離感が近く、リードと寄り添いでバランスが取れる二人。</p></div>
    </div>

    ${
      mine
        ? `<div class="stack" style="margin-top:16px">
            <button class="btn btn-primary" id="story">📸 ストーリーズ用の画像を保存</button>
            <button class="btn btn-outline" id="share">結果のリンクをシェア</button>
          </div>`
        : `<div style="margin-top:16px"><button class="btn btn-primary" id="again">あなたも無料で診断する</button></div>`
    }

    <section class="cta" style="margin-top:28px">
      <div style="font-size:40px">💞</div>
      <h3>${best.emoji} ${best.name}の人と<br>出会ってみませんか？</h3>
      <p>恋活アプリ「こいまち」なら、診断と価値観から<br>あなたとの<strong>相性％</strong>がわかります。</p>
      <div class="store-row">${storeButtons()}</div>
      <p style="font-size:11px;margin:12px 0 0;opacity:.8">18歳以上・年齢確認済みの方のみ利用できます</p>
    </section>

    ${mine ? '<button class="back" id="again">もう一度診断する</button>' : ''}
  `;

  document.getElementById('again')!.onclick = () => {
    answers = [];
    index = 0;
    track('StartDiagnosis');
    go('?q');
  };
  document.getElementById('story')?.addEventListener('click', () => shareStory(code, scores));
  document.getElementById('share')?.addEventListener('click', async () => {
    const url = location.href;
    const text = `私の恋愛タイプは「${t.emoji}${t.name}」でした！ #こいまち診断`;
    if (navigator.share) {
      await navigator.share({ text, url }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => {});
      alert('リンクをコピーしました');
    }
  });
  app.querySelectorAll<HTMLAnchorElement>('[data-store]').forEach((a) =>
    a.addEventListener('click', () => track('Lead', { love_type: code }, false)),
  );
}

function renderLegal(key: string) {
  const doc = LEGAL[key];
  if (!doc) return renderLanding();
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card legal';
  const h = document.createElement('h1');
  h.textContent = doc.title;
  const pre = document.createElement('pre');
  pre.textContent = doc.body;
  wrap.append(h, pre);
  const back = document.createElement('button');
  back.className = 'back';
  back.textContent = '← トップへ戻る';
  back.onclick = () => go('');
  app.append(wrap, back);
}

// ------------------------------------------------------------
// ストーリーズ用画像（1080×1920）を canvas で描画
// ------------------------------------------------------------
async function drawStory(code: string, scores: AxisScores): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080, H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const t = loveType(code)!;
  const best = loveType(bestMatchCode(code))!;
  const [c1, c2] = typeGradient(code);
  const font = (w: number, s: number) => `${w} ${s}px 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif`;
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(800, 40);
  ctx.fillText('L O V E   T Y P E   C H E C K', W / 2, 190);
  ctx.font = font(700, 48);
  ctx.fillText('わたしの恋愛タイプは…', W / 2, 270);

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(W / 2, 560, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `250px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`;
  ctx.fillText(t.emoji, W / 2, 580);

  ctx.fillStyle = '#fff';
  ctx.font = font(900, 104);
  ctx.fillText(t.name, W / 2, 900);
  ctx.font = font(700, 44);
  ctx.fillText(code.split('').join('  '), W / 2, 990);
  ctx.font = font(800, 54);
  ctx.fillText(`「${t.catch}」`, W / 2, 1090);

  // 恋愛バランス
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(90, 1180, W - 180, 400, 50);
  ctx.fill();
  AXIS_KEYS.forEach((a, i) => {
    const y = 1250 + i * 85;
    const pct = (scores[a] + 100) / 200;
    ctx.fillStyle = '#fff';
    ctx.font = font(pct >= 0.5 ? 900 : 500, 34);
    ctx.textAlign = 'left';
    ctx.fillText(AXES[a].left, 140, y);
    ctx.font = font(pct < 0.5 ? 900 : 500, 34);
    ctx.textAlign = 'right';
    ctx.fillText(AXES[a].right, W - 140, y);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    rr(140, y + 28, W - 280, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    rr(140, y + 28, Math.max(16, (W - 280) * pct), 16, 8);
    ctx.fill();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 40);
  ctx.fillText(`相性のいいタイプ：${best.emoji} ${best.name}`, W / 2, 1660);
  ctx.fillStyle = '#fff';
  rr(W / 2 - 330, 1715, 660, 100, 50);
  ctx.fill();
  ctx.fillStyle = c2;
  ctx.font = font(900, 40);
  ctx.fillText('💞 こいまち で恋愛タイプ診断', W / 2, 1767);
  ctx.fillStyle = '#fff';
  ctx.font = font(500, 32);
  ctx.fillText('#こいまち診断 #恋愛タイプ診断', W / 2, 1865);

  return new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
}

async function shareStory(code: string, scores: AxisScores) {
  track('ShareStory', { love_type: code });
  const blob = await drawStory(code, scores);
  const file = new File([blob], `koimachi-${code}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ------------------------------------------------------------
// ルーティング（?q = 質問中、?r=... = 結果、#terms / #privacy = 規約）
// ------------------------------------------------------------
function route() {
  const legal = location.hash.slice(1);
  if (LEGAL[legal]) return renderLegal(legal);
  const params = new URLSearchParams(location.search);
  const result = decodeResult(params.get('r'));
  if (result) return renderResult(result.code, result.scores);
  if (params.has('q')) return renderQuestion();
  renderLanding();
}

document.querySelectorAll<HTMLAnchorElement>('[data-legal]').forEach((a) => {
  a.href = `#${a.dataset.legal}`;
});
window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);
initPixel();
route();
