javascript
const listenBtn = document.getElementById("listenBtn");
const voiceBtn = document.getElementById("voiceBtn");
const summaryBtn = document.getElementById("summaryBtn");

const originalText = document.getElementById("originalText");
const translatedText = document.getElementById("translatedText");
const status = document.getElementById("status");

const arabicBtn = document.getElementById("arabicBtn");
const italianBtn = document.getElementById("italianBtn");

let listening = false;
let voiceEnabled = true;
let sourceLanguage = "ar-EG";

let translationBusy = false;
let pendingTranslation = null;

const conversation = [];

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;


// ==============================
// SPEECH RECOGNITION
// ==============================

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = sourceLanguage;

    recognition.onstart = () => {
        listening = true;
        listenBtn.textContent = "🛑 Stop Listening";
        status.textContent = "🎤 Listening...";
    };

    recognition.onend = () => {
        if (listening) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.log("Recognition restart skipped");
                }
            }, 100);
        } else {
            status.textContent = "Ready";
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        if (event.error === "not-allowed") {
            listening = false;
            listenBtn.textContent = "🎤 Start Listening";
            status.textContent = "❌ Microphone permission denied";
            return;
        }

        if (event.error === "no-speech") {
            return;
        }

        status.textContent = `❌ Speech error: ${event.error}`;
    };

    recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim();

            if (event.results[i].isFinal) {
                finalText += transcript + " ";
            } else {
                interimText += transcript + " ";
            }
        }

        // Show speech immediately
        if (interimText.trim()) {
            originalText.textContent = interimText.trim();
            status.textContent = "🎤 Listening...";
        }

        // Send completed phrase immediately
        if (finalText.trim()) {
            const text = finalText.trim();

            originalText.textContent = text;

            addTranslationToQueue(text);
        }
    };

} else {
    status.textContent =
        "❌ Speech recognition is not supported by this browser.";
}


// ==============================
// TRANSLATION QUEUE
// ==============================

function addTranslationToQueue(text) {
    pendingTranslation = text;

    processTranslationQueue();
}


async function processTranslationQueue() {
    if (translationBusy || !pendingTranslation) {
        return;
    }

    translationBusy = true;

    const text = pendingTranslation;
    pendingTranslation = null;

    await translateSpeech(text);

    translationBusy = false;

    // If another sentence arrived while translating,
    // translate it immediately.
    if (pendingTranslation) {
        processTranslationQueue();
    }
}


// ==============================
// TRANSLATION
// ==============================

async function translateSpeech(text) {
    const from =
        sourceLanguage === "ar-EG"
            ? "Egyptian Arabic"
            : "Italian";

    const to =
        sourceLanguage === "ar-EG"
            ? "Italian"
            : "Egyptian Arabic";

    try {
        status.textContent = "🌐 Translating...";

        const response = await fetch("/api/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text,
                from,
                to
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Translation failed");
        }

        translatedText.textContent = data.translation;

        // Save conversation for summary
        conversation.push({
            from,
            original: text,
            to,
            translation: data.translation,
            time: new Date().toISOString()
        });

        status.textContent = "✅ Listening...";

        if (voiceEnabled) {
            speakTranslation(data.translation);
        }

    } catch (error) {
        console.error("Translation error:", error);

        translatedText.textContent = "Translation failed.";
        status.textContent = `❌ ${error.message}`;
    }
}


// ==============================
// TEXT TO SPEECH
// ==============================

function speakTranslation(text) {
    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang =
        sourceLanguage === "ar-EG"
            ? "it-IT"
            : "ar-EG";

    utterance.rate = 1.05;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
}


// ==============================
// LISTEN BUTTON
// ==============================

listenBtn.addEventListener("click", () => {
    if (!recognition) {
        return;
    }

    if (listening) {
        listening = false;

        recognition.stop();

        window.speechSynthesis.cancel();

        listenBtn.textContent = "🎤 Start Listening";
        status.textContent = "Stopped";

        return;
    }

    recognition.lang = sourceLanguage;

    originalText.textContent = "Listening...";
    translatedText.textContent = "Waiting...";
    status.textContent = "🎤 Starting...";

    try {
        recognition.start();
    } catch (error) {
        console.error(error);
    }
});


// ==============================
// LANGUAGE BUTTONS
// ==============================

arabicBtn.addEventListener("click", () => {
    sourceLanguage = "ar-EG";

    arabicBtn.classList.add("active");
    italianBtn.classList.remove("active");

    if (recognition) {
        recognition.lang = sourceLanguage;
    }

    status.textContent = "🇪🇬 Arabic → Italian";
});


italianBtn.addEventListener("click", () => {
    sourceLanguage = "it-IT";

    italianBtn.classList.add("active");
    arabicBtn.classList.remove("active");

    if (recognition) {
        recognition.lang = sourceLanguage;
    }

    status.textContent = "🇮🇹 Italian → Arabic";
});


// ==============================
// VOICE TOGGLE
// ==============================

voiceBtn.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;

    if (!voiceEnabled) {
        window.speechSynthesis.cancel();
    }

    voiceBtn.textContent = voiceEnabled
        ? "🔊 Voice: ON"
        : "🔇 Voice: OFF";
});


// ==============================
// SUMMARY
// ==============================

summaryBtn.addEventListener("click", () => {
    if (conversation.length === 0) {
        status.textContent = "📋 No conversation yet.";
        return;
    }

    console.log("CallBridge conversation:", conversation);

    status.textContent =
        `📋 ${conversation.length} translated messages recorded`;
});

