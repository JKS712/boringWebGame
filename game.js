// 設定畫布大小
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 620;
const canvas = document.getElementById('gameCanvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

// 全局變量
let lastBuffTime = 0;
let lastEnemyTime = 0;
const BUFF_INTERVAL = 6000;
const ENEMY_INTERVAL = 6000;
const FALLING_SPEED = 0.5;
const ENEMY_MARGIN = CANVAS_WIDTH * 0.05;
const MIN_DISTANCE = 20;
let isPaused = false;
let showGameInfo = false;
let nextEnemyY = -30;
let lastEnemySegment = -1;
let currentSegment = 0;
let startTime = 0;
let survivalScore = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let lastBuffY = -60;

// 玩家參數
let player = {
    x: CANVAS_WIDTH / 2 - 15,
    y: CANVAS_HEIGHT - 50,
    width: 30,
    height: 40,
    speed: 0.5,
    maxSpeed: 2,
    health: 20,
    maxHealth: 20,
    damage: 7,
    shootSpeed: 50,
    shootCooldown: 0,
    arrowRange: 45, // 預設箭矢飛行距離（佔畫布高度的百分比）
    getCenterX: function() {
        return this.x + this.width / 2;
    },
    getCenterY: function() {
        return this.y + this.height / 2;
    }
};

// 箭矢相關
let arrowSpeed = 4;
let arrowRange = player.arrowRange;

// Boss 相關
let buffCount = 0;
let totalEnemyHealth = 0;

// 遊戲狀態
let gameRunning = false;
let enemies = [];
let enemyBaseHealth = 40;
let enemyHealthIncrease = 5;

let arrows = []; // 箭矢
let buffsOnMap = []; // Buff 生成
let score = 0; // 計分
let playerBuffs = []; // 玩家當前的 Buff

let keys = { // 監聽鍵盤輸入
    left: false,
    right: false
};

// Buff 列表
let buffList = [
    { 
        name: "增加箭矢傷害", 
        effect: () => {
            return Math.floor(Math.random() * 3) + 3;
        }
    },
    { 
        name: "增加橫移速度", 
        effect: () => {
            return 0.1;
        }
    },
    { 
        name: "增加箭矢發射頻率", 
        effect: () => {
            return (Math.random() * 0.3) + 0.2;
        }
    },
    {
        name: "增加血量",
        effect: () => {
            return Math.min(10 + Math.floor(Date.now() / 10000), 30);
        }
    },
    {
        name: "增加箭矢飛行距離",
        effect: () => {
            return Math.random() < 0.5 ? 0.5 : 1;
        }
    }
];

document.addEventListener('keydown', (event) => {
    if (event.key === 'a' || event.key === 'ArrowLeft') keys.left = true;
    if (event.key === 'd' || event.key === 'ArrowRight') keys.right = true;
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'a' || event.key === 'ArrowLeft') keys.left = false;
    if (event.key === 'd' || event.key === 'ArrowRight') keys.right = false;
});

// 開始遊戲
function startGame() {
    gameRunning = true;
    isPaused = false;
    showGameInfo = false;
    score = 0;
    survivalScore = 0;
    buffCount = 0;
    totalEnemyHealth = 0;
    nextEnemyY = -30;
    lastEnemySegment = -1;
    currentSegment = 0;
    startTime = Date.now();
    totalPausedTime = 0;
    lastBuffTime = startTime;
    arrows = [];
    enemies = [];
    buffsOnMap = [];
    enemyBaseHealth = 40;
    lastBuffY = -60;
    playerBuffs = [];
    arrowRange = player.arrowRange;
    buffCount = 0;

    updateScore();
    document.getElementById('buttonContainer').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'block';
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('mobileControls').style.display = 'flex';
    document.getElementById('score').style.display = 'block';
    canvas.style.display = 'block';
    canvas.style.filter = 'none';

    lastBuffTime = 0;
    lastEnemyTime = 0;
    lastBuffY = -60;

    update();
}

