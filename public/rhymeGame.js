var fs = require("fs");
//setup dictionary file
var dictionary = "dictionarymain.txt";
//setup dictionary file
var abcdef = "abcdef.txt";
//setup soundalike file
var soundalike_file = "soundalikes.txt";
//setup simplified dictionary file
var simple_dictionary = "simpledictionary.txt";

var vowels = new Array('A', 'E', 'I', 'O', 'U');
var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

var CURRENTDICTIONARY = "";
var SOUNDALIKES = "";
var ALPHABET_ARRAY = new Array();
var SIMPLEDICTIONARY = "";
var firstA = 0;
try {
  fileBuffer = fs.readFileSync(dictionary, "utf-8");
  CURRENTDICTIONARY = fileBuffer.split("\n");
  var dictionary_length = CURRENTDICTIONARY.length;
  var alphabetLength = 27;
  for (var i = 0; i < dictionary_length; i++) {
    for (var j = 0; j < alphabetLength; j++) {
      if(CURRENTDICTIONARY[i].startsWith(alphabet[j])){
        //log the position of the last instance of letter in file
        ALPHABET_ARRAY[j] = [CURRENTDICTIONARY[i].charAt(0), i];
        if (j==0 && firstA==0){
          firstA = i;
        }
      }
    }
  }
  console.log("firstA="+firstA);
}
catch(err) {
  console.log("Unable to parse dictionary and alphabet index: " + err);
}
try {
  fileBuffer = fs.readFileSync(soundalike_file, "utf-8");
  SOUNDALIKES = fileBuffer.split("\n");
}
catch(err) {
  console.log("Unable to parse soundalike file: " + err);
}
try {
  fileBuffer = fs.readFileSync(simple_dictionary, "utf-8");
  SIMPLEDICTIONARY = fileBuffer.split("\n");
}
catch(err) {
  console.log("Unable to parse simplified dictionary file");
}
//FINAL CHECK THAT EVERYTHING WORKED
if (CURRENTDICTIONARY!=""&&ALPHABET_ARRAY!=""&&SOUNDALIKES!=""&&SIMPLEDICTIONARY!=""){
  console.log("All files buffered succesfully\n");
  filesBuffered=true;
}

for (var i=8170; i < 8470; i++){
  console.log("INPUT******"+getWord(i));
  //console.log("OUTPUT*****"+searchHomophones(i));
  searchHomophones(i);
}

//function to search for a homophone rhyme in a slightly more interesting way and return a string
function searchHomophones(dictionaryIndex){
  var string = findHomophones(dictionaryIndex, 0);
  if (string!=""){
    var arrayBuffer = new Array();
    string = string.slice(1);
    arrayBuffer = string.split("*");
    arrayBuffer = arrayBuffer[0].split(" ");
    var tmpString = "";
    var outputArray = new Array();
    for (var i = 0; i < arrayBuffer.length; i++){
      if (arrayBuffer[i] == ""){
        arrayBuffer = arrayBuffer.splice(i, 1);
      } else {
        var outputBufRhymes = new Array();
        var thisIndex = findTheLine(arrayBuffer[i]);
        var thisWord = getWord(thisIndex);
        var thisSyllableCount = countSyllables(thisIndex);
        if (thisWord !=0){

          var phonemeBuffer = getPhonemes(thisIndex, false);
          outputBufRhymes = searchPhonemes(phonemeBuffer, thisSyllableCount);
          outputBufRhymes = getWord(outputBufRhymes[Math.floor(Math.random() * outputBufRhymes.length)]);
          outputArray[i] = outputBufRhymes;
        }
      }
    }
    console.log("INPUT="+getWord(dictionaryIndex));
    console.log("string was="+string);
    console.log("outputArray="+outputArray);
    if (outputArray.length > 1){
      console.log("got one="+outputArray);
      return outputArray;
    } else return 0;
  } else return 1;
}

