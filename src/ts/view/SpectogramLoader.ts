import {AxesHelper, BufferAttribute, BufferGeometry, LinePieces, Points, PointsMaterial} from "three";
import {DataUtils} from "utils/DataUtils";
import {SceneManager} from "./SceneManager";

interface IVec3
{
	x: number;
	y: number;
	z: number;
}

export class SpectogramLoader
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

				xyzArray.push({
					x: xAxisValues[i],
					y: value,
					z: zAxisValues[j],
				});

				console.log(zAxisValues[j]);
			}
		}

		console.log(xyzArray);

		const positions = new Float32Array(xyzArray.flatMap(xyz => [xyz.x, xyz.y, xyz.z]));
		const colors = new Float32Array(xyzArray.flatMap(xyz => [0, 0.75, 0]));

		this._geometry.setAttribute("position", new BufferAttribute(positions, 3));
		this._geometry.setAttribute("color", new BufferAttribute(colors, 3));
		this._geometry.computeBoundingBox();
		this._geometry.center();

		const material = new PointsMaterial({size: 0.15, vertexColors: true});

		const points = new Points(this._geometry, material);

		const bbox = this._geometry.boundingBox;
		const size = {
			x: bbox.max.x - bbox.min.x,
			y: bbox.max.y - bbox.min.y,
			z: bbox.max.z - bbox.min.z,
		};
		const xToZRatio = size.x / size.z;
		const xToYRatio = size.x / size.y;

		points.scale.setZ(xToZRatio);
		points.scale.setY(xToYRatio);

		this._sceneManager.scene.add(points);

		const axesHelper = new AxesHelper(5);
		this._sceneManager.scene.add(axesHelper);
	}
}