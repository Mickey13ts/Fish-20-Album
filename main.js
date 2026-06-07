import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

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
renderer.toneMappingExposure = 1.0; 
document.body.appendChild(renderer.domElement);

// 后处理 - Bloom 发光
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,   // strength - 发光强度
    0.35,  // radius - 发光半径
    0.6    // threshold - 亮度阈值（降低让更多元素发光）
);
composer.addPass(bloomPass);

// 轻微 RGB 偏移，增添梦幻感
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0015;
composer.addPass(rgbShiftPass);
rgbShiftPass.renderToScreen = true;

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

const photoUrls = Array.from({ length: totalPhotos }, (_, i) => `textures/photo${i + 1}.jpg`);

// 纪念日配置：2025年1月6日是在一起的第1天
const ANNIVERSARY_DATE = new Date('2025-01-06');
function getDaysTogether() {
    const now = new Date();
    const diff = now.getTime() - ANNIVERSARY_DATE.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

// 照片备注配置：每张照片的简短描述（按索引对应）
const photoCaptions = {
    0: '我们的第一张合照',
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
            glowPhase: Math.random() * Math.PI * 2
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
        group.userData.explodeRot.set(
            (Math.random() - 0.5) * Math.PI * 0.6, 
            (Math.random() - 0.5) * Math.PI * 0.6, 
            (Math.random() - 0.5) * Math.PI * 0.6
        );
    });
}

const videoElement = document.getElementById('input_video');
const cameraPreview = document.getElementById('camera-preview');
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

hands.onResults((results) => {
    // 浏览回忆模式下完全禁用手势控制
    if (currentState === 'GALLERY') return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];
        
        // 首次检测到手，隐藏手势提示
        const gestureHint = document.getElementById('gesture-hint');
        if (gestureHint && gestureHint.classList.contains('visible')) {
            gestureHint.classList.add('fade-out');
            gestureHint.classList.remove('visible');
        }

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
cameraUtils.start().then(() => {
    const stream = videoElement.srcObject;
    if (stream && cameraPreview) {
        cameraPreview.srcObject = stream;
        // 初始状态 HEART，显示爱心摄像头窗口
        cameraPreview.parentElement.classList.add('visible');
    }
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
    bloomPass.strength = 0.6 + Math.sin(elapsedTime * 2.5) * 0.15;
    
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
        // 爆炸状态下 Z 轴响应更快
        const lerpSpeed = currentState === 'EXPLODED' ? 0.12 : 0.05;
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
            group.rotation.x += data.spinSpeed.x;
            group.rotation.y += data.spinSpeed.y;
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

            group.position.lerp(targetPos, 0.08);
            group.quaternion.slerp(new THREE.Quaternion().setFromEuler(targetRot), 0.08);
            group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
            
            data.frameMat.opacity += (targetOpacity - data.frameMat.opacity) * 0.08;
            data.photoMat.opacity += (targetOpacity - data.photoMat.opacity) * 0.08;
        }
    });

    composer.render();
}

// ==========================================
// 7. 懒加载队列系统
// ==========================================
const textureLoader = new THREE.TextureLoader();
let loadedCount = 0;

async function loadPhotosInBatches(urls, batchSize = 4) {
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(batch.map((url, index) => loadSingleTexture(url, i + index)));
    }
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if(overlay) {
            overlay.style.opacity = 0;
            overlay.style.transition = 'opacity 1s ease';
        }
    }, 1000);
}

function loadSingleTexture(url, index) {
    return new Promise((resolve) => {
        textureLoader.load(url, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace; 
            const targetMesh = photos[index].userData.photoMesh;
            targetMesh.material.map = texture;
            targetMesh.material.needsUpdate = true;
            photos[index].userData.isLoaded = true;
            loadedCount++;
            
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            if(progressBar) progressBar.style.width = `${(loadedCount / totalPhotos) * 100}%`;
            if(progressText) progressText.innerText = `${loadedCount}/${totalPhotos}`;
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

// 更新照片备注显示
function updatePhotoCaption() {
    if (!photoCaption) return;
    if (currentState === 'GALLERY') {
        const caption = photoCaptions[currentGalleryIndex];
        if (caption) {
            photoCaption.textContent = caption;
            photoCaption.classList.remove('hidden');
        } else {
            photoCaption.classList.add('hidden');
        }
    } else {
        photoCaption.classList.add('hidden');
    }
}

if (btnEnter && galleryUI && btnPrev && btnNext && btnExit) {
    btnEnter.addEventListener('click', () => {
        currentState = 'GALLERY';
        currentGalleryIndex = 0; 
        updatePhotoCaption();
        // 隐藏摄像头爱心窗口
        const cameraHeart = document.getElementById('camera-heart');
        if (cameraHeart) cameraHeart.classList.remove('visible');
        // 重置相机到正中心，消除手势偏移
        targetCameraPos.set(0, 0, 35);
        camera.position.set(0, 0, 35);
        // 立即将所有照片放到 GALLERY 布局的初始位置
        photos.forEach(group => {
            const diff = group.userData.index - currentGalleryIndex;
            const absDiff = Math.abs(diff);
            if (diff === 0) {
                group.position.set(0, 0, 22);
                group.rotation.set(0, 0, 0);
                group.scale.set(1.3, 1.3, 1.3);
            } else {
                group.position.set(diff * 5, 0, 22 - absDiff * 2);
                group.rotation.set(0, diff > 0 ? -0.15 : 0.15, 0);
                group.scale.set(1.0 - absDiff * 0.1, 1.0 - absDiff * 0.1, 1.0 - absDiff * 0.1);
            }
        });
        btnEnter.classList.add('hidden');
        galleryUI.classList.remove('hidden');
    });

    btnExit.addEventListener('click', () => {
        currentState = 'HEART';
        updatePhotoCaption();
        // 显示摄像头爱心窗口
        const cameraHeart = document.getElementById('camera-heart');
        if (cameraHeart) cameraHeart.classList.add('visible');
        targetCameraPos.set(0, 0, 35); // 重置相机位置
        btnEnter.classList.remove('hidden');
        galleryUI.classList.add('hidden');
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

    // 手势提示：延迟显示，给场景一点加载时间
    const gestureHint = document.getElementById('gesture-hint');
    if (gestureHint) {
        setTimeout(() => {
            gestureHint.classList.add('visible');
        }, 2000);
    }

    // 纪念日倒计时
    const daysNumber = document.getElementById('days-number');
    if (daysNumber) {
        daysNumber.textContent = getDaysTogether();
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

// 开场按钮
const introOverlay = document.getElementById('intro-overlay');
const btnStart = document.getElementById('btn-start');

if (introOverlay && btnStart) {
    btnStart.addEventListener('click', () => {
        introOverlay.classList.add('fade-out');
        startExperience();
        // 淡出动画结束后移除 DOM
        setTimeout(() => {
            introOverlay.style.display = 'none';
        }, 1000);
    });
} else {
    // 如果没有开场元素，直接启动
    startExperience();
}