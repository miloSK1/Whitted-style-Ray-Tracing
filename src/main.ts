///////////////////////////////////////////////////////////////////////////////////////////////////
// imports

// external dependencies
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// custom imports
import * as utils from './lib/utils';
import RenderWidget from './lib/rendererWidget';
import { Application, createWindow } from './lib/window';

import { CanvasWidget } from './lib/canvasWidget';
import * as helper from './helper';


///////////////////////////////////////////////////////////////////////////////////////////////////
// pre main

// define shadow bias
const bias = 0.001;

let settings = new helper.Settings();
// create scene
var scene = new THREE.Scene();

helper.setupGeometry(scene);

// setup light
let lights = helper.setupLight(scene);

// create camera
let camera = new THREE.PerspectiveCamera();
helper.setupCamera(camera);

let raycaster = new THREE.Raycaster(camera.position);

let widC: CanvasWidget;

// initial width and height value
let widthIni = settings.width;
let heightIni = settings.height;

///////////////////////////////////////////////////////////////////////////////////////////////////
// helper func

// helper func to calcuate improved sphere intersection method
function sphereIntersection(ray: THREE.Ray, sphere: THREE.Mesh){
    if (!(sphere.geometry instanceof THREE.SphereGeometry)) {
        return { check: false, intersectionPoint1: null, intersectionPoint2: null };
    }

    let tca = ray.direction.clone().normalize().dot(sphere.position.clone().sub(ray.origin));

    if(tca < 0){
        return { check: false, intersectionPoint1: null, intersectionPoint2: null };
    }

    let P = ray.origin.clone().add(ray.direction.clone().multiplyScalar(tca));
    
    let subt = sphere.position.clone().sub(P);
    let y = subt.length();

    // check intersection
    let check = y <= sphere.geometry.parameters.radius;

    let thc = Math.sqrt((sphere.geometry.parameters.radius*sphere.geometry.parameters.radius)-(y*y));
    let t0 = Math.max((tca-thc), 0.0);
    let t1 = tca+thc;

    let intersectionPoint1 = ray.origin.clone().add(ray.direction.clone().normalize().multiplyScalar(t0));
    let intersectionPoint2 = ray.origin.clone().add(ray.direction.clone().normalize().multiplyScalar(t1));

    return { check: check, intersectionPoint1: intersectionPoint1, intersectionPoint2: intersectionPoint2 }
}

function pixelColor(raycaster: THREE.Raycaster, depth: any){
    // initial color
    let finColor = new THREE.Color(0.0, 0.0, 0.0);
    
    let intersects = raycaster.intersectObjects(scene.children, true);
    let topObject: any;
    let minDistance = Infinity;
    let intersectionPoint: any;
    let normal: any;
    let drawSpheres: any

    // approach using triangle intersection method
    for (let intersect of intersects) {
        if(settings.correctSpheres){
            drawSpheres = !((intersect.object as THREE.Mesh).geometry instanceof THREE.SphereGeometry)
        }
        else{
            drawSpheres = true;
        }
        // if correctSpheres checked avoid spheres (take into accout everythinig left), if not just go through everything
        if (intersect.object instanceof THREE.Mesh && intersect.distance < minDistance && drawSpheres) {
            minDistance = intersect.distance;
            topObject = intersect.object;
            intersectionPoint = intersect.point;
            if(intersect.face){
                normal = intersect.face.normal.clone().transformDirection(intersect.object.matrixWorld);
            }
        }
    }

    // approach using improved intersection method
    if (settings.correctSpheres) {
        for (let mesh of scene.children) {
            if (mesh instanceof THREE.Mesh && mesh.geometry instanceof THREE.SphereGeometry) {
                let intersectedSphere = sphereIntersection(raycaster.ray, mesh);
                if (intersectedSphere.check) {
                    let sphereDistance = raycaster.ray.origin.distanceTo(mesh.position);
                    if (sphereDistance < minDistance) {
                        minDistance = sphereDistance;
                        topObject = mesh;
                        intersectionPoint = intersectedSphere.intersectionPoint1;
                        normal = intersectionPoint.clone().sub(mesh.position).normalize();
                        
                    }
                }
            }
        }
    }

    if (topObject && topObject instanceof THREE.Mesh) {
        let reflex = topObject.material.reflectivity;
        let mirBol = topObject.material.mirror;

        // if phong enabled
        if (settings.phong) {

            let brightLight = phongIllumination(lights[0], normal, topObject, intersectionPoint);
            finColor.add(brightLight);
            if (settings.alllights){
                let redLight = phongIllumination(lights[1], normal, topObject, intersectionPoint);
                let blueLight = phongIllumination(lights[2], normal, topObject, intersectionPoint);
                finColor.add(redLight);
                finColor.add(blueLight);
            }

            // handle mirror case
            if (settings.mirrors && mirBol && depth > 0){
                let viewDirection = camera.position.clone().sub(intersectionPoint).normalize();
                let refl = viewDirection.reflect(normal).negate();

                // to avoid artifacts apply shadow bias
                let biasedIntersectionPoint = intersectionPoint.clone().add(normal.clone().multiplyScalar(bias));

                let reflCaster = new THREE.Raycaster(biasedIntersectionPoint, refl);

                // recursive behavior
                let reflCol = pixelColor(reflCaster, depth-1);

                finColor.lerp(reflCol, reflex);

                return finColor;
            }
        }
        // without phong 
        else {
            let matColor = topObject.material.color.clone();
            finColor.add(matColor);
        }
    }

    return finColor
}

