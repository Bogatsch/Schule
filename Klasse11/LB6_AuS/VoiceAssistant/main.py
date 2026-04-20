import os
import sys
import tty
import termios
import time
import random
import subprocess
import threading
import warnings
import re
from contextlib import contextmanager
import speech_recognition as sr
from gtts import gTTS

# --- KONFIGURATION ---
MIC_INDEX = 5 

# Globale Variablen zur Steuerung
current_audio_process = None
toiletten_chance = 0.4

warnings.filterwarnings("ignore")


# ANSI-Farben
RESET  = "\033[0m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
GRAY   = "\033[90m"
BLUE   = "\033[94m"


def _visible_len(text):
    """Länge des Textes ohne ANSI-Escape-Sequenzen."""
    return len(re.sub(r"\033\[[0-9;]*m", "", text))


def cprint(text=""):
    """Gibt Text horizontal zentriert in der Konsole aus."""
    cols = os.get_terminal_size().columns
    pad = max(0, (cols - _visible_len(text)) // 2)
    print(" " * pad + text)


def print_header():
    width = 54
    border     = CYAN + BOLD + "═" * width + RESET
    thin_line  = GRAY + "─" * width + RESET
    cprint()
    cprint(border)
    cprint(CYAN + BOLD + "🎙  HERR BOGATSCHS KI-ASSISTENT" + RESET)
    cprint(border)
    cprint()
    cprint(BOLD + "Mögliche Befehle:" + RESET)
    cprint(thin_line)
    cmds = [
        "Darf ich dem Lehrer eine Frage stellen?",
        "Darf ich auf die Toilette / aufs Klo?",
        "Wie spät ist es?",
        "Wo finde ich die Lösungen?",
    ]
    for phrase in cmds:
        cprint(f"{GREEN}▸{RESET}  {phrase}")
    cprint(thin_line)
    cprint()


@contextmanager
def suppress_stderr_fd():
    """Unterdrückt native stderr-Ausgaben (z.B. ALSA/PyAudio) temporär."""
    devnull_fd = os.open(os.devnull, os.O_WRONLY)
    saved_stderr_fd = os.dup(2)
    try:
        os.dup2(devnull_fd, 2)
        yield
    finally:
        os.dup2(saved_stderr_fd, 2)
        os.close(saved_stderr_fd)
        os.close(devnull_fd)

def kill_audio():
    """Bricht die aktuelle Sprachausgabe sofort ab."""
    global current_audio_process
    if current_audio_process and current_audio_process.poll() is None:
        current_audio_process.terminate() # Prozess beenden
        current_audio_process = None

def speak(text):
    """Sprachausgabe; blockierend, damit ein Befehl komplett abgearbeitet wird."""
    global current_audio_process
    try:
        with suppress_stderr_fd():
            tts = gTTS(text=text, lang='de')
            filename = "voice_temp.mp3"
            tts.save(filename)

            # Blockiert bis die Ausgabe fertig ist, damit ein Tastendruck genau einen Lauf triggert.
            current_audio_process = subprocess.Popen(
                ["mpg123", "-q", filename],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            current_audio_process.wait()
    except Exception:
        # Fehler werden absichtlich still behandelt, um die Konsole sauber zu halten.
        pass
    finally:
        current_audio_process = None

def run_logic():
    """Führt eine einzelne Anfrage aus."""
    global toiletten_chance, ready_for_space
    
    # 1. Falls er noch spricht: Ruhe!
    kill_audio()
    
    response_text = None
    should_exit = False
    should_clear = False

    r = sr.Recognizer()
    # Etwas toleranteres Ende der Aufnahme, damit ganze Saetze erfasst werden.
    r.pause_threshold = 1.4
    r.non_speaking_duration = 0.8
    r.phrase_threshold = 0.3
    with suppress_stderr_fd():
        with sr.Microphone(device_index=MIC_INDEX) as source:
            r.adjust_for_ambient_noise(source, duration=0.5)
            cprint(YELLOW + BOLD + "🎤  Ich höre jetzt zu …" + RESET)
            try:
                audio = r.listen(source, timeout=6, phrase_time_limit=10)
                befehl = r.recognize_google(audio, language="de-DE").lower()
                cprint(BLUE + f"Du:  {befehl}" + RESET)
            except Exception:
                befehl = None

    # Antwort erst NACH geschlossenem Mikrofon erzeugen/abspielen.
    if not befehl:
        response_text = "Ich habe dich nicht verstanden."
    elif "kann" in befehl:
        response_text = "Ich weiß nicht, ob du das kannst."
    elif re.search(r"\bdarf ich\b", befehl) and "lehrer" and "frage" in befehl:
        if "bitte" in befehl:
            response_text = "Ja, natürlich."
            should_clear = True
        else:
            response_text = "Was ist das Zauberwort? So antworte ich nicht."
    elif "toilette" in befehl or "klo" in befehl:
        if random.random() <= toiletten_chance:
            response_text = "Glückwunsch! Du darfst aufs Klo."
            toiletten_chance = 0.4
            should_clear = True
        else:
            toiletten_chance = min(1.0, toiletten_chance + 0.1)
            response_text = "Leider kein Glück gehabt. Versuche es nochmal."
    elif "wie spät" in befehl:
        response_text = f"Es ist {time.strftime('%H:%M')} Uhr."
        should_clear = True
    elif "lösung" in befehl:
        response_text = "Die Lösungen findest du auf Lernsax."
        should_clear = True
    elif "beenden" in befehl or "stopp" in befehl:
        response_text = "Programm wird beendet."
        should_exit = True
    else:
        response_text = f"Befehl {befehl} ist nicht definiert."

    cprint(GREEN + f"💬  {response_text}" + RESET)
    speak(response_text)
    if should_exit:
        time.sleep(1)
        os._exit(0)
    if should_clear:
        os.system("clear")
        print_header()


def wait_for_space():
    """Wartet im Terminal auf einen einzelnen Leertasten-Druck."""
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        while True:
            ch = sys.stdin.read(1)
            if ch == ' ':
                break
            elif ch == '\x03':  # Ctrl+C
                raise KeyboardInterrupt
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)


def main():
    os.system("clear")
    print_header()
    speak("System bereit.")

    try:
        while True:
            cprint(CYAN + "[ Leertaste drücken zum Sprechen ]" + RESET)
            wait_for_space()
            cprint()
            run_logic()
            cprint()
    except KeyboardInterrupt:
        cprint(GRAY + "Programm beendet." + RESET)

if __name__ == "__main__":
    main() 