import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import GUI from "lil-gui";

export default class Sketch {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.isAnimating = false;

    // Centres des continents
    this.continentCenters = {
      asia: { lat: 34.0479, lon: 100.6197 },
      africa: { lat: 1.6508, lon: 10.2674 },
      europe: { lat: 54.526, lon: 15.2551 },
      oceania: { lat: -22.7351, lon: 140.0188 },
      americas: { lat: 39.8283, lon: -98.5795 },
    };

    window.addEventListener("resize", () => this.onResize());
    this.addEventListeners();

    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initObjects();
    this.initLighting();
    this.initGUI();

    this.animate();
  }

  addEventListeners() {
    document
      .querySelectorAll(".asia, .africa, .europe, .oceania, .americas")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const continent = button.classList[0];
          this.focusOnContinent(continent);
        });
      });
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.cameraDistance = 2;
    this.camera.position.set(0, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight + 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
  }

  initObjects() {
    this.geometry = new THREE.SphereGeometry(1, 64, 64);

    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const earthTexture = textureLoader.load("/textures/earthlights8k.jpg");

    this.material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      map: earthTexture,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Ajout des pins
    const cities = [
      { name: "Marseille", lat: 43.2965, lon: 5.3698 },
      { name: "Djibouti", lat: 11.8251, lon: 42.5903 },
      { name: "Miami", lat: 25.7617, lon: -80.1918 },
      { name: "Kuala Lumpur", lat: 3.139, lon: 101.6869 },
      { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
      { name: "Paris", lat: 48.8566, lon: 2.3522 },
      { name: "Barcelone", lat: 41.3851, lon: 2.1734 },
      { name: "Porto", lat: 41.1579, lon: -8.6291 },
    ];

    cities.forEach((city) => this.addPin(city.lat, city.lon));
  }

  initLighting() {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(0, 0, 1);
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(this.ambientLight);
  }

  initGUI() {
    this.gui = new GUI();
    this.gui.add(this.controls, "autoRotate");
    this.gui.add(this.controls, "autoRotateSpeed").min(0).max(2);
    this.gui
      .add(this.directionalLight, "intensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("lightIntensity");

    this.gui
      .add(this.directionalLight.position, "x")
      .min(-10)
      .max(10)
      .step(0.001);
    this.gui
      .add(this.directionalLight.position, "y")
      .min(-10)
      .max(10)
      .step(0.001);
    this.gui
      .add(this.directionalLight.position, "z")
      .min(-10)
      .max(10)
      .step(0.001);

    this.gui
      .add(this.ambientLight, "intensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("ambientIntensity");
    this.guiProgress = { progress: 0 };
    this.gui
      .add(this.guiProgress, "progress", 0, 1)
      .name("Animation Progress")
      .listen();
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    const elapsedTime = this.clock.getElapsedTime();

    if (this.isAnimating) {
      const elapsed = elapsedTime - this.startTime;
      const progress = Math.min(1, elapsed / this.animationDuration);

      this.guiProgress.progress = progress;

      // Calculate target position
      const targetPosition = this.latLongToVector3(
        this.targetLat,
        this.targetLon,
        this.cameraDistance
      );

      // Cakculate the current and interpolated direction
      const targetDirection = targetPosition.clone().normalize();
      const currentDirection = this.camera.position.clone().normalize();
      const interpolatedDirection = currentDirection
        .clone()
        .lerp(targetDirection, progress);

      //MaJ camera position and lookAt
      this.camera.position.copy(
        interpolatedDirection.multiplyScalar(this.cameraDistance)
      );
      this.camera.lookAt(0, 0, 0);

      if (progress >= 0.15) {
        this.isAnimating = false;
        this.controls.autoRotateSpeed = 0.2;
        this.controls.autoRotate = true;

        setTimeout(() => {
          this.controls.autoRotateSpeed = 0.5;
        }, 1000);
      }
    } else {
      this.guiProgress.progress = 0;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.animate.bind(this));
  }

  focusOnContinent(continent) {
    const { lat, lon } = this.continentCenters[continent];
    this.targetLat = lat;
    this.targetLon = lon;
    this.startTime = this.clock.getElapsedTime();
    this.animationDuration = 5;
    this.isAnimating = true;
    this.controls.autoRotateSpeed = 0.2;
  }

  latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }

  addPin(lat, lon) {
    this.radius = 1;
    const pinGeometry = new THREE.CircleGeometry(0.01, 32);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    pinMaterial.side = THREE.DoubleSide;
    const pin = new THREE.Mesh(pinGeometry, pinMaterial);

    const position = this.latLongToVector3(lat, lon, this.radius + 0.01);
    pin.position.copy(position);

    pin.lookAt(new THREE.Vector3(0, 0, 0));
    pin.rotateX(Math.PI * 4);

    this.scene.add(pin);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const points = [];

    const start = position.clone();
    const end = start.clone().multiplyScalar(1.05);

    points.push(start);
    points.push(end);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);

    this.scene.add(line);
  }
}

const canvas = document.querySelector("canvas");
new Sketch(canvas);
