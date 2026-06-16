import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';





// ==========================================
// 0. 全屏控制（页面加载即生效，覆盖所有界面）
// ==========================================
(function initFullscreen() {
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (!btnFullscreen) return;
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    });
    document.addEventListener('fullscreenchange', () => {
        btnFullscreen.textContent = document.fullscreenElement ? '⛶' : '⛶';
    });
})();

// ==========================================
// 1. 核心视觉与场景初始化
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); // 深邃午夜蓝
scene.fog = new THREE.FogExp2(0x050510, 0.012); // 淡淡雾气

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 35;
let targetCameraPos = new THREE.Vector3(0, 0, 35); 

// 渲染器配置：防发白，提升清晰度
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55; 
document.body.appendChild(renderer.domElement);

// 后处理 - Bloom 发光
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,  // strength - 发光强度
    0.35,  // radius - 发光半径
    0.7    // threshold - 亮度阈值（提高减少发光范围）
);
composer.addPass(bloomPass);

// RGB 偏移已移除 — 会造成照片内红绿蓝色散条纹，影响清晰度

// ==========================================
// 2. 氛围特效：核心光效与灯光
// ==========================================
const coreLight = new THREE.PointLight(0xffddaa, 6, 80);
coreLight.position.set(0, 0, 5);
scene.add(coreLight);

// 爱心底部补光
const bottomGlowLight = new THREE.PointLight(0xffcc88, 5, 40);
bottomGlowLight.position.set(0, -12, 0);
scene.add(bottomGlowLight);

// 顶部暖光
const topWarmLight = new THREE.PointLight(0xffeedd, 4, 50);
topWarmLight.position.set(0, 12, 0);
scene.add(topWarmLight);

scene.add(new THREE.AmbientLight(0xffffff, 2.0));
const directionalLight = new THREE.DirectionalLight(0xffffff, 3.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// ==========================================
// 3. 氛围特效：星钻粒子系统
// ==========================================
function createStardust() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorPalette = [
        new THREE.Color(0xffffff), 
        new THREE.Color(0xffb6c1), 
        new THREE.Color(0xffd700),
        new THREE.Color(0xff6699),
        new THREE.Color(0xffaacc)
    ];

    for (let i = 0; i < particleCount; i++) {
        const r = 40 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 0.3 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 使用圆形发光贴图
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 32;
    spriteCanvas.height = 32;
    const ctx = spriteCanvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,200,220,0.9)');
    gradient.addColorStop(0.5, 'rgba(255,100,150,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

    const material = new THREE.PointsMaterial({
        size: 0.25,
        map: spriteTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'stardust';
    scene.add(particles);
    return particles;
}
const stardust = createStardust();

// ==========================================
// 3.5 沿爱心轨迹的发光线条路径
// ==========================================
function createHeartGlowPath() {
    const pathPoints = [];
    const detail = 200; // 轨迹采样点
    const scale = 0.5;

    for (let i = 0; i <= detail; i++) {
        const t = (i / detail) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3) * scale;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
        const z = Math.sin(t * 5) * 3 * 0.5;
        pathPoints.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(pathPoints, true);

    // 发光轨迹 - 用稠密采样点 + AdditiveBlending 线段，而非管道
    const tubePoints = curve.getPoints(detail * 4);
    const tubeGeometry = new THREE.BufferGeometry().setFromPoints(tubePoints);
    
    const tubeMat = new THREE.LineBasicMaterial({
        color: 0xffeebb,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 1
    });
    const tubeLine = new THREE.Line(tubeGeometry, tubeMat);
    tubeLine.name = 'heartGlowPath';
    scene.add(tubeLine);

    // 外层扩散光晕 - 稍偏移路径
    const offsetPoints = pathPoints.map(p => {
        const n = p.clone().normalize();
        return p.clone().add(n.multiplyScalar(1.2));
    });
    const curveOuter = new THREE.CatmullRomCurve3(offsetPoints, true);
    const outerGeom = new THREE.BufferGeometry().setFromPoints(curveOuter.getPoints(detail * 3));
    const outerMat = new THREE.LineBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: 1
    });
    const outerLine = new THREE.Line(outerGeom, outerMat);
    outerLine.name = 'heartGlowOuter';
    scene.add(outerLine);

    return { tubeLine, outerLine, curve, pathPoints };
}
const heartGlow = createHeartGlowPath();

// ==========================================
// 3.6 沿轨迹流动的光点粒子
// ==========================================
function createFlowParticles(curve) {
    const flowCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(flowCount * 3);
    const flowColors = new Float32Array(flowCount * 3);
    const flowData = []; // 存储每个粒子的流动进度

    const flowColorPalette = [
        new THREE.Color(0xffffff),
        new THREE.Color(0xffffdd),
        new THREE.Color(0xffeecc),
        new THREE.Color(0xffeebb),
        new THREE.Color(0xffd700)
    ];

    for (let i = 0; i < flowCount; i++) {
        const progress = Math.random();
        const pt = curve.getPointAt(progress);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;

        const color = flowColorPalette[Math.floor(Math.random() * flowColorPalette.length)];
        flowColors[i * 3] = color.r;
        flowColors[i * 3 + 1] = color.g;
        flowColors[i * 3 + 2] = color.b;

        flowData.push({
            progress: progress,
            speed: 0.0003 + Math.random() * 0.0015,
            offset: (Math.random() - 0.5) * 0.5
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(flowColors, 3));

    // 发光粒子贴图
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gctx = glowCanvas.getContext('2d');
    const gGradient = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gGradient.addColorStop(0, 'rgba(255,255,255,1)');
    gGradient.addColorStop(0.15, 'rgba(255,220,240,0.95)');
    gGradient.addColorStop(0.4, 'rgba(255,150,200,0.6)');
    gGradient.addColorStop(0.7, 'rgba(255,80,140,0.15)');
    gGradient.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = gGradient;
    gctx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    const material = new THREE.PointsMaterial({
        size: 0.35,
        map: glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const flowPoints = new THREE.Points(geometry, material);
    flowPoints.name = 'flowParticles';
    scene.add(flowPoints);

    return { flowPoints, flowData };
}
const flowSystem = createFlowParticles(heartGlow.curve);

// ==========================================
// 4. 数据状态与 3D 照片节点构建
// ==========================================
const photos = [];
const totalPhotos = 34; 
let currentState = 'HEART'; // 'HEART', 'EXPLODED', 'GALLERY'
let currentGalleryIndex = 0; 
let isPhoto20Locked = localStorage.getItem('photo20_unlocked') !== 'true'; // 第20张照片默认锁定，需手势解锁
let isPhoto7Locked = localStorage.getItem('photo7_unlocked') !== 'true';   // 第7张照片默认锁定，需双手比心解锁
let isPhoto34Locked = localStorage.getItem('photo34_unlocked') !== 'true'; // 第34张照片默认锁定，需双手圆圈放在眼睛上解锁
let photo20LockHintTimer = null; // 10秒后切换提示词的定时器
let photo7LockHintTimer = null;
let photo34LockHintTimer = null;
let lockSkipBtnTimer = null; // 20秒后显示跳过按钮
let gallerySwipeHintTimer = null; // 浏览模式挥手提示淡出定时器

const photoUrls = Array.from({ length: totalPhotos }, (_, i) => `textures/photo${i + 1}.jpg`);

// 纪念日配置：2025年1月6日是在一起的第1天
const ANNIVERSARY_DATE = new Date('2025-01-06');
function getDaysTogether() {
    const now = new Date();
    const diff = now.getTime() - ANNIVERSARY_DATE.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}
// 对象生日：2006年7月1日
const PARTNER_BIRTHDAY = new Date('2006-07-01');
function getPartnerAge() {
    const now = new Date();
    let age = now.getFullYear() - PARTNER_BIRTHDAY.getFullYear();
    const m = now.getMonth() - PARTNER_BIRTHDAY.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < PARTNER_BIRTHDAY.getDate())) {
        age--;
    }
    return age;
}

// 照片备注配置：每张照片的简短描述（按索引对应）
const photoCaptions = {
    0: '🐭🐟的一周年',
    1: '那天阳光正好',
    2: '你说喜欢这里',
    3: '一起看日落',
    4: '笑得好开心',
    5: '陪你走过的路',
    6: '最爱的那个瞬间',
    7: '永远不会忘记',
    8: '你眼里的星星',
    9: '手牵手去旅行',
    10: '有你真好',
    11: '甜甜的回忆',
    12: '每一个拥抱',
    13: '温暖如你',
    14: '心动时刻',
    15: '一起成长',
    16: '幸福很简单',
    17: '你在身边',
    18: '快乐时光',
    19: '最美的相遇',
    20: '余生请多指教',
    21: '感谢有你',
    22: '唯一',
    23: '一起加油',
    24: '甜蜜日常',
    25: '陪伴是最长情的告白',
    26: '爱你哟',
    27: '珍贵的瞬间',
    28: '约定好了',
    29: '小确幸',
    30: '你的笑容',
    31: '一直走下去',
    32: '未来可期',
    33: '永远爱你'
};

function initHeartShape() {
    // 玫瑰金基础材质
    const baseFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xb76e79, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide
    });

    for (let i = 0; i < totalPhotos; i++) {
        const group = new THREE.Group();
        
        // 独立克隆材质，开启透明度以支持相册渐隐
        const frameMat = baseFrameMaterial.clone();
        frameMat.transparent = true;
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.4), frameMat);
        frame.position.z = -0.05; 
        
        const photoMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, roughness: 0.4, metalness: 0.1, transparent: true
        });
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 3.0), photoMat);

        group.add(frame);
        group.add(photo);

        const t = (i / totalPhotos) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = Math.sin(t * 5) * 3 + (Math.random() - 0.5) * 2; 
        const scale = 0.5;

        group.userData = {
            index: i,
            photoMesh: photo,
            frameMesh: frame,
            frameMat: frameMat,
            photoMat: photoMat,
            isLoaded: false,
            fadeProgress: 0,
            heartPos: new THREE.Vector3(x * scale, y * scale, z),
            heartRot: new THREE.Euler(0, 0, 0),
            explodePos: new THREE.Vector3(),
            explodeRot: new THREE.Euler(),
            floatSpeed: Math.random() * 0.02 + 0.01,
            spinSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 },
            glowPhase: Math.random() * Math.PI * 2,
            rotPhase: Math.random() * Math.PI * 2  // 旋转摆动相位
        };

        group.position.copy(group.userData.heartPos);
        photos.push(group);
        scene.add(group);
    }
}

