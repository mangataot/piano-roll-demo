// Bass part is created here in the format used by Tone.Part and is ready to be played in the piano roll
// added a background percussion part for fun

function init() {
	
	var conga = new Tone.MembraneSynth({
				"pitchDecay" : 0.02,
				"octaves" : 2,
				"envelope" : {
					"attack" : 0.0006,
					"decay" : 0.9,
					"sustain" : 0
				}
			}).toMaster();
			
	var congaPart = new Tone.Sequence(function(time, pitch){
		conga.triggerAttack(pitch, time, Math.random()*0.4 + 0.2);
	}, ["G3", "C4", "F4", "C4"], "8n").start(0);
	conga.volume.value = -12;
	
	var bass = new Tone.FMSynth({
		"harmonicity" : 3,
		"modulationIndex" : 6.5,
		"carrier" : {
			"oscillator" : {
				"type" : "custom",
				"partials" : [3, 4, 5, 2]
			},
			"envelope" : {
				"attack" : 0.08,
				"decay" : 1.6,
				"sustain" : 0.9,
			},
		},
		"modulator" : {
			"oscillator" : {
				"type" : "square"
			},
			"envelope" : {
				"attack" : 0.1,
				"decay" : 1.6,
				"sustain" : 0.8,
			"release" : 0.05
			},
		}
	}).toMaster();

	var bassNotes = [{
		time: "0:0",
		note: "C2",
		dur: "4n + 8n",
		velocity: 0.9
	
	}, {
		time: "0:2",
		note: "D#2",
		dur: "8n",
		velocity: 0.7
	
	}, {
		time: "0:2 + 4t",
		note: "C2",
		dur: "8n",
		velocity: 0.7
	}, {
		time: "0:2 + 4t*2",
		note: "A#2",
		dur: "8n",
		velocity: 0.8
	}, {
		time: "1:0",
		note: "C2",
		dur: "4n + 8n",
		velocity: 0.9
	}, {
		time: "1:2",
		note: "C2",
		dur: "8n",
		velocity: 0.7
	}, {
		time: "1:2 + 4t",
		note: "C2",
		dur: "8n",
		velocity: 0.6
	}, {
		time: "1:2 + 4t*2",
		note: "E2",
		dur: "8n",
		velocity: 0.6
	}, {
		time: "2:0",
		note: "F2",
		dur: "4n + 8n",
		velocity: 0.9
	}, {
		time: "2:2",
		note: "F2",
		dur: "8n",
		velocity: 0.9
	}, {
		time: "2:2 + 4t",
		note: "F1",
		dur: "8n",
		velocity: 0.9
	}, {
		time: "2:2 + 4t*2",
		note: "F2",
		dur: "8n",
		velocity: 0.9
	}, {
		time: "3:0",
		note: "F1",
		dur: "4n + 8n",
		velocity: 0.8
	}, {
		time: "3:2",
		note: "F2",
		dur: "8n",
		velocity: 0.9
	}, {
		time: "3:2 + 4t",
		note: "F1",
		dur: "8n",
		velocity: 0.6
	}, {
		time: "3:2 + 4t*2",
		note: "A#2",
		dur: "8n",
		velocity: 0.7
	}];


	var bassPart = new Tone.Part(function(time, event) {
		bass.triggerAttackRelease(event.note, event.dur, time, event.velocity);
	}, bassNotes).start(0);

	var uiCanvas = document.getElementById('canvas-ui');
	var eventCanvas = document.getElementById('canvas-event');

	Tone.Transport.bpm.value = 180;
	var BPMDisplayEl = document.getElementById('tempo-display');
	var timeDisplay = document.getElementById('time-display');
	var startBtn = document.getElementById('start-stop-button');
	var incTempoBtn = document.getElementById('tempo-inc');
	var decTempoBtn = document.getElementById('tempo-dec');
	var prd = new PianoRollDemo(uiCanvas, eventCanvas, bassPart, bassNotes, BPMDisplayEl, timeDisplay, startBtn, incTempoBtn, decTempoBtn);

}