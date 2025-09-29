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

// API Configuration
const API_BASE_URL = 'https://tgame-manager.preview.emergentagent.com/api';

// Initialize Telegram WebApp
let tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// User data
let currentUser = null;
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

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Get user data from Telegram
function getTelegramUser() {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    return {
      telegram_id: String(user.id),
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null
    };
  }
  
  // Fallback for testing
  return {
    telegram_id: 'test_' + Math.random().toString(36).substr(2, 9),
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User'
  };
}

// Initialize or get user
async function initializeUser() {
  try {
    showLoadingModal(true);
    
    const telegramUser = getTelegramUser();
    console.log('Telegram user:', telegramUser);
    
    // Try to get existing user or create new one
    try {
      currentUser = await apiCall(`/users/${telegramUser.telegram_id}`);
    } catch (error) {
      if (error.message.includes('404')) {
        // Create new user
        currentUser = await apiCall('/users', 'POST', telegramUser);
      } else {
        throw error;
      }
    }
    
    console.log('Current user:', currentUser);
    updateBalanceDisplay();
    updateProfileStats();
    updateInventoryDisplay();
    
    // Load spin history
    await loadSpinHistory();
    
    showLoadingModal(false);
    return true;
  } catch (error) {
    console.error('Failed to initialize user:', error);
    showError('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
    showLoadingModal(false);
    return false;
  }
}

// Load spin history
async function loadSpinHistory() {
  try {
    const history = await apiCall(`/spin-history/${currentUser.telegram_id}?limit=20`);
    spinHistory = history.map(spin => ({
      prize: spin.result,
      isWin: spin.is_win
    }));
    updateSpinHistoryDisplay();
  } catch (error) {
    console.error('Failed to load spin history:', error);
  }
}

// Update balance display
function updateBalanceDisplay() {
  if (!currentUser) return;
  
  const balanceElements = ['balanceText', 'balanceTextShop', 'balanceTextProfile'];
  balanceElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = `${currentUser.balance.toLocaleString()} <img src="images\\Star Fill.svg" alt="звезды" class="star-icon">`;
    }
  });
}

// Update profile stats
function updateProfileStats() {
  if (!currentUser) return;
  
  const profileSpinsEl = document.getElementById('profileSpins');
  if (profileSpinsEl) {
    profileSpinsEl.textContent = currentUser.total_spins;
  }
}

// Update inventory display
function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById('inventoryGrid');
  if (!inventoryGrid || !currentUser) return;

  // Check if inventory is empty
  if (!currentUser.inventory || currentUser.inventory.length === 0) {
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
  currentUser.inventory.forEach((item) => {
    if (item.type === '2x' || item.type === '3x') {
      // For 2x/3x items, show star icon with claim button
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${item.rarity}"></div>
          <div class="reward-stars-large">${item.amount} <img src="images/Star Fill.svg" alt="звезды" class="star-icon"></div>
          <button class="claim-btn" onclick="openInventoryModal('${item.id}')">Забрать</button>
        </div>
      `;
    } else if ((item.type === 'NFT' || item.type === 'Secret NFT') && item.gif_url) {
      // For NFT items with gif URL, show the gif and gift name
      const giftName = getGiftNameFromPath(item.gif_url);
      inventoryHTML += `
        <div class="reward-card">
          <div class="reward-rarity rarity-${item.rarity}"></div>
          <div class="reward-gif-container">
            <img src="${item.gif_url}" alt="${giftName}" class="reward-gif" />
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

// Get gift name from path
function getGiftNameFromPath(gifPath) {
  const fileName = gifPath.split('/').pop();
  const nameWithoutExtension = fileName.replace('.gif', '');
  return nameWithoutExtension;
}

// Function to open inventory modal
function openInventoryModal(itemId) {
  const item = currentUser.inventory.find(i => i.id === itemId);
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

// Function to claim reward
async function claimReward(itemId) {
  try {
    const response = await apiCall(`/claim-reward/${currentUser.telegram_id}?item_id=${itemId}`, 'POST');
    
    // Update user balance
    currentUser.balance = response.new_balance;
    
    // Remove item from inventory
    currentUser.inventory = currentUser.inventory.filter(item => item.id !== itemId);
    
    // Update displays
    updateBalanceDisplay();
    updateInventoryDisplay();
    
    // Show success message
    showClaimSuccessModal(response.claimed_amount);
    
  } catch (error) {
    console.error('Failed to claim reward:', error);
    showError('Не удалось забрать награду');
  }
}

// Show claim success modal
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

// Update spin history display
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

// Show loading modal
function showLoadingModal(show) {
  const modal = document.getElementById('loadingModal');
  if (modal) {
    if (show) {
      modal.classList.add('show');
    } else {
      modal.classList.remove('show');
    }
  }
}

// Show error message
function showError(message) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const result = document.getElementById('modalResult');
  const modalMessage = document.getElementById('modalMessage');
  
  if (!modal || !title || !result || !modalMessage) return;
  
  title.textContent = 'Ошибка';
  result.textContent = '⚠️';
  result.className = 'modal-result';
  modalMessage.textContent = message;
  modal.classList.add('show');
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

// Wheel system
const canvas = document.getElementById('wheel');
if (!canvas) {
  console.error('Canvas element not found!');
}

const ctx = canvas ? canvas.getContext('2d') : null;
const centerX = canvas ? canvas.width / 2 : 0;
const centerY = canvas ? canvas.height / 2 : 0;
const radius = canvas ? Math.min(centerX, centerY) - 8 : 0;
const centerHoleRadius = 70;

// Wheel configuration
const WHEEL_CONFIG = [
  {label: "2x", count: 30, color: '#06b6d4'},
  {label: "3x", count: 12, color: '#f59e0b'},
  {label: "NFT", count: 5, color: '#8b5cf6'},
  {label: "Secret NFT", count: 1, color: '#ef4444'}
];

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

// Spin wheel function
async function spinWheel() {
  if (isSpinning || !currentUser) return;

  // Check if bet is selected
  if (!selectedChoice) {
    showError('Сначала выберите ставку!');
    return;
  }

  try {
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

    // Make API call to spin
    const spinResult = await apiCall('/spin', 'POST', {
      telegram_id: currentUser.telegram_id,
      bet_choice: selectedChoice,
      username: currentUser.username,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name
    });

    // Update current user data
    currentUser.balance = spinResult.new_balance;
    currentUser.total_spins = (currentUser.total_spins || 0) + 1;
    if (spinResult.is_win) {
      currentUser.total_wins = (currentUser.total_wins || 0) + 1;
    }
    
    // Add inventory item if won
    if (spinResult.inventory_item) {
      if (!currentUser.inventory) currentUser.inventory = [];
      currentUser.inventory.push(spinResult.inventory_item);
    }

    // Add to spin history
    spinHistory.unshift({
      prize: spinResult.result,
      isWin: spinResult.is_win
    });
    if (spinHistory.length > 20) {
      spinHistory.pop();
    }

    // Calculate spin animation
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
        finishSpin(spinResult);
      }
    }

    requestAnimationFrame(animate);

  } catch (error) {
    console.error('Spin failed:', error);
    showError('Ошибка при запуске спина. Попробуйте еще раз.');
    
    // Reset UI
    isSpinning = false;
    const spinButton = document.getElementById('spinButton');
    if (spinButton) {
      spinButton.disabled = false;
      spinButton.classList.remove('spinning');
      spinButton.innerHTML = 'Spin';
    }
  }
}

function finishSpin(spinResult) {
  // Visual effects
  const pointer = document.getElementById('pointer');
  if (pointer) {
    pointer.classList.add('pulse');
    setTimeout(() => pointer.classList.remove('pulse'), 800);
  }

  if (spinResult.is_win) {
    createParticles();
    if (spinResult.result === 'Secret NFT') {
      createConfetti();
    }
  }

  // Update displays
  updateBalanceDisplay();
  updateProfileStats();
  updateInventoryDisplay();
  updateSpinHistoryDisplay();

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
      spinButton.innerHTML = 'Spin';
    }
    if (wheelContainer) wheelContainer.classList.remove('spinning');
    if (centerHub) centerHub.classList.remove('spinning');
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('disabled'));
    if (progressRing) progressRing.classList.remove('active');

    // Show result
    showResult(spinResult);
  }, 1000);
}