// 更新畫面
function update() {
    if (!gameRunning || isPaused) return;

    const currentTime = Date.now();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    updatePlayer();
    drawPlayer();
    updateArrows();
    updateShooting();
    
    if (currentTime - lastBuffTime - totalPausedTime >= BUFF_INTERVAL) {
        createBuffs();
        lastBuffTime = currentTime - totalPausedTime;
    }
    
    drawBuffsOnMap();
    drawEnemies();

    // 檢查是否有Boss未被擊敗
    const boss = enemies.find(enemy => enemy.isBoss);
    if (boss && boss.y + boss.height >= CANVAS_HEIGHT) {
        gameOver("Boss到達底部");
    }

    // 更新 lastBuffY
    if (buffsOnMap.length > 0) {
        lastBuffY = Math.max(...buffsOnMap.map(buff => buff.y));
    } else {
        lastBuffY = -60;
    }

    // 存活時間計分
    const survivalTime = Math.floor((currentTime - startTime - totalPausedTime) / 1000);
    if (survivalTime % 10 === 0 && survivalTime !== survivalScore) {
        survivalScore = survivalTime;
        score += Math.floor(survivalTime / 10);
        updateScore();
    }

    requestAnimationFrame(update);
}

// 重新開始遊戲
function restartGame() {
    player = {
        x: CANVAS_WIDTH / 2 - 15,
        y: CANVAS_HEIGHT - 50,
        width: 30,
        height: 40,
        speed: 0.5,
        maxSpeed: 2,
        health: 20,
        maxHealth: 20,
        damage: 7,
        shootSpeed: 50,
        shootCooldown: 0,
        arrowRange: 30,
        getCenterX: function() {
            return this.x + this.width / 2;
        },
        getCenterY: function() {
            return this.y + this.height / 2;
        }
    };
    arrows = [];
    enemies = [];
    buffsOnMap = [];
    enemyBaseHealth = 40;
    score = 0;
    survivalScore = 0;
    buffCount = 0;
    totalEnemyHealth = 0;
    lastBuffY = -60;
    nextEnemyY = -30;
    lastEnemySegment = -1;
    playerBuffs = [];
    arrowRange = player.arrowRange;
    lastEnemySegment = -1;
    currentSegment = 0;
    buffCount = 0;

    isPaused = false;
    showGameInfo = false;
    document.getElementById('pauseButton').innerText = '暫停';
    document.getElementById('toggleInfoButton').textContent = '顯示資訊';
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('gameOverlay').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    canvas.style.filter = 'none';

    startGame();
}

// 更新玩家位置
function updatePlayer() {
    if (keys.left && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys.right && player.x + player.width < CANVAS_WIDTH) {
        player.x += player.speed;
    }
}

// 繪製玩家
function drawPlayer() {
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    drawHealth(player);
}

// 生成箭矢
function shootArrow() {
    const arrow = {
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 10,
        speed: arrowSpeed,
        damage: player.damage,
        distance: 0
    };
    arrows.push(arrow);
}

// 更新箭矢
function updateArrows() {
    let arrowsToRemove = [];
    let enemiesToRemove = [];

    arrows.forEach((arrow, arrowIndex) => {
        arrow.y -= arrow.speed;
        arrow.distance += arrow.speed;

        enemies.forEach((enemy, enemyIndex) => {
            if (
                arrow.x < enemy.x + enemy.width &&
                arrow.x + arrow.width > enemy.x &&
                arrow.y < enemy.y + enemy.height &&
                arrow.height + arrow.y > enemy.y
            ) {
                enemy.health -= arrow.damage;
                
                if (enemy.health <= 0) {
                    score += Math.round(enemyBaseHealth / 40);
                    updateScore();
                    enemiesToRemove.push(enemyIndex);
                    
                    // 如果不是 Boss，則掉落隨機 buff
                    if (!enemy.isBoss) {
                        dropRandomBuff(enemy.x, enemy.y);
                    }
                }

                arrowsToRemove.push(arrowIndex);
            }
        });

        if (arrow.distance >= arrowRange * CANVAS_HEIGHT / 100) {
            arrowsToRemove.push(arrowIndex);
        }
    });

    arrowsToRemove.sort((a, b) => b - a).forEach(arrowIndex => {
        arrows.splice(arrowIndex, 1);
    });

    enemiesToRemove.sort((a, b) => b - a).forEach(enemyIndex => {
        enemies.splice(enemyIndex, 1);
    });

    arrows.forEach(arrow => {
        ctx.fillStyle = 'black';
        ctx.fillRect(arrow.x, arrow.y, arrow.width, arrow.height);
    });
}

