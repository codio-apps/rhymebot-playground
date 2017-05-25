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
      }
    }
  }
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
  console.log("All files buffered succesfully");
  filesBuffered=true;
}

var simpleOutput = new Array();
var splitSoundalikes = new Array();
var itemsChanged = 0;
//for every line in the dictionary
for (var i = 0; i < CURRENTDICTIONARY.length; i++){
  var changes=0;
  var tmpString = getPhonemes(i, false).slice(1);
  var tmpArray = tmpString.split(" ");
  var arrayBuffer = new Array();
  //for every line in soundalikes.txt
  for (var j = 0; j < SOUNDALIKES.length-1; j++){
    splitSoundalikes = SOUNDALIKES[j].split(",");
    //console.log("splitSoundalikes="+splitSoundalikes);
    //== [AA][AA0][AA1][AA2]
    //for every phoneme in the word we are looking at
    for (var k = 0; k < tmpArray.length; k++){
      //tmpArray  = EH2,K,S,KTP,L,AH,M,EY,SH,AH,NgNM,P,OY2,NgNM,T
      //we are going to compare it and what follows it to the phoneme set in the splitup line from SOUNDALIKES
      //for every single soundalike
      for (var l = 1; l < splitSoundalikes.length-1; l++){
        var stopCon = false;
        var tmpPhoArray = splitSoundalikes[l].split(" ");
        //console.log(tmpPhoArray[tmpPhoArray.length-1]);
        //compare current position phoneme to phoneme in the tmpPhoArray
        for (var m = 0; m < tmpPhoArray.length; m++){
          //if (tmpArray.length-k >= tmpPhoArray.length){
            if (tmpArray[k+m]!=tmpPhoArray[m]){
              arrayBuffer.length=0;
              stopCon = true;
              //console.log("stopCon is now true because:"+tmpArray[k+m]+"!="+tmpPhoArray[m]+":");
            } else {
              arrayBuffer[m] = tmpArray[k+m];
              //console.log("stopCon is now false because:"+tmpArray[k+m]+"=="+tmpPhoArray[m]+":");
            }
          //} else {
          //  arrayBuffer.length=0;
          //  stopCon = true;
            //console.log("stopCon is now true because: "+tmpArray.length+"!>="+tmpPhoArray.length);
          //}
        }
        //if all the phonemes are found
        if (!stopCon){
          changes++;
          //console.log ("match found at "+getWord(i)+", "+tmpPhoArray+" transforming...");
          //console.log(tmpArray);
          tmpPhoArray = splitSoundalikes[0].split(" ");

          //IF THE REPLACING ARRAY IS LONGER
          if (tmpPhoArray.length > arrayBuffer.length){
            //console.log("Displacing "+getWord(i)+"///"+tmpPhoArray+"///"+arrayBuffer);
            tmpArray.splice(k+tmpPhoArray.length-1, 0, tmpPhoArray[tmpPhoArray.length-1]);
            //console.log("Displaced "+getWord(i)+"///"+tmpArray);

            //IF THE REPLACING ARRAY IS SHORTER
          } else if (tmpPhoArray.length < arrayBuffer.length){
            //console.log("Splicing "+getWord(i)+" "+arrayBuffer+" into "+tmpPhoArray);
            tmpArray.splice(k+tmpPhoArray.length, 1);
            //console.log("Spliced "+getWord(i)+"///"+tmpArray);
          }

          //for every phoneme in the replacing string
          for (var n = 0; n < tmpPhoArray.length; n++){
            tmpArray[k+n]=tmpPhoArray[n];
            //console.log("replacing phoneme "+tmpPhoArray[n]);
          }
          tmpString = tmpArray.toString();
          //console.log(tmpString);
          itemsChanged++;
        }
      }
    }
  }
  //end of word is here
  simpleOutput[i]=tmpString;
  //console.log("END OF WORD: "+changes+" changes, "+tmpString);
}
//end of dictionary is here
console.log("finished whole dictionary, made "+itemsChanged+" changes");
console.log("trying to save to simpledictionary.txt now");
var writeBuffer = "";
for (var i=0; i <CURRENTDICTIONARY.length-1; i++){
  writeBuffer = writeBuffer+simpleOutput[i].toString()+"\n";
}
try {

  fs.writeFileSync("simpledictionary.txt", writeBuffer, 'utf8');
}
catch(err) {
  console.log('Error writing simpledictionary.txt' + err);
}
console.log('Saved!');

function getPhonemes(dictionaryIndex, all){
  var theLine = CURRENTDICTIONARY[dictionaryIndex];
  var phonemeString ="";
  //trim off the spelling and spacing from the string
  var tempPHONEMES = theLine.slice(getWord(dictionaryIndex).length+2);
  //for the found word, make an array containing each phoneme sound
  var PHONEMES = tempPHONEMES.split(" ");
  if (all){
    for (var i = 0; i < PHONEMES.length; i++){
      phonemeString = phonemeString+" "+PHONEMES[i];
    }
    return phonemeString;
  } else {
    //detect the first letter of phonemes sounds until you find a vowel
    var firstVowel = 0;
    var char = "";
    //check the first character of each phoneme, backwards
    for (var i = 0, phoLen = PHONEMES.length; i < phoLen; i++){
      //set char to the first letter of the phoneme
      char = PHONEMES[phoLen-i-1].charAt(0);
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
    phoLen = PHONEMES.length-firstVowel;
    //construct our phoneme string
    for (var i = firstVowel; i < PHONEMES.length; i++){
      phonemeString = phonemeString+" "+PHONEMES[i];
    }
    return phonemeString;
  }
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
