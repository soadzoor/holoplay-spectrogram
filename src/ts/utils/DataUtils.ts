export class DataUtils
{
	public static async loadTxt(txtUrl: string)
	{
		const response = await fetch(txtUrl);
		const text = await response.text();

		return text;
	}
}