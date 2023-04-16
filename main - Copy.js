import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const firebase = window.firebase;
let mainTree;

function init() {
  // Get a reference to the Firebase Realtime Database
  const database = firebase.database();

  // Create a unique player ID
  const playerId = Date.now().toString();

  // Create the scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Blue sky

// Listen for changes in other players' data
database.ref('players').on('value', (snapshot) => {
  const playersData = snapshot.val();
  if (playersData) {
    for (const id in playersData) {
      if (id !== playerId) {
        updateOtherPlayerPositionAndRotation(id, playersData[id]);
      }
    }
  }
});
// Listen for player disconnections and remove their cube
database.ref('players').on('child_removed', (snapshot) => {
  const playerId = snapshot.key;
  if (playersMeshes[playerId]) {
    scene.remove(playersMeshes[playerId]);
    delete playersMeshes[playerId];
  }
});


// Remove the player's data from Firebase when they disconnect
database.ref(`players/${playerId}`).onDisconnect().remove();

// Function to update the player's position and rotation in Firebase
function updatePlayerData() {
  database.ref(`players/${playerId}`).set({
    position: cameraBody.position,
    rotation: { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z },
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
  });
}
// remove stale players by checking their lastUpdated value
function removeStalePlayers() {
  const currentTime = Date.now();
  const staleThreshold = 10000; // 10 seconds; adjust this value as needed

  database.ref('players').once('value', (snapshot) => {
    const playersData = snapshot.val();
    if (playersData) {
      for (const id in playersData) {
        const playerData = playersData[id];
        if (currentTime - playerData.lastUpdated > staleThreshold) {
          database.ref(`players/${id}`).remove();
        }
      }
    }
  });
}

const cleanupInterval = 5000; // 5 seconds; adjust this value as needed
setInterval(removeStalePlayers, cleanupInterval);


//Create empty object to store the players' meshes
let playersMeshes = {};

//Add a function to create a cube for each player
function createPlayerCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  return cube;
}


// Update the position and rotation of other players in your metaverse function to create cubes for other players
function updateOtherPlayerPositionAndRotation(playerId, playerData) {
  let playerMesh = playersMeshes[playerId];

  if (!playerMesh) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    playerMesh = new THREE.Mesh(geometry, material);
    scene.add(playerMesh);

    playersMeshes[playerId] = playerMesh;
  }

  playerMesh.position.set(
    playerData.position.x,
    playerData.position.y,
    playerData.position.z
  );

  const playerRotation = playerData.rotation;
  playerMesh.rotation.set(playerRotation.x, playerRotation.y, playerRotation.z);
}



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
  } else if (event.button === 0) { // Left click
    raycaster.setFromCamera(new THREE.Vector2(), camera);

    // List of objects to test for intersection (add tree meshes to this list)
    const objects = [mainTree, duplicate1, duplicate2, duplicate3];

    const intersects = raycaster.intersectObjects(objects);
    console.log('Intersects:', intersects); // Log intersects

    if (intersects.length > 0) {
      const clickedTree = intersects[0].object;
      console.log('Clicked tree:', clickedTree); // Log clicked tree
      const stump = stumpModel.clone();
      stump.position.copy(clickedTree.position);
      cutTree(clickedTree, stump);
    }
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

// Create duplicate variables outside of the addModelsToScene function
const duplicate1 = new THREE.Object3D();
const duplicate2 = new THREE.Object3D();
const duplicate3 = new THREE.Object3D();

// Function to add models to the scene
function addModelsToScene(gltf) {
  const treeBoxShape = new CANNON.Box(new CANNON.Vec3(1, 2, 1)); // Adjust the size of the collision box based on your tree model
  gltf.scene.userData = { clicks: 0 };
  mainTree = gltf.scene;
  mainTree.userData = { clicks: 0 };
  
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
 duplicate1.userData = { clicks: 0 };
 duplicate1.position.set(5, 0, -5);
 scene.add(duplicate1);
 createTreeBody(5, 0, -5);

 // Duplicate the model again and set its position
 const duplicate2 = gltf.scene.clone();
 duplicate2.userData = { clicks: 0 };
 duplicate2.position.set(-5, 0, -5);
 scene.add(duplicate2);
 createTreeBody(-5, 0, -5);

 // Duplicate the model again and set its position
 const duplicate3 = gltf.scene.clone();
 duplicate3.userData = { clicks: 0 };
 duplicate3.position.set(-5, 0, 1);
 scene.add(duplicate3);
 createTreeBody(-5, 0, 1);
}

//Add a raycaster and a clock for the tree respawn timer:
const raycaster = new THREE.Raycaster(); 
const treeRespawnClock = new THREE.Clock(); 

//load the stump.glb model
let stumpModel;

loader.load(
  '/objects/stump/stump.glb',
  (gltf) => {
    stumpModel = gltf.scene;
  },
  undefined,
  (error) => {
    console.error('An error occurred while loading the GLTF model:', error);
  }
);

//function to handle tree cutting logic
function cutTree(tree, stump) {
  if (tree.userData.clicks === undefined) {
    tree.userData.clicks = 0;
  }
  tree.userData.clicks++;

  console.log('Clicks:', tree.userData.clicks);

  if (tree.userData.clicks >= 5) {
    tree.visible = false; // Hide the tree
    stump.visible = true; // Show the stump

    console.log('Tree removed, stump added');

    setTimeout(() => {
      stump.visible = false; // Hide the stump
      tree.visible = true; // Show the tree
      tree.userData.clicks = 0; // Reset the click count
      console.log('Tree respawned, stump removed, click count reset');
    }, 15000);
  }
}


//an event listener for mouse clicks, and perform raycasting to detect if a tree has been clicked
document.addEventListener('mousedown', (event) => {
  if (event.button === 0) { // Left click
    raycaster.setFromCamera(new THREE.Vector2(), camera);

    // List of objects to test for intersection (add tree meshes to this list)
    const objects = [mainTree, duplicate1, duplicate2, duplicate3];

    const intersects = raycaster.intersectObjects(objects);
    console.log('Intersects:', intersects); // Log intersects

    if (intersects.length > 0) {
      const clickedTree = intersects[0].object;
      console.log('Clicked tree:', clickedTree); // Log clicked tree
      const stump = stumpModel.clone();
      stump.position.copy(clickedTree.position);
      cutTree(clickedTree, stump);
    }
  }
});




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

// Update player data every frame
  updatePlayerData();
}



//Prevent Context Menu on Rightclick
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Start the animation loop
animate();

// Call the updatePlayerData function to sync player position and rotation
updatePlayerData();

}
init();