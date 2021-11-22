export class MathUtils
{
	public static clamp(num: number, min: number, max: number)
	{
		return num <= min ? min : num >= max ? max : num;
	}

	public static getRandomBetween(min: number, max: number)
	{
		return Math.random() * (max - min) + min;
	}

	// https://en.wikipedia.org/wiki/Linear_interpolation
	public static getInterpolant(x0: number, y0: number, x1: number, y1: number, x: number)
	{
		return (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0);
	}
}