//function to find words or strings of words that sound the same
function findHomophones(i, startingIndex){
  //console.log("Calling findHomophones on "+getWord(i));
  var thisLine = CURRENTDICTIONARY[i].split("  ");
  thisLine[1] = thisLine[1].replace(/1/g, "0");
  thisLine[1] = thisLine[1].replace(/2/g, "0")+"|";
  thisLine[1] = thisLine[1].slice(0, thisLine[1].length-1);
  var thatPhoneme = new String();
  var thisPhoneme = thisLine[1].toString();
  //console.log("searching for "+thisLine[1]+" from "+startingIndex+" to "+CURRENTDICTIONARY.length);
  var solved = false;
  var failed = false;
  var outputArray = new Array();
  var parent = new Array();
  //compare phonemes
  var counter = startingIndex;
  //console.log("searching for|"+thisPhoneme);
  while (!failed){
    //console.log("called from the top");
    solved=false;
    //console.log("starting search");
    for (var k = counter; k < CURRENTDICTIONARY.length-1; k++) {
      if (k==i){
        k++;
      }
      //console.log("k is "+k);
      var thatLine = CURRENTDICTIONARY[k].split("  ");
      thatLine[1] = thatLine[1].replace(/1/g, "0");
      thatLine[1] = thatLine[1].replace(/2/g, "0");
      thatLine[1] = thatLine[1].slice(0, thatLine[1].length-1);
      thatPhoneme = thatLine[1]; //OR

      //console.log("checking at|"+thatPhoneme);
      if (thisPhoneme.startsWith(thatPhoneme)){
        //console.log("found="+thisPhoneme);
        //console.log("thatt="+thatPhoneme);
        //console.log("at "+k);
        parent.push(getWord(k).toLowerCase());
        //console.log("found="+getWord(k));
        thisPhoneme = thisPhoneme.slice(thatPhoneme.length+1);//L D EH G
        //console.log("sliced to="+thisPhoneme);
        if (thisPhoneme.length==0){
          console.log("solved="+getWord(i));
          solved=true;
          var tmp = findHomophones(i, k+1);
          if (tmp != ""){
            parent.push(tmp.toLowerCase());
            //console.log("pushing tmp "+tmp);
          }
          //console.log("parent="+parent);
          outputArray.push("*"+parent);
          //console.log("|"+parent+"|");
          console.log("returning="+outputArray.toString().replace(/,/g, " "))
          return outputArray.toString().replace(/,/g, " ");
        }
      }
    }
    if (k==CURRENTDICTIONARY.length-1){
      //console.log("got to the end of the dictionary without solving autofailing");
      failed = true;
    }
    //console.log("failed, restarting");
  }
  if (!solved){
    //console.log("not solved");
    //return "("+outputArray.toString()+")";
    return "";
  }
}

//function to take in an index from the dictionary and return an array of results
function fuzzyRhymes(dictionaryIndex){
  //console.log("fuzzyRhymes called on "+dictionaryIndex);
  var indexArray = new Array();
  var syllableArray = new Array();
  var phonemes = getPhonemes(dictionaryIndex, false).slice(1);
  var ordinarySearchResults = searchPhonemes(phonemes, 0);
  var vowelCount = countSyllables(dictionaryIndex);
  var fuzzyString = SIMPLEDICTIONARY[dictionaryIndex];
  //console.log("fuzzy logic is "+fuzzyString);
  for (var i = 0; i < SIMPLEDICTIONARY.length; i++){
    var compareString = SIMPLEDICTIONARY[i];
    if (compareString.endsWith(fuzzyString)){
      if (ordinarySearchResults.includes(i)){
        //skip don't add it to this array
      } else {
        indexArray.push(i);
      }
    }
  }
  if (indexArray.length == 0){
    return "";
  }
  //console.log("finished searching");
  return indexArray;
}

function getWord(dictionaryIndex){
  if (dictionaryIndex != -1) {
    var gotString = CURRENTDICTIONARY[dictionaryIndex];
    var theWord = gotString.split(" ");
    if (theWord[0].endsWith(")")){
      theWord[0] = theWord[0].slice(0, theWord[0].length-3);
    }
    return theWord[0];
  } else {
    return 0;
  }
}

