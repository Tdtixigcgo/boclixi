// --- CẤU HÌNH GIẢI THƯỞNG MỚI ---
const USER_SMALL_PRIZES = [10000, 15000, 20000, 25000, 30000]; // Giải cho user
const BAIT_PRIZES = [50000, 100000, 100000, 100000, 50000];    // "Mồi" để gây tiếc nuối
const FILLER_PRIZES = [2000, 5000, 10000, 20000];              // Các giải còn lại

function generateRiggedPrizes(clickedIdx) {
    let finalPrizes = new Array(12).fill(null);
    
    // 1. Ô người dùng click luôn là tiền nhỏ (10k-30k)
    const userWin = USER_SMALL_PRIZES[Math.floor(Math.random() * USER_SMALL_PRIZES.length)];
    finalPrizes[clickedIdx] = userWin;
    
    // 2. Tạo danh sách các bao còn lại (11 bao)
    // Phải có ít nhất 3-4 bao 50k-100k để "thao túng tâm lý"
    let others = [...BAIT_PRIZES];
    while(others.length < 11) {
        others.push(FILLER_PRIZES[Math.floor(Math.random() * FILLER_PRIZES.length)]);
    }
    others.sort(() => Math.random() - 0.5); // Xáo trộn mồi
    
    // 3. Đổ các bao còn lại vào các vị trí trống
    let otherIdx = 0;
    for(let i=0; i<12; i++) {
        if(finalPrizes[i] === null) {
            finalPrizes[i] = others[otherIdx];
            otherIdx++;
        }
    }
    return finalPrizes;
}

// --- HÀM HANDLE FLIP CẬP NHẬT ---
function handleFlip(idx) {
    if (hasPicked) return;
    hasPicked = true;

    // Cơ cấu kết quả ngay khi click
    prizes = generateRiggedPrizes(idx);
    
    // Cập nhật giá trị hiển thị trên mặt sau của tất cả các bao
    const allCards = document.querySelectorAll('.lixi-card');
    allCards.forEach((card, i) => {
        const backFace = card.querySelector('.face.back');
        const amountDisplay = backFace.querySelector('.prize-amount');
        const prizeValue = prizes[i];
        
        amountDisplay.innerText = prizeValue.toLocaleString() + 'đ';
        
        // Đổi màu sắc bao dựa trên số tiền
        if (prizeValue >= 50000) {
            backFace.className = 'face back type-big';
        } else if (i === idx) {
            backFace.className = 'face back type-user';
        } else {
            backFace.className = 'face back type-small';
        }
    });

    // Phần còn lại giữ nguyên (play sound, revealAll, save log...)
    const name = prompt("Tên của bạn?") || "Ẩn danh";
    saveLog(name, prizes[idx]); 
    
    allCards[idx].classList.add('is-flipped');
    playTing();
    setTimeout(() => revealAll(idx), 900);
}
