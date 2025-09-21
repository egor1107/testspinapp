/**
 * Lucky Wheel - Telegram Mini App
 * Игра "Рулетка удачи" с системой наград и фейковой лентой истории
 */

// ==================== КОНФИГУРАЦИЯ ====================

const WHEEL_CONFIG = [
  { label: "Звёзды", count: 30, color: '#06b6d4' },
  { label: "Подарок", count: 12, color: '#f59e0b' },
  { label: "NFT", count: 5, color: '#8b5cf6' },
  { label: "Secret NFT", count: 1, color: '#ef4444' }
];

// Конфигурация наград для инвентаря
const REWARD_CONFIG = {
  'Secret NFT': { emoji: '💎', rarity: 'legendary' },
  'NFT': { emoji: '🎨', rarity: 'epic' },
  'Звёзды': { emoji: '⭐', rarity: 'common' },
  'Подарок': { emoji: '🎁', rarity: 'rare' }
};

// Конфигурация для фейковой истории (только цветные квадраты)
const HISTORY_CONFIG = [
  { type: 'stars', weight: 45 }, // 45% шанс
  { type: 'gift', weight: 35 },  // 35% шанс
  { type: 'nft', weight: 20 }    // 20% шанс
  // Secret NFT не включаем, как запрошено
];

// ==================== СОСТОЯНИЕ ИГРЫ ====================

let gameState = {
  spins: parseInt(localStorage.getItem('wheelSpins') || '0'),
  wins: parseInt(localStorage.getItem('wheelWins') || '0'),
  winStreak: parseInt(localStorage.getItem('winStreak') || '0'),
  currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
  lastDaily: localStorage.getItem('lastDaily') || '0',
  soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
  achievements: JSON.parse(localStorage.getItem('achievements') || '[]'),
  inventory: JSON.parse(localStorage.getItem('wheelInventory') || '{}'),
  currentSection: 'wheel'
};

// ==================== АУДИО СИСТЕМА ====================

let audioContext = null;

/**
 * Инициализация аудио контекста
 */
function initAudio() {
  if (!gameState.soundEnabled || audioContext) return;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log('Audio not supported');
  }
}

/**
 * Воспроизведение звукового эффекта
 * @param {number} frequency - Частота звука
 * @param {number} duration - Длительность в секундах
 * @param {string} type - Тип осциллятора
 */