// 更新射擊
function updateShooting() {
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    } else {
        shootArrow();
        player.shootCooldown = player.shootSpeed;
    }
}

// 生成 Buff
function createBuffs() {
    const buffWidth = (CANVAS_WIDTH / 2) - 2;
    const leftBuff = createBuff(0, -30, buffWidth);
    const rightBuff = createBuff(buffWidth + 2, -30, buffWidth);

    buffsOnMap.push(leftBuff, rightBuff);
    
    lastBuffY = -30;
    buffCount += 2;
    currentSegment = Math.floor(buffCount / 2) - 1;

    // 更新下一個敵人的生成位置
    nextEnemyY = -30 - MIN_DISTANCE;

    // 在第15、30、45...個buff前生成Boss
    if (buffCount % 30 === 28) {
        createBoss();
    } else if (currentSegment !== lastEnemySegment) {
        createEnemy(true);
    }
}

// 創建單個 Buff
function createBuff(x, y, width) {
    const chosenBuff = buffList[Math.floor(Math.random() * buffList.length)];
    const buffValue = chosenBuff.effect();
    return {
        x: x,
        y: y,
        width: width,
        height: 30,
        chosenBuff: chosenBuff,
        buffValue: buffValue,
        isObtained: false,
        canObtain: true,
        isDropped: false
    };
}

// 掉落隨機 Buff
function dropRandomBuff(x, y) {
    const buffWidth = 30;
    const buffHeight = 30;
    const randomBuff = buffList[Math.floor(Math.random() * buffList.length)];
    const buffValue = randomBuff.effect();
    
    const droppedBuff = {
        x: x + (30 - buffWidth) / 2,
        y: y,
        width: buffWidth,
        height: buffHeight,
        chosenBuff: randomBuff,
        buffValue: buffValue,
        isObtained: false,
        canObtain: true,
        isDropped: true
    };

    buffsOnMap.push(droppedBuff);
}

function getBuffValueText(buffName, value) {
    switch (buffName) {
        case "增加箭矢傷害":
            return `+${value}`;
        case "增加橫移速度":
            return `+${value.toFixed(1)}`;
        case "增加箭矢發射頻率":
            return `-${value.toFixed(1)}`;
        case "增加血量":
            return `+${value}`;
        case "增加箭矢飛行距離":
            return `+${value.toFixed(1)}%`;
        default:
            return `+${value}`;
    }
}

// 繪製地圖上的 Buff
function drawBuffsOnMap() {
    for (let i = buffsOnMap.length - 1; i >= 0; i--) {
        const buff = buffsOnMap[i];
        
        if (!buff.isObtained) {
            ctx.fillStyle = buff.isDropped ? 'orange' : (buff.canObtain ? 'lightgreen' : 'gray');
            ctx.fillRect(buff.x, buff.y, buff.width, buff.height);
            
            ctx.fillStyle = 'black';
            ctx.font = buff.isDropped ? "12px Arial" : "12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const textX = buff.x + buff.width / 2;
            const textY = buff.y + buff.height / 3;
            ctx.fillText(buff.chosenBuff.name, textX, textY);

            // 顯示buff數值
            const valueText = getBuffValueText(buff.chosenBuff.name, buff.buffValue);
            ctx.fillText(valueText, textX, textY + buff.height / 3);

            if (!buff.isDropped) {
                ctx.fillStyle = 'black';
                ctx.fillRect(buff.x + buff.width, buff.y, 2, buff.height);
            }
        }

        buff.y += FALLING_SPEED;

        const playerTopCenter = {
            x: player.x + player.width / 2,
            y: player.y
        };

        // 檢查玩家是否觸碰到 buff
        if (
            (buff.isDropped && 
             player.x < buff.x + buff.width &&
             player.x + player.width > buff.x &&
             player.y < buff.y + buff.height &&
             player.y + player.height > buff.y) ||
            (!buff.isDropped && 
             playerTopCenter.y <= buff.y + buff.height &&
             playerTopCenter.y + player.speed > buff.y + buff.height &&
             playerTopCenter.x >= buff.x &&
             playerTopCenter.x <= buff.x + buff.width)
        ) {
            if (!buff.isObtained && buff.canObtain) {
                console.log(`獲得buff: ${buff.chosenBuff.name}, 效果值: ${buff.buffValue}`);
                buff.isObtained = true;

                applyBuffEffect(buff.chosenBuff.name, buff.buffValue);

                playerBuffs.push({
                    name: buff.chosenBuff.name,
                    value: buff.buffValue
                });

                if (!buff.isDropped) {
                    const otherBuff = buffsOnMap.find(b => b !== buff && b.y === buff.y);
                    if (otherBuff) {
                        otherBuff.canObtain = false;
                    }
                }
                updatePlayerInfo();
            }
        }
        if (buff.y > CANVAS_HEIGHT) {
            buffsOnMap.splice(i, 1);
        }
    }
}

