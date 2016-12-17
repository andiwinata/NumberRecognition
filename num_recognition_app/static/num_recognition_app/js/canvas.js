// classes declaration
function Vector2(x, y) {
	this.x = (x === undefined) ? 0 : x;
	this.y = (y === undefined) ? 0 : y;
}

Vector2.prototype = {

	sqrMagnitudeTo: function (x, y) {
		// assuming that x contains x and y as attribute
		if (y === undefined) {
			if (x.x === undefined || x.y === undefined) {
				console.error('cannot get x and y value');
			} else {
				return this.sqrMagnitude(this.x, x.x, this.y, x.y);
			}
		} else { // if there are 2 inputs
			return this.sqrMagnitude(this.x, x, this.y, y);
		}
	},

	sqrMagnitude: function (x1, x2, y1, y2) {
		return Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
	},

	set: function (x, y) {
		// http://stackoverflow.com/questions/2100758/javascript-or-variable-assignment-explanation
		this.x = +x || 0;
		this.y = +y || 0;
	},

	lerpTo: function (x, y, t) {
		return this.lerp(this.x, x, this.y, y, t);
	},

	lerp: function (x1, x2, y1, y2, t) {
		return new Vector2(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
	},

	constructor: Vector2, // putting constructor property back
};

/**
 * Canvas grid, the one used for drawing
 * using canvas but limited to pixel style art
 * @type {Object}
 */
let CanvasGrid = {
	CanvasLayer: function (context, layerOrder) {
		this.context = context;
		this.layerOrder = layerOrder;
	},

	initSettings: function () {
		// changeable variables
		this.gridSizeX = 10;
		this.gridSizeY = 10;
		this.brushSize = [
			[1, 1],
			[1, 1]
		];
		this.zeroColor = "#000000";
		this.oneColor = "#ffffff";
		this.borderColor = "#FF9E80";
		this.textColor = "rgba(255, 158, 128, 0.5)"; //"#FF9E80";
		this.fontFamily = "Roboto, Consolas, Monaco, sans-serif";

		// multiplier based on size of 1 grid pixel
		this.fontSizeMultiplier = 0.75;
	},

	get currentCtx() {
		return this.getLayerContext(this.currentLayerId);
	},

	getLayerContext: function (layerId) {
		let layerObj = this.canvasLayers[layerId];
		if (layerObj === undefined) {
			let err = new Error(`Cannot get the current context for id ${layerId}!`);
			throw err;
		}

		return layerObj.context;
	},


	init: function () {
		this.initSettings();

		this.drawingArea = document.getElementById("drawingArea");
		// setting canvas container
		this.canvasContainer = document.getElementById("canvasContainer");
		this.canvasContainer.style.position = 'relative';

		this.canvases = [...document.getElementsByClassName('canvas')];
		this.canvasLayers = {};

		// pixel drawn is mainly used for view representation
		this.pixelDrawn = {};
		// this is similar to pixelDrawn but it only care about 1 layer for now...
		// this is used for redraw() even though a bit redundant with pixelDrawn
		this.canvasValues = {};

		this.storedData = [];

		this.hitBox = document.getElementById('topCanvas');
		this.borderContext = document.getElementById('borderCanvas').getContext('2d');
		this.valueContext = document.getElementById('valueCanvas').getContext('2d');

		this.lastGeneratedLayerId = 0;
		this.createCanvasLayer(canvasContainer);
		this.currentLayerId = 0;

		this.isDrawing = false;
		this.isMobile = false;

		this.bindEvent();

		this.updateCanvasSizeData();
		this.resizeCanvases();
		this.resetCanvas(this.currentLayerId);
		this.drawGridBorder();
		this.updateCanvasValueView(this.currentLayerId);
	},

	/**
	 * Binding event for buttons
	 * @return {[type]} [description]
	 */
	bindEvent: function () {
		let self = this;

		/**
		 * Event listener for reset button
		 */
		document.getElementById('resetCanvas').onclick =
			() => self.resetCanvas(self.currentLayerId, self.updateCanvasValueView.bind(self, self.currentLayerId)); // use bind to keep the have correct scope

		/**
		 * Handle mouse down or touch start
		 */
		let handleStart = function (coordinate) {
			self.isDrawing = true;

			let x = coordinate.x;
			let y = coordinate.y;
			self.drawBrush(self.currentLayerId, x, y, self.updateCanvasValueView.bind(self, self.currentLayerId));
			self.previousMousePos.x = x;
			self.previousMousePos.y = y;
		};
		self.hitBox.onmousedown = function (e) {
			// only left click
			if (e.button == 0 && !self.isMobile) {
				handleStart(self.getCursorPosition(e, 'mouse'));
			}
		};
		self.hitBox.addEventListener('touchstart', function (e) {
			self.isMobile = true;
			e.preventDefault();
			handleStart(self.getCursorPosition(e, 'touch'));
		}, { passive: true });

		/**
		 * Handle mouse move or touch move
		 */
		let handleMove = function (coordinate) {
			if (self.isDrawing) {
				let x = coordinate.x;
				let y = coordinate.y;
				// console.log(`is moving`);
				self.drawInBetween(self.previousMousePos.x, x, self.previousMousePos.y, y);
				self.drawBrush(self.currentLayerId, x, y, self.updateCanvasValueView.bind(self, self.currentLayerId));
				self.previousMousePos.set(x, y);
				// canvasGrid.ctx.lineTo(x, y); ctx.stroke();
			}
		};
		self.hitBox.onmousemove = function (e) {
			handleMove(self.getCursorPosition(e, 'mouse'));
		};
		self.hitBox.addEventListener('touchmove', function (e) {
			e.preventDefault();
			handleMove(self.getCursorPosition(e, 'touch'));
		});

		/**
		 * Handle mouse up or touch end
		 */
		let handleEnd = function (e) {
			self.isDrawing = false;
			self.updateCanvasValueView(self.currentLayerId);
		};
		self.hitBox.onmouseup = function () {
			if (!self.isMobile) {
				handleEnd();
			}
		}
		self.hitBox.addEventListener('touchend', function (e) {
			e.preventDefault();
			handleEnd();
		});

		/**
		 * Event listener for document
		 */
		document.onmouseup = function () {
			self.isDrawing = false;
		};

		/**
		 * Event listener when windows is resized
		 */
		window.onresize = function () {
			self.isMobile = false;
			self.updateCanvasSizeData();
			self.resizeCanvases();
			self.resetCanvas(self.currentLayerId);
			self.drawGridBorder();
			self.redraw();
			self.updateCanvasValueView(self.currentLayerId);
		};
	},

	/* ================ FUNCTIONS ================ */

	/**
	 * Namespacing functions that related to data only
	 * not sure if this is the best approach...
	 */
	dataFunctions: {
		/**
		 * Update the current width of all canvases
		 * for some reason cannot use getter() since the getCurrentWidth() will always 
		 * give different value in the beginning (might be some loading changes)
		 */
		updateCurrentWidth: function (self) {
			self = self ? self : this;
			let rawWidth = self.drawingArea.getBoundingClientRect().width;
			self.currentWidth = rawWidth - (rawWidth % self.gridSizeX);
		},

		updateCanvasDimensionValues: function (self) {
			self = self ? self : this;

			self.pixelWidth = Math.round(self.currentWidth / self.gridSizeX);
			self.pixelHeight = Math.round(self.currentWidth / self.gridSizeY);

			self.previousMousePos = new Vector2();
			self.maxSqrMagnitude = Vector2.prototype.sqrMagnitude(self.pixelWidth, 0, self.pixelHeight, 0);
		},

		/**
		 * Updating the list of pixel to get grid data from
		 * usually the top left corner of the canvas
		 */
		updatePixelList: function (self) {
			self = self ? self : this;

			self.pixelList = [];
			// get pixel list and draw border
			for (let i = 0; i < self.gridSizeY; i++) {
				for (let j = 0; j < self.gridSizeX; j++) {
					self.pixelList.push([
						j * self.pixelWidth,
						i * self.pixelHeight
					]);
				}
			}
		},
	},

	updateCanvasSizeData: function () {
		this.dataFunctions.updateCurrentWidth(this);
		this.dataFunctions.updateCanvasDimensionValues(this);
		this.dataFunctions.updatePixelList(this);
	},

	resizeCanvases: function () {
		// resize canvas following the container in 1:1 aspect ratio
		// setting html content to all canvas because css width and height is not enough
		// to set canvases height and width
		let w = this.currentWidth;

		let setElementDimension = function (el, w, h) {
			el.setAttribute('width', w);
			el.setAttribute('height', h);
			el.style.width = w + 'px';
			el.style.height = h + 'px';
		}

		// set all canvases width and height
		setElementDimension(this.canvasContainer, w, w);

		// canvases is not array so cannot call canvases.forEach
		Array.prototype.forEach.call(this.canvases, function (val) {
			setElementDimension(val, w, w);
		});
	},

	createCanvasLayer: function (parent) {
		let canvasId = `drawingCanvas${this.lastGeneratedLayerId}`;
		let canvasClass = `canvas`;

		// create canvas and put it to DOM
		let newCanvas = document.createElement('canvas');
		newCanvas.setAttribute('id', canvasId);
		newCanvas.setAttribute('class', canvasClass);
		parent.appendChild(newCanvas);
		this.canvases.push(newCanvas);

		// add the new layer to dictionary, add the correct sorting order
		// right now just using layerId
		this.canvasLayers[this.lastGeneratedLayerId] = new this.CanvasLayer(newCanvas.getContext('2d'), this.lastGeneratedLayerId);
		// initialize pixelDrawn array for this layer Id
		this.pixelDrawn[this.lastGeneratedLayerId] = {};
		// increment generated layer id
		this.lastGeneratedLayerId++;
	},

	/**
	 * Update the view representation of the currentCanvasValue per grid
	 * This will always get the latest state of canvas
	 */
	updateCanvasValueView: function (layerId) {
		let canvasValues = this.getCanvasValue(layerId);
		this.valueContext.clearRect(0, 0, this.currentWidth, this.currentWidth);

		for (let i = 0; i < canvasValues.length; i++) {
			let index2d = this.get2dIndex(i);
			this.drawCanvasGridText(this.valueContext, canvasValues[i],
				index2d.x * this.pixelWidth + (0.5 * this.pixelWidth),
				index2d.y * this.pixelHeight + (0.5 * this.pixelHeight));
		}

	},

	/**
	 * Draw brush
	 * @param  {number} layerId
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {function()} callback=null
	 */
	drawBrush: function (layerId, x, y, callback = null) {
		// draw brush according to shape of the brush
		let self = this;
		this.brushSize.forEach(function (val, i) {
			val.forEach(function (val, j) {
				if (val == 1) {
					self.drawSquarePixel(layerId, x + j * self.pixelWidth, y + i * self.pixelHeight);
				}
			});
		});

		if (callback != null) {
			callback();
		}
	},

	/**
	 * Drawing square pixel function
	 * @param  {number} layerId
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {string} coordinate='pixel'
	 */
	drawSquarePixel: function (layerId, x, y, coordinate = 'pixel') {
		let ctx = this.getLayerContext(layerId);

		let x2 = 0;
		let y2 = 0;
		let flatIndex = 0;

		if (coordinate == 'pixel') {
			x2 = x - (x % this.pixelWidth);
			y2 = y - (y % this.pixelHeight);
			flatIndex = this.get1dIndex(x2, y2, coordinate = 'pixel')
		} else {
			x2 = x * this.pixelWidth;
			y2 = y * this.pixelHeight;
			flatIndex = this.get1dIndex(x, y, coordinate = 'grid');
		}

		// console.log(this.pixelDrawn);
		if (this.pixelDrawn[layerId][flatIndex] != 1) {
			// console.log(`x2: ${x2}, y2: ${y2}`);
			ctx.fillRect(x2, y2, this.pixelWidth, this.pixelHeight);
			this.pixelDrawn[layerId][flatIndex] = 1;
		} else {
			// console.log(`pixel has been drawn`);
		}
	},

	drawCanvasGridText: function (ctx, text, x, y) {
		let currentStyle = ctx.fillStyle;

		ctx.font = `bold ${this.currentWidth / this.gridSizeX * this.fontSizeMultiplier}px ${this.fontFamily}`;
		ctx.fillStyle = this.textColor;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";

		ctx.fillText(text, x, y);
		ctx.fillStyle = currentStyle;
	},

	getCanvasValue: function (layerId) {
		let ctx = this.getLayerContext(layerId);
		let arr = [];

		this.pixelList.forEach(function (val) {
			let imgData = ctx.getImageData(val[0], val[1], 1, 1).data;
			let r = imgData[0];
			let g = imgData[1];
			let b = imgData[2];
			let greyScale = (r + g + b) / 3 / 255;
			arr.push(greyScale);
		});

		// set the data too
		this.canvasValues[layerId] = arr;

		return arr;
	},

	/**
	 * @param  {number} layerId				Layer Id to get context from
	 * @param  {function()} callback=null		Callback after canvas is resetted
	 */
	resetCanvas: function (layerId, callback = null) {
		let ctx = this.getLayerContext(layerId);

		let w = this.currentWidth;
		ctx.clearRect(0, 0, w, w);
		ctx.fillStyle = this.zeroColor;
		ctx.fillRect(0, 0, w, w);
		ctx.fillStyle = this.oneColor;

		for (let key in this.pixelDrawn[layerId]) {
			this.pixelDrawn[layerId][key] = 0;
		}

		if (callback != null) {
			callback();
		}
	},

	/**
	 * Redrawing the canvas based on last canvas value
	 */
	redraw: function () {
		// loop through every layer
		for (let layerId in this.canvasValues) {
			let layerValues = this.canvasValues[layerId];

			// and redraw it
			for (let i = 0; i < layerValues.length; i++) {
				if (layerValues[i] != 1) {
					continue;
				}

				let coord = this.get2dIndex(i);
				let x = coord.x;
				let y = coord.y;
				this.drawSquarePixel(layerId, x, y, coordinate = 'grid');
			}
		}
	},

	drawBorder: function (ctx, x, y, width, height) {
		ctx.strokeStyle = this.borderColor;
		ctx.rect(x, y, width, height);
		ctx.stroke();
	},

	drawGridBorder: function () {
		// get pixel list and draw border
		for (let i = 0; i < this.gridSizeY; i++) {
			for (let j = 0; j < this.gridSizeX; j++) {
				this.drawBorder(this.borderContext, j * this.pixelWidth, i * this.pixelHeight, this.pixelWidth, this.pixelHeight);
			}
		}
	},

	/**
	 * Return 1d index of 2d position
	 * Basically y * gridSizeX + x
	 * [0, 1, 2, 3, 4, 5]
	 * [6, 7, 8, 9, 10, 11]
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {string} coordinate='grid'
	 * @return {number}
	 */
	get1dIndex: function (x, y, coordinate = 'grid') {
		// if they are out of index, return -1
		if (coordinate == 'grid') {
			return x >= this.gridSizeX || y >= this.gridSizeY ? -1 :
				y * this.gridSizeX + x;
		} else { // this may cause bug in the future since pixelWidth and Height are changing during resize
			return x >= this.gridSizeX * this.pixelWidth || y >= this.gridSizeY * this.pixelHeight ? -1 :
				Math.floor(y / this.pixelHeight) * this.gridSizeX + Math.floor(x / this.pixelWidth);
		}
	},

	/**
	 * Get 2d index from 1d index
	 * @param  {number} flatIndex
	 * @param  {string} coordinate='grid'
	 * @return {Object{x, y}}
	 */
	get2dIndex: function (flatIndex, coordinate = 'grid') {
		if (coordinate == 'grid') {
			return { x: flatIndex % this.gridSizeX, y: Math.floor(flatIndex / this.gridSizeX) };
		} else {
			let xGrid = Math.floor(flatIndex % this.pixelWidth);
			let yGrid = Math.floor(flatIndex / this.pixelHeight);
			return { x: xGrid, y: yGrid };
		}
	},

	/**
	 * only draw the in between
	 * not drawing start and end
	 * @param {number} x1
	 * @param {number} x2
	 * @param {number} y1
	 * @param {number} y2
	 */
	drawInBetween: function (x1, x2, y1, y2) {
		let distSqr = Vector2.prototype.sqrMagnitude(x1, x2, y1, y2);

		if (distSqr > this.maxSqrMagnitude) {
			let totalInBetween = Math.floor(distSqr / this.maxSqrMagnitude);
			let increment = 1 / (totalInBetween + 1);
			// console.log('total in between: ' + totalInBetween);

			for (let i = 1; i <= totalInBetween; i++) {
				let pos = Vector2.prototype.lerp(x1, x2, y1, y2, i * increment);
				this.drawBrush(this.currentLayerId, pos.x, pos.y);
			}
		}
	},

	getCurrentCanvasValue: function () {
		return this.getCanvasValue(this.currentLayerId);
	},

	resetCurrentCanvas: function () {
		this.resetCanvas(this.currentLayerId, this.updateCanvasValueView.bind(this, this.currentLayerId));
	},

	getCursorPosition: function (event, eventType) {
		let rect = this.canvasContainer.getBoundingClientRect();
		let x = 0;
		let y = 0;

		if (eventType == 'touch') {
			x = event.touches[0].clientX;
			y = event.touches[0].clientY;
		} else { // if mouse or anything
			x = event.clientX;
			y = event.clientY;
		}

		x -= rect.left;
		y -= rect.top;
		return { "x": x, "y": y };
	},

};

/**
 * Handle form input and getting value to be prepared for training data
 * @type {Object}
 */
let TrainingData = {
	configs: {
		trainUrl: "/api/ml-model/train",
	},

	init: function () {
		this.formMessage = document.getElementById("trainFormMessage");
		this.formMessageTypes = { "success": "success", "alert": "alert" };

		this.trainDigitNumberInput = document.getElementById('trainDigitNumber');
		this.storedData = [];

		let self = this;

		// listeners
		document.getElementById('submitTrainForm').onclick = this.sendTrainData.bind(this);
		document.getElementById('train-form').onsubmit = (e) => {
			e.preventDefault();
			self.sendTrainData();
		};

		this.trainDigitNumberInput.oninput = function () {
			self.setFormMessageVisibility(false);
		};
	},

	/**
	 * Sending training data 
	 * (label and parameters)
	 */
	sendTrainData: function () {
		let val = this.trainDigitNumberInput.value;

		// check if it contains valid string (not just empty whitespace)
		// http://stackoverflow.com/questions/2031085/how-can-i-check-if-string-contains-characters-whitespace-not-just-whitespace
		if (!/\S/.test(val)) {
			this.setFormMessageValue("Hey don't leave the data label empty!", "alert");
			this.setFormMessageVisibility(true);
			return;
		}

		let intVal = parseInt(val);

		if (Util.isInt(intVal) && intVal >= 0 && intVal < 10) {
			let canvasValue = CanvasGrid.getCurrentCanvasValue();
			let data = {
				label: intVal,
				features: canvasValue
			};
			// store data to array
			// TODO: this might not neccessary
			this.storedData.push(data);

			// reset the data and canvas
			this.trainDigitNumberInput.value = '';
			CanvasGrid.resetCurrentCanvas();

			let self = this;

			// sending the data
			Util.sendPostJsonData(data, this.configs.trainUrl, [{
				"Content-type": "application/json;charset=UTF-8"
			}], function (response) {
				self.setFormMessageValue('Successfully added training data!', 'success');
			}, function (error) {
				self.setFormMessageValue(`Failed to add data, error: ${error}`, 'alert');
			});

			this.setFormMessageValue('Adding data...', 'success');
		} else {
			this.setFormMessageValue("Only put integer 0-9 as data label!", "alert");
		}

		this.setFormMessageVisibility(true);
	},

	setFormMessageVisibility: function (visible) {
		let hiddenClassName = "hidden--no-height";

		if (visible) {
			// adding animation
			this.formMessage.style.maxHeight = this.formMessage.scrollHeight;
			// remove the hidden class
			this.formMessage.classList.remove(hiddenClassName);
		} else {
			let classes = this.formMessage.classList;
			if (!classes.contains(hiddenClassName)) {
				// adding animation
				this.formMessage.style.maxHeight = 0;
				// add hidden class
				this.formMessage.classList.add(hiddenClassName);
			}
		}

	},

	setFormMessageValue: function (message, type = "success") {
		if (!type in this.formMessageTypes) {
			throw new Error(`Form message type ${type} does not exist in the formMessageTypes!`);
		}

		// set the message
		this.formMessage.innerHTML = message;

		// check if same type
		let classList = this.formMessage.classList;

		if (classList.contains(type)) {
			return;
		}

		// clean all other messageTypes
		for (let cls of classList) {
			if (cls in this.formMessageTypes) {
				this.formMessage.classList.remove(cls);
			}
		}

		this.formMessage.classList.add(type);
	},

};

/**
 * Handle number prediction
 */
let PredictData = {
	configs: {
		predictUrl: "/api/ml-model/predict",
	},

	init: function () {
		this.submitPredictButton = document.getElementById("submitPredict");
		this.predictResult = document.getElementById("predictResult");

		this.submitPredictButton.onclick = this.sendPredictRequest.bind(this);
	},

	sendPredictRequest: function () {
		// sending the data
		let canvasValue = CanvasGrid.getCurrentCanvasValue();
		let data = {
			features: canvasValue
		};

		Util.sendPostJsonData(data, this.configs.predictUrl, [{
			"Content-type": "application/json;charset=UTF-8"
		}], function (response) {
			this.predictResult.innerHTML = `The number is: ${response}!`;
		}, function (error) {
			// handle error
		});
	}
};

let Util = {
	sendPostJsonData: function (data, url, headers, onSuccessResponse, onErrorReponse) {
		let xhr = new XMLHttpRequest();

		xhr.open('POST', url, true);

		for (header of headers) {
			for (hKey in header) {
				xhr.setRequestHeader(hKey, header[hKey]);
			}
		}

		xhr.onload = function (e) {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				if (xhr.status === 200) {
					console.log(xhr.responseText);
					if (typeof onSuccessResponse === "function") {
						onSuccessResponse(xhr.responseText);
					}
				} else {
					console.error(xhr.statusText);
					console.error(xhr.responseText);
					if (typeof onErrorReponse === "function") {
						onErrorReponse(xhr.statusText);
					}
				}
			}
		};

		let jsonData = JSON.stringify(data);
		xhr.send(jsonData);
	},

	// Short-circuiting, and saving a parse operation
	isInt: function (value) {
		let x;
		if (isNaN(value)) {
			return false;
		}
		x = parseFloat(value);
		return (x | 0) === x;
	}
}

CanvasGrid.init();
TrainingData.init();
PredictData.init();