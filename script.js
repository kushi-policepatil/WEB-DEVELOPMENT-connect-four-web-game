// Connect Four by Kushi — vanilla JS
// Board: 7 cols x 6 rows. Players: 1 (red) and 2 (green).

const COLS = 7;
const ROWS = 6;
const P1 = 1;
const P2 = 2;

const boardEl = document.getElementById('board');
const winnerBanner = document.getElementById('winnerBanner');
const turnBanner = document.getElementById('turnBanner');

const modeSelect = document.getElementById('modeSelect');
const firstMoveWrap = document.getElementById('firstMoveWrap');
const firstMove = document.getElementById('firstMove');
const difficultyWrap = document.getElementById('difficultyWrap');
const difficulty = document.getElementById('difficulty');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const resetBtn = document.getElementById('resetBtn');

const scoreP1 = document.getElementById('scoreP1');
const scoreP2 = document.getElementById('scoreP2');
const scoreTie = document.getElementById('scoreTie');
const p2Label = document.getElementById('p2Label');

let board, current, history, locked, gameOver;
let scores = JSON.parse(localStorage.getItem('c4-scores') || '{"p1":0,"p2":0,"tie":0}');

// --- Setup ---
function initBoard() {
  boardEl.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.col = c;
    col.setAttribute('role','columnheader');
    col.setAttribute('aria-colindex', c+1);
    col.addEventListener('click', () => playerMove(c));
    for (let r = 0; r < ROWS; r++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      const chip = document.createElement('div');
      chip.className = 'chip';
      cell.appendChild(chip);
      col.appendChild(cell);
    }
    boardEl.appendChild(col);
  }
}

function newGame(resetScores = false) {
  board = Array.from({length: COLS}, () => Array(ROWS).fill(0));
  current = P1;
  history = [];
  locked = false;
  gameOver = false;
  winnerBanner.hidden = true;
  render();
  if (resetScores) {
    scores = {p1:0, p2:0, tie:0};
    saveScores();
  }
  updateUITexts();
  maybeCpuAutoStart();
}

function updateUITexts() {
  scoreP1.textContent = scores.p1;
  scoreP2.textContent = scores.p2;
  scoreTie.textContent = scores.tie;
  const cpuMode = modeSelect.value === 'cpu';
  p2Label.textContent = cpuMode ? 'CPU' : 'Player 2';
  firstMoveWrap.hidden = !cpuMode;
  difficultyWrap.hidden = !cpuMode;
  setTurnBanner();
}

function setTurnBanner(text) {
  if (text) {
    turnBanner.textContent = text;
    return;
  }
  if (gameOver) return;
  if (modeSelect.value === 'cpu' && current === P2) {
    turnBanner.textContent = "CPU thinking… ⏳";
  } else {
    turnBanner.textContent = `Player ${current}'s turn ⏳`;
  }
}

function saveScores() {
  localStorage.setItem('c4-scores', JSON.stringify(scores));
}

// --- Mechanics ---
function drop(col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[col][r] === 0) {
      board[col][r] = player;
      history.push({col, row: r});
      return {col, row: r};
    }
  }
  return null;
}

function undo() {
  if (!history.length || locked) return;
  const last = history.pop();
  board[last.col][last.row] = 0;
  // PvCPU: undo two moves if possible (player + cpu) for convenience
  if (modeSelect.value === 'cpu' && history.length) {
    const last2 = history.pop();
    board[last2.col][last2.row] = 0;
  } else {
    current = current === P1 ? P2 : P1;
  }
  gameOver = false;
  winnerBanner.hidden = true;
  render(true);
  setTurnBanner();
}

function isValidMove(col) {
  return board[col][0] === 0;
}

function getValidMoves() {
  const arr = [];
  for (let c = 0; c < COLS; c++) if (isValidMove(c)) arr.push(c);
  return arr;
}

function checkWinner() {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const p = board[c][r];
      if (!p) continue;
      for (const [dc, dr] of dirs) {
        let count = 1, cells = [{c, r}];
        let cc = c + dc, rr = r + dr;
        while (cc>=0 && cc<COLS && rr>=0 && rr<ROWS && board[cc][rr]===p) {
          cells.push({c:cc, r:rr}); count++; cc+=dc; rr+=dr;
        }
        if (count >= 4) return {player: p, cells};
      }
    }
  }
  if (getValidMoves().length === 0) return {player: 0, cells: []}; // tie
  return null;
}