function playSound(frequency, duration, type = 'sine') {
  if (!audioContext || !gameState.soundEnabled) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// ==================== ФОНОВЫЕ ЧАСТИЦЫ ====================

/**
 * Инициализация анимированного фона
 */
function initBackgroundParticles() {
  const container = document.getElementById('bgParticles');
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

// ==================== СИСТЕМА НАГРАД ====================

/**
 * Добавление награды в инвентарь
 * @param {string} rewardName - Название награды
 */
function addRewardToInventory(rewardName) {
  if (!gameState.inventory[rewardName]) {
    gameState.inventory[rewardName] = 0;
  }
  gameState.inventory[rewardName]++;
  localStorage.setItem('wheelInventory', JSON.stringify(gameState.inventory));
  updateInventoryDisplay();
}

/**
 * Обновление отображения инвентаря
 */
function updateInventoryDisplay() {
  const inventoryGrid = document.getElementById('inventoryGrid');

  // Проверка на пустой инвентарь
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

  // Отображение наград
  let inventoryHTML = '';
  Object.entries(gameState.inventory).forEach(([rewardName, count]) => {
    if (count > 0) {
      const reward = REWARD_CONFIG[rewardName];
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

/**
 * Обновление статистики профиля
 */
function updateProfileStats() {
  document.getElementById('profileSpins').textContent = gameState.spins;
}

// ==================== НАВИГАЦИЯ ====================

/**
 * Переключение между секциями приложения
 * @param {string} section - Название секции
 */
function showSection(section) {
  // Скрыть все секции
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Показать выбранную секцию
  document.getElementById(section + 'Section').classList.add('active');
  document.querySelector(`[onclick="showSection('${section}')"]`).classList.add('active');

  gameState.currentSection = section;

  // Обновить данные профиля при переходе
  if (section === 'profile') {
    updateProfileStats();
    updateInventoryDisplay();
  }
}

// ==================== НАСТРОЙКИ ====================

/**
 * Переключение звука
 */
function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  localStorage.setItem('soundEnabled', gameState.soundEnabled);

  const slider = document.getElementById('soundSlider');
  if (gameState.soundEnabled) {
    slider.classList.add('active');
    initAudio();
    playSound(800, 0.1);
  } else {
    slider.classList.remove('active');
  }
}

/**
 * Показ модального окна пополнения баланса
 */
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

// ==================== СИСТЕМА КОЛЕСА ====================

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = Math.min(centerX, centerY) - 8;
const centerHoleRadius = 70; // Увеличенный радиус центра

// Создание секторов из конфигурации
const sectors = [];
WHEEL_CONFIG.forEach(item => {
  for (let i = 0; i < item.count; i++) {
    sectors.push({
      label: item.label,
      color: item.color
    });
  }
});

/**
 * Перемешивание массива (алгоритм Фишера-Йетса)
 * @param {Array} array - Массив для перемешивания
 * @returns {Array} Перемешанный массив
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Перемешиваем секторы
shuffleArray(sectors);

const sectorAngle = (2 * Math.PI) / sectors.length;
let currentRotation = 0;
let selectedChoice = null;
let isSpinning = false;

/**
 * Отрисовка колеса
 * @param {number} rotationAngle - Угол поворота в радианах
 */
function drawWheel(rotationAngle = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Внешняя тень
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(148, 163, 184, 0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Отрисовка секторов
  for (let i = 0; i < sectors.length; i++) {
    const startAngle = rotationAngle + i * sectorAngle;
    const endAngle = startAngle + sectorAngle;

    // Градиент для каждого сектора
    const gradient = ctx.createRadialGradient(
      centerX, centerY, centerHoleRadius, 
      centerX, centerY, radius
    );
    gradient.addColorStop(0, sectors[i].color);
    gradient.addColorStop(1, sectors[i].color + 'CC'); // Добавление прозрачности

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Граница сектора
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
  }

  // Центральное отверстие с градиентом
  const centerGradient = ctx.createRadialGradient(
    centerX, centerY, 0, 
    centerX, centerY, centerHoleRadius
  );
  centerGradient.addColorStop(0, '#f8fafc');
  centerGradient.addColorStop(1, '#e2e8f0');

  ctx.beginPath();
  ctx.fillStyle = centerGradient;
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Граница центрального отверстия
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerHoleRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.stroke();
}

/**
 * Запуск вращения колеса
 */
function spinWheel() {
  if (isSpinning) return;

  isSpinning = true;
  playSound(440, 0.2);

  const spinButton = document.getElementById('spinButton');
  const wheelContainer = document.getElementById('wheelContainer');
  const centerHub = document.getElementById('centerHub');
  const progressRing = document.getElementById('progressRing');
  const pointer = document.getElementById('pointer');

  // Обновление UI
  spinButton.disabled = true;
  spinButton.classList.add('spinning');
  spinButton.textContent = 'Крутится...';
  wheelContainer.classList.add('spinning');
  centerHub.classList.add('spinning');
  centerHub.querySelector('.status-text').textContent = 'Удача';
  centerHub.querySelector('.main-text').textContent = 'СПИН!';
  document.querySelectorAll('.bet-option').forEach(opt => opt.classList.add('disabled'));

  // Показать индикатор прогресса
  progressRing.classList.add('active');

  // Расчет вращения
  const minSpins = 5;
  const maxSpins = 8;
  const spins = Math.floor(Math.random() * (maxSpins - minSpins + 1)) + minSpins;
  const finalAngle = Math.random() * 360;
  const totalRotation = spins * 360 + finalAngle;

  const startRotation = currentRotation;
  const endRotation = startRotation + totalRotation;
  const duration = 4000; // 4 секунды
  const startTime = performance.now();

  /**
   * Анимация вращения
   * @param {number} currentTime - Текущее время
   */
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Функция плавности для естественного вращения
    const easeOut = 1 - Math.pow(1 - progress, 3);
    currentRotation = startRotation + (endRotation - startRotation) * easeOut;

    drawWheel((currentRotation * Math.PI) / 180);

    // Звуковые эффекты при вращении
    if (Math.floor(progress * 40) > Math.floor((progress - 0.01) * 40)) {
      playSound(200 + Math.random() * 100, 0.05);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      finishSpin();
    }
  }

  requestAnimationFrame(animate);
}

/**
 * Завершение вращения и определение результата
 */
function finishSpin() {
  // Расчет результата с исправленной математикой
  const normalizedRotation = ((currentRotation % 360) + 360) % 360;
  // Указатель находится сверху (270 градусов в координатах canvas)
  const pointerPosition = 270;
  const adjustedAngle = (pointerPosition - normalizedRotation + 360) % 360;
  const sectorAngle = 360 / sectors.length;
  const sectorIndex = Math.floor(adjustedAngle / sectorAngle) % sectors.length;
  const result = sectors[sectorIndex].label;

  console.log('Debug - Rotation:', normalizedRotation, 'Adjusted:', adjustedAngle, 'Sector:', sectorIndex, 'Result:', result);
  const isWin = result === selectedChoice;

  // Обновление состояния игры
  gameState.spins++;
  if (isWin) {
    gameState.wins++;
    gameState.currentStreak++;
    if (gameState.currentStreak > gameState.winStreak) {
      gameState.winStreak = gameState.currentStreak;
    }
    // Добавление награды в инвентарь
    addRewardToInventory(result);
  } else {
    gameState.currentStreak = 0;
  }

  // Сохранение статистики
  localStorage.setItem('wheelSpins', gameState.spins);
  localStorage.setItem('wheelWins', gameState.wins);
  localStorage.setItem('winStreak', gameState.winStreak);
  localStorage.setItem('currentStreak', gameState.currentStreak);

  // Звуковые эффекты
  if (isWin) {
    playSound(523.25, 0.3); // До
    if (result === 'Secret NFT') {
      // Специальный звук джекпота
      setTimeout(() => playSound(659.25, 0.3), 100); // Ми
      setTimeout(() => playSound(783.99, 0.3), 200); // Соль
    }
  } else {
    playSound(155.56, 0.5); // Ми-бемоль
  }

  // Визуальные эффекты
  const pointer = document.getElementById('pointer');
  pointer.classList.add('pulse');
  setTimeout(() => pointer.classList.remove('pulse'), 800);

  if (isWin) {
    createParticles();
    if (result === 'Secret NFT') {
      createConfetti();
    }
  }

  // Сброс UI
  setTimeout(() => {
    const spinButton = document.getElementById('spinButton');
    const wheelContainer = document.getElementById('wheelContainer');
    const centerHub = document.getElementById('centerHub');
    const progressRing = document.getElementById('progressRing');

    isSpinning = false;
    spinButton.disabled = false;
    spinButton.classList.remove('spinning');
    spinButton.textContent = 'Крутить колесо';
    wheelContainer.classList.remove('spinning');
    centerHub.classList.remove('spinning');
    centerHub.querySelector('.main-text').textContent = 'СТАРТ!';
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('disabled'));
    progressRing.classList.remove('active');

    showResult({ label: result }, isWin);
  }, 1000);
}

/**
 * Показ результата вращения
 * @param {Object} result - Объект результата
 * @param {boolean} isWin - Флаг выигрыша
 */
function showResult(result, isWin) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modalTitle');
  const modalResult = document.getElementById('modalResult');
  const message = document.getElementById('modalMessage');

  title.textContent = 'Результат спина';
  modalResult.textContent = result.label;
  modalResult.className = `modal-result ${isWin ? 'win' : 'lose'}`;

  if (isWin) {
    message.textContent = '🎉 Вы угадали! Отличная интуиция!';
  } else {
    message.textContent = 'В следующий раз обязательно повезёт!';
  }

  modal.classList.add('show');
}

// ==================== ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ====================

/**
 * Создание частиц при выигрыше
 */
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

    // Анимация частицы
    particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0.8 },
      { 
        transform: `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px) scale(0)`, 
        opacity: 0 
      }
    ], {
      duration: 1000 + Math.random() * 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }).onfinish = () => particle.remove();
  }
}