// rayTracer function
function rayTracer(canvasWidget: CanvasWidget, horizontalChunk: number, verticalChunk: number, chunk: number) {

    let canvCords = new THREE.Vector2();

    for (let x = horizontalChunk; x < horizontalChunk + chunk; x++) {
        for (let y = verticalChunk; y < verticalChunk + chunk; y++) {
            
            let subsamples = Math.pow(2, settings.subsamples);
            let subStep = 1 / settings.subsamples

            // initial color
            let pixCol = new THREE.Color(0,0,0)

            // shoot multiple rays per pixel
            // e.g. 2
            for (let subX = 0; subX < settings.subsamples; subX++) {
                // x 2 = 4 (subpixels in 1 origin pixel)
                for (let subY = 0; subY < settings.subsamples; subY++) {

                    // supersampling tehnique
                    let subPixelX = (x + subX * subStep)
                    let subPixelY = (y + subY * subStep)
            
                    canvCords.x = (subPixelX / canvasWidget.Canvas.width) * 2 - 1;
                    canvCords.y = -(subPixelY / canvasWidget.Canvas.height) * 2 + 1;

                    raycaster.setFromCamera(canvCords, camera);

                    let subPixCol = pixelColor(raycaster, settings.maxDepth)
                    pixCol.add(subPixCol);

                }
            }
            // average color
            if(settings.subsamples != 1){
                pixCol.multiplyScalar(1 / subsamples);
            }
            canvasWidget.setPixel(x, y, pixCol);
        }
    }
}

