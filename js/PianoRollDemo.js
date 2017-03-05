/* Piano Roll Demo - M.Clayton - using ES6 Classes */

class PianoRollDemo {
    constructor(uiCanvas, eventCanvas, tonePart, toneNotes, BPMDisplayEl, timeDisplay, startBtn, incTempoBtn, decTempoBtn) {
        console.log("PianoRollDemo constructor happened!");
        var startoctave = -1; //these could be added as extended parameters
        var keyWidth = 120;
        var gridWidth = 1000;
        var gridElHeight = 15;
        var uiContext = uiCanvas.getContext("2d");
        var eventContext = eventCanvas.getContext("2d");
        var keyboard = new Keyboard(gridElHeight, 30, 22, uiCanvas, keyWidth);
        keyboard.drawKeyboard('c', startoctave, 25);
        eventCanvas.height = keyboard.height;
        var grid = new Grid(keyboard, uiCanvas, gridWidth, keyWidth, gridElHeight);
        grid.drawAllGrid();

        //Loop cycle settings hard coded here for the sake of the demo - would be removed on further development
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = '0';
        Tone.Transport.loopEnd = '4m';

        var notePData = new NotePosData();
        var eventsDrawMngr = new EventsDrawManager(startoctave, eventCanvas, eventContext, gridWidth, keyboard, tonePart, toneNotes, notePData);
        var transportMan = new TransportManager(eventCanvas, eventContext, grid, keyboard, eventsDrawMngr, BPMDisplayEl, timeDisplay, startBtn, incTempoBtn, decTempoBtn, notePData);

        //on iOS, the context will be started on the first valid user action on the class specified
        StartAudioContext(Tone.context, startBtn, function() {
            //audio context is started
            transportMan.start();
        });
    }
}
class NotePosData {
    constructor() {
        this.storeNoteTime = [];
    }
}
class TransportManager {
    constructor(myCanvas, myContext, grid, keyboard, eventsDrawMngr, BPMDisplayEl, timeDisplay, startBtn, incTempoBtn, decTempoBtn, notePData) {
        this.myCanvas = myCanvas;
        this.myContext = myContext;
        this.grid = grid;
        this.gridWidth = grid.gridWidth;
        this.started = false;
        this.eventNo = 0;
        this.lastEventNo = 0;
        this.keyboard = keyboard;
        this.eventsDrawMngr = eventsDrawMngr;
        this.BPMDisplayEl = BPMDisplayEl;
        this.timeDisplay = timeDisplay;
        this.startBtn = startBtn;
        this.incTempoBtn = incTempoBtn;
        this.decTempoBtn = decTempoBtn;
        this.notePData = notePData;
        this.loopTime;
        this.storedTicks = 0;
        this.tempoStep = 5;
        this.stopProcess = false;
        this.refreshLoopTime();
        this.initBtnListeners();
        this.this_x;
        this.last_x;
    }
    initBtnListeners() {
        //make start button work
        this.startBtn.addEventListener('click', this.clickFn.bind(this), false);
        //make tempo buttons work
        this.incTempoBtn.addEventListener('click', this.tempoInc.bind(this), false);
        this.decTempoBtn.addEventListener('click', this.tempoDec.bind(this), false);
    }
    refreshLoopTime() {
        this.loopTime = Tone.Time(Tone.Transport.loopEnd).toSeconds();
    }
    renderPlayHead() {
        var progress = Tone.Transport.seconds / Tone.Transport.loopEnd;
        this.last_x = this.grid.drawGridLineV(this.myContext, this.myCanvas.height, progress);
    }
    redrawFrame() {
        requestAnimationFrame(this.redrawFrame.bind(this));
        //check if loop from end to start just happened
        if (Tone.Transport.ticks >= this.storedTicks) {
            //clear old playhead from canvas
            this.myContext.clearRect(this.last_x - 1, 0, 2, this.myCanvas.height);

            //redraw the note currently under the playhead
            this.noteObj = this.keyboard.keys[this.notePData.storeNoteTime[this.lastEventNo].note];

            this.noteDur = this.notePData.storeNoteTime[this.lastEventNo].end - this.notePData.storeNoteTime[this.lastEventNo].start;
            if (Tone.Transport.state == 'started') // Only do when playing 
            {
                this.eventsDrawMngr.drawEvent(this.noteObj, this.notePData.storeNoteTime[this.lastEventNo].start, this.noteDur, this.loopTime, '#79cc00');
                if (!this.stopProcess) // is skipped after last event has been processed. 
                {
                    if (Tone.Transport.seconds > this.notePData.storeNoteTime[this.eventNo].start) {
                        this.keyboard.highlightNote(this.keyboard.keys[this.notePData.storeNoteTime[this.eventNo].note]);
                        this.lastEventNo = this.eventNo++;
                        if (this.eventNo == this.notePData.storeNoteTime.length) //out of events till next cycle
                        {
                            this.stopProcess = true;
                        }
                    } else {
                        //clear last two events on the keyboard
                        this.doKeyClear(this.eventNo - 1);
                        this.doKeyClear(this.eventNo - 2);
                    }
                    this.timeDisplay.innerHTML = Tone.Transport.position.substr(0, 5);
                }
            }
            //then render the play head
            this.renderPlayHead();
            this.storedTicks = Tone.Transport.ticks;
        } else {
            //restart cycle
            this.eventNo = this.lastEventNo = 0;
            this.storedTicks = 0;
            this.stopProcess = false;
            if (this.notePData.storeNoteTime[0] != undefined) this.keyboard.unhighlightNote(this.keyboard.keys[this.notePData.storeNoteTime[this.notePData.storeNoteTime.length - 1].note]);
            this.eventsDrawMngr.storeEventPosDraw('redraw');
        }
    }
    doKeyClear(eventNo) {
        if (eventNo >= 0) {
            if (Tone.Transport.seconds > this.notePData.storeNoteTime[eventNo].end) {
                this.keyboard.unhighlightNote(this.keyboard.keys[this.notePData.storeNoteTime[eventNo].note]);
            }
        }
    }
    tempoInc() {
        if (Tone.Transport.bpm.value < 300) {
            Tone.Transport.bpm.value = Math.round(Tone.Transport.bpm.value) + this.tempoStep;
            this.updateTempo();
            this.eventsDrawMngr.storeEventPosDraw('none');
            this.refreshLoopTime();
        }
    }
    tempoDec() {
        if (Tone.Transport.bpm.value > 0) {
            Tone.Transport.bpm.value = Math.round(Tone.Transport.bpm.value) - this.tempoStep;
            this.updateTempo();
            this.eventsDrawMngr.storeEventPosDraw('none');
            this.refreshLoopTime();
        }
    }
    updateTempo() {
        this.BPMDisplayEl.innerHTML = Math.round(Tone.Transport.bpm.value) + ' BPM';
    }
    clickFn() {
        if (!this.started) {
            Tone.Transport.start("+0.1");
            this.started = true;
            this.startBtn.innerHTML = 'stop';
        } else {
            Tone.Transport.pause();
            this.started = false;
            this.startBtn.innerHTML = 'start';
        }
    }
    start() {
        this.updateTempo();
        this.redrawFrame();
    }
}
class EventsDrawManager {
    //this is currently only set up to deal with a monophonic keyboard line. Chords would need the event object list to contain multiple note objects.
    constructor(startoctave, eventCanvas, eventContext, gridWidth, keyboard, myPart, partNotes, notePData) {
        this.startoctave = startoctave;
        this.eventCanvas = eventCanvas;
        this.eventContext = eventContext;
        this.gridWidth = gridWidth;
        this.keyboard = keyboard;
        this.myPart = myPart;
        this.partNotes = partNotes;
        this.notePData = notePData;
        this.storeEventPosDraw('redraw');
    }
    storeEventPosDraw(option) {
        //Loops through the part supplied and stores the event block start and end
        //positions per event. Draws the notes to the piano roll after clearing the canvas 
        //too if redraw is set as parameter
        //Just done after page load and after cycle restart. on tempo change is called but without a draw.
        //Reads from the part notes object array - the format used by Tone.js
        //Ideally the draw and store parts of this fn should be seperated

        if (option == 'redraw') {
            this.eventContext.clearRect(0, 0, this.eventCanvas.width, this.eventCanvas.height);
        }
        var countFromC, octave, ind, shiftSemiT, revInd, noteStartTime, noteDuration;
        var loopTime = Tone.Time(Tone.Transport.loopEnd).toSeconds();
        for (var bnote = 0; bnote < this.partNotes.length; bnote++) {
            countFromC = this.partNotes[bnote].note.charCodeAt(0) - 67;
            //so the above will be -2 for A, -1 for B, 0 for C, 1 for D, 2 for E, 3 for F, 4 for G
            if (countFromC == -2) { //A
                shiftSemiT = -3;
            } else if (countFromC == -1) { //B
                shiftSemiT = -1;
            } else if (countFromC < 3) { //C-E
                shiftSemiT = countFromC * 2;
            } else //F-G
            {
                shiftSemiT = countFromC * 2 - 1;
            }
            if (this.partNotes[bnote].note[1] == '#') { //if it's a sharp note..
                octave = this.partNotes[bnote].note.charCodeAt(2) - 48; //48 is ascii for 0 - minus 48 to get number from string char
                ind = ((this.startoctave + octave) * 12) + shiftSemiT + 1; //offset by one for the sharp
            } else {
                octave = this.partNotes[bnote].note.charCodeAt(1) - 48; //look at second char for octave if not a sharp
                ind = ((this.startoctave + octave) * 12) + shiftSemiT;
            }
            noteStartTime = Tone.Time(this.partNotes[bnote].time).toSeconds();
            noteDuration = Tone.Time(this.partNotes[bnote].dur).toSeconds();
            if (option == 'redraw') {
                this.drawEvent(this.keyboard.keys[ind], noteStartTime, noteDuration, loopTime, 0);
            }
            this.notePData.storeNoteTime[bnote] = {
                note: ind,
                start: noteStartTime,
                end: noteStartTime + noteDuration
            };
        }
    }
    drawEvent(note, noteStartTime, duration, loopTime, fillStyle) {
        this.eventContext.fillStyle = '#756382';
        if (fillStyle != 0) this.eventContext.fillStyle = fillStyle; //remove
        this.eventContext.strokeStyle = '#333';
        this.eventContext.lineWidth = 1;
        this.eventContext.fillRect((noteStartTime / loopTime) * this.gridWidth, note.y, (duration / loopTime) * this.gridWidth, note.height);
    }
}
class Grid {
    constructor(kb, uiCanvas, gridWidth, keyWidth, gridElHeight) {
        this.uiCanvas = uiCanvas;
        this.uiContext = this.uiCanvas.getContext("2d");
        this.keys = kb.keys;
        this.gridWidth = gridWidth;
        this.keyWidth = keyWidth;
        this.gridElHeight = gridElHeight;
        this.xTemp;
    }
    drawGridLineH(keyPosY, offset) {
        this.uiContext.beginPath();
        this.uiContext.moveTo(this.keyWidth, keyPosY + offset);
        this.uiContext.lineTo(this.gridWidth + this.keyWidth, keyPosY + offset);
        this.uiContext.stroke();
    }
    drawGridLineV(myContext, canvHeight, tNorm) {
        this.xTemp = Math.floor(tNorm * this.gridWidth);
        return this.drawLineV(myContext, canvHeight, this.xTemp, '#fff');
    }
    drawLineV(myContext, canvHeight, x, col) {
        myContext.strokeStyle = col;
        myContext.beginPath();
        myContext.moveTo(x, 0);
        myContext.lineTo(x, canvHeight);
        myContext.stroke();
        return x;
    }
    drawAllGrid() {
        var flagLastBlack;
        for (var i = 0; i < this.keys.length; i++) {
            if (flagLastBlack) {
                this.drawGridLineH(this.keys[i].y, this.keys[i].height - this.gridElHeight / 2);
                flagLastBlack = false;
            } else {
                this.drawGridLineH(this.keys[i].y, this.keys[i].height);
                if (this.keys[i].black) {
                    flagLastBlack = true;
                }
            }
        }
        this.drawGridLineH(this.gridElHeight / 2, 0);
        this.drawLineV(this.uiContext, this.uiCanvas.height, this.gridWidth * 0.25 + this.keyWidth, '#555');
        this.drawLineV(this.uiContext, this.uiCanvas.height, this.gridWidth * 0.5 + this.keyWidth, '#555');
        this.drawLineV(this.uiContext, this.uiCanvas.height, this.gridWidth * 0.75 + this.keyWidth, '#555');
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
        if (key === undefined) {
            return;
        }
        key.draw(this.uiContext);
    }
    highlightNote(key) {
        if (key === undefined) {
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
        var startNote = 12 * this.startOctave - 8 + mappings[startindex];
        var octave = this.startOctave;
        var nextY = 0;
        for (var i = numKeys - 1, j = startindex; i > -1; i--, j--) {
            if (j < 0) {
                j = 11;
            }

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
        for (i = 0; i < this.keys.length; i++) {
            if (!this.keys[i].black) {
                this.keys[i].draw(this.uiContext);
            }
        }
        for (i = 0; i < this.keys.length; i++) {
            if (this.keys[i].black) {
                this.keys[i].draw(this.uiContext);
            }
        }
    }
}
class PianoKey {
    constructor(y, height, note, octave, frequency, keyWidth) {
        this.octave = octave;
        this.frequency = 440;
        this.y = y;
        this.height = height;
        this.note = note;
        if (this.note[1] == '#') {
            this.black = true;
            this.width = keyWidth / 2;
            this.fillStyle = '#000';
        } else {
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
        } else {
            context.fillStyle = "#000";
        }
    }
    highlight(noteName) {
        this.context.fillStyle = "#559900";
        this.context.fillRect(this.width / 2, this.y + 2, this.width / 2, this.height - 4);
    }
    unhighlight(noteName, fillStyle) {
        this.context.fillStyle = fillStyle;
        this.context.fillRect(this.width / 2, this.y + 2, this.width / 2, this.height - 4);
    }
}