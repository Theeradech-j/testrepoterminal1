const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BORDER = 3;

// Pastel palette per piece type
const COLORS = {
  I: { fill: '#aee6e6', stroke: '#6ec6c6', inner: '#d4f4f4' },
  O: { fill: '#f9f3a9', stroke: '#d4c860', inner: '#fefce0' },
  T: { fill: '#d4a9f9', stroke: '#a060d4', inner: '#ecdeff' },
  S: { fill: '#a9f9b4', stroke: '#60c870', inner: '#d4feda' },
  Z: { fill: '#f9a9b4', stroke: '#d46080', inner: '#ffd8e0' },
  J: { fill: '#a9c4f9', stroke: '#6090d4', inner: '#d4e4ff' },
  L: { fill: '#f9cfa9', stroke: '#d4a060', inner: '#ffe8d4' },
  G: { fill: '#3a2060', stroke: '#2a1040', inner: '#4a3080' }, // ghost
};

const PIECES = {
  I: { shape: [[1,1,1,1]], color: 'I' },
  O: { shape: [[1,1],[1,1]], color: 'O' },
  T: { shape: [[0,1,0],[1,1,1]], color: 'T' },
  S: { shape: [[0,1,1],[1,1,0]], color: 'S' },
  Z: { shape: [[1,1,0],[0,1,1]], color: 'Z' },
  J: { shape: [[1,0,0],[1,1,1]], color: 'J' },
  L: { shape: [[0,0,1],[1,1,1]], color: 'L' },
};

const PIECE_KEYS = Object.keys(PIECES);

const SCORE_TABLE = [0, 100, 300, 500, 800];
const BASE_SPEED = 800;

// ── Canvas setup ───────────────────────────────────────────
const boardCanvas = document.getElementById('board');
const ctx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nctx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

// ── State ──────────────────────────────────────────────────
let board, current, next, score, level, lines, paused, gameOver, dropTimer, dropInterval, animId;

function newBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  const p = PIECES[key];
  return {
    shape: p.shape.map(r => [...r]),
    color: p.color,
    x: Math.floor((COLS - p.shape[0].length) / 2),
    y: 0,
  };
}

function rotate(shape) {
  const rows = shape.length, cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  );
}

function collides(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c, ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lock() {
  current.shape.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v && current.y + r >= 0) {
        board[current.y + r][current.x + c] = current.color;
      }
    });
  });
  clearLines();
  current = next;
  next = randomPiece();
  if (collides(current.shape, current.x, current.y)) {
    endGame();
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += SCORE_TABLE[cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, BASE_SPEED - (level - 1) * 70);
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collides(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

// ── Drawing ────────────────────────────────────────────────
function drawBlock(context, x, y, colorKey) {
  const c = COLORS[colorKey];
  const px = x * BLOCK, py = y * BLOCK;

  // outer fill
  context.fillStyle = c.fill;
  context.fillRect(px, py, BLOCK, BLOCK);

  // inner highlight square
  context.fillStyle = c.inner;
  context.fillRect(px + BORDER * 2, py + BORDER * 2, BLOCK - BORDER * 4, BLOCK - BORDER * 4);

  // border
  context.strokeStyle = c.stroke;
  context.lineWidth = BORDER;
  context.strokeRect(px + BORDER / 2, py + BORDER / 2, BLOCK - BORDER, BLOCK - BORDER);
}

function drawBoard() {
  ctx.fillStyle = '#0d1a2e';
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  // grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
    }
  }

  // locked blocks
  board.forEach((row, r) => {
    row.forEach((color, c) => {
      if (color) drawBlock(ctx, c, r, color);
    });
  });

  // ghost
  const gy = ghostY();
  if (gy !== current.y) {
    current.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) drawBlock(ctx, current.x + c, gy + r, 'G');
      });
    });
  }

  // current piece
  current.shape.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v) drawBlock(ctx, current.x + c, current.y + r, current.color);
    });
  });
}

function drawNext() {
  nctx.fillStyle = '#0d1a2e';
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const offX = Math.floor((4 - next.shape[0].length) / 2);
  const offY = Math.floor((4 - next.shape.length) / 2);
  next.shape.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v) {
        const c2 = COLORS[next.color];
        const px = (offX + c) * BLOCK, py = (offY + r) * BLOCK;
        nctx.fillStyle = c2.fill;
        nctx.fillRect(px, py, BLOCK, BLOCK);
        nctx.fillStyle = c2.inner;
        nctx.fillRect(px + BORDER * 2, py + BORDER * 2, BLOCK - BORDER * 4, BLOCK - BORDER * 4);
        nctx.strokeStyle = c2.stroke;
        nctx.lineWidth = BORDER;
        nctx.strokeRect(px + BORDER / 2, py + BORDER / 2, BLOCK - BORDER, BLOCK - BORDER);
      }
    });
  });
}

// ── Game loop ──────────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  if (!paused && !gameOver) {
    const dt = ts - lastTime;
    dropTimer += dt;
    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      if (!collides(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lock();
      }
    }
    drawBoard();
    drawNext();
  }
  lastTime = ts;
  animId = requestAnimationFrame(loop);
}

// ── Controls ───────────────────────────────────────────────
let lastDownTime = 0;
const DOUBLE_TAP_MS = 400;

document.addEventListener('keydown', e => {
  if (gameOver || paused) {
    if (e.key === 'p' || e.key === 'P') togglePause();
    return;
  }
  switch (e.key) {
    case 'ArrowLeft':
      if (!collides(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collides(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown': {
      const now = performance.now();
      if (now - lastDownTime < DOUBLE_TAP_MS) {
        // double tap → hard drop
        e.preventDefault();
        while (!collides(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 2;
        }
        scoreEl.textContent = score;
        lock();
        lastDownTime = 0;
      } else {
        // single tap → soft drop
        if (!collides(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
          scoreEl.textContent = score;
        }
        lastDownTime = now;
      }
      break;
    }
    case 'ArrowUp': {
      const rotated = rotate(current.shape);
      if (!collides(rotated, current.x, current.y)) current.shape = rotated;
      break;
    }
    case 'p':
    case 'P':
      togglePause();
      break;
  }
});

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    overlayText.textContent = 'PAUSED';
    overlayBtn.textContent = 'RESUME';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    lastTime = performance.now();
  }
}

// ── Start / End ────────────────────────────────────────────
function startGame() {
  board = newBoard();
  score = 0; level = 1; lines = 0;
  dropTimer = 0; dropInterval = BASE_SPEED;
  paused = false; gameOver = false;
  scoreEl.textContent = 0;
  levelEl.textContent = 1;
  linesEl.textContent = 0;
  current = randomPiece();
  next = randomPiece();
  overlay.classList.add('hidden');
  lastTime = performance.now();
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function endGame() {
  gameOver = true;
  overlayText.innerHTML = 'GAME OVER\n\nSCORE: ' + score;
  overlayBtn.textContent = 'PLAY AGAIN';
  overlay.classList.remove('hidden');
}

overlayBtn.addEventListener('click', startGame);

// Show start screen on load
overlayText.innerHTML = 'PASTEL<br>TETRIS';
overlayBtn.textContent = 'START';
overlay.classList.remove('hidden');