// helper func to calculate phong Illumination
function phongIllumination(light: THREE.PointLight, normal: THREE.Vector3, mesh: any, intersection: THREE.Vector3) {
    let Phong = new THREE.Color(0.0, 0.0, 0.0); // initial color

    // no ambient part

    // calculate light direction and attenuation
    let lightDirection = light.position.clone().sub(intersection.clone());
    let attenuation = 1 / (lightDirection.clone().lengthSq());

    // diffuse (lambert) part
    lightDirection.normalize()

    let cosTheta = Math.max(normal.clone().dot(lightDirection.clone()), 0.0);

    // Ld = diffuseColor * cosTheta * diffuseReflectance * lightIntensity

    let lightIntensity = light.color.clone().multiplyScalar(light.intensity * 4 * attenuation);

    let diffuseReflectance = mesh.material.color.clone();
    let Ld = diffuseReflectance.clone().multiply(lightIntensity.clone()).multiplyScalar(cosTheta);

    // specular part
    // L_s = I * k_s * (r^T v)^m || I = light intensity; k_s = specular reflectance * specular color; m = 'shininess'

    let Ls = new THREE.Color(0, 0, 0);;
    let normalN = normal.clone().normalize();

    // check if there is no reflection on back
    let front = Math.max(normalN.dot(lightDirection), 0.0);
    if (front > 0.0) {
        let pVec = normal.clone().normalize().multiplyScalar(cosTheta);
        let reflVec = pVec.clone().multiplyScalar(2.0).sub(lightDirection.clone());
    
        let reflVecN = reflVec.clone().normalize();
        let viewDirN = camera.position.clone().sub(intersection).normalize();
        
        let cosGamma = Math.max(reflVecN.clone().dot(viewDirN.clone()), 0.0);
        
        // shininess adjusted manually to get similar effect with right side
        let shininess  = mesh.material.shininess/5
        let cosGshin = Math.max(Math.pow(cosGamma, shininess), 0.0);
    
        let specularReflectance = mesh.material.specular.clone();
        let specularLI = lightIntensity.clone().multiplyScalar(shininess/4);
        Ls = specularReflectance.clone().multiply(specularLI.clone()).multiplyScalar(cosGshin);
    }

    // shadows calculation
    if (settings.shadows) {
        let epsilon = 1e-8;
        let shadowRayOrigin = intersection.clone().add(normal.clone().multiplyScalar(epsilon));
        let shadowRayDirection = light.position.clone().sub(shadowRayOrigin).normalize();
        let shadowRaycaster = new THREE.Raycaster(shadowRayOrigin, shadowRayDirection);
        let inShadow = false;
        let lightDistance = light.position.clone().sub(shadowRayOrigin).length();

        for (let obj of scene.children) {
            if (obj != mesh) {
                if (settings.correctSpheres && (obj as THREE.Mesh).geometry instanceof THREE.SphereGeometry) {
                    
                    let sphereIntersect = sphereIntersection(shadowRaycaster.ray, (obj as THREE.Mesh));
                    if (sphereIntersect.check && sphereIntersect.intersectionPoint1) {
                        let distanceToIntersection = shadowRaycaster.ray.origin.distanceTo(sphereIntersect.intersectionPoint1);
                        if (distanceToIntersection < lightDistance && distanceToIntersection > epsilon) {
                            inShadow = true;
                            break;
                        }
                    }
                } else {
                    let intersects = shadowRaycaster.intersectObject(obj);
                    if (intersects.length > 0 && intersects[0].distance < lightDistance) {
                        inShadow = true;
                        break;
                    }
                }
            }
        }

        if (inShadow) {
            return Phong;
        }
    }

    // final result
    Phong.add(Ld);
    Phong.add(Ls);

    return Phong;
  }

//#################################################################################################
// callback
function callback(changed: utils.KeyValuePair<helper.Settings>) {
    switch (changed.key) {
        default:
            break;
    }
}

function main(){
    let root = Application("Ray Tracer");
    root.setLayout([["canvas_W", "scene_W"]]);
    root.setLayoutColumns(["50%", "50%"]);
    root.setLayoutRows(["100%"])

    // ---------------------------------------------------------------------------
    // create Settings and create GUI settings
    helper.createGUI(settings);
    // adds the callback that gets called on settings change
    settings.addCallback(callback);

    // create renderer
    let sceneDiv = createWindow("scene_W");
    root.appendChild(sceneDiv);
    let canvasDiv = createWindow("canvas_W");
    root.appendChild(canvasDiv);

    // create renderer
    let renderer = new THREE.WebGLRenderer({
        antialias: true,  // to enable anti-alias and get smoother output
    });

    // create controls
    let controls = new OrbitControls(camera, sceneDiv);
    helper.setupControls(controls);

    // start the animation loop (async)
    var widS = new RenderWidget(sceneDiv, renderer, camera, scene, controls);
    widC = new CanvasWidget(canvasDiv);
    widC.changeDimensions(widthIni, heightIni);
    
    // render drawing on canvas
    settings.render = function() {
        widC.changeDimensions(settings.width, settings.height);
        // clear canvas before drawing
        widC.clearCanvas();
        
        // set render block size
        const chunk = 32;
        let horizontalChunk = 0, verticalChunk = 0;
    
        function renderChunk() {
            rayTracer(widC, horizontalChunk, verticalChunk, chunk);
    
            // update block position
            horizontalChunk += chunk;
            if (horizontalChunk >= widC.Canvas.width) {
                horizontalChunk = 0;
                verticalChunk += chunk;
            }
    
            // check if the entire canvas is covered
            if (verticalChunk < widC.Canvas.height) {
                setTimeout(renderChunk, 0);
            }
        }
    
        renderChunk();
    };

    // make current canvas downloadable
    settings.saveImg = function() {
        widC.savePNG();
    }

    widS.animate();
}

// call main entrypoint
main();
