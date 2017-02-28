/* View keyboard UI layout - using ES6 Classes */
/* A few globals which will be accessible by the 'class' instances */

var this_x; 
var last_x;
var started = false;
var keyWidth = 120;
var gridWidth = 1000;
var gridElHeight = 15;
var startoctave = -1;
var storeNoteTime = [];
var stopProcess = false;
var tempoStep = 5;
Tone.Transport.bpm.value = 180;

function initAll() {
	console.log("initAll");
	var uiCanvas = document.getElementById('canvas-ui');
	var uiContext = uiCanvas.getContext("2d");
	var eventCanvas = document.getElementById('canvas-event');
	var eventContext = eventCanvas.getContext("2d");
	
	var keyboard = new Keyboard(gridElHeight, 30, 22, uiCanvas, keyWidth);
	keyboard.drawKeyboard('c', startoctave, 25);
	eventCanvas.height = keyboard.height;
	
	var grid = new Grid(keyboard, uiCanvas, gridWidth, keyWidth);
	grid.drawAllGrid();
	
	//Loop cycle settings hard coded here for the sake of the demo - would be removed on further development
	Tone.Transport.loop = true;
	Tone.Transport.loopStart = '0';
	Tone.Transport.loopEnd = '4m';
	
	var eventsDrawMngr = new EventsDrawManager(eventCanvas, eventContext, keyboard, bassPart, bassNotes);
	var transportMan = new TransportManager(eventCanvas, eventContext, gridWidth, keyboard, eventsDrawMngr);
	transportMan.start();
	
	document.getElementById('tempo-display').innerHTML=Math.round(Tone.Transport.bpm.value)+' BPM';
	//make start button work
	document.getElementById('start-stop-button').addEventListener('click', clickFn, false);
	//make tempo buttons work
	document.getElementById('tempo-inc').addEventListener('click', tempoInc, false);
	document.getElementById('tempo-dec').addEventListener('click', tempoDec, false);
	
	//on iOS, the context will be started on the first valid user action on the class specified
	StartAudioContext(Tone.context, "#start-stop-button", function(){
		//audio context is started
		console.log('audio context is started')
	});
	function tempoInc() {
		Tone.Transport.bpm.value = Math.round(Tone.Transport.bpm.value) + tempoStep;
		updateTempo();
		eventsDrawMngr.storeEventPosDraw('none');
		transportMan.refreshLoopTime();
	}
	function tempoDec() {
		Tone.Transport.bpm.value = Math.round(Tone.Transport.bpm.value) - tempoStep;
		updateTempo();
		eventsDrawMngr.storeEventPosDraw('none');
		transportMan.refreshLoopTime();
	}
	function updateTempo() {
		document.getElementById('tempo-display').innerHTML=Math.round(Tone.Transport.bpm.value)+' BPM';
	}
}

