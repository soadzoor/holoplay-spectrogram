import {Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, HemisphereLight, GammaEncoding, Vector2, Object3D, Vector3} from "three";
import {CameraControls} from "./CameraControls";
import {Convergence, Easing} from "utils/Convergence";
import {BoundedConvergence} from "utils/BoundedConvergence";
import {Constants} from "utils/Constants";
import {SpectrogramLoader} from "./SpectrogramLoader";
import {Line2} from "three/examples/jsm/lines/Line2";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
import TWEEN from "@tweenjs/tween.js";
import * as Holoplay from "holoplay/dist/holoplay.module";

export class SceneManager
{
	private _urlParams = new URLSearchParams(window.location.search);
	private _domElement: HTMLDivElement = document.getElementById("playGround") as HTMLDivElement;
	private _canvas: HTMLCanvasElement = document.createElement("canvas");
	private _resolution: Vector2 = new Vector2();
	private _scene: Scene;
	private _camera: PerspectiveCamera | Holoplay.Camera;
	private _controls: CameraControls;
	private _renderer: WebGLRenderer | Holoplay.Renderer;
	private _distance: BoundedConvergence = new BoundedConvergence(30, 30, 1, 100, Easing.EASE_OUT, Constants.ANIMATION_DURATION);
	private _normalizedCameraPosition: number[] = [0, 0, 1];
	private _origin: Vector3 = new Vector3(0, 0, 0);
	private _chartLoader: SpectrogramLoader;

	private _requestAnimationFrameId: number = null;
	private static _timeStamp: number = 0;
	public needsRender = true;

	constructor()
	{
		this._scene = new Scene();
		if (this._isHolo)
		{
			this._camera = new Holoplay.Camera();
		}
		else
		{
			this._camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
		}

		this.initBackground();
		this.initLights();
		this.initControls();
		this.initRenderer();
		this.initMeshes();
		this.onWindowResize();
		this.animate(0);
	}

	private get _isHolo()
	{
		return this._urlParams.get("holo") === "true";
	}

	private initBackground()
	{
		// const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !((<any>window).MSStream);

		// this._scene.add(new VignetteBackground({
		// 	aspect: this._camera.aspect,
		// 	grainScale: IS_IOS ? 0 : 0.001, // mattdesl/three-vignette-background#1
		// 	colors: ["#ffffff", "#353535"]
		// }).mesh);
	}


	private initLights()
	{
		const light1 = new AmbientLight(0xFFFFFF, 0.1);

		const light2 = new DirectionalLight(0xFFFFFF, 0.1);
		light2.position.set(0.5, 0, 0.866); // ~60ยบ

		const light3 = new HemisphereLight(0xffffbb, 0x080820, 0.8);

		this._scene.add(light1, light2, light3);
	}

	private initControls()
	{
		this._controls = new CameraControls(this._domElement, this);
		this._controls.activate();
	}

	private initMeshes()
	{
		this._chartLoader = new SpectrogramLoader(this);
	}

	private initRenderer()
	{
		if (this._isHolo)
		{
			this._renderer = new Holoplay.Renderer();
		}
		else
		{
			const contextAttributes = {
				alpha: false,
				antialias: true
			};
			const context = this._canvas.getContext("webgl2", contextAttributes) || this._canvas.getContext("experimental-webgl2", contextAttributes);
			this._renderer = new WebGLRenderer({
				canvas: this._canvas,
				context: context as WebGL2RenderingContext,
				...contextAttributes
			});
			this._renderer.setPixelRatio(window.devicePixelRatio);
			this._renderer.setClearColor(0xECF8FF);
			this._renderer.outputEncoding = GammaEncoding;
		}

		this._canvas = this._renderer.domElement;
		this._domElement.appendChild(this._canvas);

		this._resolution.set(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);

		this._canvas.addEventListener("webglcontextlost", this.onContextLost);

		window.addEventListener("resize", this.onWindowResize);
	}

	private onWindowResize = () =>
	{
		this._canvas.width = 0;
		this._canvas.height = 0;

		const width = window.innerWidth;
		const height = window.innerHeight;

		this._resolution.set(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio);
		this._scene.traverse((object: Object3D) =>
		{
			if (object instanceof Line2)
			{
				if (object.material instanceof LineMaterial)
				{
					object.material.resolution.copy(this._resolution);
				}
			}
		});

		if (!this._isHolo)
		{
			this._renderer.setSize(width, height);
			this._camera.aspect = width / height;
			this._camera.updateProjectionMatrix();
		}

		this.needsRender = true;
	};

	private onContextLost = (event: Event) =>
	{
		event.preventDefault();

		alert("Unfortunately WebGL has crashed. Please reload the page to continue!");
	};

	public get scene()
	{
		return this._scene;
	}

	private update = (time: number) =>
	{
		SceneManager._timeStamp = performance.now();
		TWEEN.update();

		this._requestAnimationFrameId = requestAnimationFrame(this.update);

		this.needsRender = Convergence.updateActiveOnes(SceneManager._timeStamp) || this.needsRender;
		if (this.needsRender)
		{
			this._normalizedCameraPosition = this._controls.update();
			this._camera.position.set(
				this._normalizedCameraPosition[0] * this._distance.value,
				this._normalizedCameraPosition[1] * this._distance.value,
				this._normalizedCameraPosition[2] * this._distance.value
			);
			this._camera.lookAt(this._origin);
			this._renderer.render(this._scene, this._camera);
			this.needsRender = false;
		}
	};

	private animate = (time: number) =>
	{
		cancelAnimationFrame(this._requestAnimationFrameId);
		this.update(time);
	};

	/** Returns the timestamp of the newest render run  */
	public static get timeStamp()
	{
		return SceneManager._timeStamp;
	}

	public get distance()
	{
		return this._distance;
	}

	public get resolution()
	{
		return this._resolution;
	}
}