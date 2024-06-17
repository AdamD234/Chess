let overlay = true;
let playing = "player";
let difficulty = "Medium";
let playFirst = "Random";
let previouslySelectedSquare = false;
let turn = "white";
let legalMoves = [];
const knightMoves = [
  [1, 2],
  [-1, 2],
  [1, -2],
  [-1, -2],
  [2, 1],
  [-2, 1],
  [2, -1],
  [-2, -1],
];
let enPassant;
let movesPlayed = [];
let flipped = 1;
let kingPositions = { white: "e1", black: "e8" };
//updates where castling is possible for: white king side, white queen side, black king side, black queen side
let ableToCastle = [true, true, true, true];
let flashes = 0;
let promotionSquare;
let pastPositions = [];
pastPositions.push(currentPosition().toString());
let fiftyMoveRule = 0;
let endOfGame = false;
const blur = document.querySelector(".blur");

//settings
let coordinates = "outside";

//used to create dragging visuals
const hoverPiece = document.querySelector(".hover-piece");
//tracks hover piece to mouse
const dragPiece = (event) => {
  hoverPiece.style.left = event.pageX + "px";
  hoverPiece.style.top = event.pageY + "px";
};

//corrects coordinates shown
const numberCoords = document.querySelectorAll(".number-coordinate");
numberCoords.forEach(function (node) {
  let num = node.id[1].toString();
  node.setAttribute("numberCoord", num);
});
const letterCoords = document.querySelectorAll(".letter-coordinate");
letterCoords.forEach(function (node) {
  let letter = node.id[0].toString();
  node.setAttribute("letterCoord", letter);
});

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//-------------------------Starting Buttons----------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

function againstSwap(against) {
  if (against.name != playing) {
    playing = against.name;
    let buttons = against.parentElement.querySelectorAll("input");
    for (const button of buttons) {
      button.classList.toggle("againstSelected");
    }
    document.querySelector(".menu").classList.toggle("no-computer");
  }
}

function difficultyUpdate(chosenDifficulty) {
  let title = chosenDifficulty.firstElementChild.firstElementChild.innerHTML;
  if (title != difficulty) {
    difficulty = title;
    let difficultyOptions =
      chosenDifficulty.parentElement.querySelectorAll("a");
    for (const option of difficultyOptions) {
      option.classList.remove("difficultySelected");
    }
    chosenDifficulty.classList.add("difficultySelected");
  }
}

function firstUpdate(chosenFirst) {
  let title = chosenFirst.firstElementChild.firstElementChild.innerHTML;
  if (title != playFirst) {
    playFirst = title;
    let firstOptions = chosenFirst.parentElement.querySelectorAll("a");
    for (const option of firstOptions) {
      option.classList.remove("firstSelected");
    }
    chosenFirst.classList.add("firstSelected");
  }
}

