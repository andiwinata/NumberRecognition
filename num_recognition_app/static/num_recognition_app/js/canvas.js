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
  initSettings: function() {
    // changeable variables
    this.gridSizeX = 10;
    this.gridSizeY = 10;
    this.canvasWidth = 500;
    this.canvasHeight = 500;
    this.brushSize = [
      [1, 1],
      [1, 1]
    ];
  },

  init: function() {
    this.initSettings();

    //  setting canvas container
    this.canvasContainer = document.getElementById("canvasContainer");
    this.canvasContainer.style.position = 'relative';
    this.canvasContainer.style.width = this.canvasWidth + 'px';
    this.canvasContainer.style.height = this.canvasHeight + 'px';

    this.el = document.getElementById('drawingCanvas');
    this.el2 = document.getElementById('borderCanvas');
    this.hitBox = document.getElementById('topCanvas');

    this.pixelValueDiv = document.getElementById('canvasValue');

    this.ctx = this.el.getContext('2d');
    this.ctx2 = this.el2.getContext('2d');
    this.currentCtx = this.ctx;

    this.isDrawing = false;

    this.pixelList = [];
    this.pixelDrawn = {};

    this.pixelWidth = Math.round(this.canvasWidth / this.gridSizeX);
    this.pixelHeight = Math.round(this.canvasHeight / this.gridSizeY);

    this.previousMousePos = new Vector2();
    this.maxSqrMagnitude = Vector2.prototype.sqrMagnitude(this.pixelWidth, 0, this.pixelHeight, 0);

    this.storedData = [];

    // setting html content to all canvas because css width and height is not enough
    // to set canvases height and width
    let canvases = document.getElementsByClassName('canvas');

    // set all canvas width and height
    // canvases is not array so cannot call canvases.forEach
    let self = this;
    Array.prototype.forEach.call(canvases, function(val) {
      val.setAttribute('width', val.clientWidth);
      val.setAttribute('height', val.clientHeight);
      val.style.width = self.canvasWidth + 'px';
      val.style.height = self.canvasHeight + 'px';
      val.width = self.canvasWidth;
      val.height = self.canvasHeight;
    });

    this.bindEvent();
    // draw canvas
    this.resetCanvas(this.currentCtx);

    // get pixel list and draw border
    for (let i = 0; i < this.gridSizeY; i++) {
      for (let j = 0; j < this.gridSizeX; j++) {
        this.pixelList.push([
          j * this.pixelWidth,
          i * this.pixelHeight
        ]);

        this.pixelDrawn[this.get1dIndex(j, i, true)] = 0;
        this.drawBorder(this.ctx2, j * this.pixelWidth, i * this.pixelHeight, this.pixelWidth, this.pixelHeight);
      }
    }

  },

  /**
   * Binding event for buttons
   * @return {[type]} [description]
   */
  bindEvent: function() {
    let self = this;

    /**
     * Event listener for reset button
     */
    document.getElementById('resetCanvas').onclick =
      () => self.resetCanvas(self.currentCtx, self.updateCanvasValueView.bind(self)); // use bind to keep the have correct scope

    /**
     * Event listener for canvases
     */
    self.hitBox.onmousedown = function(e) {
      // only left click
      if (e.button == 0) {
        let pos = self.getCursorPosition(self.canvasContainer, e);
        self.isDrawing = true;
        self.drawBrush(self.currentCtx, pos.x, pos.y, self.updateCanvasValueView.bind(self));
        self.previousMousePos.x = pos.x;
        self.previousMousePos.y = pos.y;
      }
    };

    /**
     * Event listener for canvases
     */
    self.hitBox.onmousemove = function(e) {
      if (self.isDrawing) {
        let pos = self.getCursorPosition(self.canvasContainer, e);
        self.drawInBetween(self.previousMousePos.x, pos.x, self.previousMousePos.y, pos.y);
        self.drawBrush(self.currentCtx, pos.x, pos.y, self.updateCanvasValueView.bind(self));
        self.previousMousePos.set(pos.x, pos.y);
        // canvasGrid.ctx.lineTo(pos.x, pos.y); ctx.stroke(); 
      }
    };

    /**
     * Event listener for canvases
     */
    self.hitBox.onmouseup = function() {
      self.isDrawing = false;
      self.updateCanvasValueView();
    };

    /**
     * Event listener for document
     */
    document.onmouseup = function() {
      self.isDrawing = false;
    };

  },

  /* ================ FUNCTIONS ================ */

  updateCanvasValueView: function() {
    let canvasValues = this.canvasValues = this.getCurrentCanvasValue();
    let canvasValueStr = "";

    for (let i = 0; i < canvasValues.length; i++) {
      if (i != 0 && i % this.gridSizeX == 0) {
        canvasValueStr += "\n<br>";
      }
      canvasValueStr += canvasValues[i] + " ";
    }

    this.pixelValueDiv.innerHTML = canvasValueStr + "<br>";
  },

  drawBrush: function(ctx, x, y, callback = null) {
    // draw brush according to shape of the brush
    let self = this;
    this.brushSize.forEach(function(val, i) {
      val.forEach(function(val, j) {
        if (val) {
          self.drawSquarePixel(ctx, x + j * self.pixelWidth, y + i * self.pixelHeight);
        }
      });
    });

    if (callback != null) {
      callback();
    }
  },

  // drawing square pixel function
  drawSquarePixel: function(ctx, x, y) {
    let x2 = x - (x % this.pixelWidth);
    let y2 = y - (y % this.pixelHeight);
    let flatIndex = this.get1dIndex(x2, y2, false);

    if (this.pixelDrawn[flatIndex] == 0) {
      ctx.fillRect(x2, y2, this.pixelWidth, this.pixelHeight);
      this.pixelDrawn[flatIndex] = 1;
    }
  },

  getCanvasValue: function(ctx) {
    let arr = [];

    this.pixelList.forEach(function(val) {
      let imgData = ctx.getImageData(val[0], val[1], 1, 1).data;
      let r = imgData[0];
      let g = imgData[1];
      let b = imgData[2];
      let greyScale = (r + g + b) / 3 / 255;
      arr.push(greyScale);
    });

    return arr;
  },

  resetCanvas: function(ctx, callback = null) {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.el.width, this.el.height);
    ctx.fillStyle = "white";

    for (let key in this.pixelDrawn) {
      this.pixelDrawn[key] = false;
    }

    if (callback != null) {
      callback();
    }
  },

  drawBorder: function(ctx, x, y, width, height) {
    ctx.strokeStyle = 'grey';
    ctx.rect(x, y, width, height);
    ctx.stroke();
  },

  // Return 1d index of 2d position
  // Basically y * gridSizeX + x
  // [0, 1, 2, 3, 4, 5]
  // [6, 7, 8, 9, 10, 11]
  get1dIndex: function(x, y, gridValue = false) {
    // if they are out of index, return -1
    if (gridValue) {
      return x >= this.gridSizeX || y >= this.gridSizeY ? -1 : y * this.gridSizeX * this.pixelHeight + x * this.pixelWidth;
    } else {
      return x >= this.gridSizeX * this.pixelWidth || y >= this.gridSizeY * this.pixelHeight ? -1 : y * this.gridSizeX + x;
    }
  },

  // only draw the in between
  // not drawing start and end
  drawInBetween: function(x1, x2, y1, y2) {
    let distSqr = Vector2.prototype.sqrMagnitude(x1, x2, y1, y2);

    if (distSqr > this.maxSqrMagnitude) {
      let totalInBetween = Math.floor(distSqr / this.maxSqrMagnitude);
      let increment = 1 / (totalInBetween + 1);
      // console.log('total in between: ' + totalInBetween);

      for (let i = 1; i <= totalInBetween; i++) {
        let pos = Vector2.prototype.lerp(x1, x2, y1, y2, i * increment);
        this.drawBrush(this.currentCtx, pos.x, pos.y);
      }
    }
  },

  getCurrentCanvasValue: function() {
    return this.getCanvasValue(this.currentCtx);
  },

  resetCurrentCanvas: function() {
    this.resetCanvas(this.currentCtx, this.updateCanvasValueView.bind(this));
  },

  getCursorPosition: function (canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
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
      let val = parseInt(self.digitNumberData.value);

      if (val) {
        let canvasValue = CanvasGrid.getCurrentCanvasValue();
        let data = {
          label: val,
          features: canvasValue
        };
        // store data to array
        self.storedData.push(data);

        // reset the data and canvas
        self.digitNumberData.value = '';
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