// ==========================================
// 4.5 飘落花瓣 / 爱心碎片浪漫粒子
// ==========================================
function createRomanticPetals() {
    const petalCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(petalCount * 3);
    const petalColors = new Float32Array(petalCount * 3);
    const petalData = [];

    const petalColorPalette = [
        new THREE.Color(0xffb6c1),
        new THREE.Color(0xffc0cb),
        new THREE.Color(0xff99bb),
        new THREE.Color(0xffaacc),
        new THREE.Color(0xffd1dc)
    ];

    for (let i = 0; i < petalCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

        const color = petalColorPalette[Math.floor(Math.random() * petalColorPalette.length)];
        petalColors[i * 3] = color.r;
        petalColors[i * 3 + 1] = color.g;
        petalColors[i * 3 + 2] = color.b;

        petalData.push({
            baseY: positions[i * 3 + 1],
            speedY: 0.01 + Math.random() * 0.04,
            swayAmp: 0.5 + Math.random() * 1.5,
            swaySpeed: 0.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(petalColors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const petals = new THREE.Points(geometry, material);
    petals.name = 'romanticPetals';
    scene.add(petals);

    return { petals, petalData };
}
const romanticPetals = createRomanticPetals();

// ==========================================
// 5. 交互逻辑：MediaPipe 与无限随机爆炸
// ==========================================
let hasTriggeredExplosion = false; // 标记是否触发过爆炸

function triggerExplosion() {
    if (currentState === 'EXPLODED' || currentState === 'GALLERY') return;
    currentState = 'EXPLODED';
    
    photos.forEach(group => {
        // 紧凑但有层次感的爆炸：从爱心中心向外扩散
        const heartPos = group.userData.heartPos;
        const dir = heartPos.clone().normalize();
        // 沿原方向+随机扰动，半径控制在 6~14 单位（紧凑且不超出屏幕）
        const radius = 6 + Math.random() * 8;
        // 添加随机角度偏移让爆炸更有层次
        const angleOffset = (Math.random() - 0.5) * Math.PI * 0.5;
        const phiOffset = (Math.random() - 0.5) * Math.PI * 0.4;
        
        const theta = Math.atan2(dir.y, dir.x) + angleOffset;
        const phi = Math.acos(dir.z / Math.max(dir.length(), 0.01)) + phiOffset;
        
        const ex = radius * Math.sin(phi) * Math.cos(theta);
        const ey = radius * Math.sin(phi) * Math.sin(theta);
        const ez = radius * Math.cos(phi);
        
        // X 水平方向额外拉伸 1.6 倍，让爆炸更开阔
        group.userData.explodePos.set(ex * 2.5, ey * 1.6, ez);
        // 各轴旋转范围 ±0.5π（±90°），总旋转不超过 180°
        group.userData.explodeRot.set(
            (Math.random() - 0.5) * Math.PI * 0.5, 
            (Math.random() - 0.5) * Math.PI * 0.5, 
            (Math.random() - 0.5) * Math.PI * 0.5
        );
    });
}

const videoElement = document.getElementById('input_video');
const cameraPreview = document.getElementById('camera-preview');
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

// 浏览模式下单手挥动切换的防抖
let gallerySwipeCooldown = false;
let lastSwipeHandX = null;
let swipeAccumulator = 0; // 累积挥动距离

hands.onResults((results) => {
    // ===== 彩蛋解锁：照片20（索引19）前置摄像头镜像，MediaPipe标签与真实左右相反 =====
    // MediaPipe'Left' = 你的真实右手（画面右侧）→ 握👊
    // MediaPipe'Right' = 你的真实左手（画面左侧）→ 比✌️
    if (currentState === 'GALLERY' && currentGalleryIndex === 19 && isPhoto20Locked) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2 && results.multiHandedness) {
            let mpLeftLM = null, mpRightLM = null;  // MP = MediaPipe label
            
            for (const h of results.multiHandedness) {
                if (h.label === 'Left') {
                    mpLeftLM = results.multiHandLandmarks[h.index];
                } else if (h.label === 'Right') {
                    mpRightLM = results.multiHandLandmarks[h.index];
                }
            }
            
            if (mpLeftLM && mpRightLM) {
                // MediaPipe'Left'（你的真实右手）：检测"握拳"
                const rWrist = mpLeftLM[0];
                let rTotalDist = 0;
                [8, 12, 16, 20].forEach(tip => {
                    const dx = mpLeftLM[tip].x - rWrist.x;
                    const dy = mpLeftLM[tip].y - rWrist.y;
                    rTotalDist += Math.sqrt(dx*dx + dy*dy);
                });
                const rightFist = (rTotalDist / 4) < 0.12;
                
                // MediaPipe'Right'（你的真实左手）：检测"比✌️"
                const lIndexExtended = mpRightLM[8].y < mpRightLM[6].y;
                const lMiddleExtended = mpRightLM[12].y < mpRightLM[10].y;
                const lRingCurled = mpRightLM[16].y > mpRightLM[14].y;
                const lPinkyCurled = mpRightLM[20].y > mpRightLM[18].y;
                const leftTwoFingers = lIndexExtended && lMiddleExtended && lRingCurled && lPinkyCurled;
                
                if (leftTwoFingers && rightFist) {
                    // 解锁！
                    clearTimeout(photo20LockHintTimer);
                    isPhoto20Locked = false;
                    localStorage.setItem('photo20_unlocked', 'true');
                    const lockOverlay = document.getElementById('photo-lock-overlay');
                    if (lockOverlay) {
                        lockOverlay.classList.add('unlocked');
                        lockOverlay.classList.remove('show');
                    }
                    updatePhotoCaption();
                }
            }
        }
    }

    // ===== 彩蛋解锁：照片7（索引6）双手比心 ❤️ =====
    if (currentState === 'GALLERY' && currentGalleryIndex === 6 && isPhoto7Locked) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2) {
            const h1 = results.multiHandLandmarks[0];
            const h2 = results.multiHandLandmarks[1];

            // 每只手比半个心: 拇指伸出，其余手指弯曲（支持两种比心姿势）
            function isHeartHalf(lm) {
                const margin = 0.03;
                const thumbUp = lm[4].y < lm[3].y + margin;        // 拇指伸出（心形底部）
                const indexCurl = lm[8].y > lm[6].y - margin;      // 食指弯曲（心形顶部）
                const middleCurl = lm[12].y > lm[10].y - margin;   // 中指弯曲
                const ringCurl = lm[16].y > lm[14].y - margin;     // 无名指弯曲
                const pinkyCurl = lm[20].y > lm[18].y - margin;    // 小指弯曲
                const curledTotal = (indexCurl ? 1 : 0) + (middleCurl ? 1 : 0) + (ringCurl ? 1 : 0) + (pinkyCurl ? 1 : 0);
                return thumbUp && curledTotal >= 3;
            }

            // 两手拇指尖靠拢
            const thumbDist = Math.sqrt(
                Math.pow(h1[4].x - h2[4].x, 2) + Math.pow(h1[4].y - h2[4].y, 2)
            );

            if (isHeartHalf(h1) && isHeartHalf(h2) && thumbDist < 0.4) {
                // 解锁！
                clearTimeout(photo7LockHintTimer);
                isPhoto7Locked = false;
                localStorage.setItem('photo7_unlocked', 'true');
                const lockOverlay = document.getElementById('photo-lock-overlay');
                if (lockOverlay) {
                    lockOverlay.classList.add('unlocked');
                    lockOverlay.classList.remove('show');
                }
                updatePhotoCaption();
            }
        }
    }
    
    // ===== 彩蛋解锁：照片34（索引33）双手 OK 圆圈放在眼睛上 👀 =====
    if (currentState === 'GALLERY' && currentGalleryIndex === 33 && isPhoto34Locked) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2) {
            const h1 = results.multiHandLandmarks[0];
            const h2 = results.multiHandLandmarks[1];

            // 检测一只手：四指指尖与拇指尖聚拢围成圆圈（5个指尖聚集在一起）
            function isOKCircle(lm) {
                const tips = [lm[4], lm[8], lm[12], lm[16], lm[20]]; // 拇指+食中无小指尖
                // 计算5个指尖的中心点
                let cx = 0, cy = 0;
                tips.forEach(t => { cx += t.x; cy += t.y; });
                cx /= 5; cy /= 5;
                // 判断所有指尖都在中心点附近（聚拢成圆圈）
                let gathered = 0;
                tips.forEach(t => {
                    const d = Math.sqrt(Math.pow(t.x - cx, 2) + Math.pow(t.y - cy, 2));
                    if (d < 0.14) gathered++;
                });
                return gathered >= 4; // 至少4个指尖聚拢在一起
            }

            // 检查双手是否都在屏幕上部分（眼睛区域），使用手腕位置更灵敏
            const nearEyes = h1[0].y < 0.58 && h2[0].y < 0.58;

            if (isOKCircle(h1) && isOKCircle(h2) && nearEyes) {
                clearTimeout(photo34LockHintTimer);
                isPhoto34Locked = false;
                localStorage.setItem('photo34_unlocked', 'true');
                const lockOverlay = document.getElementById('photo-lock-overlay');
                if (lockOverlay) {
                    lockOverlay.classList.add('unlocked');
                    lockOverlay.classList.remove('show');
                }
                updatePhotoCaption();
            }
        }
    }

    // 浏览回忆模式：单手挥动切换照片（双手出现时跳过，避免解锁手势误触翻页）
    if (currentState === 'GALLERY') {
        const isTwoHands = results.multiHandLandmarks && results.multiHandLandmarks.length >= 2;
        if (isTwoHands) {
            lastSwipeHandX = null;
            swipeAccumulator = 0;
        }
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && !gallerySwipeCooldown && !isTwoHands) {
            const wrist = results.multiHandLandmarks[0][0];
            const handX = wrist.x;
            
            if (lastSwipeHandX !== null) {
                const delta = handX - lastSwipeHandX;
                swipeAccumulator += delta;
                
                // 累积超过阈值就切换（摄像头镜像：用户左挥 = 画面右移 → 后翻一张）
                if (swipeAccumulator > 0.12) {
                    // 用户左挥 → 后翻一张（下一张）
                    if (currentGalleryIndex < totalPhotos - 1) {
                        currentGalleryIndex++;
                        updatePhotoCaption();
                        setSwipeCooldown();
                    }
                    swipeAccumulator = 0;
                } else if (swipeAccumulator < -0.12) {
                    // 用户右挥 → 前翻一张（上一张）
                    if (currentGalleryIndex > 0) {
                        currentGalleryIndex--;
                        updatePhotoCaption();
                        setSwipeCooldown();
                    }
                    swipeAccumulator = 0;
                }
            }
            lastSwipeHandX = handX;
        } else {
            lastSwipeHandX = null;
            swipeAccumulator = 0;
        }
        return;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];

        // 视差跟随
        targetCameraPos.x = (wrist.x - 0.5) * 20; 
        targetCameraPos.y = -(wrist.y - 0.5) * 20;
        
        // 爆炸状态下，手掌越靠近摄像头(z越小)，画面越往前推
        if (currentState === 'EXPLODED') {
            // wrist.z 越小(手越近)，相机越前进(Z越小)；wrist.z 越大(手越远)，相机越后退(Z越大)
            // wrist.z 范围约 -0.3~0.1，扩大灵敏系数到 120
            targetCameraPos.z = 35 + wrist.z * 120;
            targetCameraPos.z = Math.max(15, Math.min(42, targetCameraPos.z));
        } else if (currentState === 'HEART') {
            targetCameraPos.z = 35;
        }

        const fingertips = [8, 12, 16, 20];
        let totalDist = 0;
        fingertips.forEach(tipIndex => {
            const dx = landmarks[tipIndex].x - wrist.x;
            const dy = landmarks[tipIndex].y - wrist.y;
            totalDist += Math.sqrt(dx*dx + dy*dy);
        });
        const avgDist = totalDist / fingertips.length;

        if (avgDist > 0.25 && currentState === 'HEART') { 
            triggerExplosion();
            // 隐藏手势提示
            const gestureHint = document.getElementById('gesture-hint');
            if (gestureHint && gestureHint.classList.contains('visible')) {
                gestureHint.classList.add('fade-out');
                gestureHint.classList.remove('visible');
            }
            // 第一次爆炸后显示握拳收回提示
            if (!hasTriggeredExplosion) {
                hasTriggeredExplosion = true;
                const fistHint = document.getElementById('fist-hint');
                if (fistHint) fistHint.classList.add('visible');
            }
        } else if (avgDist < 0.12 && currentState === 'EXPLODED') { 
            currentState = 'HEART';
            // 隐藏握拳提示
            const fistHint = document.getElementById('fist-hint');
            if (fistHint && fistHint.classList.contains('visible')) {
                fistHint.classList.add('fade-out');
                fistHint.classList.remove('visible');
            }
            // 回到爱心界面，显示摄像头
            const cameraHeart = document.getElementById('camera-heart');
            if (cameraHeart) cameraHeart.classList.add('visible');
        }
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});

