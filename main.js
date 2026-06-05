import * as THREE from 'three';

// ==========================================
// 1. 核心视觉与场景初始化 (高级感与防发白)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); // 深邃午夜蓝
scene.fog = new THREE.FogExp2(0x050510, 0.015); // 淡淡雾气

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 35;
let targetCameraPos = new THREE.Vector3(0, 0, 35); // 用于视差跟随

// 渲染器配置：防发白，提升清晰度
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // 电影级曝光，保证明亮但不发白
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. 氛围特效：核心光效与灯光
// ==========================================
// 爱心中央的脉冲光源 (心脏能量核心)
const coreLight = new THREE.PointLight(0xff66b2, 3, 60);
scene.add(coreLight);

// 基础照明：保证照片清晰度
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const directionalLight = new THREE.DirectionalLight(0xffeedd, 2.0);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// ==========================================
// 3. 氛围特效：星钻粒子系统 (奢华感星尘)
// ==========================================
function createStardust() {
    const particleCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
        new THREE.Color(0xffffff), // 白色闪烁
        new THREE.Color(0xffb6c1), // 粉色
        new THREE.Color(0xffd700)  // 金色
    ];

    for (let i = 0; i < particleCount; i++) {
        // 球形分布在场景中
        const r = 40 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // 随机分配粉/金/白颜色
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending // 发光混合模式
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    return particles;
}
const stardust = createStardust();

// ==========================================
// 4. 构建 34 张照片与玫瑰金相框
// ==========================================
const photos = [];
const totalPhotos = 34; // 恢复为 34 张
let currentState = 'HEART'; // 状态：'HEART' 或 'EXPLODED'

// 照片URL列表
const photoUrls = Array.from({ length: totalPhotos }, (_, i) => `textures/photo${i + 1}.jpg`);

function initHeartShape() {
    // 玫瑰金材质：高金属度，适当粗糙度模拟拉丝质感
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xb76e79, 
        metalness: 0.9, 
        roughness: 0.2, 
        side: THREE.DoubleSide
    });

    for (let i = 0; i < totalPhotos; i++) {
        const group = new THREE.Group();
        
        // 边框：比照片稍微大一点的平面，并略微靠后
        const frameGeometry = new THREE.PlaneGeometry(4.4, 3.4);
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.z = -0.05; 
        
        // 照片占位材质 (等待懒加载)
        const photoGeometry = new THREE.PlaneGeometry(4.0, 3.0);
        const photoMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.4,
            metalness: 0.1 // 微微的光泽感
        });
        const photo = new THREE.Mesh(photoGeometry, photoMat);

        group.add(frame);
        group.add(photo);

        // 爱心方程坐标计算 (数学饱满度)
        const t = (i / totalPhotos) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = Math.sin(t * 5) * 3 + (Math.random() - 0.5) * 2; // Z轴交错产生立体厚度
        const scale = 0.5;

        group.userData = {
            index: i,
            photoMesh: photo,
            isLoaded: false,
            fadeProgress: 0,
            heartPos: new THREE.Vector3(x * scale, y * scale, z),
            heartRot: new THREE.Euler(0, 0, 0),
            explodePos: new THREE.Vector3(),
            explodeRot: new THREE.Euler(),
            floatSpeed: Math.random() * 0.02 + 0.01,
            spinSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 }
        };

        group.position.copy(group.userData.heartPos);
        photos.push(group);
        scene.add(group);
    }
}

// ==========================================
// 5. 交互逻辑：高灵敏度 MediaPipe & 无限随机爆炸
// ==========================================
function triggerExplosion() {
    if (currentState === 'EXPLODED') return;
    currentState = 'EXPLODED';
    
    // 无限随机：每次炸开都重新计算所有照片的全新轨迹
    photos.forEach(group => {
        const radius = 20 + Math.random() * 25; // 有远有近
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1); // 球面均匀分布
        
        const ex = radius * Math.sin(phi) * Math.cos(theta);
        const ey = radius * Math.sin(phi) * Math.sin(theta);
        const ez = radius * Math.cos(phi);
        
        group.userData.explodePos.set(ex, ey, ez);
        
        // 随机自转角度
        group.userData.explodeRot.set(
            Math.random() * Math.PI * 2, 
            Math.random() * Math.PI * 2, 
            Math.random() * Math.PI * 2
        );
    });
}

