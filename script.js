/* ============================================================
   LÌ XÌ TÂM CƠ 2026 — script.js
   Bộ não: Khóa thiết bị · Thao túng kết quả · Pháo hoa
   ============================================================ */

'use strict';

// ── DOM refs ─────────────────────────────────────────────────
const grid    = document.getElementById('lixi-grid');
const blocker = document.getElementById('blocker-overlay');
const errText = document.getElementById('error-text');
const hintTxt = document.getElementById('hint-text');
const resBanner = document.getElementById('result-banner');
const resAmount = document.getElementById('result-amount');
const resRegret = document.getElementById('result-regret');

// ── Prize config ─────────────────────────────────────────────
const USER_PRIZES   = [2000, 5000, 10000, 15000, 18000]; // user chỉ trúng đây
const BIG_PRIZE     = 100000;
const SMALL_OTHERS  = [1000, 2000, 5000, 10000, 20000, 50000];
const TOTAL_CARDS   = 12;
const BIG_IN_OTHERS = 5;  // số bao 100k để user tiếc nuối

// ── State ─────────────────────────────────────────────────────
let prizes      = [];   // mảng 12 phần tử
let userIndex   = -1;
let hasPicked   = false;

/* ── Audio Engine (Web Audio API) ────────────────────────────
   Không cần file ngoài, tạo âm thanh trực tiếp                */
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

/**
 * Tiếng "Ting" cao trong trẻo khi lật bao
 */
function playTing(pitch = 1.0) {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1047 * pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1568 * pitch, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
}

/**
 * Tiếng pháo hoa nổ khi hiện kết quả
 */
function playFirework() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 880, 1175];
    notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = now + i * 0.06;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.18);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.start(t);
        osc.stop(t + 0.6);
    });
}

/* ── Device Fingerprint ──────────────────────────────────────
   Tạo ID thiết bị đơn giản từ các thông số trình duyệt         */
function generateDeviceId() {
    const parts = [
        navigator.userAgent,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        navigator.hardwareConcurrency || '?',
    ].join('||');

    // FNV-1a hash (nhẹ, không cần crypto)
    let hash = 2166136261;
    for (let i = 0; i < parts.length; i++) {
        hash ^= parts.charCodeAt(i);
        hash = (hash * 16777619) >>> 0; // unsigned 32-bit
    }
    return `lixi2026_${hash.toString(36)}`;
}

/* ── checkDevice ─────────────────────────────────────────────
   Hàm chạy ngay khi load: kiểm tra đã bốc chưa                */
function checkDevice() {
    const deviceId = generateDeviceId();
    const picked   = localStorage.getItem(deviceId);

    if (picked === 'picked') {
        errText.textContent = 'Mày đã bốc lì xì rồi tham lam gì :))';
        blocker.classList.add('active');
        return false; // blocked
    }
    return true; // OK
}

function markDevicePicked() {
    localStorage.setItem(generateDeviceId(), 'picked');
}

/* ── generatePrizes ──────────────────────────────────────────
   Tạo mảng 12 phần tử theo luật tâm cơ                        */
function generatePrizes() {
    // 1) Bao của user: chỉ trúng từ USER_PRIZES
    const userAmount = USER_PRIZES[Math.floor(Math.random() * USER_PRIZES.length)];

    // 2) 11 bao còn lại: 5 bao 100k + 6 bao nhỏ
    const otherPrizes = [];
    for (let i = 0; i < BIG_IN_OTHERS; i++)
        otherPrizes.push({ amount: BIG_PRIZE, isBig: true, isUser: false });
    for (let i = 0; i < TOTAL_CARDS - 1 - BIG_IN_OTHERS; i++) {
        const amt = SMALL_OTHERS[Math.floor(Math.random() * SMALL_OTHERS.length)];
        otherPrizes.push({ amount: amt, isBig: false, isUser: false });
    }

    // 3) Xáo trộn 11 bao kia
    otherPrizes.sort(() => Math.random() - 0.5);

    // 4) Chèn bao user vào vị trí ngẫu nhiên trong 12
    userIndex = Math.floor(Math.random() * TOTAL_CARDS);
    prizes = [];
    let oi = 0;
    for (let i = 0; i < TOTAL_CARDS; i++) {
        if (i === userIndex) {
            prizes.push({ amount: userAmount, isBig: false, isUser: true });
        } else {
            prizes.push(otherPrizes[oi++]);
        }
    }
}

/* ── Helpers ─────────────────────────────────────────────────*/
function fmtVND(n) {
    if (n >= 1000) return (n / 1000).toLocaleString('vi-VN') + 'k';
    return n.toLocaleString('vi-VN') + 'đ';
}

function fmtVNDFull(n) {
    return n.toLocaleString('vi-VN') + 'đ';
}

function buildBackClass(prize) {
    if (prize.isUser) return 'type-user';
    if (prize.isBig)  return 'type-big';
    return 'type-small';
}

function buildIcon(prize) {
    if (prize.isUser) return '🧧';
    if (prize.isBig)  return '💰';
    return '💸';
}

function buildTag(prize) {
    if (prize.isUser) return '🎉 CỦA BẠN';
    if (prize.isBig)  return '✨ JACKPOT ✨';
    return 'lì xì';
}

