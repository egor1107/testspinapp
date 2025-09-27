// GIF файлы для показа при выигрыше/проигрыше NFT
const NFT_GIFS = [
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADkWwAAvtM6Eg.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgAD5X0AAoxVeUs.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADrIIAAg8v6Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADXWYAAmpx8Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADcHkAAhj26Eg.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgAD02oAAjiF6Eg.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADrIIAAg8v6Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgAD3HIAAoc76Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgAD23YAAhKX6Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADj3IAAqQ26Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADZ30AAuFC6Ug.gif',
  'gifts/AllGiftsTGG_by_TgEmodziBot_AgADjHMAAjND6Eg.gif'
];

// Функция для получения случайной gif
function getRandomNFTGif() {
  return NFT_GIFS[Math.floor(Math.random() * NFT_GIFS.length)];
}

// Configuration - обновлено для новых призов
const WHEEL_CONFIG = [
  {label: "2x", count: 30, color: '#06b6d4'},
  {label: "3x", count: 12, color: '#f59e0b'},
  {label: "NFT", count: 5, color: '#8b5cf6'},
  {label: "Secret NFT", count: 1, color: '#ef4444'}
];

// Game state
let gameState = {
  spins: parseInt(localStorage.getItem('wheelSpins') || '0'),
  wins: parseInt(localStorage.getItem('wheelWins') || '0'),
  winStreak: parseInt(localStorage.getItem('winStreak') || '0'),
  currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
  lastDaily: localStorage.getItem('lastDaily') || '0',
  inventory: JSON.parse(localStorage.getItem('wheelInventory') || '{}'),
  currentSection: 'wheel'
};

// История спинов (только в текущей сессии, не сохраняется в localStorage)
let spinHistory = [];

// Initialize background particles
function initBackgroundParticles() {
  const container = document.getElementById('bgParticles');
  const particleCount = 0;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'bg-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 8 + 's';
    container.appendChild(particle);
  }
}

// Reward system - обновлено для новых призов
const rewardConfig = {
  'Secret NFT': { emoji: '💎', rarity: 'legendary' },
  'NFT': { emoji: '🎨', rarity: 'epic' },
  '2x': { emoji: '⭐', rarity: 'common' },
  '3x': { emoji: '🎁', rarity: 'rare' }
};

function addRewardToInventory(rewardName) {
  if (!gameState.inventory[rewardName]) {
    gameState.inventory[rewardName] = 0;
  }
  gameState.inventory[rewardName]++;
  localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
  updateInventoryDisplay();
}