function clickFn() {
	console.log('click');
	if (!started){
		Tone.Transport.start("+0.1");
		started = true;
		document.getElementById('start-stop-button').innerHTML='stop';
	}
	else
	{
		Tone.Transport.pause();
		started = false;
		document.getElementById('start-stop-button').innerHTML='start';
	}
}
class TransportManager {
	constructor(myCanvas, myContext, gridWidth, keyboard, eventsDrawMngr) {
		this.myCanvas = myCanvas;
		this.myContext = myContext;
		this.gridWidth = gridWidth;
		this.eventNo = 0;
		this.lastEventNo = 0;
		this.keyboard = keyboard;
		this.eventsDrawMngr = eventsDrawMngr;
		this.loopTime;
		this.storedTicks = 0;
		this.refreshLoopTime();
	}
	refreshLoopTime() {
		this.loopTime = Tone.Time(Tone.Transport.loopEnd).toSeconds();
	}
	renderPlayHead() {
		var progress = Tone.Transport.seconds / Tone.Transport.loopEnd;
		
		this_x = Math.floor(progress * this.gridWidth);
		this.myContext.strokeStyle = '#000';
		this.myContext.beginPath();
		this.myContext.moveTo(this_x, 0);
		this.myContext.lineTo(this_x, this.myCanvas.height);
		this.myContext.stroke();
		this.noteDur;
		this.noteObj;
		last_x = this_x;
	}
	redrawFrame() {
		requestAnimationFrame(this.redrawFrame.bind(this));
		if (Tone.Transport.ticks >= this.storedTicks) //check if loop from end to start just happened
		{
			//clear old playhead from canvas
			this.myContext.clearRect(last_x-1, 0, 2, this.myCanvas.height);
			
			//redraw the note currently under the playhead
			this.noteObj = this.keyboard.keys[storeNoteTime[this.lastEventNo].note];
			
			this.noteDur = storeNoteTime[this.lastEventNo].end - storeNoteTime[this.lastEventNo].start;
			this.eventsDrawMngr.drawEvent(this.noteObj, storeNoteTime[this.lastEventNo].start, this.noteDur, this.loopTime, '#79cc00');
			if (!stopProcess && Tone.Transport.state=='started')//Only do when playing but is skipped after last event has been processed. 
			{
				if (Tone.Transport.seconds > storeNoteTime[this.eventNo].start)
				{	
					this.keyboard.highlightNote(this.keyboard.keys[storeNoteTime[this.eventNo].note]);
					console.log('doKeyHighlight:'+this.eventNo);
					this.lastEventNo = this.eventNo++;
					if (this.eventNo == storeNoteTime.length) //out of events till next cycle
					{
						stopProcess = true;
					}
				}
				else {
					//clear last two events on the keyboard
					this.doKeyClear(this.eventNo-1);
					this.doKeyClear(this.eventNo-2);
				}
					
				document.getElementById('time-display').innerHTML = Tone.Transport.position.substr(0,5)
				
			}
			//then render the play head
			this.renderPlayHead();
			this.storedTicks = Tone.Transport.ticks;
			
		}
		else
		{
			console.log('restart cycle');
			//restart cycle
			this.eventNo = this.lastEventNo = 0;
			this.storedTicks = 0;
			stopProcess = false;
			if (storeNoteTime[0]!=undefined) this.keyboard.unhighlightNote(this.keyboard.keys[storeNoteTime[storeNoteTime.length - 1].note]);
			this.eventsDrawMngr.storeEventPosDraw('redraw');
		}
	}
	doKeyClear(eventNo){
		//console.log('doKeyClear:'+eventNo);
		if (eventNo > 0)
		{
			if (Tone.Transport.seconds > storeNoteTime[eventNo].end)
			{
				this.keyboard.unhighlightNote(this.keyboard.keys[storeNoteTime[eventNo].note]);
			}
		}
	}
	start() {
		this.redrawFrame()
	}
}
class EventsDrawManager {
	//this is currently only set up to deal with a monophonic bass line. Chords would need the event object list to contain multiple note objects.
	constructor(eventCanvas, eventContext, keyboard, myPart, partNotes){
		this.eventContext = eventContext;
		this.eventCanvas = eventCanvas;
		this.keyboard = keyboard;
		this.myPart = myPart;
		this.partNotes = partNotes;
		this.storeEventPosDraw('redraw'); 
	}
	storeEventPosDraw(option) {
		//Loops through the part supplied and stores the event block start and end
		//positions per event. Draws the notes to the piano roll after clearing the canvas 
		//too if redraw is set as parameter
		//Just done after page load and after cycle restart. on tempo change is called but without a draw.
		//Reads from the bass notes object array - the format used by Tone.js
		//Ideally the draw and store parts of this fn should be seperated
		
		if (option=='redraw') {
			this.eventContext.clearRect(0,0,this.eventCanvas.width,this.eventCanvas.height);
		}
		var countFromC, octave, ind, shiftSemiT, revInd, noteStartTime, noteDuration;
		var loopTime = Tone.Time(Tone.Transport.loopEnd).toSeconds();
		for (var bnote = 0; bnote < this.partNotes.length; bnote++)
		{
			countFromC = bassNotes[bnote].note.charCodeAt(0) - 67;
			//so the above will be -2 for A, -1 for B, 0 for C, 1 for D, 2 for E, 3 for F, 4 for G
			if (countFromC == -2) {//A
				shiftSemiT = -3;
			}
			else if (countFromC == -1) {//B
				shiftSemiT = -1;
			}
			else if (countFromC<3) {//C-E
				shiftSemiT = countFromC*2;
			}
			else //F-G
			{
				shiftSemiT = countFromC*2 - 1;
			}
			if (bassNotes[bnote].note[1]=='#'){//if it's a sharp note..
				octave = bassNotes[bnote].note.charCodeAt(2)-48; //48 is ascii for 0 - minus 48 to get number from string char
				ind =((startoctave + octave) * 12) + shiftSemiT +1; //offset by one for the sharp
			}
			else
			{
				octave = bassNotes[bnote].note.charCodeAt(1)-48; //look at second char for octave if not a sharp
				ind =((startoctave + octave) * 12) + shiftSemiT; 
			}
			noteStartTime = Tone.Time(bassNotes[bnote].time).toSeconds();
			noteDuration = Tone.Time(bassNotes[bnote].dur).toSeconds();
			if (option=='redraw') {
				this.drawEvent(this.keyboard.keys[ind], noteStartTime, noteDuration, loopTime, 0);	
			}
			storeNoteTime[bnote] = {note: ind, start: noteStartTime, end: noteStartTime+noteDuration};
		}
	}
	
