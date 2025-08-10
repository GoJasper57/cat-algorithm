// === Maze Search Visualizer (DFS / BFS) ===
// Required files in same folder: heart.png, wall.png, cat.png

let cols, rows;
let w = 40;                    // Cell size 40x40
let grid = [];
let stack = [];                // DFS stack
let queue = [];                // BFS queue
let parents = new Map();       // BFS parents (for search, not final drawing)
let current;
let startCell;
let target;
let found = false;
let searchMode = "DFS";        // "DFS" or "BFS"

let heartImg, wallImg, catImg;

function preload() {
  heartImg = loadImage("heart.png"); // target
  wallImg  = loadImage("wall.png");  // obstacle
  catImg   = loadImage("cat.png");   // search cursor (current cell)
}

function setup() {
  createCanvas(1000, 1000);   // 25x25 cells with w=40
  cols = floor(width / w);
  rows = floor(height / w);

  // Build grid
  grid = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      grid.push(new Cell(i, j));
    }
  }

  startCell = grid[0];
  current = startCell;

  // Random target not equal to start
  do {
    target = grid[floor(random(grid.length))];
  } while (target === startCell);
  target.target = true;

  createUI();
  initSearch(searchMode, /*fromCurrent=*/false); // first run from start
  frameRate(20);
}

function draw() {
  background(51);

  // Draw all cells
  for (let i = 0; i < grid.length; i++) grid[i].show();

  // Start & current highlight (cat)
  startCell.showStart();
  if (!found) current.highlight();

  // Advance one search step
  if (!found) {
    if (searchMode === "DFS") stepDFS();
    else stepBFS();
  }
}

// ========== UI ==========
function createUI() {
  const btnDFS = createButton("DFS");
  btnDFS.mousePressed(() => switchMode("DFS"));
  btnDFS.style("margin-right", "8px");

  const btnBFS = createButton("BFS");
  btnBFS.mousePressed(() => switchMode("BFS"));
  btnBFS.style("margin-right", "8px");

  const btnReset = createButton("Reset");
  btnReset.mousePressed(resetAllFootprintsAndRestart);

  [btnDFS, btnBFS, btnReset].forEach(btn => {
    btn.style("padding", "8px 14px");
    btn.style("font-size", "14px");
    btn.style("border-radius", "12px");
    btn.style("border", "1px solid #777");
    btn.style("background", "#f4f4f4");
    btn.style("cursor", "pointer");
  });
}

function switchMode(mode) {
  searchMode = mode;
  // Switch algorithm: continue from current, keep old footprints visible
  initSearch(mode, /*fromCurrent=*/true);
}

// Reset: clear ALL footprints (including persistent), keep walls & target, restart from START
function resetAllFootprintsAndRestart() {
  for (let c of grid) {
    c.visited = c.backtrack = c.path = false;
    c.visMark = c.backtrackMark = c.pathMark = false;
  }
  found = false;
  current = startCell;
  initSearch(searchMode, /*fromCurrent=*/false);
}

function initSearch(mode, fromCurrent) {
  // 1) Persist old logical footprints into visual marks (so they stay on screen)
  for (let c of grid) {
    if (c.visited)   c.visMark = true;
    if (c.backtrack) c.backtrackMark = true;
    if (c.path)      c.pathMark = true;

    // Clear per-run logical flags
    c.visited = false;
    c.backtrack = false;
    c.path = false;
  }

  // 2) Reset per-run structures
  stack = [];
  queue = [];
  parents.clear();
  found = false;

  // 3) Start node
  if (!fromCurrent) current = startCell; // on first run or reset, start from startCell
  current.visited = true;

  if (mode === "DFS") {
    // DFS: stack is managed in stepDFS
  } else {
    // BFS: enqueue current and set parent
    queue.push(current);
    parents.set(keyOf(current), null);
  }
}

// ========== Search Steps ==========
function stepDFS() {
  let next = current.checkNeighbors();
  if (next) {
    next.visited = true;
    stack.push(current);
    current = next;
  } else if (stack.length > 0) {
    current.backtrack = true;
    current = stack.pop();
  }

  if (current === target) {
    found = true;
    showFinalPathFromStart();   // always highlight path from START → TARGET
    console.log("Target found (DFS)!");
  }
}

function stepBFS() {
  if (queue.length === 0) return;

  current = queue.shift();

  if (current === target) {
    found = true;
    showFinalPathFromStart();   // always highlight path from START → TARGET
    console.log("Target found (BFS)!");
    return;
  }

  const neighbors = current.orthNeighbors();
  for (let nb of neighbors) {
    if (!nb.visited && !nb.obstacle) {
      nb.visited = true;
      parents.set(keyOf(nb), current);
      queue.push(nb);
    }
  }
}

