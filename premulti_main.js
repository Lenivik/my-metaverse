import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// Create the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Blue sky

// Create the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 2;
camera.eulerOrder = 'YXZ';

// Create the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Responsive Canvas 
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Create the physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Set gravity
world.broadphase = new CANNON.NaiveBroadphase();

// Create the camera body
const cameraShape = new CANNON.Sphere(1);
const cameraBody = new CANNON.Body({
  mass: 5,
  linearDamping: 0.9,
  angularDamping: 0.9,
});
cameraBody.addShape(cameraShape);
cameraBody.position.set(camera.position.x, camera.position.y, camera.position.z);
world.addBody(cameraBody);

// Create the floor
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8CFDC1 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Create floor physics body
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0, // Setting mass to 0 makes it static
});
floorBody.addShape(floorShape);
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Create a clock for animation updates
const clock = new THREE.Clock();

// Movement and controls
const moveSpeed = 5;
const lookSpeed = 0.2;
const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  mouseX: 0,
  mouseY: 0,
};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
      movement.forward = true;
      break;
    case 'KeyA':
      movement.left = true;
      break;
    case 'KeyS':
      movement.backward = true;
      break;
    case 'KeyD':
      movement.right = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
      movement.forward = false;
      break;
    case 'KeyA':
      movement.left = false;
      break;
    case 'KeyS':
      movement.backward = false;
      break;
    case 'KeyD':
      movement.right = false;
      break;
  }
});

//rightclick camera move
let isRightClick = false;

document.addEventListener('mousedown', (event) => {
  if (event.button === 2) {
    isRightClick = true;
  }
});

document.addEventListener('mouseup', (event) => {
  if (event.button === 2) {
    isRightClick = false;
  }
});

document.addEventListener('mousemove', (event) => {
  if (isRightClick) {
    movement.mouseX = event.movementX;
    movement.mouseY = event.movementY;
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === document.body) {
    document.addEventListener('mousemove', (event) => {
      if (isRightClick) {
        movement.mouseX = event.movementX;
        movement.mouseY = event.movementY;
      }
    });
  } else {
    document.removeEventListener('mousemove', (event) => {
      if (isRightClick) {
        movement.mouseX = event.movementX;
        movement.mouseY = event.movementY;
      }
    });
  }
});

// GLTFLoader
const loader = new GLTFLoader();

// Function to add models to the scene
function addModelsToScene(gltf) {
  const treeBoxShape = new CANNON.Box(new CANNON.Vec3(1, 2, 1)); // Adjust the size of the collision box based on your tree model

  // Helper function to create a tree body and add it to the world
  function createTreeBody(x, y, z) {
    const treeBody = new CANNON.Body({ mass: 0 });
    treeBody.addShape(treeBoxShape);
    treeBody.position.set(x, y, z);
    world.addBody(treeBody);
    return treeBody;
  }

  // Set the position of the original model
  gltf.scene.position.set(2, 0, -5);
  scene.add(gltf.scene);
  createTreeBody(2, 0, -5);

  // Duplicate the model and set its position
  const duplicate1 = gltf.scene.clone();
  duplicate1.position.set(5, 0, -5);
  scene.add(duplicate1);
  createTreeBody(5, 0, -5);

  // Duplicate the model again and set its position
  const duplicate2 = gltf.scene.clone();
  duplicate2.position.set(-5, 0, -5);
  scene.add(duplicate2);
  createTreeBody(-5, 0, -5);
}


loader.load(
  '/objects/tree/tree.glb',
  (gltf) => {
    addModelsToScene(gltf);
  },
  undefined,
  (error) => {
    console.error('An error occurred while loading the GLTF model:', error);
  }
);


// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const fixedTimeStep = 1.0 / 60.0; // 60 fps

  // Update the physics simulation
  world.step(fixedTimeStep);

  // Update the camera position based on the camera body position
  camera.position.copy(cameraBody.position);

// Update movement
const forward = new THREE.Vector3();
camera.getWorldDirection(forward);
forward.y = 0; // ignore vertical movement
forward.normalize();

const right = new THREE.Vector3();
right.crossVectors(camera.up, forward).normalize();

if (movement.forward) {
  cameraBody.applyForce(forward.clone().multiplyScalar(moveSpeed * cameraBody.mass), cameraBody.position);
}
if (movement.backward) {
  cameraBody.applyForce(forward.clone().multiplyScalar(-moveSpeed * cameraBody.mass), cameraBody.position);
}
if (movement.left) {
  cameraBody.applyForce(right.clone().multiplyScalar(moveSpeed * cameraBody.mass), cameraBody.position);
}
if (movement.right) {
  cameraBody.applyForce(right.clone().multiplyScalar(-moveSpeed * cameraBody.mass), cameraBody.position);
}



  
  // camera rotation update code that uses Euler angles
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= movement.mouseX * lookSpeed * delta;
  euler.x -= movement.mouseY * lookSpeed * delta;
  euler.x = Math.max(Math.min(euler.x, Math.PI / 2), -Math.PI / 2);
  camera.quaternion.setFromEuler(euler);

// Reset mouse movement
movement.mouseX = 0;
movement.mouseY = 0;

// Render the scene
renderer.render(scene, camera);
}

//Prevent Context Menu on Rightclick
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Start the animation loop
animate();