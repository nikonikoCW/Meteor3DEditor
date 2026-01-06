import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { TilesRenderer } from '3d-tiles-renderer';

/**
 * WebGPU Scene Manager
 * Experimental implementation using WebGPURenderer
 */
export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        // Initialize WebGPURenderer
        this.renderer = new WebGPURenderer({
            canvas,
            antialias: true,
            forceWebGL: false
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 10000);
        this.camera.position.set(5, 5, 5);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Grid
        const gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(gridHelper);

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Transform Controls
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });
        this.scene.add(this.transformControls.getHelper());

        // Objects list for raycasting
        this.objects = [];

        // Tilesets list
        this.tilesets = [];

        // Setup Loaders
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/draco/');
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        // Animation Loop
        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);

        console.log('SceneManager (WebGPU) initialized');
    }

    animate() {
        this.controls.update();

        // Update 3D Tiles
        for (const tileset of this.tilesets) {
            tileset.update();
        }

        this.renderer.renderAsync(this.scene, this.camera);
    }

    onWindowResize(width, height) {
        if (!this.canvas) return;
        const w = width || this.canvas.clientWidth;
        const h = height || this.canvas.clientHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);

        // Resize tilesets
        for (const tileset of this.tilesets) {
            tileset.setResolutionFromRenderer(this.camera, this.renderer);
        }
    }

    /**
     * Load a GLTF/GLB model
     * @param {string} url 
     * @param {THREE.Vector3} position 
     */
    loadModel(url, position) {
        this.gltfLoader.load(url, (gltf) => {
            const model = gltf.scene;
            if (position) {
                model.position.copy(position);
            }
            this.scene.add(model);
            this.objects.push(model);
            console.log('Model loaded:', url);
        }, undefined, (error) => {
            console.error('Error loading model:', error);
        });
    }

    /**
     * Load an HDR environment map
     * @param {string} url 
     */
    loadEnvironment(url) {
        const loader = new RGBELoader();
        loader.load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
            this.scene.environment = texture;
            console.log('Environment loaded:', url);
        }, undefined, (error) => {
            console.error('Error loading environment:', error);
        });
    }

    /**
     * Load a 3D Tileset
     * @param {string} url 
     */
    loadTileset(url) {
        const tilesRenderer = new TilesRenderer(url);
        tilesRenderer.setCamera(this.camera);
        tilesRenderer.setResolutionFromRenderer(this.camera, this.renderer);
        this.scene.add(tilesRenderer.group);
        this.tilesets.push(tilesRenderer);
        console.log('Tileset loaded:', url);
    }

    /**
     * Add a basic geometry
     * @param {string} type 'Box' | 'Sphere'
     * @param {THREE.Vector3} position 
     */
    addGeometry(type, position) {
        let geometry, material, mesh;
        material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });

        if (type === 'Box') {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        } else if (type === 'Sphere') {
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
        }

        if (geometry) {
            mesh = new THREE.Mesh(geometry, material);
            if (position) {
                mesh.position.copy(position);
            }
            this.scene.add(mesh);
            this.objects.push(mesh);
        }
    }

    /**
     * Handle mouse click for selection
     * @param {number} x normalized mouse x (-1 to 1)
     * @param {number} y normalized mouse y (-1 to 1)
     */
    selectObject(x, y) {
        this.mouse.set(x, y);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.objects, true);

        if (intersects.length > 0) {
            // Find the root object (since we might hit a child mesh)
            let selected = intersects[0].object;
            // Traverse up to find the object we added to this.objects
            while (selected.parent && !this.objects.includes(selected)) {
                selected = selected.parent;
            }

            if (this.objects.includes(selected)) {
                this.transformControls.attach(selected);
                return selected;
            }
        }

        this.transformControls.detach();
        return null;
    }

    /**
     * Get intersection point on the ground plane (y=0)
     * @param {number} x 
     * @param {number} y 
     * @returns {THREE.Vector3|null}
     */
    getGroundIntersection(x, y) {
        this.mouse.set(x, y);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        return this.raycaster.ray.intersectPlane(plane, target);
    }
}