function applyBuffEffect(buffName, value) {
    switch (buffName) {
        case "增加箭矢傷害":
            player.damage += value;
            break;
        case "增加橫移速度":
            player.speed = Math.min(player.speed + value, player.maxSpeed);
            break;
        case "增加箭矢發射頻率":
            player.shootSpeed = Math.max(player.shootSpeed - value, 1);
            break;
        case "增加血量":
            player.maxHealth += value;
            player.health = player.maxHealth;
            break;
        case "增加箭矢飛行距離":
            arrowRange += value;
            break;
    }
}

// 生成敵人
function createEnemy(forcedCreation = false) {
    if (currentSegment === lastEnemySegment && !forcedCreation) return;

    const enemy = {
        x: ENEMY_MARGIN + Math.random() * (CANVAS_WIDTH - 2 * ENEMY_MARGIN - 30),
        y: nextEnemyY,
        width: 30,
        height: 30,
        health: enemyBaseHealth,
        isBoss: false
    };
    enemyBaseHealth += enemyHealthIncrease;
    totalEnemyHealth += enemy.health;
    enemies.push(enemy);

    // 更新上一個敵人所在的區段
    lastEnemySegment = currentSegment;
}

// 生成Boss
function createBoss() {
    const bossHealth = Math.round(totalEnemyHealth / 3);

    const boss = {
        x: CANVAS_WIDTH / 2 - 25,
        y: nextEnemyY - 30,
        width: 50,
        height: 50,
        health: bossHealth,
        isBoss: true
    };
    enemies.push(boss);
    totalEnemyHealth = 0; 
    console.log(`Boss生成，血量：${bossHealth}`);

    // 更新上一個敵人所在的區段
    lastEnemySegment = currentSegment;
}

// 繪製敵人
function drawEnemies() {
    enemies.forEach((enemy, index) => {
        ctx.fillStyle = enemy.isBoss ? 'purple' : 'red';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        drawHealth(enemy);
        enemy.y += FALLING_SPEED;

        // 檢查是否與Buff重疊
        buffsOnMap.forEach(buff => {
            if (
                enemy.y + enemy.height > buff.y - MIN_DISTANCE &&
                enemy.y < buff.y + buff.height + MIN_DISTANCE
            ) {
                enemy.y = buff.y - enemy.height - MIN_DISTANCE;
            }
        });

        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.height + player.y > enemy.y
        ) {
            player.health -= enemy.health;
            enemies.splice(index, 1);
            if (player.health <= 0) {
                gameOver("你死了");
            }
        }

        if (enemy.y > CANVAS_HEIGHT) {
            if (enemy.isBoss) {
                gameOver("你被BOSS幹掉了");
            } else {
                enemies.splice(index, 1);
            }
        }
    });
}

// 繪製血量
function drawHealth(entity) {
    ctx.font = entity.isBoss ? "20px Arial" : "18px Arial";
    ctx.fillStyle = 'black';
    const healthText = `HP: ${entity.health}`;
    const textWidth = ctx.measureText(healthText).width;
    const x = entity.x + (entity.width / 2) - (textWidth / 2);
    const y = entity.y - 10;
    ctx.fillText(healthText, x, y);
}