function playGame() {
  blur.style.display = "none";
  blur.firstElementChild.style.display = "none";
  blur.lastElementChild.style.display = "flex";
  overlay = false;
  if (playFirst == "Random") {
    if (Math.random() < 0.5) {
      playFirst = "white";
    } else {
      playFirst = "black";
    }
  }
  playFirst = playFirst.toLowerCase();
  if (playFirst == "black" && playing == "computer") {
    if (flipped == 1) {
      flipBoard();
    }
    randomComputerMove();
  }
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//-----------------------------Controls--------------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

// makes the pieces always draggable
document.addEventListener("dragstart", (event) => {
  event.dataTransfer.dropEffect = "none";
  event.preventDefault();
});

// triggered when the mouse is clicked or released
// starts all the logic
function press(event, mouseDown) {
  if (overlay) {
    return;
  }
  let boardArea = document.querySelector(".board").getBoundingClientRect();

  //if mouse is off board cancel move or a piece is currently being promoted, drops dragged piece
  if (
    event.pageX > boardArea.right ||
    event.pageX < boardArea.left ||
    event.pageY > boardArea.bottom ||
    event.pageY < boardArea.top ||
    promotionSquare
  ) {
    dragPickUp();
    previouslySelectedSquare = false;
    clearHighlights();
    return;
  }

  const selectedSquare = squareLocate(event, boardArea);
  //returns the HTML element of the selected square

  const colourOfSelectedSquare = colourInSquare(selectedSquare);
  //returns string of what colour piece/ empty is in the selected square

  if (previouslySelectedSquare && selectedSquare != previouslySelectedSquare) {
    //plays move if piece is selected, drops dragged piece
    if (Move(selectedSquare)) {
      dragPickUp(false, selectedSquare);
      return;
    }
  }
  if (mouseDown) {
    if (colourOfSelectedSquare == turn) {
      //if correct piece colour is pressed it gets selected (runs the move logic)
      previouslySelectedSquare = selectedSquare;
      highlightSquares(selectedSquare);
      dragPickUp(event);
      return;
    }
    if (
      colourOfSelectedSquare == "empty" &&
      previouslySelectedSquare &&
      !Move(selectedSquare)
    ) {
      //cancels move if empty square is selected
      previouslySelectedSquare = false;
      clearHighlights();
      return;
    }
  }
  // drops dragged piece
  dragPickUp();
}

//finds what square the mouse selects
function squareLocate(e, boardArea) {
  let mouseX = Math.floor(((e.pageX - boardArea.left) * 8) / boardArea.height);
  let mouseY =
    8 - Math.floor(((e.pageY - boardArea.top) * 8) / boardArea.height);
  mouseX = String.fromCharCode(97 + mouseX);
  return document.getElementById(mouseX + mouseY);
}

// moves a piece to an empty/ other players square
function Move(currentSquare) {
  //if this move was a castle less checks can be done
  if (legalMoves.includes(currentSquare.id + "c")) {
    castle(currentSquare.id);
    moveSwap();
    clearHighlights();
    enPassant = false;
    previouslySelectedSquare = 0;
    return true;
  }
  //if there's no legal moves or this isn't a legal move, this piece can't be selected or moved there
  if (
    !legalMoves ||
    !(
      legalMoves.includes(currentSquare.id) ||
      legalMoves.includes(currentSquare.id + "e")
    )
  ) {
    return false;
  }
  //saves the move and any missing piece data to be undone
  movesPlayed.push([
    previouslySelectedSquare.id,
    currentSquare.id,
    currentSquare.innerHTML,
  ]);

  //runs checks and updates board visuals accordingly
  boardUpdates(currentSquare);
  return true;
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//------------------------------Visuals--------------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

//updates board and runs checks
function boardUpdates(currentSquare) {
  //visually swaps pieces and changes UI
  currentSquare.innerHTML = previouslySelectedSquare.innerHTML;
  previouslySelectedSquare.innerHTML = "";

  //checks for promotions
  promote(currentSquare);

  //updates UI if it's not a promotion
  if (!promotionSquare) {
    moveSwap();
  }
  //checks for en passant, end of game, removes highlights, checks castling rights and promotions
  enPassantChecks(currentSquare);
  endOfGameChecks(currentSquare);
  updateCastlingRights(currentSquare);
  clearHighlights();

  //ends move
  previouslySelectedSquare = false;

  if (playing == "computer" && turn != playFirst) {
    randomComputerMove();
  }
}

//changes whose move it is and UI
function moveSwap() {
  if (turn == "white") {
    turn = "black";
  } else {
    turn = "white";
  }
  let turns = document.querySelectorAll(".turn");
  for (const turnHighlight of turns) {
    turnHighlight.classList.toggle("current");
  }
}

//highlights selected piece, possible moves, possible captures and flashes king
function highlightSquares(currentSquare) {
  clearHighlights();
  //runs hasLegalMoves which checks for legal moves and updates the legalMoves variable if there are legal moves
  if (!hasLegalMoves(currentSquare)) {
    if (isChecked()) {
      // if the piece has no legal moves and king is in check then:
      kingFlash();
    }
    return;
  }
  //selected piece has legal moves so shows possible moves
  currentSquare.style.boxShadow = "inset 0 0 10px 0";
  for (const move of legalMoves) {
    let highlight = document.getElementById(move[0] + move[1]);
    if (colourInSquare(highlight) != "empty" && move.length < 3) {
      // capture piece highlight
      highlight.style.boxShadow = "inset 0 0 10px 0 #d11e1e";
    }
    // dots
    highlight.style.backgroundImage = "radial-gradient(#0007 20%, #0000 40%)";
  }
}

// clears all highlights except check if it's there, also makes sure all pieces are visible
function clearHighlights() {
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j < 9; j++) {
      let x = String.fromCharCode(97 + i);
      let clear = document.getElementById(x + j);
      clear.style.backgroundImage = "none";
      clear.style.boxShadow = "";
      if (clear.innerHTML) {
        clear.firstElementChild.style.opacity = "1";
      }
    }
  }
  if (isChecked()) {
    checkHighlight();
  }
  //adds the last move as faint highlights
  if (movesPlayed.length > 0 && movesPlayed[movesPlayed.length - 1] != "flip") {
    document.getElementById(
      movesPlayed[movesPlayed.length - 1][0]
    ).style.boxShadow = "#52bfedaa 0px 0px 25px inset";
    document.getElementById(
      movesPlayed[movesPlayed.length - 1][1]
    ).style.boxShadow = "#52bfed 0px 0px 25px inset";
  }
}

// adds a check highlight
function checkHighlight() {
  document.getElementById(kingPositions[isChecked()]).style.boxShadow =
    "inset 0 0 20px 0 #890F0F";
}

