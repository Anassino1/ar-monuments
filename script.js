const URL = "./model/";
let model, webcam;
let scene, camera, renderer, loader, currentModel, currentClass = null;

async function init() {
    // Load Teachable Machine model
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    document.getElementById("label").innerText = "Model loaded!";

    // Setup webcam
    const flip = true; // don't mirror back camera
    webcam = new tmImage.Webcam(400, 300, flip);

    await webcam.setup({
        facingMode: "environment" // back camera
    });

    await webcam.play();
    document.getElementById("webcam").appendChild(webcam.canvas);

    // Setup Three.js
    initThreeJS();

    // Start loop
    window.requestAnimationFrame(loop);
}

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(400, 300);
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

    if (highest.probability > 0.6) {
        document.getElementById("label").innerText = `Detected: ${highest.className}`;
        if (highest.className !== currentClass) {
            // Only update when detection changes
            currentClass = highest.className;
            showModel(currentClass);
        }
    } else {
        document.getElementById("label").innerText = "No confident detection";
        clearModel();
        currentClass = null;
    }
}

function showModel(className) {
    clearModel(); // Remove old one first

    let modelPath = null;
    switch (className) {
        case "Koutoubia":
            modelPath = "./models/koutoubia.glb";
            break;
        case "Hassan Tower":
            modelPath = "./models/hassan_tower.glb";
            break;
        case "Bab Mrissa":
            modelPath = "./models/bab_mrissa.glb";
            break;
        case "Bab al mansour":
            modelPath = "./models/bab_manssour.glb";
            break;
        default:
            console.warn("No model defined for:", className);
            return;
    }

    loader.load(
        modelPath,
        (gltf) => {
             clearModel();
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
                    child.material.forEach((m) => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        currentModel = null;
        renderer.renderLists.dispose();
    }
}

init();




// const URL = "./model/"; // Path to your Teachable Machine model folder
// let model, webcam;
// // Three.js variables
// let scene, camera, renderer, loader, currentModel;

// function initThreeJS() {
//     scene = new THREE.Scene();
//     camera = new THREE.PerspectiveCamera(75, 400/300, 0.1, 1000);
//     camera.position.z = 5;

//     renderer = new THREE.WebGLRenderer({ alpha: true });
//     renderer.setSize(400, 300);
//     document.getElementById("model-container").appendChild(renderer.domElement);

//     loader = new THREE.GLTFLoader();
// }

// function animateThreeJS() {
//     if (currentModel) currentModel.rotation.y += 0.01; // optional rotation
//     renderer.render(scene, camera);
// }


// async function init() {
//     // Load the model
//     model = await tmImage.load(URL + "model.json", URL + "metadata.json");
//     document.getElementById("label").innerText = "Model loaded!";

//     // Setup webcam
//     const flip = true; // flip camera for selfie view
//     webcam = new tmImage.Webcam(400, 300, flip); 
//     await webcam.setup(); 
//     await webcam.play();

//     // Append the canvas (webcam feed) to the page
//     document.getElementById("webcam").appendChild(webcam.canvas);

//     // Start the loop
//     window.requestAnimationFrame(loop);
// }


// async function loop() {
//     webcam.update(); // update the webcam frame
//     await predict();
//     window.requestAnimationFrame(loop);
// }

// async function predict() {
//     const prediction = await model.predict(webcam.canvas);
//     let highest = prediction[0];
//     for (let i = 1; i < prediction.length; i++) {
//         if (prediction[i].probability > highest.probability) {
//             highest = prediction[i];
//         }
//     }
//     // If probability > 0.5, show label
//     if (highest.probability > 0.5) {
//         document.getElementById("label").innerText = `Detected: ${highest.className}`;
//     } else {
//         document.getElementById("label").innerText = "No confident detection";
//     }
// }

// init();

