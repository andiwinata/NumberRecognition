// classes declaration
function Vector2(x, y) {
  this.x = (x === undefined) ? 0 : x;
  this.y = (y === undefined) ? 0 : y;
}

Vector2.prototype = {

  sqrMagnitudeTo: function(x, y) {
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

  sqrMagnitude: function(x1, x2, y1, y2) {
    return Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
  },

  set: function(x, y) {
    // http://stackoverflow.com/questions/2100758/javascript-or-variable-assignment-explanation
    this.x = +x || 0;
    this.y = +y || 0;
  },

  lerpTo: function(x, y, t) {
    return this.lerp(this.x, x, this.y, y, t);
  },

  lerp: function(x1, x2, y1, y2, t) {
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
		this.fontFamily = "Lato, Consolas, Monaco, sans-serif";
		
		// multiplier based on size of 1 grid pixel
		this.fontSizeMultiplier = 0.75;
	},

	get currentCtx() {
		return this.getLayerContext(this.currentLayerId);
	},

	getLayerContext: function (layerId) {
		let layerObj = this.canvasLayers[layerId];
		if (layerObj === undefined) {
			throw new Error(`Cannot get the current context for id ${layerId}!`);
		}

		return layerObj.context;
	},

	/**
	 * Update the current width of all canvases
	 * for some reason cannot use getter() since the getCurrentWidth() will always 
	 * give different value in the beginning (might be some loading changes)
	 */
	updateCurrentWidth() {
		let rawWidth = this.drawingArea.getBoundingClientRect().width;
		this.currentWidth = rawWidth - (rawWidth % this.gridSizeX);
	},

	init: function () {
		this.initSettings();

		this.drawingArea = document.getElementById("drawingArea");
		// setting canvas container
		this.canvasContainer = document.getElementById("canvasContainer");
		this.canvasContainer.style.position = 'relative';

		this.canvases = [...document.getElementsByClassName('canvas')];
		this.canvasLayers = {};

		this.pixelList = [];
		this.pixelDrawn = {};

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

		this.updateCurrentWidth();
		this.updateCanvasDimensionValues();
		this.resizeCanvases();
		this.resetCanvas(this.currentLayerId);

		// get pixel list and draw border
		for (let i = 0; i < this.gridSizeY; i++) {
			for (let j = 0; j < this.gridSizeX; j++) {
				this.pixelList.push([
					j * this.pixelWidth,
					i * this.pixelHeight
				]);

				this.pixelDrawn[this.currentLayerId][this.get1dIndex(j, i, coordinate = 'grid')] = 0;
				this.drawBorder(this.borderContext, j * this.pixelWidth, i * this.pixelHeight, this.pixelWidth, this.pixelHeight);
			}
		}

		this.updateCanvasValueView();
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
			() => self.resetCanvas(self.currentLayerId, self.updateCanvasValueView.bind(self)); // use bind to keep the have correct scope

		/**
		 * Handle mouse down or touch start
		 */
		let handleStart = function (coordinate) {
			self.isDrawing = true;

			let x = coordinate.x;
			let y = coordinate.y;
			console.log(`handle start, x: ${x}, y:${y}`);
			self.drawBrush(self.currentLayerId, x, y, self.updateCanvasValueView.bind(self));
			self.previousMousePos.x = x;
			self.previousMousePos.y = y;
		};
		self.hitBox.onmousedown = function (e) {
			// only left click
			if (e.button == 0 && !self.isMobile) {
				console.log('mouse down');
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
				self.drawBrush(self.currentLayerId, x, y, self.updateCanvasValueView.bind(self));
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
			self.updateCanvasValueView();
			console.log(`handle end`);
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
			self.updateCurrentWidth();
			self.updateCanvasDimensionValues();
			self.resizeCanvases();
			self.resetCanvas(self.currentLayerId);
			self.drawGridBorder();
			self.redraw();
			self.updateCanvasValueView();
		};
	},

	/* ================ FUNCTIONS ================ */
	updateCanvasDimensionValues: function () {
		this.pixelWidth = Math.round(this.currentWidth / this.gridSizeX);
		this.pixelHeight = Math.round(this.currentWidth / this.gridSizeY);

		this.previousMousePos = new Vector2();
		this.maxSqrMagnitude = Vector2.prototype.sqrMagnitude(this.pixelWidth, 0, this.pixelHeight, 0);
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

	updateCanvasValueView: function () {
		let canvasValues = this.canvasValues = this.getCurrentCanvasValue();
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
		if (this.pixelDrawn[layerId][flatIndex] == 0) {
			// console.log(`x2: ${x2}, y2: ${y2}`);
			ctx.fillRect(x2, y2, this.pixelWidth, this.pixelHeight);
			this.pixelDrawn[layerId][flatIndex] = 1;
		} else {
			console.log(`pixel has been drawn`);
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

	getCanvasValue: function (ctx) {
		let arr = [];

		this.pixelList.forEach(function (val) {
			let imgData = ctx.getImageData(val[0], val[1], 1, 1).data;
			let r = imgData[0];
			let g = imgData[1];
			let b = imgData[2];
			let greyScale = (r + g + b) / 3 / 255;
			arr.push(greyScale);
		});

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

	redraw: function () {
		let canvasValues = this.canvasValues;

		for (let i = 0; i < canvasValues.length; i++) {
			if (canvasValues[i] != 1) {
				continue;
			}

			let x = i % this.gridSizeX;
			let y = Math.floor(i / this.gridSizeX);
			this.drawSquarePixel(this.currentLayerId, x, y, coordinate = 'grid');
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
	 * @param  {} flatIndex
	 * @param  {} coordinate='grid'
	 * @return {Object{x, y}}
	 */
	get2dIndex: function (flatIndex, coordinate = 'grid') {
		if (coordinate == 'grid') {
			return {x: flatIndex % this.gridSizeX, y: Math.floor(flatIndex / this.gridSizeX)};
		} else {
			let xGrid = Math.floor(flatIndex % this.pixelWidth);
			let yGrid = Math.floor(flatIndex / this.pixelHeight);
			return {x: xGrid, y: yGrid};
		}
	},

	// only draw the in between
	// not drawing start and end
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
		return this.getCanvasValue(this.currentCtx);
	},

	resetCurrentCanvas: function () {
		this.resetCanvas(this.currentLayerId, this.updateCanvasValueView.bind(this));
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
    trainPostUrl: "/api/ml-model/train",
  },

  init: function() {

    this.trainDigitNumberData = document.getElementById('trainDigitNumber');
    this.storedData = [];

    self = this;
    /**
     * Event listener for submit button
     */
    document.getElementById('submitTrainForm').onclick = function() {
      let val = parseInt(self.trainDigitNumberData.value);

      if (val) {
        let canvasValue = CanvasGrid.getCurrentCanvasValue();
        let data = {
          label: val,
          features: canvasValue
        };
        // store data to array
        self.storedData.push(data);

        // reset the data and canvas
        self.trainDigitNumberData.value = '';
        CanvasGrid.resetCurrentCanvas();

        // sending the data
        self.sendPostData(data, self.configs.trainPostUrl, [{
          "Content-type": "application/json;charset=UTF-8"
        }]);
      }
    };

  },

  sendPostData: function(data, url, headers) {
    let xhr = new XMLHttpRequest();

    xhr.open('POST', url, true);

    for (header of headers) {
      for (hKey in header) {
        xhr.setRequestHeader(hKey, header[hKey]);
      }
    }

    xhr.onload = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          console.log(xhr.responseText);
        } else {
          console.error(xhr.statusText);
        }
      }
    };

    let jsonData = JSON.stringify(data);
    xhr.send(jsonData);
  }
};

let PredictData = {
  init: function() {

  },
};

CanvasGrid.init();
TrainingData.init();
PredictData.init();