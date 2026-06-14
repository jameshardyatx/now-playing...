document.getElementById('closeButton').addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

const songTextElement = document.getElementById("songText");

function horizontalScroll(amount, el) {
  const maxScroll = el.scrollWidth - el.clientWidth;
  const nextPos = el.scrollLeft + amount;

  if (nextPos >= maxScroll) {
    el.scrollLeft = 0;
    return true; // reset occurred
  }

  el.scrollLeft = nextPos;
  return false;
}

function startScrolling(el) {
  const PAUSE_DELAY = 4000;
  const TICK = 450;
  function scrollStep() {
    const reset = horizontalScroll(7, el);

    // Pause for 2 seconds after resetting
    const delay = reset ? PAUSE_DELAY : TICK;

    setTimeout(scrollStep, delay);
  }

  // Initial 2-second pause before starting
  setTimeout(scrollStep, PAUSE_DELAY);
}

startScrolling(songTextElement);

const nowPlayingTextContainer = document.getElementById("nowPlayingText");

const nowPlayingString = "now playing...";

for (let i = 0; i < nowPlayingString.length; i++) {
  const letter = document.createElement("span");
  letter.classList.add("letter");
  letter.dataset.npPos = i.toString();
  letter.textContent = nowPlayingString[i];
  nowPlayingTextContainer.appendChild(letter);
}