// king flashes three times
function kingFlash() {
  //max of 3 flashes
  if (flashes < 6) {
    //gets the king thats in check
    let king = document.getElementById(kingPositions[isChecked()]);
    if (flashes % 2 == 0) {
      //off every other
      if (king) {
        king.style.boxShadow = "";
      }
    } else {
      //on if it's still in check
      if (isChecked()) {
        checkHighlight();
      }
    }
    flashes += 1;
    //recursive
    setTimeout(kingFlash, 100);
  } else {
    flashes = 0;
  }
}

// castles the king
function castle(currentSquare) {
  //finds which files the king and rook are on and determines whether it's kingside or queenside
  let kingSquare = previouslySelectedSquare.id;
  let kingFile = kingSquare.charCodeAt(0);
  let clickFile = currentSquare.charCodeAt(0);
  let side = Math.sign((clickFile - kingFile) * flipped);

  //gets HTML of all squares
  let kingNewSquare = document.getElementById(
    String.fromCharCode(kingFile + 2 * flipped * side) + kingSquare[1]
  );
  let rookSquare = document.getElementById(
    String.fromCharCode(kingFile + (3.5 * side - 0.5) * flipped) + kingSquare[1]
  );
  let rookNewSquare = document.getElementById(
    String.fromCharCode(kingFile + 1 * flipped * side) + kingSquare[1]
  );
  //updates global king position
  kingPositions[turn] = kingNewSquare.id;
  //swaps over pieces and saves move to be undone
  kingNewSquare.innerHTML = previouslySelectedSquare.innerHTML;
  previouslySelectedSquare.innerHTML = "";
  rookNewSquare.innerHTML = rookSquare.innerHTML;
  rookSquare.innerHTML = "";
  movesPlayed.push([
    kingSquare,
    kingNewSquare.id,
    rookNewSquare.id,
    "castle",
    rookSquare.id,
  ]);
}

// shows the promotion display
function promote(currentSquare) {
  //if a pawn is at the edge of the board
  if (
    pieceInSquare(currentSquare) == "pawn" &&
    (currentSquare.id[1] == 1 || currentSquare.id[1] == 8)
  ) {
    //slides the popup over
    document.querySelector(".promotion-popup").style.transform = "none";
    promotionSquare = currentSquare.id;
    let promotionPieces = document.querySelectorAll(".promoteTo");
    //changes to piece colour in the display
    for (const pieceOption of promotionPieces) {
      if (pieceOption.firstElementChild.getAttribute("class") != turn) {
        pieceOption.firstElementChild.classList.toggle("white");
        pieceOption.firstElementChild.classList.toggle("black");
      }
    }
  }
}

// saves the move as an en passant, removes pawn and removes the en passant state at the end of a move
function enPassantChecks(currentSquare) {
  if (enPassant) {
    if (currentSquare.id == enPassant) {
      let removeId = enPassant[0] + (3 + enPassant[1] / 3);
      movesPlayed[movesPlayed.length - 1] = [
        movesPlayed[movesPlayed.length - 1][0],
        movesPlayed[movesPlayed.length - 1][1],
        document.getElementById(removeId).innerHTML,
        "enPassant",
        removeId,
      ];
      document.getElementById(removeId).innerHTML = "";
    }
    enPassant = false;
  }
  if (legalMoves.includes(currentSquare.id + "e")) {
    enPassant = currentSquare.id[0] + String(3 * currentSquare.id[1] - 9);
  }
}

