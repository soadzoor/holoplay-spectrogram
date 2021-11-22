export class ColorUtils
{
	/**
	 * 
	 * @param hue [0-360]
	 * @param saturation [0 - 1]
	 * @param lightness [0 - 1]
	 * 
	 * Returns array with 3 elements: rgb in range of [0, 1]
	 */
	public static hsl2rgb(h: number, s: number, l: number) 
	{
		const a = s * Math.min(l, 1 - l);

		const f = (n: number, k: number = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

		return [
			f(0),
			f(8),
			f(4)
		];
	}
}