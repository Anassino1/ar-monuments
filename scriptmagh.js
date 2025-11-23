const URL = "./ainaadi/";

let model, webcam;
let scene, camera, renderer, loader, currentModel, currentClass = null;
let currentLoadToken = 0;

// --- INIT FUNCTION ---
async function init() {
    // Load Teachable Machine model
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    document.getElementById("label").innerText = "Model loaded!";

    // Webcam setup
    webcam = new tmImage.Webcam(window.innerWidth, window.innerHeight, false);
    await webcam.setup({
        facingMode: { ideal: "environment" },
        video: { width: window.innerWidth, height: window.innerHeight }
    });
    await webcam.play();

    // Make video and canvas cover screen
    const video = webcam.webcam;
    const canvas = webcam.canvas;

    [video, canvas].forEach(el => {
        el.style.position = "absolute";
        el.style.top = "0";
        el.style.left = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit = "cover";
        el.style.objectPosition = "center center";
        el.setAttribute("playsinline", true);
    });

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(video);
    container.appendChild(canvas);

    // Initialize Three.js
    initThreeJS();

    // Handle resizing
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    // Start AR loop
    window.requestAnimationFrame(loop);
}

// --- RESIZE HANDLER ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    webcam.canvas.width = window.innerWidth;
    webcam.canvas.height = window.innerHeight;
    webcam.webcam.width = window.innerWidth;
    webcam.webcam.height = window.innerHeight;
}

// --- THREE.JS SETUP ---
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("model-container").appendChild(renderer.domElement);

    loader = new THREE.GLTFLoader();

    const light = new THREE.AmbientLight(0xffffff, 2);
    scene.add(light);
}

// --- MAIN LOOP ---
async function loop() {
    webcam.update();
    await predict();
    renderer.render(scene, camera);
    window.requestAnimationFrame(loop);
}

// --- PREDICTION ---
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    const highest = prediction.reduce((a, b) => (a.probability > b.probability ? a : b));

    if (highest.probability > 0.6) {
        document.getElementById("label").innerText = `Detected: ${highest.className}`;
        if (!currentModel || highest.className !== currentClass) {
            currentClass = highest.className;
            showModel(currentClass);
        }
    } else {
        document.getElementById("label").innerText = "No confident detection";
        currentClass = null;
        clearModel();
    }
}

// --- LOAD 3D MODEL ---
function showModel(className) {
    clearModel();
    currentClass = className;
    const thisLoadToken = ++currentLoadToken;

    let modelPath = null;
    switch (className) {
        case "Koutoubia": 
            modelPath = "https://anassino1.github.io/ar-monuments/models/koutoubia.glb"; 
            break;
        case "Hassan Tower": 
            modelPath = "https://anassino1.github.io/ar-monuments/models/hassan_tower.glb"; 
            break;
        case "This object isn't part of Maghribinaya's monuments": 
            modelPath = "https://anassino1.github.io/ar-monuments/models/koutoubia.glb"; 
            break;
        default: 
            console.warn("No model defined for:", className); 
            return;
    }

    loader.load(
        modelPath,
        (gltf) => {
            if (thisLoadToken !== currentLoadToken) return; // ignore outdated loads
            currentModel = gltf.scene;
            currentModel.name = className;
            currentModel.scale.set(1, 1, 1);
            currentModel.position.set(0, -1, 0);
            scene.add(currentModel);
        },
        undefined,
        (error) => console.error("Error loading model:", error)
    );
}

// --- CLEAR CURRENT MODEL ---
function clearModel() {
    if (!currentModel) return;
    scene.remove(currentModel);
    currentModel.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    currentModel = null;
}

// --- START BUTTON ---
document.getElementById("start-btn").addEventListener("click", async () => {
    const startScreen = document.getElementById("start-screen");
    startScreen.classList.add("fade-out");

    setTimeout(async () => {
        startScreen.style.display = "none";

        document.getElementById("webcam-container").style.display = "block";
        document.getElementById("model-container").style.display = "block";
        document.getElementById("label").style.display = "block";

        await init();
    }, 1000);
});
