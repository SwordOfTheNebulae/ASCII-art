type CharBrightness = [number, number, number, number];

interface DisplayChar {
	char: string;
	brightnesses: CharBrightness;
}

let settings = {
	contrast: 1,
	brightness: 0,
	width: 128,
	height: 64,
	invertColour: false,
};

const asciiArtOut = document.getElementById("ascii-art") as HTMLSpanElement;

const displayImage = document.getElementById(
	"imagePreview"
) as HTMLImageElement;

let charsetCache: Map<string, DisplayChar[]> = new Map();

const widthInput = document.getElementById("width") as HTMLInputElement;
const heightInput = document.getElementById("height") as HTMLInputElement;

settings.width = Number.parseInt(widthInput.value) ?? 128;
settings.height = Number.parseInt(heightInput.value) ?? 128;

widthInput.addEventListener("change", () => {
	settings.width = Number.parseInt(widthInput.value) ?? settings.width;
	CreateAsciiArt();
});

heightInput.addEventListener("change", () => {
	settings.height = Number.parseInt(heightInput.value) ?? settings.height;
	CreateAsciiArt();
});

const invertColourCheckbox = document.getElementById(
	"invert-colour"
) as HTMLInputElement;

invertColourCheckbox.addEventListener("input", () => {
	settings.invertColour = invertColourCheckbox.checked;
	CreateAsciiArt();
});
settings.invertColour = invertColourCheckbox.checked;

/** Gets all characters and calcualates the brightnesses of each quadrent of each character. */
function getAllDisplayCharsInRange(
	start: number = 32, // these defaults are standard keyboard characters including space
	end: number = 126, // box (and some symbols) characters are 9472 (U+2500) to 9839 (U+266F)
	fontFamily = "monospace"
): DisplayChar[] {
	let out: DisplayChar[] = [];
	let ctx = document.createElement("canvas").getContext("2d");
	for (let i = start; i <= end; i++) {
		const char = String.fromCharCode(i);
		out.push({
			char,
			brightnesses: calculateBrightnessOfCharacter(
				char,
				fontFamily,
				ctx,
				128,
				0.5
			),
		});
	}
	return out;
}

const charsetButtons = Array.from(
	document.querySelectorAll(".charset-checkbox")
) as HTMLInputElement[];
let charsetOptions = { keyboard: true, lines: true, blocks: true, space: true };
function updateCharsetOption(option: string, value: boolean) {}
charsetButtons[0].addEventListener("input", () => {
	charsetOptions.keyboard = charsetButtons[0].checked;
	CreateAsciiArt();
});
charsetButtons[1].addEventListener("input", () => {
	charsetOptions.lines = charsetButtons[1].checked;
	CreateAsciiArt();
});
charsetButtons[2].addEventListener("input", () => {
	charsetOptions.blocks = charsetButtons[2].checked;
	CreateAsciiArt();
});
charsetButtons[3].addEventListener("input", () => {
	charsetOptions.space = charsetButtons[3].checked;
	CreateAsciiArt();
});

charsetButtons.forEach((b) => b.dispatchEvent(new Event("input")));

/** Get the values from the charset case, and if they don't exist, create them with the specified ranges. */
function AccessCharsetCache(
	name: string,
	charRangesIfNotFound: [min: number, max: number][],
	forceRefresh = false
) {
	if (!charsetCache.get(name) || forceRefresh) {
		let tempCharset = [];
		charRangesIfNotFound.forEach(
			([min, max]) =>
				(tempCharset = tempCharset.concat(
					getAllDisplayCharsInRange(min, max)
				))
		);
		charsetCache.set(name, tempCharset);
	}
	return charsetCache.get(name);
}

/** Returns a array of characters and their brightnesses based on the charsetOptions global object */
function GetCharset() {
	let out: DisplayChar[] = [];
	if (charsetOptions.space)
		out = out.concat(AccessCharsetCache("space", [[32, 32]])); // space
	if (charsetOptions.keyboard)
		out = out.concat(AccessCharsetCache("keyboard", [[33, 126]])); // all/most keyboard characters
	if (charsetOptions.lines)
		out = out.concat(
			// box character + a few extras
			AccessCharsetCache("lines", [
				[9472, 9599],
				[9633, 9633],
			]) // char 9632 (■) was ugly so i removed it, doesn't really fit into any catago]ry
		);
	if (charsetOptions.blocks)
		out = out.concat(
			// block characters
			AccessCharsetCache("blocks", [
				[9600, 9600],
				[9604, 9604],
				[9608, 9608],
				[9617, 9619],
			])
		);

	return out;
}