//updates a html element to be dragged between squares
function dragPickUp(event) {
  if (event) {
    //updates html to match selected piece
    hoverPiece.innerHTML = previouslySelectedSquare.innerHTML;
    //shows hover piece and hides the piece in the selected square
    hoverPiece.style.display = "block";
    previouslySelectedSquare.firstElementChild.style.opacity = "0";
    // Move immediately to the initial position
    dragPiece(event);
    //adds an event listener so the pieces position is always where the mouse is
    document.addEventListener("mousemove", dragPiece);
    return;
  }
  //removes tracking and hides hover piece
  document.removeEventListener("mousemove", dragPiece);
  hoverPiece.style.display = "none";
  //reshow board pieces involved
  if (previouslySelectedSquare) {
    previouslySelectedSquare.firstElementChild.style.opacity = "1";
  }
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//-----------------------End Game Conditions---------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

//checks for checks or end of game
function endOfGameChecks(currentSquare) {
  if (isChecked()) {
    console.log("Check");
    if (!anyLegalMoves()) {
      endOfGame = true;
      console.log("Checkmated");
      blur.style.display = "grid";
      // dragPickUp();
    }
  } else if (draw(currentSquare)) {
    console.log("Draw");
    endOfGame = true;
    blur.lastElementChild.firstElementChild.innerHTML = "Draw";
    blur.style.display = "grid";
    // dragPickUp();
  }
}

// checks if a king is in check
function isChecked() {
  let checked = false;
  let kingColour = "white";
  if (inCheck(kingPositions[kingColour], kingColour)) {
    checked = "white";
  }
  kingColour = "black";
  if (inCheck(kingPositions[kingColour], kingColour)) {
    if (!checked) {
      checked = "black";
    } else {
      checked = "both";
    }
  }
  return checked;
}

//iterates over every piece, returns true if any moves can be legally played
function anyLegalMoves() {
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j < 9; j++) {
      let x = String.fromCharCode(97 + i);
      let sq = document.getElementById(x + j);
      if (sq.innerHTML) {
        let colour = sq.firstElementChild.getAttribute("class");
        if (colour == turn) {
          if (hasLegalMoves(sq)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

//checks for draw
function draw(currentSquare) {
  //converts current position to a string to be saved
  if (flipped == -1) {
    flipBoard(true);
    pos = currentPosition();
    flipBoard(true);
  } else {
    pos = currentPosition();
  }
  let stingPos = pos.toString();

  // three move repetition
  if (pastPositions.includes(stingPos)) {
    pastPositions.splice(pastPositions.indexOf(stingPos), 1, "temp");
    if (pastPositions.includes(stingPos)) {
      return true;
    }
    pastPositions.splice(pastPositions.indexOf("temp"), 1, stingPos);
  }
  pastPositions.push(stingPos);

  // 50 move rule, if no pieces or taken or pawn moves for 50 moves then the game is drawn
  if (
    movesPlayed[movesPlayed.length - 1][2] != false ||
    pieceInSquare(currentSquare) == "pawn"
  ) {
    fiftyMoveRule = 0;
  } else {
    fiftyMoveRule++;
  }
  if (fiftyMoveRule > 99) {
    return true;
  }
  // no moves
  if (!anyLegalMoves()) {
    return true;
  }

  //just the current pieces
  let piecesPositions = pos.slice(0, 64);
  //removes kings and empty squares
  let filtered = piecesPositions.filter(
    (piece) => piece != "ee" && piece != "wk" && piece != "bk"
  );
  //if there's no other pieces there's insufficient material
  if (filtered.length == 0) {
    return true;
  } else if (filtered.length == 1) {
    //or if there's just one bishop or knight
    if (
      filtered[0] == "wn" ||
      filtered[0] == "bn" ||
      filtered[0] == "wb" ||
      filtered[0] == "bb"
    ) {
      return true;
    }
  } //FIXME: not sure about this and implement timeout and insufficient material draw
  else if (filtered.length == 2) {
    filtered.sort();
    if ((filtered[0] == "bb") & (filtered[1] == "wb")) {
      let bbSq = piecesPositions.indexOf("bb");
      let bbSqCol = (Math.floor(bbSq / 8) + bbSq) % 2;
      let wbSq = piecesPositions.indexOf("wb");
      let wbSqCol = (Math.floor(wbSq / 8) + wbSq) % 2;
      if (wbSqCol == bbSqCol) {
        return true;
      }
    }
  }
  return false;
}

//returns the current position
function currentPosition() {
  let cPosition = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j < 9; j++) {
      let x = String.fromCharCode(97 + i);
      let sq = document.getElementById(x + j);
      let colour = colourInSquare(sq);
      let piece = pieceInSquare(sq);
      if (piece == "knight") {
        piece = "n";
      }
      cPosition.push(colour[0] + piece[0]);
    }
  }
  cPosition.push(enPassant);
  cPosition = cPosition.concat(ableToCastle);
  cPosition.push(turn);
  return cPosition;
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//------------------------------Castling-------------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

// checks if the piece moved changes castling rights
function updateCastlingRights(currentSquare) {
  let old = ableToCastle;
  if (pieceInSquare(currentSquare) == "king") {
    if (colourInSquare(currentSquare) == "white") {
      ableToCastle[0] = false;
      ableToCastle[1] = false;
    } else {
      ableToCastle[2] = false;
      ableToCastle[3] = false;
    }
    //updates global king positions
    kingPositions[colourInSquare(currentSquare)] = currentSquare.id;
  } else if (pieceInSquare(currentSquare) == "rook") {
    //1 = kingside, -1 = queenside
    let side =
      ((previouslySelectedSquare.id.charCodeAt(0) - 100.5) * flipped) / 3.5;
    if (colourInSquare(currentSquare) == "white") {
      if (side == 1) {
        ableToCastle[0] = false;
      } else {
        ableToCastle[1] = false;
      }
    } else {
      if (side == 1) {
        ableToCastle[2] = false;
      } else {
        ableToCastle[3] = false;
      }
    }
  }

  if (ableToCastle != old) {
    movesPlayed.push(["castlingRights", old]);
  }
}

// checks for castling moves
function findCastleMoves() {
  let vectors = [];
  //checks each direction (0 = kingside, 1 = queenside) for castling rights and if the castle is possible/legal
  for (let i = 0; i < 2; i++) {
    let direction = 1 - 2 * i;
    if (
      ableToCastle[0] &&
      castleChecker(kingPositions[turn], direction, i + 3)
    ) {
      for (let j = 2; j < i + 4; j++) {
        let vector = [flipped * j * direction, 0, "castle"];
        vectors.push(vector);
      }
    }
  }
  return vectors || false;
}

// used to find castle moves
function castleChecker(sq, side, squaresToCheck) {
  let canCastle = true;
  for (let i = 1; i < squaresToCheck; i++) {
    let vector = [flipped * i * side, 0];
    if (
      colourInSquare(sq, vector) != "empty" ||
      inCheck(vectorToSquare(sq, vector), turn)
    ) {
      canCastle = false;
    }
  }
  return canCastle;
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//----------------------------Move Logic-------------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

// finds legal moves of current piece
function hasLegalMoves(currentSquare) {
  legalMoves = [];
  let possibleMoves = [];
  //runs the right move logic for each piece, gives an array of possible (may not be legal) moves
  switch (pieceInSquare(currentSquare)) {
    case "pawn":
      possibleMoves = pawn(currentSquare);
      break;
    case "knight":
      possibleMoves = knight(currentSquare);
      break;
    case "bishop":
      possibleMoves = bishopAndRook(currentSquare, "bishop");
      break;
    case "rook":
      possibleMoves = bishopAndRook(currentSquare, "rook");
      break;
    case "queen":
      possibleMoves = queen(currentSquare);
      break;
    case "king":
      possibleMoves = king(currentSquare);
      break;
  }
  //returns false if there's no moves, returns an array of legal moves if there are some
  return possibleMoves && legalChecker(currentSquare, possibleMoves);
}

//plays all possible moves and determines if they're legal
function legalChecker(currentSquare, possibleMoves) {
  for (let move of possibleMoves) {
    //if move is a not castle, all checks have been done
    if (move[2] == "c") {
      legalMoves.push(move);
    } else {
      //find original square
      let original = document.getElementById(move[0] + move[1]);
      //saves all useful data
      let temp1 = currentSquare.innerHTML;
      let temp2;
      let temp3;
      if (original.innerHTML) {
        temp2 = original.innerHTML;
      }
      //does move
      original.innerHTML = currentSquare.innerHTML;
      currentSquare.innerHTML = "";
      //temporarily updates global king positions
      if (pieceInSquare(original) == "king") {
        temp3 = kingPositions["white"] + kingPositions["black"];
        kingPositions[turn] = original.id;
      }
      //checks if move is legal
      if (isChecked() != turn && isChecked() != "both") {
        legalMoves.push(move);
      }
      //undoes temp move
      currentSquare.innerHTML = temp1;
      if (temp2) {
        original.innerHTML = temp2;
      } else {
        original.innerHTML = "";
      }
      if (temp3) {
        kingPositions["white"] = temp3[0] + temp3[1];
        kingPositions["black"] = temp3[2] + temp3[3];
      }
    }
  }
  return legalMoves != false;
}

// finds possible moves of a pawn
function pawn(currentSquare) {
  let moveVectors = [];
  let oppositePawnColour = "black";
  let pawnDirection = flipped;
  if (colourInSquare(currentSquare) == "black") {
    oppositePawnColour = "white";
    pawnDirection *= -1;
  }
  //if square ahead is empty can move into it
  if (colourInSquare(currentSquare, [0, pawnDirection]) == "empty") {
    moveVectors.push([0, pawnDirection]);
    //if square two ahead is empty and the pawn is on the starting pawn rank, can move and make that enpassantable
    const startingPawnRank = 4.5 - 2.5 * pawnDirection;
    if (
      currentSquare.id[1] == startingPawnRank &&
      colourInSquare(currentSquare, [0, pawnDirection * 2]) == "empty"
    ) {
      moveVectors.push([0, pawnDirection * 2, "enPassant"]);
    }
  }
  for (i = 0; i < 2; i++) {
    //i = 0 = left, 1 = right, checks for any diagonal captures or en passant
    if (
      colourInSquare(currentSquare, [i * 2 - 1, pawnDirection]) &&
      (colourInSquare(currentSquare, [i * 2 - 1, pawnDirection]) ==
        oppositePawnColour ||
        enPassant ==
          vectorToSquare(currentSquare.id, [i * 2 - 1, pawnDirection]))
    ) {
      moveVectors.push([i * 2 - 1, pawnDirection]);
    }
  }
  return vectorsToMoves(currentSquare.id, moveVectors);
}

// finds possible moves of a knight
function knight(currentSquare) {
  let moveVectors = [];
  // checks in all directions for a possible knight move
  for (const moves of knightMoves) {
    if (
      colourInSquare(currentSquare, moves) &&
      colourInSquare(currentSquare, moves) != turn
    ) {
      moveVectors.push(moves);
    }
  }
  return vectorsToMoves(currentSquare.id, moveVectors);
}

// finds all possible bishop and rook moves
function bishopAndRook(currentSquare, piece) {
  let moveVectors = [];
  //goes through the four directions, diagonals for bishop and orthogonal for rooks
  for (let i = 0; i < 4; i++) {
    let x;
    let y;
    if (piece == "bishop") {
      x = Math.floor(i / 2) * 2 - 1;
      y = (i % 2) * 2 - 1;
    } else {
      x = ((i + 1) % 2) * (i - 1);
      y = (i % 2) * (i - 2);
    }
    //iterates over moves in that direction until it reaches something
    for (let j = 1; j < 8; j++) {
      let vector = [x * j, y * j];
      if (
        colourInSquare(currentSquare, vector) &&
        colourInSquare(currentSquare, vector) != turn
      ) {
        moveVectors.push(vector);
      }
      //if there's something in the square or it's the edge of the board, then stop looking this direction
      if (
        (colourInSquare(currentSquare, vector) &&
          colourInSquare(currentSquare, vector) != "empty") ||
        !colourInSquare(currentSquare, vector)
      ) {
        break;
      }
    }
  }
  return vectorsToMoves(currentSquare.id, moveVectors);
}

// finds all possible queen moves (bishop + rook)
function queen(currentSquare) {
  return bishopAndRook(currentSquare, "bishop").concat(
    bishopAndRook(currentSquare, "rook")
  );
}

// finds all possible king moves
function king(currentSquare) {
  let moveVectors = [];
  for (let x = -1; x < 2; x++) {
    for (let y = -1; y < 2; y++) {
      let vector = [x, y];
      if (
        colourInSquare(currentSquare, vector) &&
        colourInSquare(currentSquare, vector) != turn &&
        !inCheck(
          vectorToSquare(currentSquare.id, vector),
          colourInSquare(currentSquare)
        )
      ) {
        moveVectors.push(vector);
      }
    }
  }
  if (!isChecked()) {
    let castleVectors = findCastleMoves();
    if (castleVectors) {
      for (const castleVector of castleVectors) {
        moveVectors.push(castleVector);
      }
    }
  }
  return vectorsToMoves(currentSquare.id, moveVectors);
}

// checks for an attack on a square
function inCheck(currentSquare, colour) {
  currentSquare = document.getElementById(currentSquare);
  let oppositeColour = "black";
  let pawnDirection = flipped;
  if (colour == "black") {
    oppositeColour = "white";
    pawnDirection *= -1;
  }

  let pieceCheck = "bishop";
  //checks for bishop (0) and rook (1) like checks
  for (let i = 0; i < 2; i++) {
    let possibleChecks = bishopAndRook(currentSquare, pieceCheck);
    for (const move of possibleChecks) {
      if (
        colourInSquare(move) &&
        colourInSquare(move) == oppositeColour &&
        (pieceInSquare(move) == pieceCheck || pieceInSquare(move) == "queen")
      ) {
        return true;
      }
    }
    pieceCheck = "rook";
  }

  let knightMoves = knight(currentSquare);
  for (const move of knightMoves) {
    if (
      colourInSquare(move) &&
      colourInSquare(move) == oppositeColour &&
      pieceInSquare(move) == "knight"
    ) {
      return true;
    }
  }
  //checks for pawn checks
  for (let i = 0; i < 2; i++) {
    let pawnMove = [i * 2 - 1, pawnDirection];
    if (
      colourInSquare(currentSquare, pawnMove) &&
      colourInSquare(currentSquare, pawnMove) == oppositeColour &&
      pieceInSquare(currentSquare.id, pawnMove) == "pawn"
    ) {
      return true;
    }
  }
  //checks for other king
  for (let x = -1; x < 2; x++) {
    for (let y = -1; y < 2; y++) {
      let vector = [x, y];
      if (
        colourInSquare(currentSquare, vector) &&
        colourInSquare(currentSquare, vector) == oppositeColour &&
        pieceInSquare(currentSquare, vector) == "king"
      ) {
        return true;
      }
    }
  }
  return false;
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//-------------------Square checks and vector logic--------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

// finds what piece is in a square, can have a vector applied
function pieceInSquare(currentSquare, vector) {
  currentSquare = elementInSquare(currentSquare, vector);
  if (!currentSquare) {
    return false;
  }
  if (!currentSquare.innerHTML) {
    return "empty";
  } else {
    return currentSquare.firstElementChild.dataset.piece;
  }
}

// finds what color piece is in a square, can have a vector applied
function colourInSquare(currentSquare, vector) {
  currentSquare = elementInSquare(currentSquare, vector);
  if (!currentSquare) {
    return false;
  }
  if (!currentSquare.innerHTML) {
    return "empty";
  } else if (currentSquare.firstElementChild.getAttribute("class") == "black") {
    return "black";
  } else {
    return "white";
  }
}

//applies vector and finds the actual element in the square
function elementInSquare(currentSquare, vector) {
  if (vector) {
    if (vectorToSquare(currentSquare, vector)) {
      currentSquare = vectorToSquare(currentSquare, vector);
    } else {
      return false;
    }
  }
  if (typeof currentSquare == "string") {
    currentSquare = document.getElementById(currentSquare);
  }
  return currentSquare;
}

// turns a list of vectors into a list of possible moves
function vectorsToMoves(currentSquare, vecs) {
  let moves = [];
  for (const vector of vecs) {
    moves.push(vectorToSquare(currentSquare, vector));
  }
  return moves;
}

// turns a vector into a square, checks if it is on the board
function vectorToSquare(currentSquare, vector) {
  if (typeof currentSquare != "string") {
    currentSquare = currentSquare.id;
  }
  //applies vectors to the current square
  let x = currentSquare.charCodeAt(0) + vector[0];
  let y = Number(currentSquare[1]) + vector[1];
  //if the move is on the board, return it
  if (x > 96 && x < 105 && y > 0 && y < 9) {
    x = String.fromCharCode(x);
    if (vector.length > 2) {
      if (vector[2] == "castle") {
        return x + y + "c";
      }
      return x + y + "e";
    }
    return x + y;
  } else {
    return false;
  }
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//--------------------------Computer Moves-----------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

function randomComputerMove() {
  if (!endOfGame) {
    let pieces = document.querySelectorAll("table svg." + turn);
    let piece = pieces[Math.floor(Math.random() * pieces.length)];
    let pieceSquare = piece.parentElement;
    highlightSquares(pieceSquare);
    if (legalMoves.length == 0) {
      randomComputerMove();
      return;
    }
    previouslySelectedSquare = pieceSquare;
    let move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    let moveSquare = document.getElementById(move[0] + move[1]);
    Move(moveSquare);
  }
}

//---------------------------------------------------------------------
//---------------------------------------------------------------------
//-----------------------Extra button presses--------------------------
//---------------------------------------------------------------------
//---------------------------------------------------------------------

// promotes a pawn
function promoteTo(sq) {
  //updates pawn to new piece
  let newHTML = sq.innerHTML;
  //find the last pawn move (other than flips)
  let movesAgo = lastPawnMove();
  let move = movesPlayed[movesPlayed.length - movesAgo];
  //checks for any taken pieces
  let taken = "";
  if (move.length > 2) {
    taken = move[2];
  }
  //updates undo move
  movesPlayed[movesPlayed.length - movesAgo] = [
    move[0],
    move[1],
    taken,
    "promotion",
    document.getElementById(promotionSquare).innerHTML,
  ];
  document.getElementById(promotionSquare).innerHTML = newHTML;
  document.querySelector(".promotion-popup").style.transform =
    "translateX(110%)";
  moveSwap();
  endOfGameChecks(promotionSquare);
  clearHighlights();
  promotionSquare = false;

  //ends move
  previouslySelectedSquare = false;
  if (playing == "computer" && turn != playFirst) {
    randomComputerMove();
  }
  return true;
}

//returns last pawn move
function lastPawnMove() {
  let i = 0;
  do {
    i++;
  } while (typeof movesPlayed[movesPlayed.length - i] == "string");
  return i;
}

// undoes the most recent move
function undo(fromReset) {
  //if no move has been played, no need to undo
  if (movesPlayed.length == 0) {
    return;
  }

  //removes en passant
  enPassant = 0;
  //get the last move
  let last = movesPlayed[movesPlayed.length - 1];
  if (last[0] == "castlingRights") {
    //if the last move is updating castling rights, revert them
    ableToCastle[0] = last[1][0];
    ableToCastle[1] = last[1][1];
    ableToCastle[2] = last[1][2];
    ableToCastle[3] = last[1][3];
    movesPlayed.pop();
    last = movesPlayed[movesPlayed.length - 1];
  }
  //if the last move was a board flip
  if (last == "flip") {
    if (movesPlayed.length == 1) {
      //if it's the only move just clear it
      movesPlayed.pop();
    } else {
      if (
        movesPlayed[movesPlayed.length - 2] &&
        movesPlayed[movesPlayed.length - 2] == "flip"
      ) {
        //if it'a two flips in a row they cancel
        movesPlayed.pop();
        movesPlayed.pop();
        undo();
      } else {
        //flip board, undo move, un-flip board
        flipBoard(true);
        movesPlayed.pop();
        undo();
        flipBoard();
      }
    }
  } else {
    //removes it as a previously played position, swaps visuals
    pastPositions.pop();
    let from = document.getElementById(last[0]);
    let to = document.getElementById(last[1]);
    from.innerHTML = to.innerHTML;
    to.innerHTML = last[2];
    //reduces 50 move rule by 1 if it's more than 0
    if (fiftyMoveRule > 0) {
      fiftyMoveRule--;
    }
    //updates global king position if it was a king move
    if (pieceInSquare(from) == "king") {
      kingPositions[colourInSquare(from)] = from.id;
    }
    if (last[3] == "enPassant") {
      //puts the enpassanted pawn back
      to.innerHTML = "";
      document.getElementById(last[4]).innerHTML = last[2];
      enPassant = last[1];
    } else if (last[3] == "promotion") {
      //puts the promoted pawn back
      to.innerHTML = last[2];
      from.innerHTML = last[4];
    } else if (last[3] == "castle") {
      //undoes a castle
      to.innerHTML = "";
      from = document.getElementById(last[4]);
      to = document.getElementById(last[2]);
      from.innerHTML = to.innerHTML;
      to.innerHTML = "";
    }
    //removes move and checks for en passant
    movesPlayed.pop();
    checkForEnPassant();
    previouslySelectedSquare = 0;
    //swaps move if a promotion is not being chosen, gets rid of menu and promotion state if in the middle of choice
    if (!promotionSquare) {
      moveSwap();
    } else {
      document.querySelector(".promotion-popup").style.transform =
        "translateX(110%)";
      promotionSquare = false;
    }
    //clears highlights
    clearHighlights();
    if (playing == "computer" && turn != playFirst) {
      if (movesPlayed.length < 2 && !fromReset) {
        playGame();
      } else{
        undo();
      }
    }
  }
}

// checks if a square needs to be enpassantable
function checkForEnPassant() {
  //if there is a last move
  if (movesPlayed.length > 0) {
    let last = movesPlayed[movesPlayed.length - 1];
    //if last is not a flip or special move
    if (last != "flip" && last.length == 3) {
      let from = last[0];
      let to = last[1];
      let toPiece = pieceInSquare(document.getElementById(to));
      //if a pawn has moved two squares, set the square in between to be enpassantable
      if (toPiece == "pawn" && Math.abs(from[1] - to[1]) == 2) {
        enPassant = from[0] + (Number(from[1]) + Number(to[1])) / 2;
      }
    }
  }
}

// resets the board
function reset() {
  while (movesPlayed.length > 0) {
    undo(true);
  }
  playGame();
}

//flips the board
function flipBoard(add) {
  //some board flips don't need to be saved (when undoing)
  if (!add) {
    movesPlayed.push("flip");
  }
  //flips specific square values that are saved
  kingPositions = {
    white: flipCoords(kingPositions["white"]),
    black: flipCoords(kingPositions["black"]),
  };
  if (promotionSquare) {
    promotionSquare = flipCoords(promotionSquare);
  }
  if (enPassant) {
    enPassant =
      flipCoords(enPassant) + enPassant.substring(2 + enPassant.length);
  }
  //updates the flip direction
  flipped *= -1;
  //changes coordinates
  if (coordinates) {
    numberCoords.forEach(function (node) {
      let num = 9 - node.getAttribute("numberCoord");
      node.setAttribute("numberCoord", num);
    });
    letterCoords.forEach(function (node) {
      let letter = String.fromCharCode(
        201 - node.getAttribute("letterCoord").charCodeAt(0)
      );
      node.setAttribute("letterCoord", letter);
    });
  }
  //visually flips pieces around
  for (let i = 0; i < 8; i++) {
    for (let j = 1; j < 5; j++) {
      let x = String.fromCharCode(97 + i);
      let coord1 = document.getElementById(x + j);
      let coord2 = document.getElementById(flipCoords(x + j));
      let temp = coord1.innerHTML;
      coord1.innerHTML = coord2.innerHTML;
      coord2.innerHTML = temp;
    }
  }
  clearHighlights();
}

//flips the coordinate of a given value
function flipCoords(coord) {
  return String.fromCharCode(201 - coord.charCodeAt(0)) + (9 - coord[1]);
}

//TODO:
// piece/point counting
// timer
// ui
// settings - flip each move, highlight moves, show coords (inside/outside), drag pieces