// ==========================================
// 6. 动画物理引擎 (心跳、漂浮与层叠相册)
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // 核心灯光呼吸效果
    coreLight.intensity = 5 + Math.sin(elapsedTime * 3.5) * 2;
    bottomGlowLight.intensity = 4 + Math.sin(elapsedTime * 2.8 + 1) * 2;
    topWarmLight.intensity = 3 + Math.sin(elapsedTime * 2.2 + 2) * 1.5;

    // 调整 Bloom 强度随心跳变化
    bloomPass.strength = 0.4 + Math.sin(elapsedTime * 2.5) * 0.1;
    
    stardust.rotation.y = elapsedTime * 0.04;
    stardust.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1;

    // 飘落花瓣动画
    const petalPositions = romanticPetals.petals.geometry.attributes.position.array;
    for (let i = 0; i < romanticPetals.petalData.length; i++) {
        const pd = romanticPetals.petalData[i];
        petalPositions[i * 3 + 1] -= pd.speedY;
        petalPositions[i * 3] += Math.sin(elapsedTime * pd.swaySpeed + pd.phase) * 0.02;
        
        if (petalPositions[i * 3 + 1] < -20) {
            petalPositions[i * 3 + 1] = 20;
            petalPositions[i * 3] = (Math.random() - 0.5) * 40;
            petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
    }
    romanticPetals.petals.geometry.attributes.position.needsUpdate = true;

    // GALLERY 模式下固定相机在正中心
    if (currentState === 'GALLERY') {
        camera.position.lerp(new THREE.Vector3(0, 0, 35), 0.1);
    } else {
        // 提高视差跟随响应速度
        const lerpSpeed = currentState === 'EXPLODED' ? 0.15 : 0.1;
        camera.position.lerp(targetCameraPos, lerpSpeed);
    }
    camera.lookAt(scene.position);

    const heartbeatScale = 1 + 0.08 * Math.abs(Math.sin(elapsedTime * 2.5));

    // 更新流动光点
    const flowPositions = flowSystem.flowPoints.geometry.attributes.position.array;
    for (let i = 0; i < flowSystem.flowData.length; i++) {
        const fd = flowSystem.flowData[i];
        fd.progress += fd.speed;
        if (fd.progress > 1) fd.progress -= 1;
        const pt = heartGlow.curve.getPointAt(fd.progress);
        flowPositions[i * 3] = pt.x + (Math.sin(elapsedTime * 3 + i) * fd.offset);
        flowPositions[i * 3 + 1] = pt.y + (Math.cos(elapsedTime * 2.5 + i) * fd.offset);
        flowPositions[i * 3 + 2] = pt.z;
    }
    flowSystem.flowPoints.geometry.attributes.position.needsUpdate = true;

    // 爱心轨迹光晕呼吸
    heartGlow.tubeLine.material.opacity = 0.5 + Math.sin(elapsedTime * 3) * 0.2;
    heartGlow.outerLine.material.opacity = 0.2 + Math.sin(elapsedTime * 2.5 + 1) * 0.1;

    photos.forEach(group => {
        const data = group.userData;

        // 懒加载淡入
        if (data.isLoaded && data.fadeProgress < 1) {
            data.fadeProgress += 0.02;
            data.photoMesh.material.color.lerpColors(new THREE.Color(0x111111), new THREE.Color(0xffffff), Math.min(data.fadeProgress, 1));
        }

        if (currentState === 'HEART') {
            group.position.lerp(data.heartPos, 0.06);
            group.quaternion.slerp(new THREE.Quaternion().setFromEuler(data.heartRot), 0.06);
            group.scale.lerp(new THREE.Vector3(heartbeatScale, heartbeatScale, heartbeatScale), 0.1);
            
            // 恢复透明度
            data.frameMat.opacity += (1 - data.frameMat.opacity) * 0.1;
            data.photoMat.opacity += (1 - data.photoMat.opacity) * 0.1;
            
        } else if (currentState === 'EXPLODED') {
            const floatOffset = new THREE.Vector3(
                Math.sin(elapsedTime * data.floatSpeed * 2) * 1.2,
                Math.cos(elapsedTime * data.floatSpeed * 3) * 1.2,
                Math.sin(elapsedTime * data.floatSpeed * 1.5) * 1.2
            );
            const currentTargetPos = data.explodePos.clone().add(floatOffset);
            
            group.position.lerp(currentTargetPos, 0.08);
            // 正弦波来回旋转，幅度为 explodeRot（±90°），平缓摆动
            const rotWave = Math.sin(elapsedTime * 0.8 + data.rotPhase);
            group.rotation.set(
                data.explodeRot.x * rotWave,
                data.explodeRot.y * rotWave,
                data.explodeRot.z * rotWave
            );
            group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);

            data.frameMat.opacity += (1 - data.frameMat.opacity) * 0.1;
            data.photoMat.opacity += (1 - data.photoMat.opacity) * 0.1;

        } else if (currentState === 'GALLERY') {
            const diff = data.index - currentGalleryIndex;
            const absDiff = Math.abs(diff);
            
            let targetPos = new THREE.Vector3();
            let targetRot = new THREE.Euler();
            let targetOpacity = 0;
            let targetScale = 1;

            if (diff === 0) {
                // 当前照片：屏幕正中心
                targetPos.set(0, 0, 22); 
                targetRot.set(0, 0, 0);
                targetOpacity = 1;
                targetScale = 1.3;
            } else if (diff > 0) {
                // 未浏览的：右侧水平排列
                targetPos.set(diff * 5, 0, 22 - absDiff * 2);
                targetRot.set(0, -0.15, 0);
                targetOpacity = Math.max(0.6 - diff * 0.1, 0.15); 
                targetScale = 1.0 - diff * 0.1;
            } else {
                // 已浏览的：左侧水平排列
                targetPos.set(diff * 5, 0, 22 - absDiff * 2);
                targetRot.set(0, 0.15, 0);
                targetOpacity = Math.max(0.6 - absDiff * 0.1, 0.15);
                targetScale = 1.0 - absDiff * 0.1;
            }

            group.position.lerp(targetPos, 0.15);
            group.quaternion.slerp(new THREE.Quaternion().setFromEuler(targetRot), 0.15);
            group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
            
            data.frameMat.opacity += (targetOpacity - data.frameMat.opacity) * 0.15;
            data.photoMat.opacity += (targetOpacity - data.photoMat.opacity) * 0.15;
        }
    });

    composer.render();
}

