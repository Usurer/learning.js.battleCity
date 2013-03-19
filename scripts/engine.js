function MainLoop() {
	this.fps = 50; //draw loops per second
	this.ups = 20; //update loops per second
	
	this.gameObjects = [];	
	this.globals = [];
	this.pressedKeys = [];
	this.tanks = [];
	this.missiles = [];
	this.deadObjects = [];
	this.tileMapTanks = [];
	
	var self = this;
	
	var keyCodeMapper = function(keyCode) {
		switch (keyCode) {
			case 37: return 'w';
			case 38: return 'n';
			case 39: return 'e';
			case 40: return 's';
			case 87: return 'N'; //W
			case 83: return 'S'; //A
			case 65: return 'W'; //S
			case 68: return 'E'; //D
			case 32: return 'SPACE'; //space
			case 17: return 'RCTRL'; //rctrl
			default: return null;
		};
	};
	
	/*	
		Take a look at http://jsfiddle.net/HwR9N/3/
		The main idea there to use keys[e.keyCode] array to store pressed keys.
		If key is released, keys[e.keyCode] is set to non-numeral value like False.
		Dadz cool.
	*/
	var keyDownHandler = function(e) {
		//console.log(e.keyCode);
		var pressedKey = keyCodeMapper(e.keyCode);
		
		if (pressedKey != null) {
			for (i = 0; i < self.pressedKeys.length; i++) {
				if (self.pressedKeys[i] === pressedKey) {
					return;
				}				
			}
			self.pressedKeys.push(pressedKey);
		};
		
		new DebuggingMessage().pressedBtn(self.pressedKeys);
	};
	
	var keyUpHandler = function(e) {
		var releasedKey = keyCodeMapper(e.keyCode);		
		if (releasedKey != null) {
			for (i = 0; i < self.pressedKeys.length; i++) {
				if (self.pressedKeys[i] == releasedKey) {
					self.pressedKeys.splice(i, 1); //remove element from array					
				}
			}
		};
		new DebuggingMessage().pressedBtn(self.pressedKeys);
	};

	this.createTank = function(id, commandsMap, coords, color) {
		var newTank = new Tank(id);
		newTank.setCommandsMap(commandsMap);
		newTank.initialize(coords, [50, 50], '', color);
		self.gameObjects[newTank.id] = newTank;
		self.tanks[newTank.id] = newTank;
	};

	this.createFirstTank = function() {		
		var map = {'S': 'setDirection', 'N': 'setDirection', 'E': 'setDirection', 'W': 'setDirection', 'SPACE': 'fire'};
		self.createTank(0, map, [50, 50], 'Red');		
	};

	this.createSecondTank = function() {		
		var map = {'s': 'setDirection', 'n': 'setDirection', 'e': 'setDirection', 'w': 'setDirection', 'RCTRL': 'fire'};
		self.createTank(1, map, [200, 200], 'Blue');				
	};	

	this.draw = function() {		
		//console.log('tick');

		
		/*Here are the bad news - we cannot fire missile from the Tank class in current object model realization, because only game engine has access to gameObjects, globals etc. I see three ways to solve the problem:
		1. This is what I've started to do first - if 'fire' is pressed, then game engine will emulate the fire.
		2. Move object arrays to the outer scope - make 'em really global and access 'em from Tank.
		3. When Tank processes commands it will create the array of results. If the result of command is a new object it will be added to this array. Then array is returned to engine and objects from it are moved to gameObjects array. That what I'll try to do now.
		*/

		var newObjects = [];
		var canvas = document.getElementById('canvas');
		var i = j = k = l = m = n = 0; /*Initializing For loops counters.*/		
		
		for (var j = 0; j < self.gameObjects.length; j++) {
			if(typeof self.gameObjects[j] === 'undefined') 
				continue;
			/*if result of command processing is an object - it should be added to special collection - in current
			realization it's a missile. Don't know if it will be changed, but now it is as it is.*/
			if(typeof self.gameObjects[j].receiveCommands !== 'undefined') {
				/*A trick to join two arrays without a new array creation (as concat does). It's also faster than concat. 
				See also: http://jsperf.com/concat-vs-push-apply/11 */			
				newObjects.push.apply(newObjects, self.gameObjects[j].receiveCommands(self.pressedKeys));
			};

			if(typeof self.gameObjects[j].update !== 'undefined')
				self.gameObjects[j].update();

			if(typeof self.gameObjects[j].draw === 'undefined')
				continue;	

			self.gameObjects[j].draw(canvas);
		};
		j = 0; //clear the counter

		/*Now we check all 'fresh' objects (missiles), assign ID's and put them to the gameObjects storage.*/
		if (newObjects.length > 0) {
			for (var i = 0; i < newObjects.length; i++) {
				if (typeof newObjects[i] === 'undefined')
					continue;
				
				if (typeof newObjects[i].id === 'undefined') 
					newObjects[i].id = self.gameObjects.length + i;				

				self.gameObjects.push(newObjects[i]);
			};
			i = 0;
			/*self.gameObjects.push.apply(self.gameObjects, newObjects); - it will also add 'undefined' values to gameObjects, so don't use it;*/
		};

		/*Now I want remove dead objects from the gameObjects list. Dead object is the one that should be removed from the game, like finished tank burst animation etc.*/
		for (var i = 0; i < self.gameObjects.length; i++) {
			if(typeof self.gameObjects[i] === 'undefined')
				continue;
			if(self.gameObjects[i].dead === true)
			{
				self.deadObjects.push(self.gameObjects[i]);
				self.gameObjects[i] = undefined;
			}
		};
		i = 0;
		
		for (var i = 0; i < self.deadObjects.length; i++) {
			var el = document.getElementById(self.deadObjects[i].id);
			if (el.parentElement == canvas)
				canvas.removeChild(el);
		};
		i = 0;
		self.deadObjects = []; //clearing container

		/*Removing all dead (and set to undefined) elements from gameObjects.*/
		var indexOfUndefined = self.gameObjects.indexOf(undefined);
		while(indexOfUndefined >= 0) {
			self.gameObjects.splice(indexOfUndefined, 1);
			indexOfUndefined = self.gameObjects.indexOf(undefined);
		};

		/*---Check for collisions---*/
		/*What I do below is saving tanks objects to tile map in accordance with tanks' positions.
		There is an assumption that canvas.width / tank.width is an integer. */		
		var canvasWH = [document.getElementById('canvas').offsetWidth, document.getElementById('canvas').offsetHeight];
		var tileMapTanksWidth = (canvasWH[0] / self.tanks[0].getSize()[0]) |0;
		var tileMapTanksHeight = (canvasWH[1] / self.tanks[0].getSize()[1]) |0;
		for(var i = 0; i < tileMapTanksWidth; i++) {
			var column = new Array(tileMapTanksHeight);
			for (var c = 0; c < column.length; c++) column[c] = [];
			self.tileMapTanks[i] = column;
		};
		i = 0;
		for (var tankIndex = 0; tankIndex < self.tanks.length; tankIndex++) {
			var tank = self.tanks[tankIndex];
			var tankTileCoord = [(tank.getPosition()[0] / tank.getSize()[0]) |0, (tank.getPosition()[1] / tank.getSize()[1]) |0];
			self.tileMapTanks[tankTileCoord[0]][tankTileCoord[1]].push(tank);
		};				

		for (var t = 0; t < self.tanks.length; t++) PossibleCollisions(self.tanks[t], self.tileMapTanks, canvas);
		/*---Check for collisions end---*/		

		setTimeout(self.draw, 1000 / self.fps);
	};
	
	this.run = function() {		
		self.createFirstTank();
		self.createSecondTank();		
		
		document.onkeydown = keyDownHandler;
		document.onkeyup = keyUpHandler;

		new DebuggingMessage().textMsg(self.gameObjects.length);

		/*Set interval is bad because it creates a queue of calls - it's better use setTimeoute with callback. 
		http://shamansir.github.com/JavaScript-Garden/#other.timeouts*/		
		var drawer = setTimeout(self.draw, 1000 / self.fps);
		
	};
}

function DebuggingMessage() {
	this.pressedBtn = function(btnsArray) {
		var msg = "Pressed buttons are: ";
		for (btn in btnsArray) {
			msg = msg + btnsArray[btn];
		}
		document.getElementById('pressedButtons').innerHTML = msg;
	};

	this.textMsg = function(textMsg) {
		document.getElementById('message').innerHTML = textMsg;	
	}
}

new MainLoop().run();