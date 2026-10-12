let audioCtx = null;
let isPlaying = false;
let currentBeat = 1;
let nextNoteTime = 0.0;
let timerId = null;
let estadoActual = "F";
let esPrimerGolpe = true;

let pesos = {
    ff: 10, fd: 80, fs: 10,
    df: 25, dd: 65, ds: 10
};

function ajustarPesos(fila, modificat) {
    if (fila === 'F') {
        let ff = parseInt(document.getElementById("p_ff").value);
        let fs = parseInt(document.getElementById("p_fs").value);
        if (ff + fs > 100) {
            if (modificat === 'ff') fs = 100 - ff;
            else ff = 100 - fs;
            document.getElementById("p_ff").value = ff;
            document.getElementById("p_fs").value = fs;
        }
        let fd = 100 - (ff + fs);
        pesos.ff = ff; pesos.fs = fs; pesos.fd = fd;
        document.getElementById("val_ff").innerText = ff + "%";
        document.getElementById("val_fs").innerText = fs + "%";
        document.getElementById("val_fd").innerText = fd + "%";
    } else {
        let df = parseInt(document.getElementById("p_df").value);
        let ds = parseInt(document.getElementById("p_ds").value);
        if (df + ds > 100) {
            if (modificat === 'df') ds = 100 - df;
            else df = 100 - ds;
            document.getElementById("p_df").value = df;
            document.getElementById("p_ds").value = ds;
        }
        let dd = 100 - (df + ds);
        pesos.df = df; pesos.ds = ds; pesos.dd = dd;
        document.getElementById("val_df").innerText = df + "%";
        document.getElementById("val_ds").innerText = ds + "%";
        document.getElementById("val_dd").innerText = dd + "%";
    }
}

function actualitzarSelectorsInici() {
    const compasMode = document.getElementById("compas").value;
    const startBeatSelect = document.getElementById("startBeat");
    const maxBeats = (compasMode === "flamenco") ? 12 : parseInt(compasMode);

    const prevVal = startBeatSelect.value;

    startBeatSelect.innerHTML = "";
    for(let b = 1; b <= maxBeats; b++) {
        let opt = document.createElement("option");
        opt.value = b;
        opt.innerText = "Beat " + b;
        startBeatSelect.appendChild(opt);
    }

    if(prevVal && prevVal <= maxBeats) {
        startBeatSelect.value = prevVal;
    } else {
        startBeatSelect.value = 1;
    }
}

function proximoEstadoMarkov() {
    const dado = Math.floor(Math.random() * 100) + 1;

    if (estadoActual === "F") {
        if (dado <= pesos.ff) return "F";
        else if (dado <= pesos.ff + pesos.fd) return "d";
        else return "S";
    } else {
        if (dado <= pesos.df) return "F";
        else if (dado <= pesos.df + pesos.dd) return "d";
        else return "S";
    }
}

function playTone(time, frecuencia, duracion) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(frecuencia, time);
    gainNode.gain.setValueAtTime(0.25, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duracion);
    osc.start(time);
    osc.stop(time + duracion);
}

function scheduleNote(beatNumber, time) {
    const compasMode = document.getElementById("compas").value;
    let esFuerte = false;
    let esSilencio = false;

    if (compasMode === "flamenco") {
        // Lógica matemática limpia para los acentos flamencos (3, 6, 8, 10, 12) sin usar corchetes conflictivos
        if (beatNumber === 3 || beatNumber === 6 || beatNumber === 8 || beatNumber === 10 || beatNumber === 12) {
            esFuerte = true;
        } else {
            estadoActual = proximoEstadoMarkov();
            if (estadoActual === "F") esFuerte = true;
            if (estadoActual === "S") esSilencio = true;
        }
    } else {
        if (beatNumber === 1) {
            esFuerte = true;
        } else {
            estadoActual = proximoEstadoMarkov();
            if (estadoActual === "F") esFuerte = true;
            if (estadoActual === "S") esSilencio = true;
        }
    }

    let rocket = (esPrimerGolpe) ? " 🚀" : "";
    if (esPrimerGolpe) esPrimerGolpe = false;

    if (esSilencio) {
        drawVisual("☁️ Silenci (" + beatNumber + ")" + rocket, "off", time);
    } else if (esFuerte) {
        playTone(time, 880, 0.08);
        drawVisual("🔴 Beat: " + beatNumber + rocket, "fuerte", time);
    } else {
        playTone(time, 440, 0.04);
        drawVisual("   Beat: " + beatNumber + rocket, "debil", time);
    }
}

function drawVisual(texto, tipoLed, time) {
    const delay = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => {
        const led = document.getElementById("led");
        document.getElementById("display").innerText = texto;
        led.className = "led";
        if (tipoLed === "fuerte") led.classList.add("active-fuerte");
        if (tipoLed === "debil") led.classList.add("active-debil");
        setTimeout(() => led.className = "led", 60);
    }, Math.max(0, delay));
}

function scheduler() {
    const bpm = parseFloat(document.getElementById("bpm").value);
    const secondsPerBeat = 60.0 / bpm;
    const compasMode = document.getElementById("compas").value;
    const maxBeats = (compasMode === "flamenco") ? 12 : parseInt(compasMode);

    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        scheduleNote(currentBeat, nextNoteTime);
        nextNoteTime += secondsPerBeat;
        currentBeat++;
        if (currentBeat > maxBeats) currentBeat = 1;
    }
    timerId = setTimeout(scheduler, 25.0);
}

function toggleMetronome() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const btn = document.getElementById("startBtn");

    if (isPlaying) {
        isPlaying = false;
        btn.innerText = "INICIAR RITME";
        btn.classList.remove("playing");
        clearTimeout(timerId);
        document.getElementById("display").innerText = "Aturat";
    } else {
        isPlaying = true;
        btn.innerText = "ATURAR RITME";
        btn.classList.add("playing");

        currentBeat = parseInt(document.getElementById("startBeat").value);
        esPrimerGolpe = true;
        estadoActual = "F";
        nextNoteTime = audioCtx.currentTime + 0.05;
        scheduler();
    }
}

// Inicialización automática de la lista al cargar el archivo
actualitzarSelectorsInici();