/** Calculated the brightness of the given ImageData object */
function calculateAverageBrightnessOfImageData(imageData: ImageData) {
	const data = imageData.data;
	let total = 0;
	for (let i = 0; i < data.length; i += 4) {
		let alpha = data[i + 3] / 255;
		total +=
			data[i] +
			data[i + 1] +
			data[i + 2] * alpha +
			(255 - data[i + 3]) * 3;
	}
	return total / ((data.length * 3) / 4);
}

/** Calculates the brightness of each quadrent of a character */
function calculateBrightnessOfCharacter(
	char: string,
	fontFamily: string = "monospace",
	ctx: CanvasRenderingContext2D = null,
	fontSize: number = 128,
	weight = 1
): CharBrightness {
	if (char.length == 0)
		throw new Error(
			`Tried to calculate the character brightness of "${char}", which is not a single character`
		);
	if (!ctx) ctx = document.createElement("canvas").getContext("2d");
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	// const size = ctx.measureText(char); // bad for characters that are not full size
	const [width, height] = [
		// size.actualBoundingBoxRight,
		// size.actualBoundingBoxDescent,
		fontSize * 0.5, // aproximations of character size in whatever monospace font firefox uses on my computer
		fontSize,
	];
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "#000000";
	ctx.fillText(char, 0, 0);
	const topLeftQuadrent = ctx.getImageData(0, 0, width / 2, height / 2);
	const topRightQuadrent = ctx.getImageData(
		width / 2,
		0,
		width / 2,
		height / 2
	);
	const bottomLeftQuadrent = ctx.getImageData(
		0,
		height / 2,
		width / 2,
		height / 2
	);
	const bottomRightQuadrent = ctx.getImageData(
		width / 2,
		height / 2,
		width / 2,
		height / 2
	);
	/**size debugging
	// ctx.beginPath();
	// ctx.strokeStyle = "#ff0000";
	// ctx.moveTo(0, height / 2);
	// ctx.lineTo(width, height / 2);
	// ctx.moveTo(width / 2, 0);
	// ctx.lineTo(width / 2, height);
	// ctx.stroke();
	// document.body.appendChild(ctx.canvas); 
	**/
	let totalBrightness: CharBrightness = [
		calculateAverageBrightnessOfImageData(topLeftQuadrent),
		calculateAverageBrightnessOfImageData(topRightQuadrent),
		calculateAverageBrightnessOfImageData(bottomLeftQuadrent),
		calculateAverageBrightnessOfImageData(bottomRightQuadrent),
	];
	if (weight != 1) {
		totalBrightness.map((br) => (br / 255) ** weight * 255);
	}
	return totalBrightness;
}

/** Calculates the brightness of a pixel */
function Brightness(r, g, b, a) {
	return (((r + g + b) / 3) * a) / 255 + (255 - a);
}

/** Finds the character in the given set of characters that best matches brightnesses of 4 values. */
function FindBestCharacterMatch(
	pixels: CharBrightness,
	charset: DisplayChar[],
	contrast = 1,
	invertColour: boolean = false
) {
	let closest: [char: string, distance: number] = ["", Infinity];
	for (const { brightnesses: b, char } of charset) {
		const distance =
			Math.abs(
				(invertColour ? 255 - pixels[0] : pixels[0]) * contrast +
					settings.brightness -
					b[0]
			) +
			Math.abs(
				(invertColour ? 255 - pixels[1] : pixels[1]) * contrast +
					settings.brightness -
					b[1]
			) +
			Math.abs(
				(invertColour ? 255 - pixels[2] : pixels[2]) * contrast +
					settings.brightness -
					b[2]
			) +
			Math.abs(
				(invertColour ? 255 - pixels[3] : pixels[3]) * contrast +
					settings.brightness -
					b[3]
			);
		if (distance < closest[1]) closest = [char, distance];
	}
	return closest[0];
}

const contrastAjust = document.getElementById("contrast") as HTMLInputElement;
const contrastDisplay = document.getElementById(
	"contrast-display"
) as HTMLSpanElement;
contrastDisplay.innerText = contrastAjust.value;
contrastAjust.addEventListener("input", () => {
	contrastDisplay.innerText = contrastAjust.value;
	settings.contrast = Number.parseFloat(contrastAjust.value) ?? 1;
});
contrastAjust.addEventListener("change", CreateAsciiArt);
contrastAjust.dispatchEvent(new Event("input"));

