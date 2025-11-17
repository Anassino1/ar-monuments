let model, webcam;
let renderer, scene, camera;
let object3D = null;

// Folder containing model.json + metadata.json
const MODEL_URL = "model/";

// Initialize everything
async function init() {
    // Load Teachable Machine model
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    document.getElementById("label").innerText = "Model loaded";

    // Webcam (single setup only — fixed mobile bug)
    const WIDTH = 640;
    const HEIGHT = 480;

    webcam = new tmImage.Webcam(WIDTH, HEIGHT, false);

    await webcam.setup({
        facingMode: { ideal: "environment" },
        width: { ideal: WIDTH },
        height: { ideal: HEIGHT }
    });

    webcam.webcam.setAttribute("playsinline", true);

    await webcam.play().catch(err => console.log("Video play failed:", err));

    document.getElementById("webcam-container").appendChild(webcam.canvas);

    // Setup 3D
    initThreeJS();

    // Responsive canvas
    window.addEventListener("resize", onResize);
    onResize();

    // Load 3D model
    loadModel();

    // Start render loop
    requestAnimationFrame(loop);
}

// Setup Three.js
function initThreeJS() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 3;
}

// Load your 3D GLTF model
function loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load("model3d/scene.gltf", (gltf) => {
        object3D = gltf.scene;
        object3D.scale.set(0.5, 0.5, 0.5);
        object3D.position.set(0, -1, -3);
        scene.add(object3D);
    });
}

// Loop
async function loop() {
    webcam.update();

    if (model) {
        const prediction = await model.predict(webcam.canvas);

        // Highest confidence class
        let best = prediction[0];
        for (let p of prediction) {
            if (p.probability > best.probability) best = p;
        }

        document.getElementById("label").innerText =
            best.className + " : " + (best.probability * 100).toFixed(1) + "%";

        // Example model reaction
        if (object3D) {
            object3D.rotation.y += 0.01;

            if (best.probability > 0.90) {
                object3D.position.y = -0.5;
            } else {
                object3D.position.y = -1.2;
            }
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
}

// Handle resize
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