// ==========================================
// 7. 懒加载队列系统
// ==========================================
const textureLoader = new THREE.TextureLoader();
let loadedCount = 0;

// 加载画面 Canvas 粒子动画
let loadingParticles = null;
let loadingCarouselTimer = null;
const loadingMessages = [
    '金风玉露一相逢，便胜却人间无数 ✨',
    '和烤鱼一起走过的日子 🌸',
    '我以海神波塞冬的名义，赐予你爱与被爱的权利 💌',
    '两个灵魂的化合产物充当了恋式反应的催化剂 💞',
    '鼠鼠爱鱼，无限接近于永远 🩷'
];
function initLoadingCarousel() {
    const el = document.getElementById('loading-carousel-text');
    if (!el) return;
    let idx = 0;
    el.textContent = loadingMessages[0];
    loadingCarouselTimer = setInterval(() => {
        idx = (idx + 1) % loadingMessages.length;
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        setTimeout(() => {
            el.textContent = loadingMessages[idx];
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 600);
    }, 3500);
}
function initLoadingCanvas() {
    const canvas = document.getElementById('loading-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.6 + 0.2
        });
    }
    function draw() {
        if (!document.getElementById('loading-overlay') || document.getElementById('loading-overlay').style.opacity === '0') {
            loadingParticles = null;
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,182,193,${p.opacity})`;
            ctx.fill();
        }
        // 连线
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(183,110,121,${0.08 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        loadingParticles = requestAnimationFrame(draw);
    }
    loadingParticles = requestAnimationFrame(draw);
    window.addEventListener('resize', () => {
        if (loadingParticles) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
}

async function loadPhotosInBatches(urls, batchSize = 4) {
    initLoadingCarousel();
    initLoadingCanvas();
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(batch.map((url, index) => loadSingleTexture(url, i + index)));
    }
    // 加载完成后短暂停驻再淡出
    setTimeout(() => {
        clearInterval(loadingCarouselTimer);
        loadingCarouselTimer = null;
        const overlay = document.getElementById('loading-overlay');
        const percent = document.getElementById('loading-percent');
        if (percent) percent.textContent = '100%';
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.transition = 'opacity 0.8s ease';
        }
        cancelAnimationFrame(loadingParticles);
        loadingParticles = null;

        // 加载完成后显示手势提示
        const gestureHint = document.getElementById('gesture-hint');
        if (gestureHint && currentState === 'HEART') {
            setTimeout(() => {
                if (currentState === 'HEART') {
                    gestureHint.classList.add('visible');
                }
            }, 1200);
        }
    }, 600);
}

function loadSingleTexture(url, index) {
    return new Promise((resolve) => {
        textureLoader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            const userData = photos[index].userData;
            const targetMesh = userData.photoMesh;
            targetMesh.material.map = texture;
            targetMesh.material.needsUpdate = true;
            photos[index].userData.isLoaded = true;
            loadedCount++;

            // 按照片原比例调整几何体尺寸
            const img = texture.image;
            if (img && img.naturalWidth && img.naturalHeight) {
                const imgAspect = img.naturalWidth / img.naturalHeight;
                const maxW = 4.0, maxH = 3.0;
                const border = 0.2;
                let pw, ph;
                if (imgAspect >= maxW / maxH) {
                    // 宽图：宽度撑满
                    pw = maxW;
                    ph = maxW / imgAspect;
                } else {
                    // 高图：高度撑满
                    ph = maxH;
                    pw = maxH * imgAspect;
                }
                targetMesh.geometry.dispose();
                targetMesh.geometry = new THREE.PlaneGeometry(pw, ph);
                userData.frameMesh.geometry.dispose();
                userData.frameMesh.geometry = new THREE.PlaneGeometry(pw + border * 2, ph + border * 2);
            }

            const pct = Math.round((loadedCount / totalPhotos) * 100);
            const ringFill = document.getElementById('loading-ring-fill');
            const percentEl = document.getElementById('loading-percent');
            if (ringFill) {
                const circumference = 2 * Math.PI * 44; // ~276.46
                const offset = circumference - (pct / 100) * circumference;
                ringFill.style.strokeDashoffset = offset;
            }
            if (percentEl) percentEl.textContent = `${pct}%`;
            resolve();
        }, undefined, () => resolve()); 
    });
}

// ==========================================
// 8. UI 交互与相册逻辑绑定
// ==========================================
const btnEnter = document.getElementById('btn-enter-gallery');
const galleryUI = document.getElementById('gallery-ui');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnExit = document.getElementById('btn-exit');
const photoCaption = document.getElementById('photo-caption');

// 浏览模式挥手切换防抖
function setSwipeCooldown() {
    gallerySwipeCooldown = true;
    setTimeout(() => {
        gallerySwipeCooldown = false;
    }, 800);
}

// 更新照片备注显示
function updatePhotoCaption() {
    const lockOverlay = document.getElementById('photo-lock-overlay');
    if (!photoCaption) return;

    // 清理定时器
    clearTimeout(photo20LockHintTimer);
    clearTimeout(photo7LockHintTimer);
    clearTimeout(photo34LockHintTimer);
    clearTimeout(lockSkipBtnTimer);
    clearTimeout(gallerySwipeHintTimer);

    // 关闭跳过按钮（离开锁定页时重置）
    const btnSkipLock = document.getElementById('btn-skip-lock');
    if (btnSkipLock) btnSkipLock.classList.remove('visible');

    if (currentState === 'GALLERY') {
        // 照片7：双手比心彩蛋
        if (currentGalleryIndex === 6 && isPhoto7Locked) {
            photoCaption.classList.add('hidden');
            if (lockOverlay) {
                lockOverlay.classList.add('show');
                const hintPrimary = document.getElementById('lock-hint-primary');
                const hintSecondary = document.getElementById('lock-hint-secondary');
                if (hintPrimary) {
                    hintPrimary.textContent = '双手比心解锁隐藏回忆 ❤️';
                    hintPrimary.classList.add('visible');
                }
                if (hintSecondary) hintSecondary.classList.remove('visible');
            }
            lockSkipBtnTimer = setTimeout(() => {
                if (btnSkipLock) btnSkipLock.classList.add('visible');
            }, 20000);
        }
        // 照片20：年龄彩蛋
        else if (currentGalleryIndex === 19 && isPhoto20Locked) {
            photoCaption.classList.add('hidden');
            if (lockOverlay) {
                lockOverlay.classList.add('show');
                const hintPrimary = document.getElementById('lock-hint-primary');
                const hintSecondary = document.getElementById('lock-hint-secondary');
                const age = getPartnerAge();
                if (hintPrimary) {
                    hintPrimary.textContent = `我的小鱼今年 ${age} 岁啦！🎂`;
                    hintPrimary.classList.add('visible');
                }
                if (hintSecondary) hintSecondary.classList.remove('visible');
                // 10秒后显示手势提示
                photo20LockHintTimer = setTimeout(() => {
                    if (hintSecondary) hintSecondary.classList.add('visible');
                }, 10000);
            }
            lockSkipBtnTimer = setTimeout(() => {
                if (btnSkipLock) btnSkipLock.classList.add('visible');
            }, 20000);
        }
        // 照片34：双手OK圆圈放眼睛上 👀
        else if (currentGalleryIndex === 33 && isPhoto34Locked) {
            photoCaption.classList.add('hidden');
            if (lockOverlay) {
                lockOverlay.classList.add('show');
                const hintPrimary = document.getElementById('lock-hint-primary');
                const hintSecondary = document.getElementById('lock-hint-secondary');
                if (hintPrimary) {
                    hintPrimary.textContent = '双手比⭕️ 放在眼睛上 👀';
                    hintPrimary.classList.add('visible');
                }
                if (hintSecondary) {
                    hintSecondary.textContent = '四指与拇指围成圆圈，像望远镜一样看';
                    hintSecondary.classList.add('visible');
                }
            }
            lockSkipBtnTimer = setTimeout(() => {
                if (btnSkipLock) btnSkipLock.classList.add('visible');
            }, 20000);
        } else {
            const caption = photoCaptions[currentGalleryIndex];
            if (caption) {
                photoCaption.textContent = caption;
                photoCaption.classList.remove('hidden');
            } else {
                photoCaption.classList.add('hidden');
            }
            if (lockOverlay) {
                lockOverlay.classList.remove('show');
                lockOverlay.classList.remove('unlocked');
            }
        }
    } else {
        photoCaption.classList.add('hidden');
        if (lockOverlay) {
            lockOverlay.classList.remove('show');
            lockOverlay.classList.remove('unlocked');
        }
    }

    // 最后一张照片（索引33）且已解锁 → 显示播放视频按钮
    const btnPlayVideo = document.getElementById('btn-play-video');
    if (btnPlayVideo) {
        if (currentState === 'GALLERY' && currentGalleryIndex === 33 && !isPhoto34Locked) {
            btnPlayVideo.classList.remove('hidden');
        } else {
            btnPlayVideo.classList.add('hidden');
        }
    }
}

if (btnEnter && galleryUI && btnPrev && btnNext && btnExit) {
    const gallerySwipeHint = document.getElementById('gallery-swipe-hint');
    
    btnEnter.addEventListener('click', () => {
        currentState = 'GALLERY';
        currentGalleryIndex = 0; 
        updatePhotoCaption();
        // 重置相机到正中心，消除手势偏移
        targetCameraPos.set(0, 0, 35);
        btnEnter.classList.add('hidden');
        galleryUI.classList.remove('hidden');
        // 进入浏览模式时显示一次手势提示，5秒后淡出
        if (gallerySwipeHint) {
            gallerySwipeHint.classList.remove('hidden');
            gallerySwipeHint.classList.remove('fade-out');
            clearTimeout(gallerySwipeHintTimer);
            gallerySwipeHintTimer = setTimeout(() => {
                if (currentState === 'GALLERY') {
                    gallerySwipeHint.classList.add('fade-out');
                }
            }, 5000);
        }
    });

    btnExit.addEventListener('click', () => {
        currentState = 'HEART';
        updatePhotoCaption();
        targetCameraPos.set(0, 0, 35); // 重置相机位置
        btnEnter.classList.remove('hidden');
        galleryUI.classList.add('hidden');
        // 隐藏双手手势提示
        clearTimeout(gallerySwipeHintTimer);
        if (gallerySwipeHint) {
            gallerySwipeHint.classList.add('hidden');
            gallerySwipeHint.classList.remove('fade-out');
        }
    });

    btnNext.addEventListener('click', () => {
        if (currentGalleryIndex < totalPhotos - 1) {
            currentGalleryIndex++;
            updatePhotoCaption();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentGalleryIndex > 0) {
            currentGalleryIndex--;
            updatePhotoCaption();
        }
    });
}

// 跳过彩蛋按钮
const btnSkipLock = document.getElementById('btn-skip-lock');
if (btnSkipLock) {
    btnSkipLock.addEventListener('click', () => {
        // 解锁当前照片
        if (currentGalleryIndex === 6) {
            isPhoto7Locked = false;
            localStorage.setItem('photo7_unlocked', 'true');
        } else if (currentGalleryIndex === 19) {
            isPhoto20Locked = false;
            localStorage.setItem('photo20_unlocked', 'true');
        } else if (currentGalleryIndex === 33) {
            isPhoto34Locked = false;
            localStorage.setItem('photo34_unlocked', 'true');
        }
        // 跳转到下一张
        if (currentGalleryIndex < totalPhotos - 1) {
            currentGalleryIndex++;
        }
        updatePhotoCaption();
    });
}

// 视频播放按钮与遮罩
const btnPlayVideo = document.getElementById('btn-play-video');
const videoOverlay = document.getElementById('video-overlay');
const memoryVideo = document.getElementById('memory-video');
const btnCloseVideo = document.getElementById('btn-close-video');

if (btnPlayVideo && videoOverlay && memoryVideo && btnCloseVideo) {
    btnPlayVideo.addEventListener('click', () => {
        videoOverlay.classList.remove('hidden');
        memoryVideo.currentTime = 0;
        memoryVideo.play().catch(() => {});
    });

    btnCloseVideo.addEventListener('click', () => {
        memoryVideo.pause();
        videoOverlay.classList.add('hidden');
    });

    // 点击背景关闭
    videoOverlay.addEventListener('click', (e) => {
        if (e.target === videoOverlay || e.target.classList.contains('video-backdrop')) {
            memoryVideo.pause();
            videoOverlay.classList.add('hidden');
        }
    });

    // 视频播完自动关闭
    memoryVideo.addEventListener('ended', () => {
        videoOverlay.classList.add('hidden');
    });

    // 按 Esc 关闭视频
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !videoOverlay.classList.contains('hidden')) {
            memoryVideo.pause();
            videoOverlay.classList.add('hidden');
        }
    });
}

// ==========================================
// 9. 启动与适配
// ==========================================
let sceneStarted = false;

function startExperience() {
    if (sceneStarted) return;
    sceneStarted = true;

    initHeartShape();
    animate();
    loadPhotosInBatches(photoUrls, 4);

    // 启动主场景摄像头
    cameraUtils.start().then(() => {
        const stream = videoElement.srcObject;
        if (stream && cameraPreview) {
            cameraPreview.srcObject = stream;
            cameraPreview.parentElement.classList.add('visible');
        }
    });

    // 手势提示将在加载完成后显示，避免被 loading 遮罩盖住

    // 纪念日倒计时
    const daysNumber = document.getElementById('days-number');
    const daysCounter = document.getElementById('days-counter');
    if (daysNumber) {
        daysNumber.textContent = getDaysTogether();
        if (daysCounter) daysCounter.classList.add('visible');
    }

    // 音乐控制
    const bgMusic = document.getElementById('bg-music');
    const btnMusic = document.getElementById('btn-music');
    let musicPlaying = false;

    if (bgMusic && btnMusic) {
        bgMusic.src = 'bgm.mp3';
        bgMusic.volume = 0.4;

        btnMusic.addEventListener('click', () => {
            if (musicPlaying) {
                bgMusic.pause();
                btnMusic.classList.remove('playing');
                btnMusic.textContent = '♪';
            } else {
                bgMusic.play().then(() => {
                    btnMusic.classList.add('playing');
                    btnMusic.textContent = '♫';
                    musicPlaying = true;
                }).catch(() => {});
            }
            musicPlaying = !musicPlaying;
        });

        document.addEventListener('click', function autoPlay() {
            if (!musicPlaying && sceneStarted) {
                bgMusic.play().then(() => {
                    btnMusic.classList.add('playing');
                    btnMusic.textContent = '♫';
                    musicPlaying = true;
                }).catch(() => {});
            }
        }, { once: true });
    }



    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
}

// 开场按钮 → 吹蜡烛界面
const introOverlay = document.getElementById('intro-overlay');
const btnStart = document.getElementById('btn-start');
const cakeOverlay = document.getElementById('cake-overlay');
const transitionScreen = document.getElementById('transition-screen');

if (introOverlay && btnStart) {
    btnStart.addEventListener('click', () => {
        // 立即进入全屏
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
        // 0.4s 渐隐至黑屏
        introOverlay.classList.add('fade-out');
        if (transitionScreen) transitionScreen.classList.add('show');
        
        setTimeout(() => {
            introOverlay.style.display = 'none';
            if (cakeOverlay) {
                cakeOverlay.classList.add('active');
                initCakeScene();
            }
            // 0.5s 渐显至蛋糕界面
            setTimeout(() => {
                if (transitionScreen) transitionScreen.classList.remove('show');
            }, 50);
        }, 400);
    });
} else {
    // 如果没有开场元素，直接启动
    startExperience();
}

// ==========================================
// 10. 吹蜡烛场景
// ==========================================
function initCakeScene() {
    const cakeCanvas = document.getElementById('cake-canvas');
    const cakeStatusText = document.getElementById('cake-status-text');
    const btnEnterHeart = document.getElementById('btn-enter-heart');
    
    if (!cakeCanvas || !cakeStatusText) return;
    
    const canvasCtx = cakeCanvas.getContext('2d');
    let canvasW, canvasH;
    
    function resizeCakeCanvas() {
        const container = document.getElementById('cake-container');
        if (container) {
            canvasW = cakeCanvas.width = container.clientWidth;
            canvasH = cakeCanvas.height = container.clientHeight;
        }
    }
    window.addEventListener('resize', resizeCakeCanvas);
    
    let cakeState = 'UNLIT'; // UNLIT | BURNING | BLOWN
    
    const candlePos = { x: 0.5, y: 0.55 };
    
    // 彩带粒子系统
    const confettiParticles = [];
    let confettiBurst = false;
    
    // 等距绘图函数
    function drawDiamond(ctx, x, y, dw, dh, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y + dh);
        ctx.lineTo(x - dw, y);
        ctx.lineTo(x, y - dh);
        ctx.lineTo(x + dw, y);
        ctx.fill();
    }
    
    function drawDrip(ctx, cx, cy, w, hIso, isLeft, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy + hIso);
        const drops = [
            {x: 0, d: 20}, {x: 20, d: 20}, {x: 20, d: 35},
            {x: 45, d: 35}, {x: 45, d: 15}, {x: 75, d: 15},
            {x: 75, d: 30}, {x: 100, d: 30}, {x: 100, d: 10},
            {x: 120, d: 10}, {x: 120, d: 0}
        ];
        for(let p of drops) {
            let px = isLeft ? cx - p.x : cx + p.x;
            let baseY = cy + hIso - (p.x * hIso / w);
            ctx.lineTo(px, baseY + p.d);
        }
        ctx.lineTo(isLeft ? cx - w : cx + w, cy);
        ctx.lineTo(cx, cy + hIso);
        ctx.fill();
    }
    
    function drawCakeScene() {
        if (canvasW === undefined) resizeCakeCanvas();
        canvasCtx.clearRect(0, 0, canvasW, canvasH);
        
        const cx = candlePos.x * canvasW;
        const cy = candlePos.y * canvasH;
        
        // 按画布高度等比缩放蛋糕，保持比例不拉伸
        const baseH = 700;
        const cakeScale = Math.min(canvasW, canvasH) / baseH;
        
        canvasCtx.save();
        canvasCtx.translate(cx, cy);
        canvasCtx.scale(cakeScale, cakeScale);
        canvasCtx.translate(-cx, -cy);
        
        const w = 120, hIso = 60, h = 90;
        
        // 盘子
        const pW = 150, pIso = 75, pH = 10, pY = cy + h;
        canvasCtx.fillStyle = '#dcdde1';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, pY + pIso); canvasCtx.lineTo(cx - pW, pY); canvasCtx.lineTo(cx - pW, pY + pH); canvasCtx.lineTo(cx, pY + pIso + pH); canvasCtx.fill();
        canvasCtx.fillStyle = '#bdc3c7';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, pY + pIso); canvasCtx.lineTo(cx + pW, pY); canvasCtx.lineTo(cx + pW, pY + pH); canvasCtx.lineTo(cx, pY + pIso + pH); canvasCtx.fill();
        drawDiamond(canvasCtx, cx, pY, pW, pIso, '#f5f6fa');
        
        // 蛋糕本体
        canvasCtx.fillStyle = '#4a2c16';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy + hIso); canvasCtx.lineTo(cx - w, cy); canvasCtx.lineTo(cx - w, cy + h); canvasCtx.lineTo(cx, cy + hIso + h); canvasCtx.fill();
        canvasCtx.fillStyle = '#361e0e';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy + hIso); canvasCtx.lineTo(cx + w, cy); canvasCtx.lineTo(cx + w, cy + h); canvasCtx.lineTo(cx, cy + hIso + h); canvasCtx.fill();
        
        // 糖霜
        drawDiamond(canvasCtx, cx, cy, w, hIso, '#fdfdfd');
        drawDrip(canvasCtx, cx, cy, w, hIso, true, '#f1f2f6');
        drawDrip(canvasCtx, cx, cy, w, hIso, false, '#dfe4ea');
        
        // 顶面装饰
        drawDiamond(canvasCtx, cx - 40, cy + 15, 15, 7.5, '#f5e4c3');
        drawDiamond(canvasCtx, cx + 50, cy - 20, 20, 10, '#f5e4c3');
        drawDiamond(canvasCtx, cx, cy - 40, 15, 7.5, '#f5e4c3');
        drawDiamond(canvasCtx, cx - 25, cy + 30, 12, 6, '#e74c3c');
        drawDiamond(canvasCtx, cx + 25, cy + 30, 12, 6, '#c0392b');
        drawDiamond(canvasCtx, cx - 60, cy - 5, 12, 6, '#e74c3c');
        drawDiamond(canvasCtx, cx + 50, cy + 5, 12, 6, '#c0392b');
        drawDiamond(canvasCtx, cx + 10, cy - 25, 12, 6, '#c0392b');
        
        // 蜡烛
        const cw = 10, chIso = 5, ch = 45;
        canvasCtx.fillStyle = '#f39c12';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy + chIso); canvasCtx.lineTo(cx - cw, cy); canvasCtx.lineTo(cx - cw, cy - ch); canvasCtx.lineTo(cx, cy + chIso - ch); canvasCtx.fill();
        canvasCtx.fillStyle = '#e67e22';
        canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy + chIso); canvasCtx.lineTo(cx + cw, cy); canvasCtx.lineTo(cx + cw, cy - ch); canvasCtx.lineTo(cx, cy + chIso - ch); canvasCtx.fill();
        drawDiamond(canvasCtx, cx, cy - ch, cw, chIso, '#f1c40f');
        canvasCtx.fillStyle = '#2c3e50';
        canvasCtx.fillRect(cx - 1.5, cy - ch - 12, 3, 12);
        
        // 火焰
        if (cakeState === 'BURNING') {
            const flameY = cy - ch - 22;
            canvasCtx.fillStyle = 'rgba(255, 153, 0, 0.8)';
            canvasCtx.beginPath();
            const flickerY = Math.random() * 4;
            canvasCtx.ellipse(cx, flameY + flickerY, 12, 18 + flickerY, 0, 0, Math.PI * 2);
            canvasCtx.fill();
            canvasCtx.fillStyle = 'rgba(255, 255, 102, 0.9)';
            canvasCtx.beginPath();
            canvasCtx.ellipse(cx, flameY + flickerY + 4, 6, 10 + flickerY, 0, 0, Math.PI * 2);
            canvasCtx.fill();
        }
        
        canvasCtx.restore();
        
        // 彩带爆炸（蜡烛熄灭后）
        if (cakeState === 'BLOWN') {
            // 首次进入时生成彩带粒子
            if (!confettiBurst) {
                confettiBurst = true;
                const burstX = cx;
                const burstY = cy - (ch + 22) * cakeScale;
                const colors = [
                    '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
                    '#ff922b', '#f06595', '#20c997', '#845ef7',
                    '#ff4757', '#2ed573', '#1e90ff', '#ff6348',
                    '#e91e63', '#ff9800', '#00bcd4', '#cddc39'
                ];
                for (let i = 0; i < 180; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const hSpeed = 10 + Math.random() * 28;
                    const vSpeed = 3 + Math.random() * 12;
                    confettiParticles.push({
                        x: burstX + (Math.random() - 0.5) * 20,
                        y: burstY + (Math.random() - 0.5) * 10,
                        vx: Math.cos(angle) * hSpeed * 1.5,
                        vy: Math.sin(angle) * vSpeed - Math.random() * 5,
                        rotation: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.4,
                        w: 8 + Math.random() * 14,
                        h: 4 + Math.random() * 7,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        gravity: 0.12 + Math.random() * 0.08,
                        friction: 0.92 + Math.random() * 0.02,
                        life: 1.0,
                        decay: 0.012 + Math.random() * 0.006
                    });
                }
            }
            
            // 更新并绘制彩带
            for (let i = confettiParticles.length - 1; i >= 0; i--) {
                const p = confettiParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.friction;
                p.rotation += p.rotSpeed;
                p.life -= p.decay;
                
                if (p.life <= 0) {
                    confettiParticles.splice(i, 1);
                    continue;
                }
                
                const alpha = p.life;
                canvasCtx.save();
                canvasCtx.translate(p.x, p.y);
                canvasCtx.rotate(p.rotation);
                canvasCtx.globalAlpha = alpha;
                canvasCtx.fillStyle = p.color;
                canvasCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                canvasCtx.restore();
            }
        }
    }
    
    // MediaPipe Hands - 捏合点火
    const cakeHands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    cakeHands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    
    cakeHands.onResults((results) => {
        if (cakeState !== 'UNLIT') return;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const thumbTip = landmarks[4], indexTip = landmarks[8];
            const dx = thumbTip.x - indexTip.x;
            const dy = thumbTip.y - indexTip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.05) {
                const pinchX = ((thumbTip.x + indexTip.x) / 2) * canvasW;
                const pinchY = ((thumbTip.y + indexTip.y) / 2) * canvasH;
                
                canvasCtx.fillStyle = '#ff4757';
                canvasCtx.beginPath();
                canvasCtx.arc(pinchX, pinchY, 15, 0, Math.PI * 2);
                canvasCtx.fill();
                
                const hitScale = Math.min(canvasW, canvasH) / 700;
                const candleWickX = candlePos.x * canvasW;
                const candleWickY = candlePos.y * canvasH - 57 * hitScale;
                const hitDist = Math.sqrt(Math.pow(pinchX - candleWickX, 2) + Math.pow(pinchY - candleWickY, 2));
                if (hitDist < 40 * hitScale) {
                    lightCakeCandle();
                }
            }
        }
    });
    
    // MediaPipe FaceMesh - 噘嘴吹气
    const cakeFaceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }});
    cakeFaceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    
    cakeFaceMesh.onResults((results) => {
        if (cakeState !== 'BURNING') return;
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            const leftCorner = landmarks[78], rightCorner = landmarks[308];
            const upperLip = landmarks[13], lowerLip = landmarks[14];
            const mouthWidth = Math.sqrt(Math.pow(leftCorner.x - rightCorner.x, 2) + Math.pow(leftCorner.y - rightCorner.y, 2));
            const mouthHeight = Math.sqrt(Math.pow(upperLip.x - lowerLip.x, 2) + Math.pow(upperLip.y - lowerLip.y, 2));
            
            if (mouthWidth < 0.08 && mouthHeight > 0.02 && mouthHeight < 0.06) {
                blowOutCakeCandle();
            }
        }
    });
    
    let lightCandleTimer = null;
    function lightCakeCandle() {
        if (lightCandleTimer) return;
        cakeStatusText.textContent = '🔥';
        lightCandleTimer = setTimeout(() => {
            cakeState = 'BURNING';
            cakeStatusText.textContent = '蜡烛已点燃！对着屏幕噘嘴吹气 💋';
            lightCandleTimer = null;
        }, 1000);
    }
    
    let blowCandleTimer = null;
    function blowOutCakeCandle() {
        if (blowCandleTimer) return;
        cakeStatusText.textContent = '💨';
        blowCandleTimer = setTimeout(() => {
            cakeState = 'BLOWN';
            cakeStatusText.textContent = '生日快乐！🎂';
            if (btnEnterHeart) btnEnterHeart.classList.add('visible');
            // 重置照片7、20、34锁定，下次浏览时需重新解锁
            isPhoto20Locked = true;
            localStorage.removeItem('photo20_unlocked');
            isPhoto7Locked = true;
            localStorage.removeItem('photo7_unlocked');
            isPhoto34Locked = true;
            localStorage.removeItem('photo34_unlocked');
            blowCandleTimer = null;
        }, 1700);
    }
    
    // 蛋糕场景的摄像头
    const cakeCamera = new Camera(document.getElementById('input_video'), {
        onFrame: async () => {
            if (canvasW === undefined) resizeCakeCanvas();
            drawCakeScene();
            await cakeHands.send({image: document.getElementById('input_video')});
            await cakeFaceMesh.send({image: document.getElementById('input_video')});
        },
        width: 1280, height: 720
    });
    
    cakeCamera.start().then(() => {
        cakeStatusText.textContent = '捏合手指，把红点移到蜡烛上点火 🕯️';
    }).catch((err) => {
        cakeStatusText.textContent = '无法访问摄像头，请检查权限';
        console.error(err);
    });
    
    // 进入爱心界面按钮
    if (btnEnterHeart) {
        btnEnterHeart.addEventListener('click', () => {
            // 停止蜡烛场景的摄像头和渲染
            cakeCamera.stop();
            // 隐藏蛋糕界面
            cakeOverlay.classList.remove('active');
            // 启动爱心界面
            startExperience();
        });
    }
}