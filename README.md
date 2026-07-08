# 💖 3D Anniversary Interactive Album

Mickey 为 kissfish 搭建的一个基于 WebGL 和 Three.js 开发的沉浸式 3D 纪念相册。

## ✨ Features

* 🤍 **心形阵列排布**：通过定制的几何逻辑，将 34 张精选照片在 3D 空间中完美构建为心形阵列。
* ✋ **手势追踪交互**：深度集成 MediaPipe 手势识别。无需鼠标，可通过真实的手部动作与相册进行交互。
* 💥 **动态物理特效**：支持手势触发的震撼“爆炸”与“收缩”粒子级动态效果，让相册更具生命力。
* 🎨 **极致视觉渲染**：采用 `MeshStandardMaterial` 材质结合高质感的玫瑰金 (Rose Gold) 纹理，配合动态光影打造拟真画廊模式。
* 🖼️ **画廊漫游模式**：支持平滑切换至画廊视角，沉浸式浏览每一帧回忆。

## 🛠️ Tech Stack

* **图形渲染**：Three.js / WebGL
* **计算机视觉**：MediaPipe (Hand Tracking)
* **前端基础**：HTML5 / CSS3 / JavaScript (ES6+)

## 🚀 Getting Started

由于项目包含加载本地纹理和图片资源的操作，建议通过本地服务器运行以避免浏览器的跨域限制 (CORS)。

### 推荐运行方式：

1. 克隆本项目到本地：
   ```bash
   git clone [https://github.com/Mickey13ts/Fish-20-Album.git](https://github.com/Mickey13ts/Fish-20-Album.git)

```

2. 进入项目目录：
```bash
   cd Fish-20-Album

```


3. 使用 VS Code 打开项目，并安装 **Live Server** 插件。
4. 在底部的状态栏点击 `Go Live`，或者右键点击 `index.html` 选择 `Open with Live Server`。
5. 浏览器将自动打开并在 `http://127.0.0.1:5500` 渲染相册。

## 💡 开发说明

本项目的所有照片资源与手势交互逻辑均在前端动态加载。如果你想替换为自己的照片，请确保照片总数为 34 张，并按照现有路径替换图片资源以保持心形计算逻辑的完美呈现。

---

*Developed with ❤️ in 2026*

---
