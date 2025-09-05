// ブロック崩しゲーム - ゲームロジック

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
    score: 0,
    lives: 3,
    gameRunning: false,
    ballMoving: false,
    isDemo: false,
    lastUserInput: Date.now(),
    demoActionTimer: 0
};

// パドル
const paddle = {
    width: 120,
    height: 15,
    x: canvas.width / 2 - 60,
    y: canvas.height - 40,
    speed: 8
};

// ボール
const ball = {
    x: canvas.width / 2,
    y: paddle.y - 20,
    radius: 8,
    dx: 0,
    dy: 0,
    speed: 6
};

// ブロック
const blocks = [];
const blockRows = 6;
const blockCols = 10;
const blockWidth = 70;
const blockHeight = 25;
const blockPadding = 5;
const blockOffsetTop = 80;
const blockOffsetLeft = 35;

// ブロックの色配列
const blockColors = [
    '#ff6b6b', '#ee5a24', '#feca57', '#48dbfb', 
    '#0abde3', '#00d2d3', '#54a0ff', '#5f27cd'
];

// ブロック初期化
function initBlocks() {
    blocks.length = 0;
    for (let r = 0; r < blockRows; r++) {
        for (let c = 0; c < blockCols; c++) {
            blocks.push({
                x: c * (blockWidth + blockPadding) + blockOffsetLeft,
                y: r * (blockHeight + blockPadding) + blockOffsetTop,
                width: blockWidth,
                height: blockHeight,
                color: blockColors[r % blockColors.length],
                visible: true
            });
        }
    }
}

// マウス移動でパドル操作
canvas.addEventListener('mousemove', (e) => {
    // ユーザー入力を記録
    gameState.lastUserInput = Date.now();
    
    // デモモード中の場合は終了
    if (gameState.isDemo) {
        stopDemo();
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddle.x = mouseX - paddle.width / 2;
    
    // パドルが画面外に出ないように制限
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x > canvas.width - paddle.width) {
        paddle.x = canvas.width - paddle.width;
    }
    
    // ボールがパドルについている時は一緒に移動
    if (!gameState.ballMoving) {
        ball.x = paddle.x + paddle.width / 2;
    }
});

// スペースキーでゲーム開始/一時停止
document.addEventListener('keydown', (e) => {
    // ユーザー入力を記録
    gameState.lastUserInput = Date.now();
    
    // デモモード中の場合は終了
    if (gameState.isDemo) {
        stopDemo();
        return;
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameState.gameRunning) {
            startGame();
        } else if (!gameState.ballMoving) {
            launchBall();
        }
    }
});

// ゲーム開始
function startGame() {
    gameState.gameRunning = true;
    gameState.ballMoving = false;
    resetBall();
}

// ボール発射
function launchBall() {
    gameState.ballMoving = true;
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30度から30度の範囲
    ball.dx = Math.sin(angle) * ball.speed;
    ball.dy = -Math.cos(angle) * ball.speed;
}

// ボールリセット
function resetBall() {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 20;
    ball.dx = 0;
    ball.dy = 0;
    gameState.ballMoving = false;
}

// 衝突検出
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ゲーム更新
function update() {
    // デモモードのチェック
    if (!gameState.gameRunning) {
        checkDemoMode();
    }
    
    // デモモード中はAIが操作
    if (gameState.isDemo) {
        updateDemoAI();
        
        // デモモード中のゲームオーバー時は自動再開
        if (!gameState.gameRunning) {
            setTimeout(() => {
                restartGame();
                gameState.isDemo = true;
                startGame();
            }, 3000);
        }
    }
    
    if (!gameState.gameRunning || !gameState.ballMoving) return;
    
    // ボール移動
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // 壁との衝突
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius <= 0) {
        ball.dy = -ball.dy;
    }
    
    // パドルとの衝突
    if (ball.y + ball.radius >= paddle.y &&
        ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
        // パドルのどの部分に当たったかで反射角度を変える
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        ball.dx = Math.sin(angle) * ball.speed;
        ball.dy = -Math.abs(Math.cos(angle) * ball.speed);
    }
    
    // ブロックとの衝突
    for (let block of blocks) {
        if (block.visible && checkCollision({
            x: ball.x - ball.radius,
            y: ball.y - ball.radius,
            width: ball.radius * 2,
            height: ball.radius * 2
        }, block)) {
            block.visible = false;
            ball.dy = -ball.dy;
            gameState.score += 10;
            updateScore();
            break;
        }
    }
    
    // ボールが下に落ちた
    if (ball.y > canvas.height) {
        gameState.lives--;
        updateLives();
        
        if (gameState.lives <= 0) {
            gameOver(false);
        } else {
            resetBall();
        }
    }
    
    // 全ブロック破壊チェック
    if (blocks.every(block => !block.visible)) {
        gameOver(true);
    }
}

