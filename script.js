'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const [FIELD_HEIGHT, FIELD_WIDTH] = [9, 9];
  const [MINE, SAFE] = [true, false]; // values in 2D array
  const NUM_OF_MINES = 10;
  const MOUSE_RIGHT_CLICK_VALUE = 2;
  const MAX_TIMER = 5999;
  const SQUARE_CLASS = 'square';
  const MINE_CLASS = 'square--mine';
  const FLAGGED_CLASS = 'square--flagged';
  const ENTERED_CLASS = 'square--entered';
  const EXPLODED_CLASS = 'square--exploded';
  const X_COORD_ATTR = 'data-x-coord';
  const Y_COORD_ATTR = 'data-y-coord';
  const NUMBER_ATTR = 'data-number';
  const TIMER_VALUE_EL = document.getElementById('timer-value');
  const REMAINING_MINES_VALUE_EL = document.getElementById('remaining-mines-value');
  const MINEFIELD_EL = document.getElementById('minefield');
  const RESET_BTN = document.getElementById('reset-btn');
  const NEW_GAME_BTN = document.getElementById('new-game-btn');
  const SQUARE_TEMPLATE = document.getElementById('square-template');

  let fieldLayout, field, isFirstClick, timer, timerInterval, flagsPlaced;

  initialize();

  function initialize() {
    fieldLayout = generatedLayout();
    populateMinefield();
    field = fieldFromDom();
    isFirstClick = true;
    timer = 0;
    flagsPlaced = 0;
  }

  function reset() {
    initialize();
    clearTimerInterval();
    updateTimer();
    updateRemainingMines();
    showResetBtn();
  }

  function end(hasWon) {
    stopTimer();
    disableAllSquares();
    showNewGameBtn();

    if (hasWon) {
      win();
    } else {
      gameOver();
    }
  }

  function win() {
    flagAllUnflaggedMines();
  }

  function gameOver() {
    explodeAllMines();
  }

  function allCoords() {
    const coords = [];

    for (let x = 0; x < FIELD_HEIGHT; x++) {
      for (let y = 0; y < FIELD_WIDTH; y++) {
        coords.push([x, y]);
      }
    }

    return coords;
  }

  function generatedMineCoords() {
    return shuffledArray(allCoords()).slice(0, NUM_OF_MINES);
  }

  function generatedLayout() {
    // first create layout without mines
    const layout = Array(FIELD_HEIGHT).fill(null).map(() => Array(FIELD_WIDTH).fill(SAFE));

    // place the mines
    generatedMineCoords().forEach(([x, y]) => layout[x][y] = MINE);

    return layout;
  }

  function populateMinefield() {
    const fragment = new DocumentFragment();

    for (let x = 0; x < FIELD_HEIGHT; x++) {
      for (let y = 0; y < FIELD_WIDTH; y++) {
        const squareClone = SQUARE_TEMPLATE.content.cloneNode(true);

        if (fieldLayout[x][y] === MINE) {
          squareClone.querySelector('button').classList.add(MINE_CLASS);
        }

        if (fieldLayout[x][y] === SAFE) {
          const surroundingMinesCount = numberOfSurroundingMines(x, y);

          if (surroundingMinesCount > 0) {
            squareClone.querySelector('button').setAttribute(NUMBER_ATTR, surroundingMinesCount);
            squareClone.querySelector('.square__number').innerText = surroundingMinesCount;
          }
        }

        squareClone.querySelector('button').setAttribute(X_COORD_ATTR, x);
        squareClone.querySelector('button').setAttribute(Y_COORD_ATTR, y);
        squareClone.querySelector('button').addEventListener('mousedown', handleSquareClick);
        squareClone.querySelector('button').addEventListener('contextmenu', event => event.preventDefault());

        fragment.append(squareClone);
      }
    }

    MINEFIELD_EL.replaceChildren(fragment);
  }

  function fieldFromDom() {
    return chunkedArray(Array.from(squareEls()), FIELD_WIDTH);
  }

  function numberOfSurroundingMines(x, y) {
    return surroundingElements(fieldLayout, x, y).filter(s => s === MINE).length;
  }

  function surroundingSquareEls(squareEl) {
    return surroundingElements(field, xCoord(squareEl), yCoord(squareEl));
  }

  function surroundingSquareElsToEnter(squareEl) {
    return surroundingSquareEls(squareEl).filter(squareEl => !isMine(squareEl) && !isEntered(squareEl) && !isFlagged(squareEl));
  }

  function enter(squareEl) {
    squareEl.classList.add(ENTERED_CLASS);
  }

  function explode(squareEl) {
    squareEl.classList.add(EXPLODED_CLASS);
  }

  function toggleFlag(squareEl, force = undefined) {
    squareEl.classList.toggle(FLAGGED_CLASS, force);
  }

  function flag(squareEl) {
    flagsPlaced++;
    toggleFlag(squareEl, true);
    updateRemainingMines();
  }

  function unflag(squareEl) {
    flagsPlaced--;
    toggleFlag(squareEl, false);
    updateRemainingMines();
  }

  function isFlagged(squareEl) {
    return squareEl.classList.contains(FLAGGED_CLASS);
  }

  function isEntered(squareEl) {
    return squareEl.classList.contains(ENTERED_CLASS);
  }

  function isMine(squareEl) {
    return squareEl.classList.contains(MINE_CLASS);
  }

  function isNumbered(squareEl) {
    return squareEl.getAttribute(NUMBER_ATTR) !== null;
  }

  function xCoord(squareEl) {
    return Number(squareEl.getAttribute(X_COORD_ATTR));
  }

  function yCoord(squareEl) {
    return Number(squareEl.getAttribute(Y_COORD_ATTR));
  }

  function enterArea(squareEl) {
    enter(squareEl);

    if (isNumbered(squareEl)) return;

    for (const squareElToEnter of surroundingSquareElsToEnter(squareEl)) {
      enterArea(squareElToEnter);
    }
  }

  function remainingSafeSquareEls() {
    return MINEFIELD_EL.querySelectorAll(`.${SQUARE_CLASS}:not(.${MINE_CLASS}, .${ENTERED_CLASS})`);
  }

  function squareEls() {
    return MINEFIELD_EL.querySelectorAll('.' + SQUARE_CLASS);
  }

  function mineEls() {
    return MINEFIELD_EL.querySelectorAll('.' + MINE_CLASS);
  }

  function unflaggedMineEls() {
    return MINEFIELD_EL.querySelectorAll(`.${MINE_CLASS}:not(.${FLAGGED_CLASS})`);
  }

  function explodeAllMines() {
    mineEls().forEach(mine => explode(mine));
  }

  function flagAllUnflaggedMines() {
    unflaggedMineEls().forEach(mine => flag(mine));
  }

  function disableAllSquares() {
    squareEls().forEach(squareEl => squareEl.disabled = true);
  }

  function updateTimer() {
    TIMER_VALUE_EL.innerText = String(Math.floor(timer / 60)).padStart(2, '0')
                                 + ':'
                                 + String(timer % 60).padStart(2, '0');
  }

  function updateRemainingMines() {
    REMAINING_MINES_VALUE_EL.innerText = String(NUM_OF_MINES - flagsPlaced).padStart(2, '0');
  }

  function showNewGameBtn() {
    RESET_BTN.hidden = true;
    NEW_GAME_BTN.hidden = false;
  }

  function showResetBtn() {
    NEW_GAME_BTN.hidden = true;
    RESET_BTN.hidden = false;
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      if (timer >= MAX_TIMER) return;

      timer++;
      updateTimer();
    }, 1000);
  }

  function stopTimer() {
    clearTimerInterval();
  }

  function clearTimerInterval() {
    clearInterval(timerInterval);
  }

  function handleSquareClick(event) {
    if (event.button === MOUSE_RIGHT_CLICK_VALUE) {
      handleSquareRightClick(event);
    } else {
      handleSquareLeftClick(event);
    }
  }

  function handleSquareLeftClick({ target }) {
    if (isFlagged(target)) return;

    if (isFirstClick) {
      isFirstClick = false;
      startTimer();
    }

    enter(target);

    if (isMine(target)) {
      end(false);
      return;
    }

    enterArea(target);

    if (remainingSafeSquareEls().length === 0) end(true);
  }

  function handleSquareRightClick({ target }) {
    if (isEntered(target)) return;

    isFlagged(target) ? unflag(target): flag(target);
  }

  RESET_BTN.addEventListener('click', reset);
  NEW_GAME_BTN.addEventListener('click', reset);
});

// Helpers

function surroundingElements(array, x, y) {
  return [
    array[x-1]?.[y-1], array[x-1]?.[y], array[x-1]?.[y+1],
    array[ x ]?.[y-1],    /* self */    array[ x ]?.[y+1],
    array[x+1]?.[y-1], array[x+1]?.[y], array[x+1]?.[y+1]
  ].filter(s => s !== undefined);
}

// Based on https://stackoverflow.com/a/8495740
function chunkedArray(array, chunkSize) {
  if (chunkSize <= 0) throw new Error('chunkSize must be greater than 0');

  const chunkedArray = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunkedArray.push(array.slice(i, i + chunkSize));
  }

  return chunkedArray;
}

// Based on https://stackoverflow.com/a/12646864
function shuffledArray(array) {
  const shuffledArray = structuredClone(array);

  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }

  return shuffledArray;
}