function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById('inventoryGrid');

  // Check if inventory is empty
  if (Object.keys(gameState.inventory).length === 0 ||
      Object.values(gameState.inventory).every(count => count === 0)) {
    inventoryGrid.innerHTML = `
      <div class="empty-inventory">
        <div class="empty-icon">📦</div>
        <div class="empty-text">Инвентарь пуст</div>
        <div class="empty-subtitle">Крутите колесо и выигрывайте награды!</div>
      </div>
    `;
    return;
  }

  // Display rewards
  let inventoryHTML = '';
  Object.entries(gameState.inventory).forEach(([rewardName, count]) => {
    if (count > 0) {
      const reward = rewardConfig[rewardName];
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${reward.rarity}"></div>
          <div class="reward-image">${reward.emoji}</div>
          <div class="reward-name">${rewardName}</div>
          <div class="reward-count">x${count}</div>
        </div>
      `;
    }
  });

  inventoryGrid.innerHTML = inventoryHTML;
}

function updateProfileStats() {
  document.getElementById('profileSpins').textContent = gameState.spins;
}

// Функция для добавления результата в историю спинов - обновлено для новых призов
function addToSpinHistory(prize, isWin) {
  spinHistory.unshift({ prize, isWin }); // Добавляем в начало массива

  // Ограничиваем историю до 20 последних спинов
  if (spinHistory.length > 20) {
    spinHistory.pop(); // Удаляем с конца
  }

  updateSpinHistoryDisplay();
}

// Функция для обновления отображения истории спинов - обновлено для новых призов
function updateSpinHistoryDisplay() {
  const historyContainer = document.getElementById('spinHistory');

  if (spinHistory.length === 0) {
    historyContainer.innerHTML = '<div class="history-placeholder">Начните крутить колесо!</div>';
    return;
  }

  let historyHTML = '';
  spinHistory.forEach((spin, index) => {
    let cubeClass = 'history-cube';

    if (spin.isWin) {
      // Определяем класс по типу приза
      switch (spin.prize) {
        case 'Secret NFT':
          cubeClass += ' win-secret-nft';
          break;
        case 'NFT':
          cubeClass += ' win-nft';
          break;
        case '2x':
          cubeClass += ' win-2x';
          break;
        case '3x':
          cubeClass += ' win-3x';
          break;
      }
    } else {
      cubeClass += ' lose';
    }

    // Добавляем анимацию для первого элемента (самого нового)
    if (index === 0) {
      cubeClass += ' new';
    }

    historyHTML += `<div class="${cubeClass}" title="${spin.isWin ? 'Выигрыш: ' + spin.prize : 'Промах'}"></div>`;
  });

  historyContainer.innerHTML = historyHTML;

  // Прокрутка не нужна, так как новые кубики добавляются в начало
}

// Section navigation
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected section
  document.getElementById(section + 'Section').classList.add('active');
  document.querySelector(`[onclick="showSection('${section}')"]`).classList.add('active');

  gameState.currentSection = section;

  // Update profile data when switching to profile
  if (section === 'profile') {
    updateProfileStats();
    updateInventoryDisplay();
  }
}

// Balance modal
function showBalanceModal() {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const result = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');

  title.textContent = 'Пополнение баланса';
  result.textContent = '💳';
  result.className = 'modal-result';
  message.textContent = 'Функция пополнения баланса будет доступна в ближайшее время!';

  modal.classList.add('show');
}

// Original wheel system
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = Math.min(centerX, centerY) - 8;
const centerHoleRadius = 70; // Увеличен радиус центра с 65 до 70

// Create sectors from config
const sectors = [];
WHEEL_CONFIG.forEach(item => {
  for (let i = 0; i < item.count; i++) {
    sectors.push({
      label: item.label,
      color: item.color
    });
  }
});

// Shuffle sectors randomly
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

shuffleArray(sectors);

const sectorAngle = (2 * Math.PI) / sectors.length;
let currentRotation = 0;
let selectedChoice = null;
let isSpinning = false;

function drawWheel(rotationAngle = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw outer shadow
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(148, 163, 184, 0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Draw sectors
  for(let i = 0; i < sectors.length; i++) {
    const startAngle = rotationAngle + i * sectorAngle;
    const endAngle = startAngle + sectorAngle;

    // Create gradient for each sector
    const gradient = ctx.createRadialGradient(centerX, centerY, centerHoleRadius, centerX, centerY, radius);
    gradient.addColorStop(0, sectors[i].color);
    gradient.addColorStop(1, sectors[i].color + 'CC'); // Add transparency

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Add sector border
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
  }

  // Draw center hole with new color - изменен цвет на фоновый
  const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerHoleRadius);
  centerGradient.addColorStop(0, '#1d232a');
  centerGradient.addColorStop(1, '#1d232a');

  ctx.beginPath();
  ctx.fillStyle = centerGradient;
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Center hole border - изменен цвет границы
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1d232a';
  ctx.stroke();
}

function spinWheel() {
  if (isSpinning) return;

  // Проверяем, выбрана ли ставка
  if (!selectedChoice) {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = 'Ошибка';
    document.getElementById('modalResult').textContent = '⚠️';
    document.getElementById('modalResult').className = 'modal-result';
    document.getElementById('modalMessage').textContent = 'Сначала выберите ставку!';
    modal.classList.add('show');
    return;
  }

  isSpinning = true;

  const spinButton = document.getElementById('spinButton');
  const wheelContainer = document.getElementById('wheelContainer');
  const centerHub = document.getElementById('centerHub');
  const progressRing = document.getElementById('progressRing');
  const pointer = document.getElementById('pointer');

  // Update UI
  spinButton.disabled = true;
  spinButton.classList.add('spinning');
  spinButton.querySelector('.button-content span').textContent = 'Spinning';
  spinButton.querySelector('.button-star-icon').style.display = 'none'; // Скрываем иконку звездочки
  wheelContainer.classList.add('spinning');
  centerHub.classList.add('spinning');
  document.querySelectorAll('.bet-option').forEach(opt => opt.classList.add('disabled'));

  // Show progress ring
  progressRing.classList.add('active');

  // Calculate spin
  const minSpins = 5;
  const maxSpins = 8;
  const spins = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;
  const finalAngle = Math.random() * 360;
  const totalRotation = spins * 360 + finalAngle;

  const startRotation = currentRotation;
  const endRotation = startRotation + totalRotation;
  const duration = 4000; // 4 seconds
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for more natural spin
    const easeOut = 1 - Math.pow(1 - progress, 3);
    currentRotation = startRotation + (endRotation - startRotation) * easeOut;

    drawWheel((currentRotation * Math.PI) / 180);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      finishSpin();
    }
  }

  requestAnimationFrame(animate);
}

function finishSpin() {
  // Calculate result - fix the math to properly determine winning sector
  const normalizedRotation = ((currentRotation % 360) + 360) % 360;
  // Pointer is at top (270 degrees in canvas coordinates), so we need to account for that
  const pointerPosition = 270; // Top position in degrees
  const adjustedAngle = (pointerPosition - normalizedRotation + 360) % 360;
  const sectorAngle = 360 / sectors.length;
  const sectorIndex = Math.floor(adjustedAngle / sectorAngle) % sectors.length;
  const result = sectors[sectorIndex].label;

  console.log('Debug - Rotation:', normalizedRotation, 'Adjusted:', adjustedAngle, 'Sector:', sectorIndex, 'Result:', result);
  const isWin = result === selectedChoice;

  // Добавляем результат в историю спинов
  addToSpinHistory(result, isWin);

  // Update game state
  gameState.spins++;
  if (isWin) {
    gameState.wins++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.winStreak) {
      gameState.winStreak = gameState.currentStreak;
    }
    // Add reward to inventory
    addRewardToInventory(result);
  } else {
    gameState.currentStreak = 0;
  }

  // Save stats
  localStorage.setItem('wheelSpins', gameState.spins);
  localStorage.setItem('wheelWins', gameState.wins);
  localStorage.setItem('winStreak', gameState.winStreak);
  localStorage.setItem('currentStreak', gameState.currentStreak);

  // Visual effects
  const pointer = document.getElementById('pointer');
  pointer.classList.add('pulse');
  setTimeout(() => pointer.classList.remove('pulse'), 800);

  if (isWin) {
    createParticles();
    if (result === 'Secret NFT') {
      createConfetti();
    }
  }

  // Reset UI
  setTimeout(() => {
    const spinButton = document.getElementById('spinButton');
    const wheelContainer = document.getElementById('wheelContainer');
    const centerHub = document.getElementById('centerHub');
    const progressRing = document.getElementById('progressRing');

    isSpinning = false;
    spinButton.disabled = false;
    spinButton.classList.remove('spinning');
    spinButton.querySelector('.button-content span').textContent = 'Spin for 125';
    spinButton.querySelector('.button-star-icon').style.display = 'inline-block'; // Показываем иконку звездочки обратно
    wheelContainer.classList.remove('spinning');
    centerHub.classList.remove('spinning');
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('disabled'));
    progressRing.classList.remove('active');

    showResult({label: result}, isWin);
  }, 1000);
}

// Обновленная функция показа результатов с новой логикой наград
function showResult(result, isWin) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const modalResult = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');

  title.textContent = 'Результат спина';
  modalResult.className = `modal-result ${isWin ? 'win' : 'lose'}`;

  // ИЗМЕНЕНО: Показываем гифки только для NFT, но НЕ для Secret NFT
  if (result.label === 'NFT') {
    // Очищаем содержимое и добавляем gif только для обычного NFT
    modalResult.innerHTML = '';

    const gifContainer = document.createElement('div');
    gifContainer.style.textAlign = 'center';
    gifContainer.style.width = '100%';

    const gifImage = document.createElement('img');
    gifImage.src = getRandomNFTGif();
    gifImage.style.maxWidth = '200px';
    gifImage.style.maxHeight = '200px';
    gifImage.style.borderRadius = '12px';
    gifImage.style.objectFit = 'contain';

    gifContainer.appendChild(gifImage);
    modalResult.appendChild(gifContainer);

    if (isWin) {
      message.textContent = '🎉 Вы угадали NFT! Отличная интуиция!';
    } else {
      const loseContainer = document.createElement('div');
      loseContainer.style.textAlign = 'center';

      const loseText = document.createElement('div');
      loseText.textContent = 'возможный NFT:';
      loseText.style.marginBottom = '8px';
      loseText.style.fontSize = '14px';
      loseText.style.color = '#b4b4d6';

      loseContainer.appendChild(loseText);
      loseContainer.appendChild(gifImage.cloneNode());

      modalResult.innerHTML = '';
      modalResult.appendChild(loseContainer);

      message.textContent = 'В следующий раз обязательно повезёт!';
    }
  } else {
    // ИЗМЕНЕНО: Для Secret NFT, 2x и 3x показываем обычное текстовое отображение
    if (result.label === '2x') {
      modalResult.innerHTML = '<span style="margin-right: 0px;">2x → 250</span><img src="images/Star Fill.svg" alt="звезды" style="height: 20px; width: auto; display: inline-block; filter: sepia(1) saturate(5) hue-rotate(10deg); vertical-align: middle; margin-left: 3px; margin-right: 0px; padding: 0px;">';
      if (isWin) {
        message.textContent = '🎉 Вы угадали! Получаете 250 звезд!';
      } else {
        message.textContent = 'В следующий раз обязательно повезёт!';
      }
    } else if (result.label === '3x') {
      modalResult.innerHTML = '<span style="margin-right: 0px;">3x → 375</span><img src="images/Star Fill.svg" alt="звезды" style="height: 20px; width: auto; display: inline-block; filter: sepia(1) saturate(5) hue-rotate(10deg); vertical-align: middle; margin-left: 3px; margin-right: 0px; padding: 0px;">';
      if (isWin) {
        message.textContent = '🎉 Вы угадали! Получаете 375 звезд!';
      } else {
        message.textContent = 'В следующий раз обязательно повезёт!';
      }
    } else {
      modalResult.textContent = result.label;
      if (isWin) {
        message.textContent = '🎉 Вы угадали! Отличная интуиция!';
      } else {
        message.textContent = 'В следующий раз обязательно повезёт!';
      }
    }
  }

  modal.classList.add('show');
}

function createParticles() {
  const container = document.getElementById('particles');
  const colors = ['#a855f7', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.width = (Math.random() * 6 + 4) + 'px';
    particle.style.height = particle.style.width;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.opacity = '0.8';

    container.appendChild(particle);

    // Animate particle
    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0.8 },
      { transform: `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px) scale(0)`, opacity: 0 }
    ], {
      duration: 1000 + Math.random() * 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }).onfinish = () => particle.remove();
  }
}

function createConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#a855f7', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';

    container.appendChild(confetti);

    confetti.animate([
      { transform: 'translateY(-10px) rotate(0deg)', opacity: 1 },
      { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
    ], {
      duration: 3000 + Math.random() * 2000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }).onfinish = () => confetti.remove();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize wheel
  drawWheel();
  initBackgroundParticles();

  // Initialize spin history display
  updateSpinHistoryDisplay();

  // Bet selection
  document.querySelectorAll('.bet-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      selectedChoice = this.dataset.choice;

      // Активируем кнопку спина когда выбрана ставка
      document.getElementById('spinButton').disabled = false;
    });
  });

  // Spin button
  document.getElementById('spinButton').addEventListener('click', spinWheel);

  // Modal close
  document.getElementById('modalButton').addEventListener('click', function() {
    document.getElementById('modal').classList.remove('show');
  });

  // Close modal by clicking outside
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('show');
    }
  });

  // Initialize profile data
  updateProfileStats();
  updateInventoryDisplay();
});

// Prevent page refresh on mobile pull-to-refresh
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
});
