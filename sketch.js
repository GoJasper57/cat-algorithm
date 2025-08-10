// === Cat Maze Search (DFS / BFS) — Centered UI + Canvas ===
// Required files in same folder: heart.png, wall.png, cat.png

let cols, rows;
let w = 40;                    // 单元格大小 40x40
let grid = [];
let stack = [];                // DFS 栈
let queue = [];                // BFS 队列
let parents = new Map();       // BFS 父指针（搜索用）
let current;
let startCell;
let target;
let found = false;
let searchMode = "DFS";        // "DFS" or "BFS"

let heartImg, wallImg, catImg;

let mainContainer;             // 包裹按钮 + 画布的容器（用于整体居中）
let btnContainer;              // 按钮容器（在画布上方一行）

function preload() {
  heartImg = loadImage("heart.png"); // 目标：红心
  wallImg  = loadImage("wall.png");  // 障碍：墙砖
  catImg   = loadImage("cat.png");   // 光标：猫
}

function setup() {
  // —— 外层容器：按钮在上，画布在下，整体居中 —— //
  mainContainer = createDiv();
  mainContainer.style("display", "flex");
  mainContainer.style("flex-direction", "column");
  mainContainer.style("align-items", "center");
  mainContainer.style("gap", "10px");        // 按钮和画布之间间距
  mainContainer.style("margin", "20px auto"); // 页面顶部和整体居中

  // —— 按钮容器（在画布上方） —— //
  btnContainer = createDiv().parent(mainContainer);
  btnContainer.style("display", "flex");
  btnContainer.style("justify-content", "center");
  btnContainer.style("gap", "12px");

  // —— 画布 —— //
  // 采用 1000x1000，配合 w=40 → 25x25 的整齐网格
  const cnv = createCanvas(900, 900);
  cnv.parent(mainContainer); // 画布置于按钮容器下方，并保持整体居中

  cols = floor(width / w);
  rows = floor(height / w);

  // 构建网格
  grid = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      grid.push(new Cell(i, j));
    }
  }

  // 起点与目标
  startCell = grid[0];
  current = startCell;

  do {
    target = grid[floor(random(grid.length))];
  } while (target === startCell);
  target.target = true;

  // 创建 UI 按钮
  createUI();

  // 初始化搜索（首次从起点）
  initSearch(searchMode, /*fromCurrent=*/false);

  frameRate(20);
}

function draw() {
  background(51);

  // 绘制格子
  for (let i = 0; i < grid.length; i++) grid[i].show();

  // 起点与“当前格”
  startCell.showStart();
  if (!found) current.highlight();  // 猫光标

  // 每帧推进一步
  if (!found) {
    if (searchMode === "DFS") stepDFS();
    else stepBFS();
  }
}

// ========== UI ==========
function createUI() {
  const btnDFS = createButton("DFS").parent(btnContainer);
  btnDFS.mousePressed(() => switchMode("DFS"));

  const btnBFS = createButton("BFS").parent(btnContainer);
  btnBFS.mousePressed(() => switchMode("BFS"));

  const btnReset = createButton("Reset").parent(btnContainer);
  btnReset.mousePressed(resetAllFootprintsAndRestart);

  // 三个按钮等宽、两倍大、圆角 8
  [btnDFS, btnBFS, btnReset].forEach(btn => {
    btn.size(160, 56);                // 等宽等高（比之前更显著的两倍感）
    btn.style("font-size", "20px");   // 字体变大
    btn.style("border-radius", "8px");
    btn.style("border", "1px solid #777");
    btn.style("background", "#f4f4f4");
    btn.style("cursor", "pointer");
  });
}

function switchMode(mode) {
  searchMode = mode;
  // 切换算法：从“当前格子”继续，但保留之前足迹（淡色持久显示）
  initSearch(mode, /*fromCurrent=*/true);
}