	drawEvent(note, noteStartTime, duration, loopTime, fillStyle)
	{
	    this.eventContext.fillStyle = '#756382';
		if (fillStyle!=0)  this.eventContext.fillStyle = fillStyle; //remove
	    this.eventContext.strokeStyle = '#333';
	    this.eventContext.lineWidth = 1;
		this.eventContext.fillRect((noteStartTime / loopTime) * gridWidth, note.y, (duration / loopTime) * gridWidth, note.height);
	}
	
}
class Grid {
	constructor(kb, uiCanvas, gridWidth, keyWidth) {
		this.uiCanvas = uiCanvas;	
		this.uiContext = this.uiCanvas.getContext("2d");
		this.keys = kb.keys;
		this.gridWidth = gridWidth;
		this.keyWidth = keyWidth;
		
	}
	drawGridLine(keyPosY, offset) {
		this.uiContext.beginPath();
		this.uiContext.moveTo(this.keyWidth, keyPosY+offset);
		this.uiContext.lineTo(this.gridWidth + this.keyWidth, keyPosY+offset);
		this.uiContext.stroke();
	}
	drawAllGrid(){
		var flagLastBlack;
		for (var i = 0; i < this.keys.length; i++) {
			if (flagLastBlack) 
			{
				this.drawGridLine(this.keys[i].y, this.keys[i].height - gridElHeight/2);
				flagLastBlack = false;
			}
			else
			{
				this.drawGridLine(this.keys[i].y, this.keys[i].height );
				if (this.keys[i].black){
					flagLastBlack = true;
				}
			}
		}
		this.drawGridLine(gridElHeight/2, 0);
	}
}
class Keyboard {
	constructor(blackKeyHeight, adgHeight, bcefHeight, uiCanvas, keyWidth) {
		/* Keyboard graphic code maths from oliphaunts.com open source project piano roll - much tweaked though */
		this.uiCanvas = uiCanvas;
		this.uiContext = this.uiCanvas.getContext("2d");
		this.keys = [];
		this.blackKeyHeight = blackKeyHeight;
		this.adgHeight = adgHeight;
		this.bcefHeight = bcefHeight;
		this.blackOffset = blackKeyHeight / 2;
		this.octaveHeight = 3 * this.adgHeight + 4 * this.bcefHeight; //The height of an entire octave is 7 x the height of a white key
		this.piano = document.getElementById('pr');
		this.container = document.getElementById('pr-container');
		this.blackKeyLookup = [];
		this.whiteKeyLookup = [];
		this.keyWidth = keyWidth;
	}
	drawNote(key) {
		if (key == undefined) {
			return;
		}
		key.draw(this.uiContext);
	}
	highlightNote(key) {
		if (key == undefined) {
			return;
		}
		key.highlight(this.uiContext);
	}
	unhighlightNote(key) {
		if (key == undefined) {
			return;
		}
		if (key.black) {
			key.unhighlight(this.uiContext, '#000');
		} else {
			key.unhighlight(this.uiContext, '#fff');
		}
	}

