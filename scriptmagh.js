const URL = "./model/";
let model, webcam;
let scene, camera, renderer, loader, currentModel, currentClass = null;
let loadingModelPromise = null;
let currentLoadToken = 0;

async function init() {
    // Load Teachable Machine model
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    document.getElementById("label").innerText = "Model loaded!";

    // Setup full-screen webcam (back camera)
    const flip = false; // do not flip back camera
// Use the full window size
webcam = new tmImage.Webcam(window.innerWidth, window.innerHeight, false);
await webcam.setup({ facingMode: "environment" });
await webcam.play();
document.getElementById("webcam-container").appendChild(webcam.canvas);

// // Optional: update renderer to match screen
// renderer.setSize(window.innerWidth, window.innerHeight);
// camera.aspect = window.innerWidth / window.innerHeight;
// camera.updateProjectionMatrix();


    // Setup Three.js
    initThreeJS();

    // Handle screen resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        webcam.canvas.width = window.innerWidth;
        webcam.canvas.height = window.innerHeight;
    });

    // Start loop
    window.requestAnimationFrame(loop);
}

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

async function loop() {
    webcam.update();
    await predict();
    renderer.render(scene, camera);
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    const highest = prediction.reduce((a, b) => (a.probability > b.probability ? a : b));
    console.log("Prediction above threshold:", highest.className);

    if (highest.probability > 0.6) {
        document.getElementById("label").innerText = `Detected: ${highest.className}`;
        console.log("detected");

        if (!currentModel || highest.className !== currentClass) {
            currentClass = highest.className;
            showModel(currentClass);
        }
    } else {
        document.getElementById("label").innerText = "No confident detection";

        // Cancel current loading if any
        currentClass = null;
        clearModel();
    }
}


// let currentModel = null;
// let currentClass = null;
let loadingModelClass = null; // track which class is being loaded

function showModel(className) {
    console.log("Entering showModel for class:", className);

    // Remove old model immediately
    clearModel();

    currentClass = className;
    const thisLoadToken = ++currentLoadToken; // assign a new token for this load

    let modelPath = null;
    switch (className) {
        case "Koutoubia": modelPath = "models/koutoubia.glb"; break;
        case "Hassan Tower": modelPath = "models/hassan_tower.glb"; break;
        case "Bab Mrissa": modelPath = "models/bab_mrissa.glb"; break;
        case "Bab al mansour": modelPath = "models/bab_manssour.glb"; break;
        default: 
            console.warn("No model defined for:", className); 
            return;
    }

    console.log("Loading model from path:", modelPath);

    loader.load(
        modelPath,
        (gltf) => {
            console.log("Model loaded:", className);
            clearModel();

            // Only add this model if it's the latest load
            if (thisLoadToken !== currentLoadToken) return;

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

function clearModel() {
    if (currentModel) {
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
}

// --- INTRO CANVAS ANIMATION --- //
window.addEventListener("DOMContentLoaded", () => {
  const introCanvas = document.getElementById("intro-canvas");
  const ctx = introCanvas.getContext("2d");
  let t = 0;

  function animateIntro() {
    const w = introCanvas.width = 300;
    const h = introCanvas.height = 300;
    ctx.clearRect(0, 0, w, h);

    // Subtle glowing circle
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    const r = 100 + 20 * Math.sin(t);
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.fill();

    // Title text
    ctx.fillStyle = "#00bcd4";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Maghribinaya", w / 2, h / 2 + 5);

    t += 0.05;
    requestAnimationFrame(animateIntro);
  }

  animateIntro();
});


const introCanvas = document.getElementById("intro-canvas");
const ctx = introCanvas.getContext("2d");
let t = 0;

function animateIntro() {
  const w = introCanvas.width = 300;
  const h = introCanvas.height = 300;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  const r = 100 + 20 * Math.sin(t);
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#00bcd4";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Maghribinaya", w / 2, h / 2 + 5);
  t += 0.05;
  requestAnimationFrame(animateIntro);
}
animateIntro();

document.getElementById("start-btn").addEventListener("click", async () => {
  const startScreen = document.getElementById("start-screen");
  startScreen.classList.add("fade-out");

  // Wait for fade animation to finish
  setTimeout(async () => {
    startScreen.style.display = "none";

    // Show your AR containers
    document.getElementById("webcam-container").style.display = "block";
    document.getElementById("model-container").style.display = "block";
    document.getElementById("label").style.display = "block";

    // Launch the AR experience
    await init();
  }, 1000); // matches the CSS transition duration
});