/* ── renderCards ─────────────────────────────────────────────
   Render 12 div.lixi-card vào #lixi-grid                      */
function renderCards() {
    grid.innerHTML = '';

    prizes.forEach((prize, idx) => {
        const card = document.createElement('div');
        card.className = 'lixi-card';
        card.dataset.index = idx;

        if (idx === userIndex) card.classList.add('is-user-card');

        // "BẠN" label above user card
        if (idx === userIndex) {
            const lbl = document.createElement('div');
            lbl.className = 'user-label';
            lbl.textContent = '👆 CHỌN ĐI';
            card.appendChild(lbl);
        }

        // Front face
        const front = document.createElement('div');
        front.className = 'face front';
        front.innerHTML = `
            <div class="front-seal">福</div>
            <div class="front-sub">春</div>
            <span class="corner-deco tl">✦</span>
            <span class="corner-deco tr">✦</span>
            <span class="corner-deco bl">✦</span>
            <span class="corner-deco br">✦</span>
        `;

        // Back face
        const back = document.createElement('div');
        back.className = `face back ${buildBackClass(prize)}`;
        back.innerHTML = `
            <div class="prize-icon">${buildIcon(prize)}</div>
            <div class="prize-amount">${fmtVNDFull(prize.amount)}</div>
            <div class="prize-tag">${buildTag(prize)}</div>
        `;

        const inner = document.createElement('div');
        inner.style.cssText = 'width:100%;height:100%;position:relative;transform-style:preserve-3d;';
        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        // Only user card is clickable
        if (idx === userIndex) {
            card.addEventListener('click', () => handleFlip(idx));
            card.style.cursor = 'pointer';
        } else {
            card.style.cursor = 'default';
        }

        grid.appendChild(card);
    });
}

/* ── handleFlip ──────────────────────────────────────────────
   Xử lý khi user bốc lì xì                                    */
function handleFlip(idx) {
    if (hasPicked) return;  // chặn click kép
    hasPicked = true;

    // Âm thanh
    getAudioCtx(); // unlock audio context (needs user gesture)
    playTing(1.0);

    // Đánh dấu thiết bị đã bốc
    markDevicePicked();

    // Bỏ label + pointer
    const userCard = grid.querySelector(`[data-index="${idx}"]`);
    const lbl = userCard.querySelector('.user-label');
    if (lbl) lbl.remove();
    userCard.style.cursor = 'default';

    // Lật bao của user
    userCard.classList.add('is-flipped');

    // Hint text
    hintTxt.style.opacity = '0';

    // Sau 900ms: lật tất cả bao còn lại (reveal all)
    setTimeout(() => revealAll(idx), 900);
}

/* ── revealAll ───────────────────────────────────────────────
   Lật lần lượt 11 bao còn lại, rồi hiện kết quả               */
function revealAll(userIdx) {
    const allCards = grid.querySelectorAll('.lixi-card');
    let delay = 0;

    allCards.forEach((card, i) => {
        if (i === userIdx) return; // đã lật rồi
        delay += 55;
        setTimeout(() => {
            card.classList.add('is-flipped');
            playTing(0.9 + Math.random() * 0.4);
        }, delay);
    });

    // Hiện kết quả sau khi tất cả lật xong
    setTimeout(() => showResult(userIdx), delay + 700);
}

/* ── showResult ──────────────────────────────────────────────
   Hiện banner kết quả + confetti + pháo hoa                    */
function showResult(userIdx) {
    const userPrize = prizes[userIdx];

    // Pháo hoa âm thanh
    playFirework();

    // Canvas confetti 3 đợt
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 }, colors: ['#f1c40f','#e74c3c','#ff0000','#ffd700','#ffffff'] });
    setTimeout(() => {
        confetti({ angle: 60,  spread: 55, particleCount: 80, origin: { x: 0 },   colors: ['#f1c40f','#ff6b6b'] });
        confetti({ angle: 120, spread: 55, particleCount: 80, origin: { x: 1 },   colors: ['#f1c40f','#ff0000'] });
    }, 350);

    // Tính danh sách bao 100k để gây tiếc
    const bigList = prizes
        .map((p, i) => ({ ...p, num: i + 1 }))
        .filter((p, i) => i !== userIdx && p.isBig)
        .map(p => `<b>bao số ${p.num}</b>`)
        .join(', ');

    // Fill banner
    resAmount.textContent = fmtVNDFull(userPrize.amount);
    resRegret.innerHTML = `
        Bạn nhận được <span class="hl-green">${fmtVNDFull(userPrize.amount)}</span> 🎉<br><br>
        Nhưng mà... <span class="hl">${BIG_IN_OTHERS} bao 100.000đ</span> nằm ở: ${bigList} 😭<br><br>
        <span style="font-size:0.8rem;opacity:0.55">Tiếc không? Thôi năm sau đến sớm nha bạn ơi~ 😂</span>
    `;

    resBanner.classList.add('show');
    resBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ── Init ────────────────────────────────────────────────────
   Chạy ngay khi DOM sẵn sàng                                   */
window.addEventListener('DOMContentLoaded', () => {
    const allowed = checkDevice();
    if (!allowed) return; // bị khóa → dừng lại

    generatePrizes();
    renderCards();
});