	drawKeyboard(startKey, startOctave, numKeys) {
		this.height = 0;
		var notes = ['a', 'a#', 'b', 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#'];
		var mappings = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
		var notesOffset = [ 
			this.adgHeight - this.blackOffset,
			this.blackOffset,
			this.bcefHeight - this.blackOffset,
			this.bcefHeight,
			this.blackOffset,
			this.adgHeight - this.blackOffset,
			this.blackOffset,
			this.bcefHeight - this.blackOffset,
			this.bcefHeight,
			this.blackOffset,
			this.adgHeight - this.blackOffset,
			this.blackOffset
		];
		var startindex = notes.indexOf(startKey);
		var startNote = 12 * startOctave - 8 + mappings[startindex];
		var octave = startOctave;
		var nextY = 0;
		for (var i = numKeys-1, j = startindex; i > -1; i--, j--) {
			if (j < 0) {j=11;}
			//console.log("i"+i+" j"+j);
			var frequency = Math.pow(2, (Math.abs(startNote - i) - 49) / 12) * 440;
			if (notes[j][1] == '#') {
				this.keys[i] = new PianoKey(nextY, this.blackKeyHeight, notes[j], octave, frequency, this.keyWidth);
			} else if (notes[j] == 'a' || notes[j] == 'd' || notes[j] == 'g') {
				this.height += this.adgHeight;
				this.keys[i] = new PianoKey(nextY, this.adgHeight, notes[j], octave, frequency, this.keyWidth);
			} else {
				this.height += this.bcefHeight;
				this.keys[i] = new PianoKey(nextY, this.bcefHeight, notes[j], octave, frequency, this.keyWidth);
			}
			if (this.keys[i].note == 'c') {
				octave -= 1;
			}
			nextY += notesOffset[j];
		}
		if (this.keys[this.keys.length - 1].black) {
			this.height += this.blackOffset;
		}
		this.piano.style.height = this.height + "px"; //el kb
		this.uiCanvas.height = this.height;
		
		//draw white keys then black keys to avoid shapes getting obscured on sequential draw
		for (var i = 0; i < this.keys.length; i++) {
			if (!this.keys[i].black) {
				this.keys[i].draw(this.uiContext);
			}
		}
		for (var i = 0; i < this.keys.length; i++) {
			if (this.keys[i].black) {
				this.keys[i].draw(this.uiContext);
			}
		}
	};
};
class PianoKey {
	constructor (y, height, note, octave, frequency, keyWidth) {
	    this.octave = octave;
	    this.frequency = 440;
	    this.y = y;
	    this.height = height;
	    this.note = note;
	    if (this.note[1] == '#') {
	        this.black = true;
	        this.width = keyWidth /2;
	        this.fillStyle = '#000'; 
	    }
	    else {
	        this.black = false;
	        this.width = keyWidth;
	        this.fillStyle = '#FFF'; 
	    }
	}
	draw(context, fillStyle, strokeStyle) {
		this.context = context;
	    context.fillStyle = this.fillStyle; 
	    context.strokeStyle = '#000';
	    context.lineWidth = 1;
	    context.fillRect(0, this.y, this.width, this.height);
	    context.strokeRect(0, this.y, this.width, this.height);
	    if (this.black) {
	        context.fillStyle = "#FFF";    
	    }
	    else {
	        context.fillStyle = "#000";             
	    } 
	}
	highlight(noteName) {
		this.context.fillStyle = "#79cc00"; 
		this.context.fillRect(this.width/2, this.y+2, this.width/2, this.height-4);
	}
	unhighlight(noteName, fillStyle) {
		this.context.fillStyle = fillStyle;
		this.context.fillRect(this.width/2, this.y+2, this.width/2, this.height-4);
	}
};

