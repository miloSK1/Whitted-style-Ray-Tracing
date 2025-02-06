import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as utils from './lib/utils';
import * as dat from 'dat.gui';

/*******************************************************************************
 * Helps to build gui, scene, camera and controls
 ******************************************************************************/

export class Settings extends utils.Callbackable{
  maxDepth: number = 2;
  subsamples: number = 1;
  width: number = 256;
  height: number = 256;
  correctSpheres: boolean = false;
  phong: boolean = false;
  alllights: boolean = false;
  shadows: boolean = false;
  mirrors: boolean = false;
  render: () => void = function(){};
  saveImg: () => void = function(){};
 }

export function createGUI(params: Settings): dat.GUI {
  var gui: dat.GUI = new dat.GUI();

  gui.add(params, "width").name("Width")
  gui.add(params, "height").name("Height")
  gui.add(params, "correctSpheres").name("Correct Spheres")
  gui.add(params, "phong").name("Phong")
  gui.add(params, "alllights").name("All Lights")
  gui.add(params, "shadows").name("Shadows")
  gui.add(params, "mirrors").name("Mirrors")
  gui.add(params, 'maxDepth', 0, 10, 1).name('Max Recursions')
  gui.add(params, "subsamples", 1, 4, 1).name("Subsamples")
  gui.add(params, "render").name("Render")
  gui.add(params, "saveImg").name("Save")
  return gui;
}


export function setupGeometry(scene: THREE.Scene){

  var phongMaterialRed = new THREE.MeshPhongMaterial( {
      color: 0x9e0059,
      specular: 0xaaaaaa,
      shininess: 150,
      reflectivity: 0,
  } ) as THREE.MeshPhongMaterial & { mirror: boolean };
  phongMaterialRed.mirror = false;

  var phongMaterialGreen = new THREE.MeshPhongMaterial( {
      color: 0x52b788,
      specular: 0xaaaaaa,
      shininess: 150,
      reflectivity: 0,
  } ) as THREE.MeshPhongMaterial & { mirror: boolean };
  phongMaterialGreen.mirror = false;

  var phongMaterialBlue = new THREE.MeshPhongMaterial( {
      color: 0x62b6cb,
      specular: 0xaaaaaa,
      shininess: 150,
      reflectivity: 0,
  } ) as THREE.MeshPhongMaterial & { mirror: boolean };
  phongMaterialBlue.mirror = false;

  var phongMaterialTop = new THREE.MeshPhongMaterial( {
      color: 0xffffff,
      specular: 0x111111,
      shininess: 100,
      reflectivity: 0,
  } ) as THREE.MeshPhongMaterial & { mirror: boolean };
  phongMaterialTop.mirror = false;

  var phongMaterialGround = new THREE.MeshPhongMaterial( {
      color: 0x806443,
      specular: 0x111111,
      shininess: 100,
      reflectivity: 0,
  } ) as THREE.MeshPhongMaterial & { mirror: boolean };
  phongMaterialGround.mirror = false;

  var mirrorMaterial = new THREE.MeshPhongMaterial( {
      color: 0xe0b1cb,
      specular: 0xffffff,
      shininess: 10000,
      reflectivity: 0.8,
  }) as THREE.MeshPhongMaterial & { mirror: boolean };
  mirrorMaterial.mirror = true;

  // 8 4
  var sphereGeometry = new THREE.SphereGeometry( 40/300, 8, 4 );
  var planeGeometry = new THREE.PlaneGeometry( 602/300, 602/300 );
  var boxGeometry = new THREE.BoxGeometry( 200/300, 100/300, 100/300 );
  var sphere = new THREE.Mesh( sphereGeometry, phongMaterialRed );
  sphere.position.set( - 130/300, - 160/300 + 5/300, - 50/300 );
  scene.add(sphere);
  var box1 = new THREE.Mesh( boxGeometry, phongMaterialGreen );
  box1.position.set( 200/300, - 200/300 + 5/300, - 50/300 );
  box1.rotation.z = 1.57
  box1.rotation.y = 0.2
  scene.add(box1);

  var sphere3 = new THREE.Mesh( sphereGeometry, phongMaterialBlue );
  sphere3.position.set( 30/300, - 265/300 + 5/300, - 75/300 );
  sphere3.rotation.y = 0.5;
  scene.add( sphere3 );

  var box = new THREE.Mesh( boxGeometry, mirrorMaterial );
  box.position.set( - 100/300, - 250/300 + 2.5/300, - 100/300 );
  box.rotation.y = 0.75;
  scene.add(box);

  // bottom
  var planebottom = new THREE.Mesh( planeGeometry, phongMaterialGround );
  planebottom.position.set( 0, - 300/300, - 150/300 );
  planebottom.rotation.x = -1.57;
  planebottom.scale.setY(0.6);
  scene.add( planebottom );

  // top
  var planetop = new THREE.Mesh( planeGeometry, phongMaterialTop );
  planetop.position.set( 0, 300/300 , - 150/300 );
  planetop.rotation.x = 1.57;
  planetop.scale.setY(0.6);
  scene.add( planetop );

  // back
  var planeback = new THREE.Mesh( planeGeometry, mirrorMaterial );
  planeback.position.set( 0, 0, - 300/300 );
  scene.add( planeback );

  // left
  var planeleft = new THREE.Mesh( planeGeometry, phongMaterialRed );
  planeleft.rotation.z = 1.57;
  planeleft.rotation.y = 1.57;
  planeleft.position.set( - 300/300, 0, - 150/300 );
  planeleft.scale.setY(0.6);
  scene.add( planeleft );

  // right
  var planeright = new THREE.Mesh( planeGeometry, phongMaterialBlue );
  planeright.rotation.z = 1.57;
  planeright.rotation.y = -1.57;
  planeright.position.set( 300/300, 0, - 150/300 );
  planeright.scale.setY(0.6);
  scene.add( planeright );

  scene.updateMatrixWorld();
  return scene;
};

export function setupLight(scene: THREE.Scene){
  var intensity = 0.25;
  var lights = [];
  var light1 = new THREE.PointLight( 0xffffff, intensity * 2 );
  light1.position.set( 0, 0, 300/300 );
  scene.add(light1);
  lights.push(light1);
  light1.updateMatrixWorld();

  var light2 = new THREE.PointLight( 0xffaa55, intensity );
  light2.position.set( - 300/300, 100/300, 100/300 );
  scene.add(light2);
  lights.push(light2);
  light2.updateMatrixWorld();

  var light3 = new THREE.PointLight( 0x55aaff, intensity );
  light3.position.set( 100/300, 200/300, 100/300 );
  scene.add(light3);
  lights.push(light3);
  light3.updateMatrixWorld();
  return lights;
};

export function setupCamera(camera: THREE.PerspectiveCamera){
  camera.fov = 60;
  camera.far = 1000;
  camera.near = 0.001;
  camera.position.z = 540/300;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera
}

export function setupControls(controls: OrbitControls){
 controls.rotateSpeed = 1.0;
 controls.zoomSpeed = 1.2;
 controls.enableZoom = true;
 controls.keys = {LEFT: "KeyA", UP:"KeyW", RIGHT: "KeyD", BOTTOM:"KeyS"};
 controls.listenToKeyEvents(document.body);
 controls.minDistance = 0.00001;
 controls.maxDistance = 9;
 controls.minZoom = 0;
 return controls;
};