function showResult(spinResult) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const modalResult = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');

  if (!modal || !title || !modalResult || !message) {
    console.error('Modal elements not found!');
    return;
  }

  title.textContent = 'Результат спина';
  modalResult.className = `modal-result ${spinResult.is_win ? 'win' : 'lose'}`;

  // Handle display based on prize type
  if (spinResult.result === 'NFT' || spinResult.result === 'Secret NFT') {
    // Show gif for NFT
    modalResult.innerHTML = '';

    const gifContainer = document.createElement('div');
    gifContainer.style.textAlign = 'center';
    gifContainer.style.width = '100%';

    if (spinResult.gif_url) {
      const gifImage = document.createElement('img');
      gifImage.src = spinResult.gif_url;
      gifImage.style.maxWidth = '200px';
      gifImage.style.maxHeight = '200px';
      gifImage.style.borderRadius = '12px';
      gifImage.style.objectFit = 'contain';
      gifContainer.appendChild(gifImage);
    }

    modalResult.appendChild(gifContainer);

    if (spinResult.is_win) {
      message.textContent = spinResult.result === 'Secret NFT' ? '🎉 Вы угадали Secret NFT! Невероятная удача!' : '🎉 Вы угадали NFT! Отличная интуиция!';
    } else {
      message.textContent = 'В следующий раз обязательно повезёт!';
    }
  } else if ((spinResult.result === '2x' || spinResult.result === '3x') && spinResult.is_win) {
    // Show 2x/3x win with arrow and reward amount
    modalResult.innerHTML = '';
    
    const winDisplay = document.createElement('div');
    winDisplay.className = 'win-reward-display';
    
    // Prize text (2x or 3x)
    const prizeText = document.createElement('span');
    prizeText.textContent = spinResult.result;
    winDisplay.appendChild(prizeText);
    
    // Arrow icon
    const arrowIcon = document.createElement('img');
    arrowIcon.src = 'images/radix-icons_arrow-right.svg';
    arrowIcon.className = 'arrow-icon';
    arrowIcon.alt = 'arrow';
    winDisplay.appendChild(arrowIcon);
    
    // Reward amount
    const rewardAmount = document.createElement('span');
    rewardAmount.textContent = spinResult.reward_amount;
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
    // For all other cases
    modalResult.textContent = spinResult.result;

    if (spinResult.is_win) {
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

// Event listeners
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize background particles
  initBackgroundParticles();
  
  // Initialize wheel
  drawWheel();
  
  // Initialize user and load data
  const initialized = await initializeUser();
  
  if (!initialized) {
    return; // Stop if initialization failed
  }

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