// 描画
function draw() {
    // 画面クリア
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // パドル描画
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
    
    // デモモード中はパドルを光らせる
    if (gameState.isDemo) {
        const intensity = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        gradient.addColorStop(0, `rgba(255, 107, 107, ${intensity})`);
        gradient.addColorStop(1, `rgba(238, 90, 36, ${intensity})`);
        
        // 光る輪郭を追加
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    } else {
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ee5a24');
        ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0; // シャドウをリセット
    
    // ボール描画
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const ballGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius);
    ballGradient.addColorStop(0, '#fff');
    ballGradient.addColorStop(1, '#ddd');
    ctx.fillStyle = ballGradient;
    ctx.fill();
    ctx.closePath();
    
    // ブロック描画
    for (let block of blocks) {
        if (block.visible) {
            ctx.fillStyle = block.color;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            
            // ブロックの輝き効果
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(block.x, block.y, block.width, block.height / 3);
        }
    }
    
    // ゲーム開始前のメッセージ
    if (!gameState.ballMoving && gameState.gameRunning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('スペースキーでボール発射!', canvas.width / 2, canvas.height / 2);
    }
}

// スコア更新
function updateScore() {
    document.getElementById('score').textContent = gameState.score;
}

// ライフ更新
function updateLives() {
    document.getElementById('lives').textContent = gameState.lives;
}

// ゲームオーバー
function gameOver(isWin) {
    gameState.gameRunning = false;
    gameState.ballMoving = false;
    
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverText = document.getElementById('gameOverText');
    
    if (isWin) {
        gameOverText.innerHTML = `
            <h2>🎉 おめでとうございます！ 🎉</h2>
            <p>全てのブロックを破壊しました！</p>
            <p>最終スコア: ${gameState.score}</p>
        `;
    } else {
        gameOverText.innerHTML = `
            <h2>💥 ゲームオーバー 💥</h2>
            <p>残念！もう一度挑戦してみましょう！</p>
            <p>最終スコア: ${gameState.score}</p>
        `;
    }
    
    gameOverScreen.style.display = 'block';
}

// デモモードのAI制御
function updateDemoAI() {
    gameState.demoActionTimer++;
    
    // ボールが動いている場合のみパドルを移動
    if (gameState.ballMoving) {
        // ボールの位置を予測してパドルを移動
        const ballPredictedX = ball.x + ball.dx * 10; // 10フレーム先を予測
        const targetPaddleX = ballPredictedX - paddle.width / 2;
        
        // スムーズにパドルを移動
        const paddleCenterX = paddle.x + paddle.width / 2;
        const diff = ballPredictedX - paddleCenterX;
        
        if (Math.abs(diff) > 5) {
            const moveSpeed = Math.min(Math.abs(diff) * 0.1, paddle.speed);
            if (diff > 0) {
                paddle.x += moveSpeed;
            } else {
                paddle.x -= moveSpeed;
            }
        }
        
        // パドルが画面外に出ないように制限
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x > canvas.width - paddle.width) {
            paddle.x = canvas.width - paddle.width;
        }
    } else {
        // ボールが停止中は中央付近で待機
        const centerX = canvas.width / 2 - paddle.width / 2;
        const diff = centerX - paddle.x;
        
        if (Math.abs(diff) > 2) {
            paddle.x += diff * 0.05;
        }
        
        // ボールをパドルの中央に保持
        ball.x = paddle.x + paddle.width / 2;
        
        // 60フレームごとにボールを発射
        if (gameState.demoActionTimer > 60 && gameState.gameRunning) {
            launchBall();
            gameState.demoActionTimer = 0;
        }
    }
}

// デモモードのチェック
function checkDemoMode() {
    if (gameState.isDemo) return;
    
    // 5秒間操作がなければデモモード開始
    if (Date.now() - gameState.lastUserInput > 5000) {
        startDemo();
    }
}

// デモモード開始
function startDemo() {
    gameState.isDemo = true;
    gameState.demoActionTimer = 0;
    
    if (!gameState.gameRunning) {
        startGame();
    }
    
    document.getElementById('demoText').style.display = 'block';
}

// デモモード終了
function stopDemo() {
    if (gameState.isDemo) {
        gameState.isDemo = false;
        document.getElementById('demoText').style.display = 'none';
    }
}

// ゲーム再開
function restartGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameRunning = false;
    gameState.ballMoving = false;
    gameState.isDemo = false;
    gameState.lastUserInput = Date.now();
    
    updateScore();
    updateLives();
    
    initBlocks();
    resetBall();
    
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('demoText').style.display = 'none';
}

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 初期化
initBlocks();
resetBall();
updateScore();
updateLives();

// ゲーム開始
gameLoop();