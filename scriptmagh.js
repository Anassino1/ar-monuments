const URL = "./ainaadi/";

let model, webcam;
let scene, camera, renderer, loader;
let currentModel = null;
let currentClass = null;
let currentLoadToken = 0;

/* ---------------------------
   INIT FUNCTION
---------------------------- */
async function init() {

    // Load Teachable Machine model
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    document.getElementById("label").innerText = "Model loaded!";

    // Setup webcam
    await setupWebcam();

    // Initialize 3D renderer
    initThreeJS();

    // Resize + orientation listener
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    // Start loop
    requestAnimationFrame(loop);
}

/* ---------------------------
   SETUP WEBCAM (supports resize)
---------------------------- */
async function setupWebcam() {

    if (webcam) {
        try { await webcam.stop(); } catch (e) {}
    }

    webcam = new tmImage.Webcam(window.innerWidth, window.innerHeight, false);

    await webcam.setup({
        facingMode: { ideal: "environment" },
        video: { width: window.innerWidth, height: window.innerHeight }
    });

    await webcam.play();

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);

    webcam.canvas.style.width = "100vw";
    webcam.canvas.style.height = "100vh";
    webcam.canvas.style.objectFit = "cover";
}

/* ---------------------------
   RESIZE HANDLER
---------------------------- */
let resizeTimeout = null;

async function onWindowResize() {

    if (resizeTimeout) clearTimeout(resizeTimeout);

    // Delay the resize so it doesn't trigger 10 times
    resizeTimeout = setTimeout(async () => {

        const W = window.innerWidth;
        const H = window.innerHeight;

        // STOP OLD STREAM
        if (webcam && webcam.webcam && webcam.webcam.stream) {
            webcam.webcam.stream.getTracks().forEach(t => t.stop());
        }

        // REQUEST A NEW HIGH-RES STREAM
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: W },
                height: { ideal: H }
            }
        });

        // ASSIGN NEW STREAM TO THE TM WEBCAM VIDEO
        webcam.webcam.video.srcObject = newStream;

        // Wait for video to resize properly
        await webcam.webcam.video.play();

        // Fix canvas size
        webcam.canvas.width = W;
        webcam.canvas.height = H;
        webcam.canvas.style.width = "100vw";
        webcam.canvas.style.height = "100vh";

        // Resize ThreeJS
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();

    }, 200);
}




/* ---------------------------
   THREE.JS SETUP
---------------------------- */
function initThreeJS() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("model-container").appendChild(renderer.domElement);

    loader = new THREE.GLTFLoader();

    scene.add(new THREE.AmbientLight(0xffffff, 2));
}

/* ---------------------------
   MAIN LOOP
---------------------------- */
async function loop() {
    webcam.update();
    await predict();
    renderer.render(scene, camera);
    if (currentModel) {
    currentModel.rotation.y += 0.01; // smooth rotation around Y-axis
}
    requestAnimationFrame(loop);
}

/* ---------------------------
   PREDICTION
---------------------------- */
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    const highest = prediction.reduce((a, b) => a.probability > b.probability ? a : b);

    if (highest.probability > 0.6) {
        document.getElementById("label").innerText = `Detected: ${highest.className}`;
        if (currentClass !== highest.className) {
            currentClass = highest.className;
            showModel(currentClass);
        }
    } else {
        document.getElementById("label").innerText = "No confident detection";
        currentClass = null;
        clearModel();
    }
}

/* ---------------------------
   LOAD 3D MODEL
---------------------------- */
function showModel(className) {
    clearModel();
    const loadToken = ++currentLoadToken;

    let modelPath = null;

    switch (className) {
        case "Koutoubia":
            modelPath = "https://anassino1.github.io/ar-monuments/models/koutoubia.glb";
            break;
        case "Hassan Tower":
            modelPath = "https://anassino1.github.io/ar-monuments/models/hassan_tower.glb";
            break;
        default:
            return;
    }

    loader.load(modelPath, gltf => {
        if (loadToken !== currentLoadToken) return;

        currentModel = gltf.scene;
        currentModel.scale.set(1, 1, 1);
        if(className === "Koutoubia"){
        currentModel.scale.set(0.5, 0.5, 0.5); // smaller
    } else {
        currentModel.scale.set(1, 1, 1); // default size
    }

        currentModel.position.set(0, 0, 0);
        scene.add(currentModel);
    });
}

/* ---------------------------
   CLEAR MODEL
---------------------------- */
function clearModel() {
    if (!currentModel) return;

    scene.remove(currentModel);

    currentModel.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
    });

    currentModel = null;
}

/* ---------------------------
   START BUTTON
---------------------------- */
document.getElementById("start-btn").addEventListener("click", async () => {

    const startScreen = document.getElementById("start-screen");
    startScreen.classList.add("fade-out");

    setTimeout(async () => {
        startScreen.style.display = "none";

        document.getElementById("webcam-container").style.display = "block";
        document.getElementById("model-container").style.display = "block";
        document.getElementById("label").style.display = "block";

        await init();
    }, 800);
});
