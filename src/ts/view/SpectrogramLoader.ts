import {BufferAttribute, BufferGeometry, Color, Fog, Mesh, MeshBasicMaterial, Points, PointsMaterial, Vector3} from "three";
import Delaunator from "delaunator";
import {ColorUtils} from "utils/ColorUtils";
import {DataUtils} from "utils/DataUtils";
import {MathUtils} from "utils/MathUtils";
import {SceneManager} from "./SceneManager";
import {Tween} from "@tweenjs/tween.js";

interface IVec3
{
	x: number;
	y: number;
	z: number;
}

interface IVec4 extends IVec3
{
	w: number;
}

export class SpectrogramLoader
{
	private _sceneManager: SceneManager;
	private _geometry: BufferGeometry = new BufferGeometry();

	constructor(sceneManager: SceneManager)
	{
		this._sceneManager = sceneManager;
		this.init();
	}

	private async init()
	{
		const data = await DataUtils.loadTxt("assets/data.txt");

		const xyzArray: IVec3[] = [];

		// Process data
		const lines = data.split("\n");

		const xAxisValues: number[] = lines[0].split(",").map(v => parseFloat(v));
		const zAxisValues: number[] = lines.map(line => parseFloat(line.split(",")[0]));

		for (let j = 1; j < lines.length; ++j)
		{
			const line = lines[j];

			const valuesAsStr = line.split(",");
			for (let i = 1; i < valuesAsStr.length; ++i)
			{
				const value = parseFloat(valuesAsStr[i]);

				// Make the data less dense
				if (i % 10 === 0 && j % 2 === 0)
				{
					xyzArray.push({
						x: xAxisValues[i],
						y: value,
						z: zAxisValues[j],
					});
				}
			}
		}

		//console.log(xyzArray);

		const positions = new Float32Array(xyzArray.flatMap(xyz => [xyz.x, xyz.y, xyz.z]));

		this._geometry.setAttribute("position", new BufferAttribute(positions, 3));
		this._geometry.computeBoundingBox();
		this._geometry.center();

		const bbox = this._geometry.boundingBox;
		const size = {
			x: bbox.max.x - bbox.min.x,
			y: bbox.max.y - bbox.min.y,
			z: bbox.max.z - bbox.min.z,
		};
		const xToZRatio = size.x / size.z;
		const xToYRatio = size.x / size.y;

		const colors = new Float32Array(xyzArray.flatMap(xyz => {
			const hue = MathUtils.getInterpolant(bbox.min.y, 240, bbox.max.y, 0, xyz.y);
			return ColorUtils.hsl2rgb(hue, 1, 0.5);
		}));
		this._geometry.setAttribute("color", new BufferAttribute(colors, 3));
		const material = new PointsMaterial({size: 0.15, vertexColors: true});

		const points = new Points(this._geometry, material);

		points.scale.setZ(xToZRatio);
		points.scale.setY(xToYRatio);

		//this._sceneManager.scene.add(points);


		// triangulate x, z
		const indexDelaunay = Delaunator.from(
			xyzArray.map(v => [v.x, v.z])
		);

		const meshIndex: number[] = []; // delaunay index => three.js index
		for (let i = 0; i < indexDelaunay.triangles.length; i++)
		{
			meshIndex.push(indexDelaunay.triangles[i]);
		}

		this._geometry.setIndex(meshIndex); // add three.js index to the existing geometry
		this._geometry.computeVertexNormals();
		const mesh = new Mesh(
			this._geometry, // re-use the existing geometry
			new MeshBasicMaterial({vertexColors: true, wireframe: true})
		);

		mesh.scale.copy(points.scale);

		//this._sceneManager.scene.add(mesh);

		const arrayOfSpectros: Mesh[] = [];

		for (let i = -2; i < 8; ++i)
		{
			const clonedMesh = mesh.clone();
			clonedMesh.userData.index = i;
			clonedMesh.position.setX(size.x * i);
			arrayOfSpectros.push(clonedMesh);
			this._sceneManager.scene.add(clonedMesh);

			if (i <= 0)
			{
				// We're changing the opacity for these, so we have to create new materials
				clonedMesh.material = (clonedMesh.material as MeshBasicMaterial).clone();
				(clonedMesh.material as MeshBasicMaterial).transparent = true;
			}
		}

		/**
		 * Azt szeretném, ha egy az előzőhöz hasonló kameranézetből látnánk az “adatfolyót ömleni” felénk,
		 * és az lenne az animáció, hogy egy ponton, pl 15 mp után egy, az idő tengelyre merőleges síkkal
		 * elmetsszük a folyót, a síktól felénk eső rész kiscollozik a képből, látjuk a metszetet, ami
		 * egy spektrogram, és azt egy más színű, a frekvenciatengelyen 0- 2kHz ig végigfutó vonal "letapogatja",
		 * a lokális maximumokra egy világító pontot elhelyezve. A letapogatás után pedig a "folyó" hömpölyög tovább.
		 */

		const flowDuration = 7500;
		const repeat = 1;

		const onCameraUpdate = (current: number[]) =>
		{
			this._sceneManager.normalizedCameraPosition[0] = current[0];
			this._sceneManager.normalizedCameraPosition[1] = current[1];
			this._sceneManager.normalizedCameraPosition[2] = current[2];
			this._sceneManager.setDistance(current[3]);
			this._sceneManager.needsRender = true;
		};

		const getCurrentCameraValues = () => [...this._sceneManager.normalizedCameraPosition, this._sceneManager.distance.value];
		const cameraDefaultPos = getCurrentCameraValues();
		const createNextCameraMovementTween = (nextCameraValues: number[], duration: number) =>
		{
			return new Tween<number[]>(getCurrentCameraValues()).to(nextCameraValues, duration).onUpdate(onCameraUpdate)
		};

		const cameraMovementTween = createNextCameraMovementTween(
			[-0.9106513905111381, 0.31412872420934657, -0.26839744705704444, 22.578957202151088], 1000)
			.onComplete(() => createNextCameraMovementTween([-0.9678970712950492, 0.2508563318577892, 0.015695863955869534, 48.400000000000006], 1000).delay(5000).start()
			.onComplete(() => createNextCameraMovementTween([-0.726860246507532, 0.5131115782011404, -0.4564982917415408, 35.57895720215109], 1000).delay(8000).start()
			.onComplete(() => createNextCameraMovementTween([-0.7911672485864805, -0.19429405112561007, 0.5799174134834175, 35.57895720215109], 5000).delay(500).start()
			.onComplete(() => createNextCameraMovementTween([-0.9972536381755035, 0.062045484453842954, -0.04044179774206199, 35.57895720215109], 2000).delay(2000).start()
			.onComplete(() => createNextCameraMovementTween(cameraDefaultPos, 2000).delay(2000).start()))))
		).delay(5000).start();

		for (let i = 0; i < arrayOfSpectros.length; ++i)
		{
			const spectroMesh = arrayOfSpectros[i];
			(spectroMesh.material as MeshBasicMaterial).opacity = 1;

			const from: IVec3 = {
				x: spectroMesh.position.x,
				y: spectroMesh.position.y,
				z: spectroMesh.position.z,
			};
			const to: IVec3 = {
				...from,
				x: spectroMesh.position.x - size.x
			};

			const onUpdate = (current: IVec3) =>
			{
				spectroMesh.position.set(current.x, current.y, current.z);
				this._sceneManager.needsRender = true;
			}

			const flowTween = new Tween<IVec3>(from).to(to, flowDuration).repeat(repeat).onUpdate(onUpdate);

			if (spectroMesh.userData.index <= 0)
			{
				flowTween.onComplete((current: IVec3) =>
				{
					const multiplicator = 2;
					const startPoint = {
						...current,
						w: 1,
					};
					const endPoint = {
						...current,
						x: spectroMesh.position.x - size.x * multiplicator,
						w: 0
					};
					new Tween<IVec4>(startPoint).to(endPoint, flowDuration * multiplicator).onUpdate((cur: IVec4) => {
						onUpdate(cur);
						(spectroMesh.material as MeshBasicMaterial).opacity = cur.w;
					}).start();
				});
			}

			flowTween.start();
		}







		const fogColor = new Color(0xffffff);

		this._sceneManager.scene.background = fogColor;
		this._sceneManager.scene.fog = new Fog(fogColor, 0.0025, 150);


		// const axesHelper = new AxesHelper(5);
		// this._sceneManager.scene.add(axesHelper);
	}
}