/**
 * Создание конфетти при джекпоте
 */
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
      { 
        transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, 
        opacity: 0 
      }
    ], {
      duration: 3000 + Math.random() * 2000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }).onfinish = () => confetti.remove();
  }
}

// ==================== СИСТЕМА ФЕЙКОВОЙ ИСТОРИИ ====================

/**
 * Получение случайного элемента истории (только цветные квадраты)
 * @returns {Object} Объект элемента истории
 */
function getRandomHistoryItem() {
  const totalWeight = HISTORY_CONFIG.reduce((sum, item) => sum + item.weight, 0);
  let randomNum = Math.random() * totalWeight;

  let selectedItem = HISTORY_CONFIG[0];
  for (const item of HISTORY_CONFIG) {
    if (randomNum <= item.weight) {
      selectedItem = item;
      break;
    }
    randomNum -= item.weight;
  }

  return {
    type: selectedItem.type
  };
}

/**
 * Создание HTML элемента истории (цветной квадрат)
 * @param {Object} item - Данные элемента
 * @returns {HTMLElement} DOM элемент
 */
function createHistoryItem(item) {
  const historyItem = document.createElement('div');
  historyItem.className = `history-item ${item.type}`;
  return historyItem;
}

/**
 * Инициализация ленты истории
 */