// Reset：清空所有足迹（包含持久足迹），保留墙与目标；按当前算法从“起点”重新开始
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
  // 1) 把上一轮的逻辑足迹转存成“持久足迹”（方便跨轮显示）
  for (let c of grid) {
    if (c.visited)   c.visMark = true;
    if (c.backtrack) c.backtrackMark = true;
    if (c.path)      c.pathMark = true;

    // 清空本轮逻辑标记
    c.visited = false;
    c.backtrack = false;
    c.path = false;
  }

  // 2) 重置本轮结构
  stack = [];
  queue = [];
  parents.clear();
  found = false;

  // 3) 起点
  if (!fromCurrent) current = startCell;
  current.visited = true;

  if (mode === "DFS") {
    // DFS：由 stepDFS 管理栈
  } else {
    // BFS：current 入队，并设置 parent
    queue.push(current);
    parents.set(keyOf(current), null);
  }
}

// ========== 搜索推进 ==========
function stepDFS() {
  const next = current.checkNeighbors();
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
    showFinalPathFromStart();   // 统一用“起点→目标”的路径来高亮
    console.log("Target found (DFS)!");
  }
}

function stepBFS() {
  if (queue.length === 0) return;

  current = queue.shift();

  if (current === target) {
    found = true;
    showFinalPathFromStart();   // 统一用“起点→目标”的路径来高亮
    console.log("Target found (BFS)!");
    return;
  }

  const neighbors = current.orthNeighbors();
  for (const nb of neighbors) {
    if (!nb.visited && !nb.obstacle) {
      nb.visited = true;
      parents.set(keyOf(nb), current);
      queue.push(nb);
    }
  }
}

// === 专门跑一次 BFS（只用于绘制最终路径：起点→目标） ===
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
    // 同时写入“本轮路径”和“持久路径”
    let node = target;
    while (node) {
      node.path = true;
      node.pathMark = true;
      node = p.get(keyOf(node));
    }
  } else {
    console.log("No path from start to target (blocked by walls).");
  }
}

// ========== 辅助 ==========
function index(i, j) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return i + j * cols;
}
function keyOf(c) { return c.i + "," + c.j; }

// 点击：切换墙（保留已存在的足迹；从当前格继续）
function mousePressed() {
  const i = floor(mouseX / w);
  const j = floor(mouseY / w);
  const idx = index(i, j);
  if (idx === -1) return;

  const clicked = grid[idx];
  if (clicked === startCell || clicked === target || clicked === current) return;

  clicked.obstacle = !clicked.obstacle;

  // 地图改变后，从当前格继续；旧足迹保留为持久标记
  initSearch(searchMode, /*fromCurrent=*/true);
}

// ========== Cell 类 ==========
class Cell {
  constructor(i, j) {
    this.i = i;
    this.j = j;

    // —— 本轮逻辑标记 —— //
    this.visited = false;
    this.backtrack = false;
    this.path = false;

    // —— 持久可视标记（跨轮保留） —— //
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

  // 当前搜索头：用 cat.png 显示
  highlight() {
    const x = this.i * w, y = this.j * w;
    noStroke();
    image(catImg, x + w*0.05, y + w*0.05, w*0.9, w*0.9); // 留点内边距更美观
  }

  // 起点：绿色块
  showStart() {
    const x = this.i * w, y = this.j * w;
    noStroke();
    fill(0, 200, 0);
    rect(x, y, w, w);
  }

  show() {
    const x = this.i * w;
    const y = this.j * w;

    // 背景网格边线
    stroke(70);
    noFill();
    rect(x, y, w, w);

    // 障碍（墙）：以图片渲染
    if (this.obstacle) {
      noStroke();
      image(wallImg, x, y, w, w);
      return; // 墙盖住其他内容
    }

    // 先画“持久足迹”（淡）
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

    // 再画“本轮足迹”（更实）
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

    // 目标：红心图
    if (this.target) {
      noStroke();
      image(heartImg, x, y, w, w);
      // 留白版本：image(heartImg, x+w*0.1, y+w*0.1, w*0.8, w*0.8);
    }
  }
}
