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
				if (i % 1 === 0 && j % 1 === 0)
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
			clonedMesh.position.setX(size.x * i);
			arrayOfSpectros.push(clonedMesh);
			this._sceneManager.scene.add(clonedMesh);
		}

		for (const spectroMesh of arrayOfSpectros)
		{
			const from: IVec3 = {
				x: spectroMesh.position.x,
				y: spectroMesh.position.y,
				z: spectroMesh.position.z,
			};
			const to: IVec3 = {
				...from,
				x: spectroMesh.position.x - size.x
			}
			new Tween<IVec3>(from).to(to, 8000).repeat(50).onUpdate((current: IVec3) =>
			{
				spectroMesh.position.set(current.x, current.y, current.z);
				this._sceneManager.needsRender = true;
			}).start();
		}

		const fogColor = new Color(0xffffff);

		this._sceneManager.scene.background = fogColor;
		this._sceneManager.scene.fog = new Fog(fogColor, 0.0025, 150);


		// const axesHelper = new AxesHelper(5);
		// this._sceneManager.scene.add(axesHelper);
	}
}