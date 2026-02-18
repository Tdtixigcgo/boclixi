/* =============================================
   LÌ XÌ TẾT 2026 — SCRIPT CHÍNH
   Device Lock + Prize Engine + Audio
   ============================================= */

'use strict';

// ===== CONFIG =====
const USER_PRIZES   = [2000, 5000, 10000, 15000, 18000];
const BIG_PRIZE     = 100000;
const SMALL_OTHERS  = [1000, 2000, 5000, 10000, 20000, 50000];
const TOTAL_CARDS   = 12;
const BIG_IN_OTHERS = 5;

// ===== STATE =====
let prizes         = [];
let userCardIndex  = -1;
let hasPicked      = false;
let audioCtx       = null;

// ===== DEVICE FINGERPRINT =====
function generateDeviceId() {
    const parts = [
        navigator.userAgent,
        ${screen.width}x${screen.height}x${screen.colorDepth},
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        navigator.hardwareConcurrency || '?',
    ].join('||');

    let hash = 2166136261;
    for (let i = 0; i < parts.length; i++) {
        hash ^= parts.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return lixi2026_${hash.toString(36)};
}

function checkDevice() {
    const deviceId = generateDeviceId();
    const status   = localStorage.getItem(deviceId);
    if (status === 'picked') {
        document.getElementById('blocker-overlay').style.display = 'flex';
        return false;
    }
    return true;
}

function markDevicePicked(winAmount) {
    const deviceId = generateDeviceId();
    localStorage.setItem(deviceId, 'picked');

    const name = prompt('🧧 Nhập tên của bạn để lưu kết quả:') || 'Ẩn danh';

    const record = {
        name:     name.trim() || 'Ẩn danh',
        amount:   winAmount,
        time:     new Date().toISOString(),
        deviceId: deviceId
    };
    const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
    log.push(record);
    localStorage.setItem('lixi_log', JSON.stringify(log));

    return name;
}

// ===== PRIZE ENGINE =====
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generatePrizes() {
    // User prize — NEVER 100k
    const userPrize = USER_PRIZES[Math.floor(Math.random() * USER_PRIZES.length)];

    // Build 11 other prizes: exactly 5 × 100k + 6 small
    const others = [];
    for (let i = 0; i < BIG_IN_OTHERS; i++) others.push(BIG_PRIZE);
    for (let i = 0; i < (TOTAL_CARDS - 1 - BIG_IN_OTHERS); i++) {
        others.push(SMALL_OTHERS[Math.floor(Math.random() * SMALL_OTHERS.length)]);
    }
    const shuffledOthers = shuffle(others);

    // Insert user prize at random position in full 12-card array
    const insertAt = Math.floor(Math.random() * TOTAL_CARDS);
    const result   = [];
    let oi = 0;
    for (let i = 0; i < TOTAL_CARDS; i++) {
        if (i === insertAt) {
            result.push({ amount: userPrize, isUser: true });
        } else {
            result.push({ amount: shuffledOthers[oi++], isUser: false });
        }
    }

    userCardIndex = insertAt;
    return result;
}

// ===== AUDIO =====
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playTing(pitch = 1.0) {
    try {
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
    } catch(e) { /* audio permission not granted yet */ }
}

function playFirework() {
    try {
        const ctx   = getAudioCtx();
        const now   = ctx.currentTime;
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
    } catch(e) {}
}

// ===== CONFETTI =====
function fireConfetti() {
    if (typeof confetti === 'undefined') return;

    confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f1c40f', '#e74c3c', '#ff0000', '#ffd700', '#ffffff']