const videoElement = document.getElementById('input_video');
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const wrist = landmarks[0];
        
        // 视角跟随 (Parallax)：手部移动控制摄像机
        targetCameraPos.x = (wrist.x - 0.5) * 20; 
        targetCameraPos.y = -(wrist.y - 0.5) * 20;

        // 手势距离计算 (判断张手/握拳)
        const fingertips = [8, 12, 16, 20];
        let totalDist = 0;
        fingertips.forEach(tipIndex => {
            const dx = landmarks[tipIndex].x - wrist.x;
            const dy = landmarks[tipIndex].y - wrist.y;
            totalDist += Math.sqrt(dx*dx + dy*dy);
        });
        const avgDist = totalDist / fingertips.length;

        // 【提高灵敏度】降低触发阈值
        if (avgDist > 0.25 && currentState === 'HEART') { 
            // 张开手：触发无限随机爆炸
            triggerExplosion();
        } else if (avgDist < 0.12 && currentState === 'EXPLODED') { 
            // 握紧拳：收缩回爱心
            currentState = 'HEART';
        }
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); },
    width: 640, height: 480
});
cameraUtils.start();

// ==========================================
// 6. 动画与物理引擎 (Lerp, 呼吸, 漂浮)
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // 氛围：核心脉冲光源呼吸
    coreLight.intensity = 3 + Math.sin(elapsedTime * 4) * 1.5;

    // 氛围：星钻粒子缓慢旋转
    stardust.rotation.y = elapsedTime * 0.05;

    // 交互：摄像机视差平滑插值
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(scene.position);

    // 物理：计算整体心跳缩放律动 (Heartbeat)
    // 使用绝对值的正弦波模拟“扑通、扑通”的心跳节奏
    const heartbeatScale = 1 + 0.08 * Math.abs(Math.sin(elapsedTime * 2.5));

    photos.forEach(group => {
        const data = group.userData;

        // 懒加载照片淡入特效
        if (data.isLoaded && data.fadeProgress < 1) {
            data.fadeProgress += 0.02;
            data.photoMesh.material.color.lerpColors(new THREE.Color(0x111111), new THREE.Color(0xffffff), Math.min(data.fadeProgress, 1));
        }

        if (currentState === 'HEART') {
            // 平滑插值：收回爱心
            group.position.lerp(data.heartPos, 0.06);
            
            // 四元数平滑插值：面朝正前方
            const targetQuat = new THREE.Quaternion().setFromEuler(data.heartRot);
            group.quaternion.slerp(targetQuat, 0.06);
            
            // 应用动态呼吸律动
            group.scale.lerp(new THREE.Vector3(heartbeatScale, heartbeatScale, heartbeatScale), 0.1);
            
        } else if (currentState === 'EXPLODED') {
            // 物理：零重力漂浮，在爆炸目标点上增加三维正弦游荡
            const floatOffset = new THREE.Vector3(
                Math.sin(elapsedTime * data.floatSpeed * 2) * 3,
                Math.cos(elapsedTime * data.floatSpeed * 3) * 3,
                Math.sin(elapsedTime * data.floatSpeed * 1.5) * 3
            );
            const currentTargetPos = data.explodePos.clone().add(floatOffset);
            
            // 平滑插值：飞向爆炸点
            group.position.lerp(currentTargetPos, 0.03);
            
            // 物理：无规则自转 (Tumbling)
            group.rotation.x += data.spinSpeed.x;
            group.rotation.y += data.spinSpeed.y;
            
            // 取消呼吸缩放，恢复正常大小
            group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    });

    renderer.render(scene, camera);
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
            texture.colorSpace = THREE.SRGBColorSpace; // 关键：防发白
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
        }, undefined, () => resolve()); // 失败不阻塞
    });
}

// ==========================================
// 8. 启动与适配
// ==========================================
initHeartShape();
animate();
loadPhotosInBatches(photoUrls, 4);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});