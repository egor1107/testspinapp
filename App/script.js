// ==================== ИНТЕГРАЦИЯ С АДМИНСКОЙ ПАНЕЛЬЮ ====================

// API Configuration - ИЗМЕНИТЕ baseUrl НА ВАШ СЕРВЕР
const API_CONFIG = {
  baseUrl: 'https://roulette-dashboard.preview.emergentagent.com/', // ИЗМЕНИТЕ НА ВАШ URL АДМИНКИ
  telegramId: null,
  username: null
};

// Функция инициализации Telegram WebApp
function initTelegramWebApp() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    
    // Получаем данные пользователя
    const user = tg.initDataUnsafe.user;
    if (user) {
      API_CONFIG.telegramId = user.id.toString();
      API_CONFIG.username = user.username || user.first_name || null;
      
      console.log('Telegram User:', {
        id: API_CONFIG.telegramId,
        username: API_CONFIG.username
      });
    }
  } else {
    // Для тестирования без Telegram
    API_CONFIG.telegramId = 'test_' + Math.random().toString(36).substr(2, 9);
    API_CONFIG.username = 'TestUser';
    console.log('Test mode - generated user:', API_CONFIG.telegramId);
  }
}

// Функция синхронизации данных пользователя с сервером
async function syncUserData() {
  if (!API_CONFIG.telegramId) return;
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: API_CONFIG.telegramId,
        username: API_CONFIG.username,
        balance: gameState.balance,
        spins: gameState.spins,
        wins: gameState.wins,
        winStreak: gameState.winStreak,
        currentStreak: gameState.currentStreak,
        inventory: gameState.inventory || []
      }),
    });

    if (response.ok) {
      console.log('Данные пользователя синхронизированы с сервером');
    } else {
      console.error('Ошибка синхронизации данных');
    }
  } catch (error) {
    console.error('Ошибка API:', error);
  }
}

// Функция отправки результата спина на сервер
async function sendSpinResult(result, isWin) {
  if (!API_CONFIG.telegramId) return;
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/users/spin-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: API_CONFIG.telegramId,
        result: result,
        isWin: isWin,
        balance: gameState.balance,
        spins: gameState.spins,
        wins: gameState.wins,
        winStreak: gameState.winStreak,
        currentStreak: gameState.currentStreak,
        inventory: gameState.inventory || []
      }),
    });

    if (response.ok) {
      console.log('Результат спина отправлен на сервер');
    } else {
      console.error('Ошибка отправки результата спина');
    }
  } catch (error) {
    console.error('Ошибка API:', error);
  }
}

// ==================== ОРИГИНАЛЬНЫЙ КОД ИГРЫ ====================

// GIF файлы для показа при выигрыше/проигрыше NFT
const NFT_GIFS = [
  'gifts/B-Day Candle.gif',
  'gifts/Evil Eye.gif',
  'gifts/Handing Star.gif',
  'gifts/Jelly Bunny.gif',
  'gifts/Jester Hat.gif',
  'gifts/Jolly Chimp.gif',
  'gifts/Lol Pop.gif',
  'gifts/Pet Snake.gif',
  'gifts/Santa Hat.gif',
  'gifts/Snoop Cigar.gif',
  'gifts/Star Notepad.gif',
  'gifts/Toy Bear.gif'
];

// Функция для получения случайной gif
function getRandomNFTGif() {
  return NFT_GIFS[Math.floor(Math.random() * NFT_GIFS.length)];
}

// Функция для получения названия подарка из пути к файлу
function getGiftNameFromPath(gifPath) {
  // Извлекаем название файла без расширения из пути
  const fileName = gifPath.split('/').pop(); // Получаем последнюю часть пути
  const nameWithoutExtension = fileName.replace('.gif', ''); // Убираем расширение
  return nameWithoutExtension;
}