//FUNCTION TO FIND THE LINE WORD IN THE DICTIONARY USING OPTIMISED STARTING POINT
function findTheLine(queryWord){
  var searchWord = queryWord.toUpperCase();
  var letter = searchWord.charAt(0);
  if(!alphabet.includes(letter)){
    for (var i =0; i < CURRENTDICTIONARY.length; i++){
      if (CURRENTDICTIONARY[i].startsWith(queryWord + "  ")){
        return i;
      }
    }
    return -1;
  }
  var dictionaryIndex = -1;
  for(var i = 0; ALPHABET_ARRAY[i][0] != letter; i++){
  }
  if(letter == "A"){
    var letterLeftIndex = 0;
  }
  else {
    var letterLeftIndex = (ALPHABET_ARRAY[i-1][1]) + 1;
  }
  var letterRightIndex = ALPHABET_ARRAY[i][1];
  for (var j = letterLeftIndex; j < letterRightIndex; j++){
    if (CURRENTDICTIONARY[j].startsWith(searchWord + "  ")){

      //console.log("Found the line "+CURRENTDICTIONARY[j]+" @ " + j);
      dictionaryIndex = j;
    }
  }
  if(dictionaryIndex != -1){
    return dictionaryIndex;
  } else {
    console.log("word not found in dictionary, returning: -1");
    messageResponse = "I don't know the word "+searchWord.toLowerCase();
    return -1;
  }
}

//takes in a phoneme string and exports an array including every permutation of it
//broken down by syllable, backwards
function breakdownPhonemes(phonemeBuffer){
  var wordEndings = new Array();
  for (var k = 0, vowelCount = 0, phoLen = phonemeBuffer.length-1; k < phoLen; k++){
    //set char to the first letter of the phoneme
    var char = phonemeBuffer[phoLen-k].charAt(0);
    //compare char to every vowel
    for (var j = 0, vowLen=vowels.length; j < vowLen; j++){
      //if we find a vowel at the next position down, log it as the next relevant one
      if (char == vowels[j]){
        var nextVowel = phoLen-k;
        vowelCount++
        //now stick the rest of the vowels back into the buffer
        var tempString = "";
        for (var l = nextVowel, restLen = phonemeBuffer.length; l < restLen; l++){
          tempString = tempString +" "+phonemeBuffer[l];
          wordEndings[vowelCount-1] = tempString;
        }
      }
    }
  }
  return wordEndings;
}

//deeper search function that returns more complex rhymes as an array
//uses searchPhonemes
function complexSearch(dictionaryIndex){
  var syllableArray = new Array();
  var phonemeBuffer = new Array();
  var wordEndings = new Array();
  var COMPLEXOUTPUT = new Array();
  var FINALOUTPUT = new Array();
  var theWord = getWord(dictionaryIndex);
  // first get the phonemes into an array
  syllableArray = getPhonemes(dictionaryIndex, false);
  phonemeBuffer = syllableArray.split(" ");
  //console.log("phonemeBuffer is "+phonemeBuffer);
  wordEndings = breakdownPhonemes(phonemeBuffer);
  //console.log("breakdownPhonemes "+wordEndings);
  var vowelCount = wordEndings.length;
  //actual searching now
  //for however many vowels we found (syllables), down to the first vowel
  for (var j = vowelCount; j > 0; j--){
    //once we are on the last syllable, search for exact matches only
    if (j==1){
      var tempArray = searchPhonemes(wordEndings[j-1], 1);
      if (tempArray.length!=0){
        COMPLEXOUTPUT = COMPLEXOUTPUT.concat(tempArray);
      }
    } else {
      //starting at the maximum syllable value and working back to the current syllable
      //for (var k = maxSyllables; k>=j; k--){
      //append all the words that rhyme but have more syllables than the current phonemeString
      var tempArray = searchPhonemes(wordEndings[j-1], 0);
      if (tempArray.length!=0){
        COMPLEXOUTPUT = COMPLEXOUTPUT.concat(tempArray);
      }
      //}
    }
  }
  //console.log(theWord+" complex search complete");
  return COMPLEXOUTPUT;
}