// 更新玩家資訊
function updatePlayerInfo() {
    document.getElementById('playerHealth').textContent = `血量: ${player.health}`;
    document.getElementById('playerDamage').textContent = `箭矢傷害: ${player.damage}`;
    document.getElementById('playerSpeed').textContent = `橫移速度: ${player.speed.toFixed(1)}`;
    document.getElementById('playerShootSpeed').textContent = `箭矢發射頻率: ${player.shootSpeed.toFixed(1)}`;
    document.getElementById('arrowRange').textContent = `箭矢飛行距離: ${arrowRange.toFixed(1)}%`;
}

// 暫停功能
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseStartTime = Date.now();
        document.getElementById('pauseMenu').style.display = 'flex';
        canvas.style.filter = 'blur(5px)';
    } else {
        totalPausedTime += Date.now() - pauseStartTime;
        document.getElementById('pauseMenu').style.display = 'none';
        canvas.style.filter = 'none';
        update();
    }
}

// 切換遊戲信息顯示
function toggleGameInfo() {
    showGameInfo = !showGameInfo;
    const gameInfo = document.getElementById('gameInfo');
    const toggleInfoButton = document.getElementById('toggleInfoButton');
    
    if (showGameInfo) {
        gameInfo.style.display = 'block';
        toggleInfoButton.textContent = '隱藏資訊';
    } else {
        gameInfo.style.display = 'none';
        toggleInfoButton.textContent = '顯示資訊';
    }
}

// 遊戲結束
function gameOver(reason) {
    gameRunning = false;
    canvas.style.filter = 'blur(5px)';
    
    const gameOverlay = document.getElementById('gameOverlay');
    const gameOverReason = document.getElementById('gameOverReason');
    const finalScore = document.getElementById('finalScore');
    
    gameOverReason.textContent = `原因: ${reason}`;
    finalScore.textContent = `得分: ${score}`;
    
    gameOverlay.style.display = 'flex';
    document.getElementById('restartButton').style.display = 'block';
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('score').style.display = 'none';
}

// 更新分數
function updateScore() {
    document.getElementById('score').innerText = `分數: ${score}`;
}

// 顯示遊戲玩法
function showHowToPlay() {
    document.getElementById('howToPlayPopup').style.display = 'block';
}

// 顯示製作資訊
function showCredits() {
    document.getElementById('creditsPopup').style.display = 'block';
}

// 關閉資訊彈窗
function closeInfoPopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

// 處理移動控制
function handleMobileControl(direction, isPressed) {
    if (direction === 'left') {
        keys.left = isPressed;
    } else if (direction === 'right') {
        keys.right = isPressed;
    }
}

// 回到首頁
function goToHome() {
    gameInfo.style.display = 'none';
    toggleInfoButton.textContent = '顯示資訊';
    gameRunning = false;
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('buttonContainer').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('score').style.display = 'none';
    document.getElementById('mobileControls').style.display = 'none';
    canvas.style.filter = 'none';
}

// 事件監聽器
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('pauseButton').addEventListener('click', togglePause);
    document.getElementById('toggleInfoButton').addEventListener('click', toggleGameInfo);
    document.getElementById('howToPlayButton').addEventListener('click', showHowToPlay);
    document.getElementById('creditsButton').addEventListener('click', showCredits);

    // 暫停菜單按鈕的事件監聽器
    document.getElementById('resumeButton').addEventListener('click', togglePause);
    document.getElementById('restartButtonPause').addEventListener('click', restartGame);
    document.getElementById('homeButton').addEventListener('click', goToHome);

    document.getElementById('howToPlayButton').addEventListener('click', showHowToPlay);
    document.getElementById('creditsButton').addEventListener('click', showCredits);

    document.querySelectorAll('.closeButton').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.infoPopup').style.display = 'none';
        });
    });

    // 移動按鈕的事件監聽器
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');

    leftButton.addEventListener('touchstart', () => handleMobileControl('left', true));
    leftButton.addEventListener('touchend', () => handleMobileControl('left', false));
    rightButton.addEventListener('touchstart', () => handleMobileControl('right', true));
    rightButton.addEventListener('touchend', () => handleMobileControl('right', false));

    // 滑鼠事件監聽器
    leftButton.addEventListener('mousedown', () => handleMobileControl('left', true));
    leftButton.addEventListener('mouseup', () => handleMobileControl('left', false));
    rightButton.addEventListener('mousedown', () => handleMobileControl('right', true));
    rightButton.addEventListener('mouseup', () => handleMobileControl('right', false));
});