function initHistoryFeed() {
  const historyTrack = document.getElementById('historyTrack');

  // Генерация начальных элементов для заполнения ленты
  for (let i = 0; i < 15; i++) {
    const item = getRandomHistoryItem();
    const historyElement = createHistoryItem(item);
    historyTrack.appendChild(historyElement);
  }

  // Непрерывное добавление новых элементов
  setInterval(() => {
    const item = getRandomHistoryItem();
    const historyElement = createHistoryItem(item);
    historyTrack.appendChild(historyElement);

    // Удаление старых элементов для предотвращения накопления в памяти
    if (historyTrack.children.length > 20) {
      historyTrack.removeChild(historyTrack.firstChild);
    }
  }, 3000 + Math.random() * 2000); // Каждые 3-5 секунд
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация колеса
  drawWheel();
  initBackgroundParticles();
  initAudio();

  // Выбор ставки
  document.querySelectorAll('.bet-option').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.bet-option').forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      selectedChoice = this.dataset.choice;
      playSound(500, 0.1);
      
      // Активировать кнопку спина при выборе ставки
      document.getElementById('spinButton').disabled = false;
    });
  });

  // Кнопка спина с проверкой выбранной ставки
  document.getElementById('spinButton').addEventListener('click', function() {
    if (!selectedChoice) {
      const modal = document.getElementById('modal');
      document.getElementById('modalTitle').textContent = 'Ошибка';
      document.getElementById('modalResult').textContent = '⚠️';
      document.getElementById('modalResult').className = 'modal-result';
      document.getElementById('modalMessage').textContent = 'Сначала выберите ставку!';
      modal.classList.add('show');
      return;
    }
    spinWheel();
  });

  // Закрытие модального окна
  document.getElementById('modalButton').addEventListener('click', function() {
    document.getElementById('modal').classList.remove('show');

    // Сброс центрального хаба
    const centerHub = document.getElementById('centerHub');
    centerHub.querySelector('.status-text').textContent = 'Удача';
    centerHub.querySelector('.main-text').textContent = 'СТАРТ!';
  });

  // Закрытие модального окна кликом вне его
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('show');
    }
  });

  // Инициализация состояния ползунка звука
  const soundSlider = document.getElementById('soundSlider');
  if (gameState.soundEnabled) {
    soundSlider.classList.add('active');
  } else {
    soundSlider.classList.remove('active');
  }

  // Инициализация данных профиля
  updateProfileStats();
  updateInventoryDisplay();

  // Инициализация ленты истории с задержкой
  setTimeout(initHistoryFeed, 1000);
});

// ==================== МОБИЛЬНАЯ ОПТИМИЗАЦИЯ ====================

// Предотвращение обновления страницы при pull-to-refresh
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

// ==================== ЭКСПОРТ ФУНКЦИЙ (для отладки) ====================

// Глобальные функции для доступа из HTML
window.showSection = showSection;
window.toggleSound = toggleSound;
window.showBalanceModal = showBalanceModal;