// --- Rendering ---
function render(skipAnim=false) {
  for (let c = 0; c < COLS; c++) {
    const colEl = boardEl.children[c];
    for (let r = 0; r < ROWS; r++) {
      const cell = colEl.children[r];
      const chip = cell.firstChild;
      cell.classList.remove('filled');
      chip.classList.remove('p1','p2');
      chip.style.transform = skipAnim ? 'translateY(0)' : '';
      if (board[c][r] === P1) { chip.classList.add('p1'); cell.classList.add('filled'); }
      if (board[c][r] === P2) { chip.classList.add('p2'); cell.classList.add('filled'); }
    }
  }
}

// --- Win visualization ---
function drawWinLine(cells) {
  // Remove existing
  const prev = document.querySelector('.win-line');
  if (prev) prev.remove();
  if (!cells.length) return;
  // first and last cells
  const a = cells[0], b = cells[cells.length-1];
  const rectA = boardEl.children[a.c].children[a.r].getBoundingClientRect();
  const rectB = boardEl.children[b.c].children[b.r].getBoundingClientRect();
  const rectBoard = boardEl.getBoundingClientRect();
  const x1 = rectA.left + rectA.width/2 - rectBoard.left;
  const y1 = rectA.top + rectA.height/2 - rectBoard.top;
  const x2 = rectB.left + rectB.width/2 - rectBoard.left;
  const y2 = rectB.top + rectB.height/2 - rectBoard.top;
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180/Math.PI;

  const line = document.createElement('div');
  line.className = 'win-line';
  line.style.left = `${x1}px`;
  line.style.top = `${y1-5}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;
  boardEl.appendChild(line);
}

// --- CPU AI ---
function evaluate(boardArr, player) {
  // Simple heuristic: center preference + potential alignments
  const opponent = player === P1 ? P2 : P1;
  let score = 0;

  // Center column preference
  const centerCol = Math.floor(COLS/2);
  for (let r=0; r<ROWS; r++) if (boardArr[centerCol][r] === player) score += 3;

  // Window scoring
  const windows = [];
  // horizontal windows
  for (let r=0; r<ROWS; r++) for (let c=0; c<=COLS-4; c++) windows.push([[c,r],[c+1,r],[c+2,r],[c+3,r]]);
  // vertical
  for (let c=0; c<COLS; c++) for (let r=0; r<=ROWS-4; r++) windows.push([[c,r],[c,r+1],[c,r+2],[c,r+3]]);
  // diagonals
  for (let c=0; c<=COLS-4; c++) for (let r=0; r<=ROWS-4; r++) windows.push([[c,r],[c+1,r+1],[c+2,r+2],[c+3,r+3]]);
  for (let c=0; c<=COLS-4; c++) for (let r=3; r<ROWS; r++) windows.push([[c,r],[c+1,r-1],[c+2,r-2],[c+3,r-3]]);

  for (const w of windows) {
    let pCount = 0, oCount = 0, empty = 0;
    for (const [c,r] of w) {
      if (boardArr[c][r] === player) pCount++;
      else if (boardArr[c][r] === opponent) oCount++;
      else empty++;
    }
    if (pCount === 4) score += 1000;
    else if (pCount === 3 && empty === 1) score += 10;
    else if (pCount === 2 && empty === 2) score += 4;
    if (oCount === 3 && empty === 1) score -= 8; // block
  }
  return score;
}

function cloneBoard(arr) { return arr.map(col => col.slice()); }

function makeMove(boardArr, col, player) {
  const b = cloneBoard(boardArr);
  for (let r=ROWS-1; r>=0; r--) if (b[col][r]===0) { b[col][r]=player; return {b, row:r}; }
  return {b, row:null};
}

function winnerOn(boardArr) {
  // returns P1/P2/0(tie)/null
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
    const p = boardArr[c][r]; if (!p) continue;
    for (const [dc,dr] of dirs) {
      let cnt=1, cc=c+dc, rr=r+dr;
      while (cc>=0&&cc<COLS&&rr>=0&&rr<ROWS&&boardArr[cc][rr]===p) {cnt++; cc+=dc; rr+=dr;}
      if (cnt>=4) return p;
    }
  }
  const valid = [];
  for (let c=0;c<COLS;c++) if (boardArr[c][0]===0) valid.push(c);
  return valid.length===0 ? 0 : null;
}

function minimax(boardArr, depth, maximizing, player, alpha=-Infinity, beta=Infinity) {
  const win = winnerOn(boardArr);
  if (win !== null) {
    if (win === 0) return {score: 0};
    return {score: win === player ? 100000 : -100000};
  }
  if (depth === 0) {
    return {score: evaluate(boardArr, player)};
  }
  const valid = [];
  for (let c=0;c<COLS;c++) if (boardArr[c][0]===0) valid.push(c);
  // Order: center-outwards for speed
  valid.sort((a,b)=>Math.abs(a-3)-Math.abs(b-3));
  if (maximizing) {
    let best = {score: -Infinity, col: valid[0]};
    for (const col of valid) {
      const {b} = makeMove(boardArr, col, player);
      const res = minimax(b, depth-1, false, player, alpha, beta);
      if (res.score > best.score) best = {score: res.score, col};
      alpha = Math.max(alpha, res.score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    const opp = player===P1?P2:P1;
    let best = {score: Infinity, col: valid[0]};
    for (const col of valid) {
      const {b} = makeMove(boardArr, col, opp);
      const res = minimax(b, depth-1, true, player, alpha, beta);
      if (res.score < best.score) best = {score: res.score, col};
      beta = Math.min(beta, res.score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function cpuChooseMove(level) {
  const valid = getValidMoves();
  if (level === 'easy') {
    return valid[Math.floor(Math.random()*valid.length)];
  }
  if (level === 'medium') {
    // Prefer winning/blocking moves, else random
    for (const c of valid) {
      const {b} = makeMove(board, c, P2);
      if (winnerOn(b) === P2) return c;
    }
    for (const c of valid) {
      const {b} = makeMove(board, c, P1);
      if (winnerOn(b) === P1) return c;
    }
    return valid[Math.floor(Math.random()*valid.length)];
  }
  // hard: minimax depth 5 (fast enough)
  const res = minimax(board, 5, true, P2);
  return res.col ?? valid[0];
}

// --- Interaction ---
function playerMove(col) {
  if (locked || gameOver) return;
  if (!isValidMove(col)) return;
  if (modeSelect.value === 'cpu' && current === P2) return; // wait for cpu

  const pos = drop(col, current);
  if (!pos) return;
  animateDrop(col, pos.row);
  afterMove();
}

function animateDrop(col, row) {
  const cell = boardEl.children[col].children[row];
  cell.classList.add('filled');
  const chip = cell.firstChild;
  chip.classList.add(current === P1 ? 'p1' : 'p2');
}

function afterMove() {
  const result = checkWinner();
  if (result) {
    endGame(result);
    return;
  }
  current = current === P1 ? P2 : P1;
  setTurnBanner();
  if (modeSelect.value === 'cpu' && current === P2) {
    locked = true;
    setTimeout(()=>{
      const move = cpuChooseMove(difficulty.value);
      const pos = drop(move, P2);
      if (pos) {
        const cell = boardEl.children[move].children[pos.row];
        cell.classList.add('filled');
        cell.firstChild.classList.add('p2');
      }
      const res = checkWinner();
      if (res) { endGame(res); locked=false; return; }
      current = P1;
      setTurnBanner();
      locked = false;
    }, 350);
  }
}

function endGame(res) {
  gameOver = true;
  if (res.player === 0) {
    winnerBanner.textContent = "It's a tie 🤝";
    scores.tie++; saveScores();
  } else {
    winnerBanner.textContent = `Player ${res.player} wins 🏆`;
    if (res.player === P1) scores.p1++; else scores.p2++;
    saveScores();
  }
  winnerBanner.hidden = false;
  updateUITexts();
  drawWinLine(res.cells);
}

// --- Events ---
modeSelect.addEventListener('change', updateUITexts);
firstMove.addEventListener('change', ()=>{
  newGame();
});
difficulty.addEventListener('change', ()=>{
  if (modeSelect.value === 'cpu') { newGame(); }
});
newGameBtn.addEventListener('click', ()=>newGame());
undoBtn.addEventListener('click', undo);
resetBtn.addEventListener('click', ()=>newGame(true));

function maybeCpuAutoStart() {
  if (modeSelect.value === 'cpu' && firstMove.value === 'cpu') {
    current = P2;
    setTurnBanner();
    setTimeout(()=>{
      const move = cpuChooseMove(difficulty.value);
      const pos = drop(move, P2);
      if (pos) {
        const cell = boardEl.children[move].children[pos.row];
        cell.classList.add('filled');
        cell.firstChild.classList.add('p2');
      }
      current = P1;
      setTurnBanner();
    }, 300);
  }
}

// Initialize
initBoard();
newGame();