//function to turn an array of indexes into a more presentable 2d array of words and syllable counts
//includes duplicate handling
function indexAndSortInto2d(indexArray, dictionaryIndex){
  //init an empty 2d array the only way I know how :/
  var FINALOUTPUT = (function(FINALOUTPUT){ while(FINALOUTPUT.push([]) < 2); return FINALOUTPUT})([]);
  //for every item in the words-that-rhyme array
  for (var i=0; i<indexArray.length; i++){
    var thisWord = getWord(indexArray[i]);
    var theWord = getWord(dictionaryIndex);
    //as long as the word isn't the same as the original search term
    if (thisWord != theWord){
      thisWord = thisWord.toLowerCase();
      //as long as this isn't already in our list, save it and it's syllables to arrays
      if (!FINALOUTPUT.includes(thisWord)){
        //turn them back into words in a new array
        FINALOUTPUT[0].push(thisWord);
        //turn them into syllable counts in a new array
        FINALOUTPUT[1].push(countSyllables(indexArray[i]));
      }
    }
  }
  //now reorder everything in the 2d array by the number of syllables
  //this method seems somewhat convoluted, but it works:/
  //what I'm doing is turning [1,2,3][one,two,three] into [1,one][2,two][3,three], sorting and then turing it back again
  for (var j = 0, list = []; j < FINALOUTPUT[0].length; j++) {
    list.push({'word': FINALOUTPUT[0][j], 'syllable': FINALOUTPUT[1][j]});
  }
  list.sort(function(a, b) {
    return ((a.syllable > b.syllable) ? -1 : ((a.syllable == b.syllable) ? 0 : 1));
  });
  for (var k = 0; k < list.length; k++) {
    FINALOUTPUT[0][k] = list[k].word;
    FINALOUTPUT[1][k] = list[k].syllable;
  }
  console.log("All indexes sorted, syllables counted and sorted, and indexes transformed into words")
  return FINALOUTPUT;
}