// === Run a fresh BFS purely to draw the final path from START to TARGET ===
function showFinalPathFromStart() {
  const q = [];
  const p = new Map();
  q.push(startCell);
  p.set(keyOf(startCell), null);

  let reached = false;
  while (q.length > 0) {
    const node = q.shift();
    if (node === target) { reached = true; break; }
    for (const nb of node.orthNeighbors()) {
      if (!nb.obstacle && !p.has(keyOf(nb))) {
        p.set(keyOf(nb), node);
        q.push(nb);
      }
    }
  }

  if (reached) {
    // Mark final path both for this run and persistently
    let node = target;
    while (node) {
      node.path = true;      // solid white this run
      node.pathMark = true;  // persistent for future runs
      node = p.get(keyOf(node));
    }
  } else {
    console.log("No path from start to target (blocked by walls).");
  }
}

// ========== Helpers ==========
function index(i, j) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return i + j * cols;
}
function keyOf(c) { return c.i + "," + c.j; }

// Click to toggle wall tiles; keeps footprints, restarts from current
function mousePressed() {
  const i = floor(mouseX / w);
  const j = floor(mouseY / w);
  const idx = index(i, j);
  if (idx === -1) return;

  const clicked = grid[idx];

  // Prevent toggling start/target/current
  if (clicked === startCell || clicked === target || clicked === current) return;

  clicked.obstacle = !clicked.obstacle;

  // Restart search from current with footprints preserved
  initSearch(searchMode, /*fromCurrent=*/true);
}

// ========== Cell ==========
class Cell {
  constructor(i, j) {
    this.i = i;
    this.j = j;

    // per-run logical flags
    this.visited = false;
    this.backtrack = false;
    this.path = false;

    // persistent visual marks (survive across runs)
    this.visMark = false;
    this.backtrackMark = false;
    this.pathMark = false;

    this.obstacle = false;
    this.target = false;
  }

  orthNeighbors() {
    const n = [];
    const top    = grid[index(this.i, this.j - 1)];
    const right  = grid[index(this.i + 1, this.j)];
    const bottom = grid[index(this.i, this.j + 1)];
    const left   = grid[index(this.i - 1, this.j)];
    if (top) n.push(top);
    if (right) n.push(right);
    if (bottom) n.push(bottom);
    if (left) n.push(left);
    return n;
  }

  checkNeighbors() {
    const candidates = this.orthNeighbors().filter(nb => !nb.visited && !nb.obstacle);
    if (candidates.length === 0) return undefined;
    return random(candidates);
  }

  // visuals
  highlight() {
    const x = this.i * w, y = this.j * w;
    noStroke();
    // draw cat as the current search cursor
    image(catImg, x + w*0.05, y + w*0.05, w*0.9, w*0.9); // 带一点内边距更可爱
  }

  showStart() {
    const x = this.i * w, y = this.j * w;
    noStroke();
    fill(0, 200, 0); // green start
    rect(x, y, w, w);
  }

  show() {
    const x = this.i * w;
    const y = this.j * w;

    // base cell
    stroke(70);
    noFill();
    rect(x, y, w, w);

    // walls
    if (this.obstacle) {
      noStroke();
      image(wallImg, x, y, w, w);
      return; // wall covers others
    }

    // persistent marks (lighter)
    if (this.visMark) {
      noStroke();
      fill(0, 128, 128, 160);
      rect(x, y, w, w);
    }
    if (this.backtrackMark) {
      noStroke();
      fill(255, 255, 255, 90);
      rect(x, y, w, w);
    }
    if (this.pathMark) {
      noStroke();
      fill(255, 255, 255, 180);
      rect(x, y, w, w);
    }

    // current-run marks (stronger)
    if (this.visited) {
      noStroke();
      fill(0, 128, 128);
      rect(x, y, w, w);
    }
    if (this.backtrack) {
      noStroke();
      fill(255, 255, 255, 120);
      rect(x, y, w, w);
    }
    if (this.path) {
      noStroke();
      fill(255, 255, 255, 230);
      rect(x, y, w, w);
    }

    // target as heart
    if (this.target) {
      noStroke();
      image(heartImg, x, y, w, w);
      // 留白版：image(heartImg, x+w*0.1, y+w*0.1, w*0.8, w*0.8);
    }
  }
}
