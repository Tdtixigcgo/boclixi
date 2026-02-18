// --- CONFIG & CONSTANTS ---
const USER_PRIZES   = [2000, 5000, 10000, 15000, 18000];
const BIG_PRIZE     = 100000;
const SMALL_OTHERS  = [1000, 2000, 5000, 10000, 20000, 50000];
const TOTAL_CARDS   = 12;

let audioCtx = null;
let prizes = [];
let hasPicked = false;

// --- DEVICE FINGERPRINT ---
function generateDeviceId() {
    const parts = [
        navigator.userAgent,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        navigator.hardwareConcurrency || '?'
    ].join('||');
    
    let hash = 2166136261;
    for (let i = 0; i < parts.length; i++) {
        hash ^= parts.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return `lixi2026_${hash.toString(36)}`;
}

// --- AUDIO ENGINE ---
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
    osc.frequency.exponentialRampToValueAtTime(1568 * pitch, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
}

function playFirework() {
    const ctx = getAudioCtx();
    [523, 659, 784].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i*0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i*0.1 + 0.4);
        osc.start(ctx.currentTime + i*0.1); osc.stop(ctx.currentTime + i*0.1 + 0.4);
    });
}

// --- GAME LOGIC ---
function generatePrizes() {
    const userWin = USER_PRIZES[Math.floor(Math.random() * USER_PRIZES.length)];
    let others = [];
    // Thêm 5 bao 100k
    for(let i=0; i<5; i++) others.push(BIG_PRIZE);
    // Thêm 6 bao nhỏ ngẫu nhiên
    for(let i=0; i<6; i++) others.push(SMALL_OTHERS[Math.floor(Math.random() * SMALL_OTHERS.length)]);
    
    others.sort(() => Math.random() - 0.5);
    const userIdx = Math.floor(Math.random() * TOTAL_CARDS);
    others.splice(userIdx, 0, userWin);
    
    return { list: others, userIdx: userIdx };
}

function renderCards() {
    const grid = document.getElementById('lixi-grid');
    if(!grid) return;
    
    const data = generatePrizes();
    prizes = data.list;

    prizes.forEach((amt, i) => {
        const type = i === data.userIdx ? 'user' : (amt === BIG_PRIZE ? 'big' : 'small');
        const card = document.createElement('div');
        card.className = `lixi-card ${i === data.userIdx ? 'is-user-card' : ''}`;
        card.innerHTML = `
            ${i === data.userIdx ? '<div class="user-label">👆 CHỌN ĐI</div>' : ''}
            <div class="card-inner">
                <div class="face front">
                    <span class="corner-deco tl">✦</span>
                    <div class="front-seal">福</div>
                    <div class="front-sub">2026</div>
                    <span class="corner-deco br">✦</span>
                </div>
                <div class="face back type-${type}">
                    <div class="prize-icon">${amt === BIG_PRIZE ? '👑' : '🧧'}</div>
                    <div class="prize-amount">${amt.toLocaleString()}đ</div>
                    <div class="prize-tag">${i === data.userIdx ? 'CỦA BẠN' : 'TIẾC CHƯA'}</div>
                </div>
            </div>
        `;
        if(i === data.userIdx) card.onclick = () => handleFlip(i);
        grid.appendChild(card);
    });
}

function handleFlip(idx) {
    if (hasPicked) return;
    hasPicked = true;
    
    const name = prompt("Tên của bạn để nhận lì xì?") || "Ẩn danh";
    const deviceId = generateDeviceId();
    
    // Save to Log
    const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
    log.push({ name, amount: prizes[idx], time: new Date().toISOString(), deviceId });
    localStorage.setItem('lixi_log', JSON.stringify(log));
    localStorage.setItem(deviceId, 'picked');

    // Effects
    playTing();
    document.querySelectorAll('.lixi-card')[idx].classList.add('is-flipped');
    
    setTimeout(() => revealAll(idx), 900);
}

function revealAll(userIdx) {
    const cards = document.querySelectorAll('.lixi-card');
    cards.forEach((card, i) => {
        if(i !== userIdx) {
            setTimeout(() => {
                card.classList.add('is-flipped');
                playTing(0.8 + Math.random() * 0.4);
            }, i * 60);
        }
    });
    
    setTimeout(() => showResult(userIdx), 1500);
}

function showResult(idx) {
    const amt = prizes[idx];
    const bigPositions = prizes.map((p, i) => p === BIG_PRIZE ? i + 1 : null).filter(n => n);
    
    document.getElementById('win-text').innerText = `Bạn đã bốc được ${amt.toLocaleString()}đ!`;
    document.getElementById('regret-text').innerText = `Tiếc quá! Bao số ${bigPositions.slice(0,3).join(', ')} đều có 100.000đ đó!`;
    document.getElementById('result-banner').classList.remove('hidden');
    
    playFirework();
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

// --- ADMIN LOGIC ---
function login() {
    const pw = document.getElementById('admin-pw').value;
    const saved = localStorage.getItem('admin_password') || 'admin2026';
    if(pw === saved) {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        renderTable();
    } else alert('Sai mật khẩu!');
}

function renderTable() {
    const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
    const searchTerm = document.getElementById('search')?.value.toLowerCase() || '';
    const tbody = document.getElementById('table-body');
    if(!tbody) return;

    let totalMoney = 0;
    tbody.innerHTML = '';
    
    log.filter(item => item.name.toLowerCase().includes(searchTerm)).forEach((item, i) => {
        totalMoney += item.amount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td style="color:var(--gold)">${item.amount.toLocaleString()}đ</td>
            <td style="font-size:10px">${item.deviceId}</td>
            <td>${new Date(item.time).toLocaleString()}</td>
            <td><button class="danger" onclick="deleteLog(${i})">Xóa</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('stat-total').innerText = log.length;
    document.getElementById('stat-money').innerText = totalMoney.toLocaleString() + 'đ';
}

function deleteLog(i) {
    let log = JSON.parse(localStorage.getItem('lixi_log'));
    log.splice(i, 1);
    localStorage.setItem('lixi_log', JSON.stringify(log));
    renderTable();
}

function resetSystem() {
    if(confirm("Xóa toàn bộ dữ liệu và reset lượt bốc?")) {
        const keys = Object.keys(localStorage);
        keys.forEach(k => { if(k.startsWith('lixi2026_') || k === 'lixi_log') localStorage.removeItem(k); });
        location.reload();
    }
}

function exportCSV() {
    const log = JSON.parse(localStorage.getItem('lixi_log') || '[]');
    let csv = "Ten,SoTien,DeviceID,ThoiGian\n";
    log.forEach(r => csv += `${r.name},${r.amount},${r.deviceId},${r.time}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lixi_report_2026.csv'; a.click();
}

function logout() { location.reload(); }

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('lixi-grid')) {
        const deviceId = generateDeviceId();
        if(localStorage.getItem(deviceId) === 'picked') {
            document.getElementById('blocker-overlay').classList.remove('hidden');
        } else {
            renderCards();
        }
    }
});