const brightnessAjust = document.getElementById(
	"brightness"
) as HTMLInputElement;
const brightnessDisplay = document.getElementById(
	"brightness-display"
) as HTMLSpanElement;
brightnessDisplay.innerText = brightnessAjust.value;
brightnessAjust.addEventListener("input", () => {
	brightnessDisplay.innerText = brightnessAjust.value;
	settings.brightness = Number.parseInt(brightnessAjust.value) ?? 1;
});
brightnessAjust.addEventListener("change", CreateAsciiArt);
brightnessAjust.dispatchEvent(new Event("input"));

/** Goes through every group of 4 (2x2) pixels in an image and returns the best matching character from the given charset for each. */
function ImageToAscii(image: ImageData, charset: DisplayChar[]) {
	const data = image.data;
	const width = image.width / 2;
	const height = image.height / 2;

	let out: String[][] = Array.from({ length: height }).map(() =>
		Array.from({ length: width })
	);
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			// get indexes for 4 pixels based on x and y
			const iTopLeft = 4 * (y * 2 * width * 2 + x * 2);
			const iTopRight = 4 * (y * 2 * width * 2 + x * 2 + 1);
			const iBottomLeft = 4 * ((y * 2 + 1) * width * 2 + x * 2);
			const iBottomRight = 4 * ((y * 2 + 1) * width * 2 + x * 2 + 1);

			// get brightnesses for 4 pixels based on index
			const brightnessTopLeft = Brightness(
				data[iTopLeft],
				data[iTopLeft + 1],
				data[iTopLeft + 2],
				data[iTopLeft + 3]
			);
			const brightnessTopRight = Brightness(
				data[iTopRight],
				data[iTopRight + 1],
				data[iTopRight + 2],
				data[iTopRight + 3]
			);
			const brightnessBottomLeft = Brightness(
				data[iBottomLeft],
				data[iBottomLeft + 1],
				data[iBottomLeft + 2],
				data[iBottomLeft + 3]
			);
			const brightnessBottomRight = Brightness(
				data[iBottomRight],
				data[iBottomRight + 1],
				data[iBottomRight + 2],
				data[iBottomRight + 3]
			);
			const pixelBrightness: CharBrightness = [
				brightnessTopLeft,
				brightnessTopRight,
				brightnessBottomLeft,
				brightnessBottomRight,
			];
			out[y][x] = FindBestCharacterMatch(
				pixelBrightness,
				charset,
				settings.contrast,
				settings.invertColour
			);
		}
	}
	return out.map((row) => row.join("")).join("\n"); // turn 2D array of characters into 1D string with newlines
}

/** Resizes a HTMLImageElement to the specified size and returns an ImageData with the resized image */
function ResizeImageIntoImageData(
	width: number,
	height: number,
	image: HTMLImageElement
): ImageData {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, width, height);
	return ctx.getImageData(0, 0, width, height);
}

/** Creates the text art using the displayImage (HTMLImageElement) and asciiArtOut (any HTMLElement) global variables and the global charset settings */
function CreateAsciiArt() {
	if (
		displayImage.src ==
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAgSURBVDhPY/z//z8DKYAJShMNRjUQA0Y1EANorYGBAQBVbQMdzqK/3wAAAABJRU5ErkJggg=="
	)
		return; // don't display the placeholder 16x16 pixel image
	asciiArtOut.innerText = ImageToAscii(
		ResizeImageIntoImageData(
			settings.width * 2,
			settings.height * 2,
			displayImage
		),
		GetCharset()
	);
	// set styles for the output box based on inverted colour
	asciiArtOut.style.backgroundColor = settings.invertColour
		? "black"
		: "white";
	asciiArtOut.style.color = settings.invertColour ? "white" : "black";
	asciiArtOut.style.border = `1px solid ${
		settings.invertColour ? "white" : "black"
	}`;
}
const fileUpload = document.getElementById("uploader") as HTMLInputElement;
const fileReader = new FileReader();
const actualSizeDisplay = document.getElementById(
	"actualsize"
) as HTMLSpanElement;

fileUpload.addEventListener("change", function fileChange(event) {
	let files = fileUpload.files;
	if (files.length == 0) return;
	fileReader.readAsDataURL(files[0]);
});
fileUpload.dispatchEvent(new Event("change")); // dispatch a change event so if a user reloads the page and the image was cached by the browser, load the image

fileReader.addEventListener("load", function fileReaderLoad(event) {
	if (event.target.result.toString() == displayImage.src) return; // if image we are loading is already there, don't do anything
	displayImage.src = event.target.result.toString();
	displayImage.onload = () => {
		actualSizeDisplay.innerText = `Raw image size: ${displayImage.naturalWidth}×${displayImage.naturalHeight}`;
		CreateAsciiArt();
		displayImage.onload = null; // remove event handler just in case
	};
});