// Configuration - CHANGED: Звёзды -> 2x, Подарок -> 3x
const WHEEL_CONFIG = [
  {label: "2x", count: 30, color: '#06b6d4'},
  {label: "3x", count: 12, color: '#f59e0b'},
  {label: "NFT", count: 5, color: '#8b5cf6'},
  {label: "Secret NFT", count: 1, color: '#ef4444'}
];

// Game state - UPDATED: Changed inventory structure and added balance
let gameState = {
  spins: parseInt(localStorage.getItem('wheelSpins') || '0'),
  wins: parseInt(localStorage.getItem('wheelWins') || '0'),
  winStreak: parseInt(localStorage.getItem('winStreak') || '0'),
  currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
  lastDaily: localStorage.getItem('lastDaily') || '0',
  balance: parseInt(localStorage.getItem('gameBalance') || '1000'),
  inventory: JSON.parse(localStorage.getItem('wheelInventory') || '[]'), // Changed to array
  currentSection: 'wheel'
};

// История спинов (только в текущей сессии, не сохраняется в localStorage)
let spinHistory = [];

// Initialize background particles
function initBackgroundParticles() {
  const container = document.getElementById('bgParticles');
  if (!container) return;
  
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'bg-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 8 + 's';
    container.appendChild(particle);
  }
}

// Reward system - UPDATED: 2x and 3x instead of stars and gift
const rewardConfig = {
  'Secret NFT': { emoji: '💎', rarity: 'legendary' },
  'NFT': { emoji: '🎨', rarity: 'epic' },
  '2x': { emoji: '2x', rarity: 'common', reward: 250 },
  '3x': { emoji: '3x', rarity: 'rare', reward: 375 }
};

// Function to generate unique ID for inventory items
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// UPDATED: Add reward to inventory as separate items
function addRewardToInventory(rewardName, gifUrl = null) {
  // Проверяем, существует ли конфигурация для данной награды
  if (!rewardConfig[rewardName]) {
    console.warn(`Попытка добавить неизвестную награду: "${rewardName}"`);
    return;
  }
  
  const reward = rewardConfig[rewardName];
  const newItem = {
    id: generateId(),
    type: rewardName,
    amount: reward.reward || 0,
    timestamp: Date.now(),
    emoji: reward.emoji,
    rarity: reward.rarity,
    gifUrl: gifUrl // Store gif URL for NFT items
  };
  
  gameState.inventory.push(newItem);
  localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
  updateInventoryDisplay();
}

// Function to remove item from inventory
function removeFromInventory(itemId) {
  gameState.inventory = gameState.inventory.filter(item => item.id !== itemId);
  localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
  updateInventoryDisplay();
}

// Function to update balance
function updateBalance(amount) {
  gameState.balance += amount;
  localStorage.setItem('gameBalance', gameState.balance);
  updateBalanceDisplay();
}

// Function to update balance display
function updateBalanceDisplay() {
  const balanceElements = ['balanceText', 'balanceTextShop', 'balanceTextProfile'];
  balanceElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = `${gameState.balance.toLocaleString()} <img src="images\\Star Fill.svg" alt="звезды" class="star-icon">`;
    }
  });
}

// Функция для очистки инвентаря от неизвестных наград
function cleanInventory() {
  // If inventory is still in old format (object), convert to new format (array)
  if (!Array.isArray(gameState.inventory)) {
    console.log('Converting old inventory format to new format');
    const oldInventory = gameState.inventory;
    gameState.inventory = [];
    
    // Convert old format to new format
    Object.entries(oldInventory).forEach(([rewardName, count]) => {
      if (rewardConfig[rewardName]) {
        for (let i = 0; i < count; i++) {
          const reward = rewardConfig[rewardName];
          const newItem = {
            id: generateId(),
            type: rewardName,
            amount: reward.reward || 0,
            timestamp: Date.now() - (i * 1000), // Slightly different timestamps
            emoji: reward.emoji,
            rarity: reward.rarity
          };
          gameState.inventory.push(newItem);
        }
      }
    });
    localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
  }
  
  // Clean unknown rewards
  const originalLength = gameState.inventory.length;
  gameState.inventory = gameState.inventory.filter(item => {
    if (!rewardConfig[item.type]) {
      console.warn(`Удаляем неизвестную награду из инвентаря: "${item.type}"`);
      return false;
    }
    return true;
  });
  
  if (gameState.inventory.length !== originalLength) {
    localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
    console.log('Инвентарь очищен от неизвестных наград');
  }
}

