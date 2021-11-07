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
}