//function to search for phonemeString matches
//returns an array of indexes
//if syllableLength is zero, return all matches
function searchPhonemes(phonemeString, syllableLength){
  var arrayBin = new Array();
  var RHYMEOUTPUT = new Array();
  var matchesFound = 0;
  //search the dictionary, for every item in it
  for (var iX = 0, n = CURRENTDICTIONARY.length; iX < n; iX++) {
    //if the rhyme is a match
    if (CURRENTDICTIONARY[iX].endsWith(phonemeString)) {
      //store the word in a temp string array, then use the 0th element
      arrayBin = CURRENTDICTIONARY[iX].split("  ");
      arrayBin[0] = arrayBin[0].toLowerCase()
      //handle zero on syllable length, return everything
      if (syllableLength == 0){
        var sylCount = 0;
      } else {
        var sylCount = countSyllables(iX);
      }
      if (sylCount == syllableLength) {
        //if the found word ends in ")"
        if (arrayBin[0].endsWith(")")) {
          //add the word to the list, but remove the brackets from the spelling info
          var tmpLen = arrayBin[0].length-3;
          arrayBin[0] = arrayBin[0].slice(0, tmpLen);
        }
        //
        if (arrayBin[0]==getWord[iX-1]) {
          console("word already found, skipping");
        } else {
          //otherwise save the word to the output array
          RHYMEOUTPUT[matchesFound]=iX;
          matchesFound++;
        }
      }
    }
  }
  //console.log("Searching for "+phonemeString+" of length "+syllableLength+" complete. Searched "+iX+" entries and found "+matchesFound+" rhyme(s).");
  return RHYMEOUTPUT;
}
//function to take in a word and spit out the rhyming phoneme data as a string
function getPhonemes(dictionaryIndex, all){
  var theLine = CURRENTDICTIONARY[dictionaryIndex];
  var phonemeString ="";
  //trim off the spelling and spacing from the string
  var tempPHONEMES = theLine.slice(getWord(dictionaryIndex).length+2);
  //for the found word, make an array containing each phoneme sound
  var phonemes = tempPHONEMES.split(" ");
  if (all){
    for (var i = 0; i < phonemes.length; i++){
      phonemeString = phonemeString+" "+phonemes[i];
    }
    return phonemeString;
  } else {
    //detect the first letter of phonemes sounds until you find a vowel
    var firstVowel = 0;
    var char = "";
    //check the first character of each phoneme, backwards
    for (var i = 0, phoLen = phonemes.length; i < phoLen; i++){
      //set char to the first letter of the phoneme
      char = phonemes[phoLen-i-1].charAt(0);
      //compare char to every vowel
      for (var j = 0, vowLen=vowels.length; j < vowLen; j++){
        //if we find a vowel at character 0, log the position as the first relevant one
        if (char == vowels[j]){
          firstVowel = phoLen-i-1;
        }
      }
    }
    //code below constucts a string of phonemes to be compared to the rest of the dictionary
    //the current logic is that it goes from the first vowel
    phoLen = phonemes.length-firstVowel;
    //construct our phoneme string
    for (var i = firstVowel; i < phonemes.length; i++){
      phonemeString = phonemeString+" "+phonemes[i];
    }
    return phonemeString;
  }
}
//function to calculate how many syllables there are in a word and return that number
function countSyllables(dictionaryIndex) {
  if (dictionaryIndex != -1) {
    var countWord = getWord(dictionaryIndex);
    var syllablesFound = 0;
    var char = "";
    //trim off the spelling and spacing from the string
    var tempPHONEMES = CURRENTDICTIONARY[dictionaryIndex].slice(countWord.length+2);
    //for the found word, make an array containing each phoneme sound
    var phonemes = tempPHONEMES.split(" ");
    for (var i = 0, phoLen = phonemes.length; i < phoLen; i++){
      //set char to the first letter of the phoneme
      char = phonemes[phoLen-i-1].charAt(0);
      //if the vowels array includes this character
      if(vowels.includes(char)){
        syllablesFound++;
      }
    }
    return syllablesFound;
  } else {
    return 0;
  }
}
//function to take in a 2d array of 0[words] with their 1[syllable count], and return a nicely structured string for sending to the user
function make2dArrayPresentable(twoDarray, theWord){
  var tmp = "";
  //if there are more than 25 results trim to 25, for simplicity's sake for now
  if (twoDarray[0].length>=40){
    tmp = tmp +"The current limit I can show you is 40\n"
    twoDarray[0].length=40; //[0] is words
    twoDarray[1].length=40; //[1] is syllables
  }
  //now, figure out how many arrays (individual syllable sets) we need
  var currentSyllable = twoDarray[1][0];
  var req = 1;
  for (var i = 0; i<twoDarray[0].length; i++){
    if (twoDarray[1][i]!=currentSyllable){
      req++;
      currentSyllable=twoDarray[1][i];
    }
  }
  //init an empty set of arrays for the sorting process
  var sortedArray = (function(sortedArray){ while(sortedArray.push([]) < req); return sortedArray})([]);
  currentSyllable = twoDarray[1][0];
  var currentIndex = 0;
  sortedArray[0][0]=currentSyllable;
  //for every item in the 0th array
  for (var i = 0; i< twoDarray[0].length; i++){
    //if the syllable value in the next position of the array is the same
    if (currentSyllable == twoDarray[1][i]){
      //push the word
      sortedArray[currentIndex].push(twoDarray[0][i]);
    } else {
      //increase the index and push the syllable count and the word
      currentIndex++;
      currentSyllable = twoDarray[1][i];
      sortedArray[currentIndex].push(twoDarray[1][i]);
      sortedArray[currentIndex].push(twoDarray[0][i]);
    }
  }
  for (var i = 0; i < req; i++){
    tmp = tmp +"\nWords that match "+sortedArray[i][0]+" syllables:\n";
    for (var j=1; j < sortedArray[i].length; j++){
      tmp = tmp + sortedArray[i][j]+", ";
    }
    tmp = tmp.slice(0, tmp.length-2);
    tmp = tmp+"\n";
  }
  console.log("Re-sort and parse to string complete");
  return tmp;
}
//function to return an array of n different random elements from an array
function randomlyReturn(inputArray, elements){
  var randArray = [""];
  randArray[0] = inputArray[Math.floor(Math.random() * inputArray.length)];
  var rBuffer = "";
  if (inputArray.length >= elements){
    for (var i=1; i < elements; i++){
      var rand =  inputArray[Math.floor(Math.random() * inputArray.length)];
      //if the array already includes the newly randomised item, re-roll
      for (var j=0; randArray.includes(rand); j++){
        rand =  inputArray[Math.floor(Math.random() * inputArray.length)];
      }
      randArray.push(rand);
    }
    //console.log("Finished processing array, randomly returning: "+randArray);
  } else {
    //  console.log("less than "+elements+" rhymes found, returning all rhymes");
    if (inputArray.length==0){
      //console.log("no rhymes found, abort");
    } else {
      //basically, just return the original
      return inputArray;
    }
  }
  return randArray;
}

function randomRhymes(dictionaryIndex, elements){
  var inputArray = new Array();
  var arrayBuffer = complexSearch(dictionaryIndex);
  if (arrayBuffer.length!==0){
    var randArray = randomlyReturn(arrayBuffer, elements);
    return randArray;
  } else {
    messageResponse = "I don't know any words that rhyme sorry";
    return "UNKNOWN";
  }
}