// UPDATED: Display inventory as separate cards - MODIFIED to add claim buttons for stars
function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById('inventoryGrid');
  if (!inventoryGrid) return;

  // Check if inventory is empty
  if (gameState.inventory.length === 0) {
    inventoryGrid.innerHTML = `
      <div class="empty-inventory">
        <div class="empty-icon">📦</div>
        <div class="empty-text">Инвентарь пуст</div>
        <div class="empty-subtitle">Крутите колесо и выигрывайте награды!</div>
      </div>
    `;
    return;
  }

  // Display individual reward cards
  let inventoryHTML = '';
  gameState.inventory.forEach((item) => {
    
    if (item.type === '2x' || item.type === '3x') {
      // For 2x/3x items, show star icon with claim button
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${item.rarity}"></div>
          <div class="reward-stars-large">${item.amount} <img src="images/Star Fill.svg" alt="звезды" class="star-icon"></div>
          <button class="claim-btn" onclick="openInventoryModal('${item.id}')">Забрать</button>
        </div>
      `;
    } else if ((item.type === 'NFT' || item.type === 'Secret NFT') && item.gifUrl) {
      // For NFT items with gif URL, show the gif and gift name
      const giftName = getGiftNameFromPath(item.gifUrl);
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${item.rarity}"></div>
          <div class="reward-gif-container">
            <img src="${item.gifUrl}" alt="${giftName}" class="reward-gif" />
          </div>
          <div class="reward-name">${giftName}</div>
        </div>
      `;
    } else {
      // For other items, show normal layout with emoji
      const amountDisplay = item.amount > 0 ? `${item.amount} ⭐` : item.type;
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${item.rarity}"></div>
          <div class="reward-image">${item.emoji}</div>
          <div class="reward-name">${item.type}</div>
          <div class="reward-amount">${amountDisplay}</div>
        </div>
      `;
    }
  });

  inventoryGrid.innerHTML = inventoryHTML;
}

// Function to open inventory modal
function openInventoryModal(itemId) {
  const item = gameState.inventory.find(i => i.id === itemId);
  if (!item) return;
  
  const modal = document.getElementById('inventoryModal');
  const title = document.getElementById('inventoryModalTitle');
  const result = document.getElementById('inventoryModalResult');
  const message = document.getElementById('inventoryModalMessage');
  const claimButton = document.getElementById('claimButton');
  
  if (!modal || !title || !result || !message || !claimButton) return;
  
  title.textContent = 'Награда';
  result.innerHTML = `
    <div class="inventory-modal-reward">
      <div class="reward-display">
        <span class="reward-amount">${item.amount} <img src="images/Star Fill.svg" alt="звезды" class="star-icon"></span>
      </div>
    </div>
  `;
  message.textContent = 'Что вы хотите сделать с этой наградой?';
  
  // Set up claim button click handler
  claimButton.onclick = () => {
    claimReward(itemId);
    modal.classList.remove('show');
  };
  
  modal.classList.add('show');
}

// Function to claim reward (add to balance and remove from inventory)
function claimReward(itemId) {
  const item = gameState.inventory.find(i => i.id === itemId);
  if (!item) return;
  
  // Add to balance
  updateBalance(item.amount);
  
  // Remove from inventory
  removeFromInventory(itemId);
  
  // Show success message
  showClaimSuccessModal(item.amount);
}

// Function to show claim success modal
function showClaimSuccessModal(amount) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const result = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');
  
  if (!modal || !title || !result || !message) return;
  
  title.textContent = 'Успешно!';
  result.innerHTML = `
    <div class="claim-success-display">
      <span class="success-amount">+${amount}</span>
      <img src="images\\Star Fill.svg" alt="звезды" class="success-star">
    </div>
  `;
  result.className = 'modal-result win';
  message.textContent = `${amount} звезд добавлено на ваш игровой баланс!`;
  
  modal.classList.add('show');
}

function updateProfileStats() {
  const profileSpinsEl = document.getElementById('profileSpins');
  if (profileSpinsEl) {
    profileSpinsEl.textContent = gameState.spins;
  }
}

// Функция для добавления результата в историю спинов
function addToSpinHistory(prize, isWin) {
  spinHistory.unshift({ prize, isWin }); // Добавляем в начало массива

  // Ограничиваем историю до 20 последних спинов
  if (spinHistory.length > 20) {
    spinHistory.pop(); // Удаляем с конца
  }

  updateSpinHistoryDisplay();
}

// Функция для обновления отображения истории спинов - UPDATED: 2x and 3x classes
function updateSpinHistoryDisplay() {
  const historyContainer = document.getElementById('spinHistory');
  if (!historyContainer) return;

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
}

// Section navigation
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected section
  const sectionEl = document.getElementById(section + 'Section');
  const navEl = document.querySelector(`[onclick="showSection('${section}')"]`);
  
  if (sectionEl) sectionEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

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

  if (!modal || !title || !result || !message) return;

  title.textContent = 'Пополнение баланса';
  result.textContent = '💳';
  result.className = 'modal-result';
  message.textContent = 'Функция пополнения баланса будет доступна в ближайшее время!';

  modal.classList.add('show');
}

// Original wheel system
const canvas = document.getElementById('wheel');
if (!canvas) {
  console.error('Canvas element not found!');
}

const ctx = canvas ? canvas.getContext('2d') : null;
const centerX = canvas ? canvas.width / 2 : 0;
const centerY = canvas ? canvas.height / 2 : 0;
const radius = canvas ? Math.min(centerX, centerY) - 8 : 0;
const centerHoleRadius = 70;

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
  if (!ctx) return;

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

  // Draw center hole with background color #1d232a
  ctx.beginPath();
  ctx.fillStyle = '#1d232a';
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Center hole border
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(29, 35, 42, 0.3)';
  ctx.stroke();
}

function spinWheel() {
  if (isSpinning) return;

  // Check if bet is selected
  if (!selectedChoice) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const result = document.getElementById('modalResult');
    const message = document.getElementById('modalMessage');
    
    if (modal && title && result && message) {
      title.textContent = 'Ошибка';
      result.textContent = '⚠️';
      result.className = 'modal-result';
      message.textContent = 'Сначала выберите ставку!';
      modal.classList.add('show');
    }
    return;
  }

  isSpinning = true;

  const spinButton = document.getElementById('spinButton');
  const wheelContainer = document.getElementById('wheelContainer');
  const centerHub = document.getElementById('centerHub');
  const progressRing = document.getElementById('progressRing');

  // Update UI
  if (spinButton) {
    spinButton.disabled = true;
    spinButton.classList.add('spinning');
    spinButton.innerHTML = 'Spinning...';
  }
  if (wheelContainer) wheelContainer.classList.add('spinning');
  if (centerHub) centerHub.classList.add('spinning');
  document.querySelectorAll('.bet-option').forEach(opt => opt.classList.add('disabled'));

  // Show progress ring
  if (progressRing) progressRing.classList.add('active');

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

// ==================== МОДИФИЦИРОВАННАЯ ФУНКЦИЯ finishSpin ====================
function finishSpin() {
  // Calculate result - fix the math to properly determine winning sector
  const normalizedRotation = ((currentRotation % 360) + 360) % 360;
  // Pointer is at top (270 degrees in canvas coordinates), so we need to account for that
  const pointerPosition = 270; // Top position in degrees
  const adjustedAngle = (pointerPosition - normalizedRotation + 360) % 360;
  const sectorAngle = 360 / sectors.length;
  const sectorIndex = Math.floor(adjustedAngle / sectorAngle) % sectors.length;
  const finalResult = sectors[sectorIndex].label; // Renamed to avoid scope issues

  const isWin = finalResult === selectedChoice;

  // Добавляем результат в историю спинов
  addToSpinHistory(finalResult, isWin);

  // Update game state
  gameState.spins++;
  if (isWin) {
    gameState.wins++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.winStreak) {
      gameState.winStreak = gameState.currentStreak;
    }
    // Add reward to inventory
    if (finalResult === 'NFT' || finalResult === 'Secret NFT') {
      // Generate GIF URL for NFT rewards
      const nftGifUrl = getRandomNFTGif();
      addRewardToInventory(finalResult, nftGifUrl);
    } else {
      addRewardToInventory(finalResult);
    }
  } else {
    gameState.currentStreak = 0;
  }

  // Save stats
  localStorage.setItem('wheelSpins', gameState.spins);
  localStorage.setItem('wheelWins', gameState.wins);
  localStorage.setItem('winStreak', gameState.winStreak);
  localStorage.setItem('currentStreak', gameState.currentStreak);

  // *** ДОБАВЛЕНО: ОТПРАВЛЯЕМ РЕЗУЛЬТАТ НА СЕРВЕР АДМИНКИ ***
  sendSpinResult(finalResult, isWin);

  // Visual effects
  const pointer = document.getElementById('pointer');
  if (pointer) {
    pointer.classList.add('pulse');
    setTimeout(() => pointer.classList.remove('pulse'), 800);
  }

  if (isWin) {
    createParticles();
    if (finalResult === 'Secret NFT') {
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
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.classList.remove('spinning');
      // UPDATED: Changed the text to reflect the new bet system (no star costs for now)
      spinButton.innerHTML = 'Spin'; 
    }
    if (wheelContainer) wheelContainer.classList.remove('spinning');
    if (centerHub) centerHub.classList.remove('spinning');
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('disabled'));
    if (progressRing) progressRing.classList.remove('active');

    // ВАЖНО: Показать результат
    showResult({label: finalResult}, isWin);
  }, 1000);
}

function showResult(result, isWin) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const modalResult = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');

  if (!modal || !title || !modalResult || !message) {
    console.error('Modal elements not found!');
    return;
  }

  title.textContent = 'Результат спина';
  modalResult.className = `modal-result ${isWin ? 'win' : 'lose'}`;

  // Handle display based on prize type
  if (result.label === 'NFT' || result.label === 'Secret NFT') {
    // Show gif for NFT
    modalResult.innerHTML = '';

    const gifContainer = document.createElement('div');
    gifContainer.style.textAlign = 'center';
    gifContainer.style.width = '100%';

    let nftGifUrl;
    if (isWin) {
      // Get GIF URL from the most recently added NFT in inventory
      const nftItems = gameState.inventory.filter(item => item.type === result.label);
      const latestNft = nftItems[nftItems.length - 1];
      nftGifUrl = latestNft ? latestNft.gifUrl : getRandomNFTGif();
    } else {
      // For losses, generate a random GIF
      nftGifUrl = getRandomNFTGif();
    }

    const gifImage = document.createElement('img');
    gifImage.src = nftGifUrl;
    gifImage.style.maxWidth = '200px';
    gifImage.style.maxHeight = '200px';
    gifImage.style.borderRadius = '12px';
    gifImage.style.objectFit = 'contain';

    gifContainer.appendChild(gifImage);
    modalResult.appendChild(gifContainer);

    if (isWin) {
      message.textContent = result.label === 'Secret NFT' ? '🎉 Вы угадали Secret NFT! Невероятная удача!' : '🎉 Вы угадали NFT! Отличная интуиция!';
    } else {
      const loseContainer = document.createElement('div');
      loseContainer.style.textAlign = 'center';

      const loseText = document.createElement('div');
      loseText.textContent = result.label === 'Secret NFT' ? 'возможный Secret NFT:' : 'возможный NFT:';
      loseText.style.marginBottom = '8px';
      loseText.style.fontSize = '14px';
      loseText.style.color = '#b4b4d6';

      loseContainer.appendChild(loseText);
      loseContainer.appendChild(gifImage.cloneNode());

      modalResult.innerHTML = '';
      modalResult.appendChild(loseContainer);

      message.textContent = 'В следующий раз обязательно повезёт!';
    }
  } else if ((result.label === '2x' || result.label === '3x') && isWin) {
    // NEW: Show 2x/3x win with arrow and reward amount
    modalResult.innerHTML = '';
    
    const winDisplay = document.createElement('div');
    winDisplay.className = 'win-reward-display';
    
    // Prize text (2x or 3x)
    const prizeText = document.createElement('span');
    prizeText.textContent = result.label;
    winDisplay.appendChild(prizeText);
    
    // Arrow icon
    const arrowIcon = document.createElement('img');
    arrowIcon.src = 'images/radix-icons_arrow-right.svg';
    arrowIcon.className = 'arrow-icon';
    arrowIcon.alt = 'arrow';
    winDisplay.appendChild(arrowIcon);
    
    // Reward amount
    const rewardAmount = document.createElement('span');
    rewardAmount.textContent = rewardConfig[result.label].reward;
    winDisplay.appendChild(rewardAmount);
    
    // Star icon
    const starIcon = document.createElement('img');
    starIcon.src = 'images/Star Fill.svg';
    starIcon.className = 'star-icon';
    starIcon.alt = 'звезды';
    winDisplay.appendChild(starIcon);
    
    modalResult.appendChild(winDisplay);
    message.textContent = '🎉 Вы угадали! Отличная интуиция!';
  } else {
    // For all other cases (Secret NFT, losses)
    modalResult.textContent = result.label;

    if (isWin) {
      message.textContent = '🎉 Вы угадали! Отличная интуиция!';
    } else {
      message.textContent = 'В следующий раз обязательно повезёт!';
    }
  }

  modal.classList.add('show');
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  
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
  if (!container) return;
  
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

// ==================== МОДИФИЦИРОВАННЫЙ Event Listener ====================
document.addEventListener('DOMContentLoaded', function() {
  // *** ДОБАВЛЕНО: ИНИЦИАЛИЗАЦИЯ TELEGRAM И СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ***
  // Инициализируем Telegram WebApp
  initTelegramWebApp();
  
  // Синхронизируем данные с сервером (с небольшой задержкой)
  setTimeout(() => {
    syncUserData();
  }, 1000);

  // СУЩЕСТВУЮЩИЙ КОД ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ:
  
  // Clean inventory from unknown rewards on page load
  cleanInventory();
  
  // Initialize balance display
  updateBalanceDisplay();
  
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

      // Enable spin button when bet is selected
      const spinButton = document.getElementById('spinButton');
      if (spinButton) {
        spinButton.disabled = false;
      }
    });
  });

  // Spin button
  const spinButton = document.getElementById('spinButton');
  if (spinButton) {
    spinButton.addEventListener('click', spinWheel);
  }

  // Modal close
  const modalButton = document.getElementById('modalButton');
  if (modalButton) {
    modalButton.addEventListener('click', function() {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.classList.remove('show');
      }
    });
  }

  // Close modal by clicking outside
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  }

  // Inventory modal close
  const inventoryModal = document.getElementById('inventoryModal');
  if (inventoryModal) {
    inventoryModal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('show');
      }
    });
  }

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

// ==================== ДОБАВЛЕНО: ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ ====================
// Периодическая синхронизация данных каждые 30 секунд
setInterval(() => {
  if (API_CONFIG.telegramId) {
    syncUserData();
  }
}, 30000);
