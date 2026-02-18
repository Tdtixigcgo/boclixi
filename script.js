const USER_PRIZES = [2000, 5000, 10000, 15000, 18000];
const BIG_PRIZE = 100000;
const SMALL_OTHERS = [1000, 2000, 5000, 10000, 20000, 50000];
const TOTAL_CARDS = 12;
const BIG_IN_OTHERS = 5;

let hasPicked = false;
let audioCtx = null;

// --- Device Lock ---
function generateDeviceId() {
    const parts = [navigator.userAgent, `${screen.width}x${screen.height}`, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language].join('||');
    let hash = 2166136261;
    for (let i = 0; i < parts.length; i++) {
        hash ^= parts.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return `lixi2026_${hash.toString(36)}`;
}

function checkDevice() {
    const id = generateDeviceId();
    if (localStorage.getItem(id) === 'picked') {
        document.getElementById('blocker-overlay').classList.remove('hidden');
        return true;
    }
    return false;
}

// --- Audio Engine ---
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTing(pitch = 1.0) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1047 * pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1568 * pitch, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
}

// --- Game Logic ---
function generatePrizes() {
    const userWin = USER_PRIZES[Math.floor(Math.random() * USER_PRIZES.length)];
    let others = [];
    for(let i=0; i<BIG_IN_OTHERS; i++) others.push(BIG_PRIZE);
    while(others.length < 11) {
        others.push(SMALL_OTHERS[Math.floor(Math.random() * SMALL_OTHERS.length)]);
    }
    others.sort(() => Math.random() - 0.5);
    const userIdx = Math.floor(Math.random() * 12);
    others.splice(userIdx, 0, userWin);
    return { prizes: others, userIdx: userIdx };
}

function renderCards() {
    const grid = document.getElementById('lixi-grid');
    const { prizes, userIdx } = generatePrizes();
    
    prizes.forEach((amount, i) => {
        const card = document.createElement('div');
        card.className = `lixi-card ${i === userIdx ? 'is-user-card' : ''}`;
        card.innerHTML = `
            ${i === userIdx ? '<div class="user-label">👆 CHỌN ĐI</div>' : ''}
            <div class="card-inner">
                <div class="face front">
                    <div class="front-seal">福</div>
                    <div class="front-sub">2026</div>
                </div>
                <div class="face back ${amount === BIG_PRIZE ? 'type-big' : (i === userIdx ? 'type-user' : 'type-small')}">
                    <div style="font-size:1.5rem">🧧</div>
                    <div style="font-weight:bold; color:white">${amount.toLocaleString()}đ</div>
                    <div style="font-size:0.6rem; color:var(--gold)">${i === userIdx ? 'CỦA BẠN' : 'LỘC XUÂN'}</div>
                </div>
            </div>
        `;
        card.onclick = () => handleFlip(i, amount, userIdx);
        grid.appendChild(card);
    });
}

function handleFlip(index, amount, userIdx) {
    if (hasPicked || index !== userIdx) return;
    hasPicked = true;
    
    const name = prompt("Nhập quý danh của bạn để nhận lộc:") || "Ẩn danh";
    
    // Mark device
    const deviceId = generateDeviceId();
    localStorage.setItem(deviceId, 'picked');
    
    // Log data
    const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
    log.push({ name, amount, time: new Date().toLocaleString(), deviceId });
    localStorage.setItem('lixi_log', JSON.stringify(log));

    // Flip animation
    const cards = document.querySelectorAll('.lixi-card');
    cards[index].classList.add('is-flipped');
    playTing(1.2);

    setTimeout(() => revealAll(cards, index), 1000);
}

function revealAll(cards, userIdx) {
    cards.forEach((card, i) => {
        if (i !== userIdx) {
            setTimeout(() => {
                card.classList.add('is-flipped');
                playTing(0.8 + Math.random() * 0.4);
            }, i * 60);
        }
    });
    setTimeout(showResult, 1500);
}

function showResult() {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    document.getElementById('result-banner').classList.remove('hidden');
    const userLog = JSON.parse(localStorage.getItem('lixi_log')).pop();
    document.getElementById('result-amount').innerText = userLog.amount.toLocaleString() + "đ";
    document.getElementById('result-note').innerText = "Tiếc quá! Chỉ tí nữa là trúng 100k rồi.";
}

window.onload = () => { if(!checkDevice()) renderCards(); };
