fuzzyRhymes/* RhymeBot is a Codio Apps Production */
/* Signed by ajstevens and ohmegamega */

/*rhymebot mk0.03 alpha */
'use strict';

// Set up constants
const
bodyParser = require('body-parser'),
config = require('config'),
crypto = require('crypto'),
express = require('express'),
https = require('https'),
request = require('request');


// Express environment
var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));


// Keyword initialisation
var KEYWORD = "rhyme"; // **TO DO ** : Chnage this to a file structure later
var vowels = new Array('A', 'E', 'I', 'O', 'U');
var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

//files array initialisation
var CURRENTDICTIONARY = "";
var RHYME_TYPOS = "";
var GREETINGS = "";
var SOUNDALIKES = "";

//global arrays - THIS NEEDS THINNING DOWN, MOST COULD BE LOCAL PROBABLE
var PHONEMES = new Array();
var ALPHABET_ARRAY = new Array();
var RHYMEOUTPUT = new Array();
var inputArray = new Array();

//file buffer
var fileBuffer = "";
var filesBuffered = false;

//counters for finders
var matchesFound = 0;
var pronunciationsFound = 0;
var maxSyllables = 0;

// Graph Profile fields by senderID
var name = "NONAMESET";
var last_name = "";
var nameFound = false;

//blank strings
var searchWord = "";
var lc_messageText = "";

//global message response string
var messageResponse = "";

// Set up file parsing
var fs = require("fs");
// Parse greetings.txt into data object
var greetings_file = "public/greetings.txt";
// Parse nearly_a_rhyme.txt into data object
var rhyme_typos = "public/nearly_a_rhyme.txt";
//setup dictionary file
var dictionary = "public/dictionarymain.txt";
//setup dictionary file
var abcdef = "public/abcdef.txt";
//setup soundalike file
var soundalike_file = "public/soundalikes.txt";

/*
* Be sure to setup your config values before running this code. You can
* set them using environment variables or modifying the config file in /config.
*
*/

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
process.env.MESSENGER_APP_SECRET :
config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
(process.env.MESSENGER_VALIDATION_TOKEN) :
config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
(process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
(process.env.SERVER_URL) :
config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
* Use your own validation token. Check that the token used in the Webhook
* setup is the same token used here.
*
*/
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
  req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});


/*
* All callbacks for Messenger are POST-ed. They will be sent to the same
* webhook. Be sure to subscribe your app to your page to receive callbacks
* for your page.
* https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
*
*/
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
* This path is used for account linking. The account linking call-to-action
* (sendAccountLinking) is pointed to this URL.
*
*/
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/*
* Verify that the callback came from Facebook. Using the App Secret from
* the App Dashboard, we can verify the signature that is sent with each
* callback in the x-hub-signature field, located in the header.
*
* https://developers.facebook.com/docs/graph-api/webhooks#setup
*
*/
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
    .update(buf)
    .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
* Authorization Event
*
* The value for 'optin.ref' is defined in the entry point. For the "Send to
* Messenger" plugin, it is the 'data-ref' field. Read more at
* https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
*
*/
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
  "through param '%s' at %d", senderID, recipientID, passThroughParam,
  timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
* Message Event
*
* This event is called when a message is sent to your page. The 'message'
* object format can vary depending on the kind of message that was received.
* Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
*
* For this example, we're going to echo any text that we get. If we get some
* special keywords ('button', 'generic', 'receipt'), then we'll send back
* examples of those bubbles to illustrate the special message bubbles we've
* created. If we receive a message with an attachment (image, video, audio),
* then we'll simply confirm that we've received the attachment.
*
*/
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  console.log("***NEW MESSAGE RECIEVED: "+messageText+"***");
  if (filesBuffered) {
    console.log("All files already Buffered");
  } else {
    // Set up the local files including references, variables and dictionaries
    setUpLocalVariables();
  }


  //   var MongoClient = require('mongodb').MongoClient;
  // var url = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/codio-apps?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";
  //
  // MongoClient.connect(url, function(err, db) {
  //   if (err) throw err;
  //   console.log("Database created!");
  //   db.close();
  // });


  console.log("Getting user info. Name is currently " + name);
  // name = getUserInfo(senderID);

  request(
    ("https://graph.facebook.com/v2.6/" + senderID + "?fields=first_name,last_name,profile_pic,locale,timezone,gender,last_ad_referral&access_token=" + PAGE_ACCESS_TOKEN),

    function(error, response, body) {

      var bodyObj = JSON.parse(body);
      console.log(bodyObj);
      name = bodyObj.first_name;
      last_name = bodyObj.last_name;

      if (isEcho) {
        // Just logging message echoes to console
        console.log("Received echo for message %s and app %d with metadata %s",
        messageId, appId, metadata);
        return;
      } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s",
        messageId, quickReplyPayload);

        sendTextMessage(senderID, "Quick reply tapped");
        return;
      }





      if (messageText) {
        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.

        // Pass the message into a case-insenstivie expression for comparison purposes
        // only. Use messageText for the original text when you need to print output.
        lc_messageText = messageText.toLowerCase();
        var intent = lc_messageText;
        var instant_reply = false;

        // If greeting, set the key to "welcome"
        if(StringSearch(lc_messageText, GREETINGS)){
          intent = "welcome";
          instant_reply = true;
        }
        // If help, set the key to "help"
        if(StringSearch(lc_messageText, "--help")){
          intent = "help";
          instant_reply = true;
        }
        // If about, set the key to "help"
        if(StringSearch(lc_messageText, "--about")){
          intent = "about";
          instant_reply = true;
        }
        // If a Rhyme typo, change the key to "rhyme_typo"
        else if(StringSearch(lc_messageText, RHYME_TYPOS)) {
          intent = "rhyme_typo";
          instant_reply = true;
        }
        // If the message starts with Rhyme, change the key to rhyme
        else if(lc_messageText.startsWith("rhyme")) {
          intent = "rhyme";
        }
        else if(lc_messageText.startsWith("count")) {
          intent = "count";
        }
        // If the message starts with Question, change the key to question
        else if(lc_messageText.startsWith("question")) {
          intent = "question";
        }
        // If the message starts with List, change the key to list
        else if(lc_messageText.startsWith("list")) {
          intent = "list";
        }
        else if(lc_messageText.startsWith("random")) {
          intent = "random";
        }
        else if(lc_messageText.startsWith("sentence")) {
          intent = "sentence";
        }
        else if (lc_messageText.startsWith("fuzzy")){
          intent = "fuzzy";
        } else {
            //Do nothing, key is set to messageText
        }

        // We convert the incoming message into a key, or we leave it as is and respond accordingly.
        // We use a key so we can take multiple messages (hi, hello hey) and convert them into the same
        // unser intent

        // Set up the default FINAL response
        messageResponse = (messageText + "?")

        switch (intent) {
          //Case to handle GREETING messages
          // ************************************
          case 'welcome':
          if (name=="NONAMESET") {
            console.log("Name not retrieved from Facebook yet");
            messageResponse = "What's up?";

          } else if(name!= "unknown") {
            messageResponse = ("What's up " + name +"?");
          }
          else {
            messageResponse = ("What's up?");
          }
          break;

          case 'help':
          messageResponse = "Here is some help information: \n" +
          "Type: rhyme - get a.\n"+
          "Type syllable - get c\n"+
          "Type count - get d\n"+
          "Type random - get e\n";
          break;
          case 'about':
          messageResponse = "Here is some about information: \n" +
          "We are here to help you rhyme.\n" +
          "We are ajstevens and ohmegamega.\n" +
          "You feel the rhythm, we feel the rhyme.";
          break;


          // Case to handle mispellt RHYME commands
          // ************************************
          case 'rhyme_typo':
          console.log("Typo time, ask for confirmation");
          messageResponse = "Are you looking for a rhyme? We'll only respond if you start your sentence with rhyme";
          break;

          // Handle the RHYME command
          // ************************************
          case 'rhyme':
          var rhymeString = messageText.slice(6);
          var messageArray = rhymeString.split(" ");
          messageResponse = "Rhyme Time! You said you want to rhyme: " + messageArray;
          break;

          //handle the count command
          case 'count':
          searchWord = lc_messageText.slice(6).toUpperCase();
          var dictionaryIndex = findTheLine(searchWord);
          if (dictionaryIndex != -1) {
            messageResponse = "There are "+countSyllables(dictionaryIndex)+" syllables in "+searchWord.toLowerCase();
          } else {
            messageResponse = "I don't know the word "+searchWord.toLowerCase()+", yet";
          }
          break;

          case 'sentence':
          searchWord = lc_messageText.slice(9).toUpperCase();
          var searchArray = searchWord.split(" ");
          var indexArray = [""];
          var messageString = "";
          for (var i = 0, len = searchArray.length; i < len; i++){
            indexArray[i] = findTheLine(searchArray[i]);
            if (indexArray[i] != -1) {
              console.log("SearchArray: "+indexArray);
              messageString = messageString+searchSentence(indexArray)+"\n";
            }
          }
          messageResponse = messageString;
          break;

          case 'fuzzy':
          searchWord = lc_messageText.slice(6).toUpperCase();
          var indexString = findTheLine(searchWord);
          if (indexString != -1){
            messageResponse = "You asked for words that fuzzy rhyme with "+searchWord.toLowerCase();
            fuzzyRhymes(indexString);
          } else {
            messageResponse = "I don't know the word "+searchWord+" yet";
          }
          break;

          //handle the question command
          case 'question':
          sendQuestion(senderID);
          break;

          case 'list':
          sendListData(senderID);
          break;
          //handle the random command
          case 'random':
          searchWord = lc_messageText.slice(7).toUpperCase();
          var searchArray = searchWord.split(" ");
          var randomArray = new Array();
          console.log("split input array: "+searchArray);
          if (isNaN(searchArray[1])){
            console.log("No number of results specified, defaulting to 10");
            var dictionaryIndex = findTheLine(searchWord);
            if (dictionaryIndex != -1){
              var totalFound = complexSearch(dictionaryIndex).length;
              randomArray = randomRhymes(dictionaryIndex, 10);
              if (randomArray.length==0){
                messageResponse = "I don't know any rhymes for "+searchWord.toLowerCase()+" yet";
              } else {
                randomArray = indexesToWords(randomArray, dictionaryIndex);
                randomArray = makeArrayReadable(randomArray, searchWord);
                var t = totalFound-1;
                messageResponse = "I know "+t+" words that rhyme, you asked for 10, here they are:\n"+randomArray;
              }
            } else {
              messageResponse = "I don't recognise the word "+searchWord.toLowerCase()+" yet";
            }
          } else {
            console.log("Input array position 1 is a number");
            var dictionaryIndex = findTheLine(searchArray[0]);
            if (dictionaryIndex != -1){
              var totalFound = complexSearch(dictionaryIndex).length;
              if (searchArray[1]>25){
                searchArray[i]=25;
              }
              randomArray = randomRhymes(dictionaryIndex, searchArray[1]);
              randomArray = indexesToWords(randomArray, dictionaryIndex);
              randomArray = makeArrayReadable(randomArray, searchWord);
              var t = totalFound-1;
              messageResponse = "I know "+t+" words that rhyme, you asked for "+searchArray[1]+", here they are:\n"+randomArray;
            } else {
              messageResponse = "I don't recognise the word "+searchWord.toLowerCase()+" yet";
            }
          }

          break;

          default:
          messageResponse = messageText + "?";
        }
        if(instant_reply = true){
          sendTextMessage(senderID, messageResponse);
        }


        // Message has attachments, handle response here
      } else if (messageAttachments) {
        //moved the below two lines here instead of within getUserInfo function as I want to call that elsewhere without returning this message
        var message = "Nice attachment;"
        sendTextMessage(senderID, message);
        //sendTextMessage(senderID, ("Message with attachment received, thanks " + senderID + "."));
      }

      if (error) {
        name = "";
        last_name = "";
        console.log("Error getting user's name: " +  error);
      } else {
      }
      // CODE GOES HERE AFTER FUNCTION RETURNS
      console.log("Received the name from Facebook, it is: "+name +" "+last_name);

    });

  }

  // Read text file data and store it into local variables for string comparisons
  function setUpLocalVariables() {
    // Assign the greetings txt file values (hey, hello, hi) to the GREETINGS variable
    // Try to read from file
    try {
      fileBuffer = fs.readFileSync(greetings_file, "utf-8");
      GREETINGS = fileBuffer.split("\n");
    }
    // Catch an error and set default
    catch(err) {
      console.log("Unable to parse greetings file: " + err);
    }
    // Assign the rhyme typos txt file values (rhime, ryme) to the RHYME_TYPOS variable
    // Try to read from file
    try {
      fileBuffer = fs.readFileSync(rhyme_typos, "utf-8");
      RHYME_TYPOS = fileBuffer.split("\n");
    }
    // Catch an error and set default
    catch(err) {
      console.log("Unable to parse rhyme file: " + err);
    }
    // Read through the dictionary and do two things -
    // a) Store the dictionary as an array broken up by a new line, in CURRENTDICTIONARY
    // b) Cycle through the dictionary and store the letter of the alphabet, and it's last position in the array
    // i.e. ALPHABET_ARRAY[1] = ["B", 1001]; - this means the letter B finishes on this line
    // Try to read from file
    try {
      fileBuffer = fs.readFileSync(dictionary, "utf-8");
      CURRENTDICTIONARY = fileBuffer.split("\n");
      var dictionary_length = CURRENTDICTIONARY.length;
      var alphabetLength = 27;
      maxSyllables = getMaxSyllables();
      //for each line in the file
      for (var i = 0; i < dictionary_length; i++) {
        //establish which letter it is
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
      console.log("soundalikes.txt loaded: "+SOUNDALIKES);
    }
    catch(err) {
      console.log("Unable to parse soundalike file: " + err);
    }
    if (GREETINGS!=""&&RHYME_TYPOS!=""&&CURRENTDICTIONARY!=""&&ALPHABET_ARRAY!=""&&SOUNDALIKES!=""){
      console.log("All files buffered succesfully");
      filesBuffered=true;
    }
  }

  //function to return the syllable value of the item in CURRENTDICTIONARY with the most syllables
  function getMaxSyllables(){
    var mostSyllables = 0;
    var maxWord = "";
    for (var i=0, len = CURRENTDICTIONARY.length; i < len; i++){
      if (mostSyllables < countSyllables(i)){
        mostSyllables = countSyllables(i);
      }
    }
    console.log("Highest syllable count in currentdictionary is: "+mostSyllables);
    return mostSyllables;
  }

  //function to take in an index from our dictionary and return everything that nearly rhymes in an array
  function fuzzyRhymes(dictionaryIndex){
    console.log("fuzzyRhymes called on "+dictionaryIndex);
    var phonemeString = getPhonemes(dictionaryIndex, false).slice(1);
    var phonemeArray = phonemeString.split(" ");
    var wordEnding = "";
    var vowelFound = false;
    //first we need to trim off just the bit of the rhyme we need for the first comparisons
    for (var k = 0, phoLen = phonemeArray.length-1; !vowelFound; k++){
      //set char to the first letter of the phoneme
      var char = phonemeArray[phoLen-k].charAt(0);
      //compare char to every vowel
      for (var j = 0, vowLen=vowels.length; j < vowLen; j++){
        //if we find a vowel at the next position , log it as the last one and end the loop
        if (char == vowels[j]){
          var lastVowel = phoLen-k;
          //now stick everything after and including the last vowel into a string
          for (var l = lastVowel, restLen = phonemeArray.length; l < restLen; l++){
            wordEnding = wordEnding +" "+phonemeArray[l];
          }
          wordEnding = wordEnding.slice(1);
          vowelFound = true;
        }
      }
    }
    console.log("phonemeArray is "+phonemeArray+" last part is "+wordEnding);

    //take everything after the last vowel into an array so we can do loops
    //look at whole rhyme except for last vowel sound or something?
    var endingArray = wordEnding.split(" ");
    console.log("endingArray: "+endingArray);

    //ok, that wasn't working the way I wanted it to, go away and think about it.
    //I think we need to have a stream of else ifs, handling specific word endings etc etc??
  }

  //function to take in a 2d array of 0[words] with their 1[syllable count], and return a nicely structured string for sending to the user
  function makeArrayReadable(twoDarray, theWord){
    var tmp = "";
    //if there are more than 25 results trim to 25, for simplicity's sake for now
    if (twoDarray[0].length>=25){
      tmp = tmp +"The current limit I can show you is 25\n"
      twoDarray[0].length=25; //[0] is words
      twoDarray[1].length=25; //[1] is syllables
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

  //function to take in an array of indexes and search each word with the complex algorithm, returning an array of presentable strings
  function searchSentence(indexArray){
    var outputArray = new Array();
    var indexOutputArray = new Array();
    var output = "";
    // for each word in the sentence
    for (var i = 0; i < indexArray.length; i++){
      //if the index is valid
      if (indexArray[i] != -1){
        //call the complex search function on this index
        console.log("Word number "+i);
        indexOutputArray[i] = complexSearch(indexArray[i]);
        //turn the indexarray back into words, obtain the syllables in this array as well
        outputArray[i] = indexesToWords(indexOutputArray[i], indexArray[i]);
        console.log("Word searching completed OK");
        output = "I know "+outputArray[i][0].length+" words that rhyme with "+getWord(indexArray[i])+"\n"+makeArrayReadable(outputArray[i], getWord(indexArray[i]).toLowerCase());
      } else {
        outputArray[i] = ["UNKNOWN"];
      }
    }
    console.log("searchSentence() completed OK");
    //now sort the sentence breakdown? for presentation?
    for (var i = 0; i < outputArray.length; i++){
    }
    return output;
  }

  //deeper search function that returns more complex rhymes as an array
  //uses searchPhonemes
  function complexSearch(dictionaryIndex){
    var syllableArray = [""];
    var phonemeBuffer = [""];
    var wordEndings = [""];
    var char = "";
    var COMPLEXOUTPUT = new Array();
    var FINALOUTPUT = new Array();
    var theWord = getWord(dictionaryIndex);
    // first get the phonemes into an array
    syllableArray = getPhonemes(dictionaryIndex, false);
    phonemeBuffer = syllableArray.split(" ");
    console.log("phonemeBuffer is "+phonemeBuffer);
    for (var k = 0, vowelCount = 0, phoLen = phonemeBuffer.length-1; k < phoLen; k++){
      //set char to the first letter of the phoneme
      char = phonemeBuffer[phoLen-k].charAt(0);
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
    console.log("wordEndings are "+wordEndings);
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
    console.log(theWord+" complex search complete");
    return COMPLEXOUTPUT;
  }

  //function to turn an array of indexes into a more presentable 2d array of words and syllable counts
  //includes duplicate handling
  function indexesToWords(indexArray, dictionaryIndex){
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

  function StringSearch(input, key) {
    if (key.indexOf(input) >= 0){
      console.log("Command recognised");
      return true;
    }
    return false;
  }

  //FUNCTION TO FIND THE LINE WORD IN THE DICTIONARY USING OPTIMISED STARTING POINT
  function findTheLine(queryWord){
    var searchWord = queryWord.toUpperCase();
    var letter = searchWord.charAt(0);
    if(!alphabet.includes(letter)){
      console.log("That is not one of the 26 chosen characters, Padawan - Returning: -1");
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

        console.log("Found the line "+CURRENTDICTIONARY[j]+" @ " + j);
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

  //function to return the exact word as a string, when given a dictionary index
  //handles brackets (removes them from the string before output)
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
        randArray[i] = rand;
      }
      console.log("Finished processing array, randomly returning: "+randArray);
    } else {
      console.log("less than "+elements+" rhymes found, returning all rhymes");
      if (inputArray.length==0){
        console.log("no rhymes found, abort");
      } else {
        //basically, just return the original
        return inputArray;
      }
    }
    return randArray;
  }



  function randomRhymes(dictionaryIndex, elements){
    inputArray.length=0;
    var arrayBuffer = complexSearch(dictionaryIndex);
    if (arrayBuffer.length!==0){
      var randArray = randomlyReturn(arrayBuffer, elements);
      return randArray;
    } else {
      messageResponse = "I don't know any words that rhyme sorry";
      return "UNKNOWN";
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
      PHONEMES = tempPHONEMES.split(" ");
      for (var i = 0, phoLen = PHONEMES.length; i < phoLen; i++){
        //set char to the first letter of the phoneme
        char = PHONEMES[phoLen-i-1].charAt(0);
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

  //function to take in a word and spit out the rhyming phoneme data as a string
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
      console.log("Constructed phoneme string: "+phonemeString);
      return phonemeString;
    }
  }

  //function to search for phonemeString matches
  //returns an array of indexes
  //if syllableLength is zero, return all matches
  function searchPhonemes(phonemeString, syllableLength){
    var arrayBin = new Array();
    RHYMEOUTPUT.length = 0;
    matchesFound = 0;
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
    console.log("Searching for "+phonemeString+" of length "+syllableLength+" complete. Searched "+iX+" entries and found "+matchesFound+" rhyme(s).");
    return RHYMEOUTPUT;
  }

  //function to search the dictionary for phonemeString matches by index and return a list
  function searchPhonemesByIndex(dictionaryIndex, syllableLength) {
    var phonemeString = getPhonemes(dictionaryIndex, false);
    var output = searchPhonemes(phonemeString, syllableLength);
    return output;
  }

  //function to split a string into 600(ish) word chunks
  function splitMessage(string){
    var arrayOfStrings = new Array();
    if (string.length>600){
      var cutFrom = 0;
      var i = 400;
      var limit = i;
      //go through the string looking for a space
      for (; i < string.length; i++){
        limit++;
        if (string.charAt(i)=="\n"){
          var cutTo = string.length-i;
          var tmp = string.slice(cutFrom, i);
          arrayOfStrings.push(tmp);
          cutFrom = i+1;
          i=i+399;
        } else if (limit>500){
          //if we don't seem to be finding a space....
          console.log("painfully close to the limit, artificially splitting at"+i);
          //go searching for the next comma
          for (var j = i, done = false; !done; j++){
            if (string.charAt(j)==","){
              console.log("found a comma, splitting at "+j+" instead");
              var cutTo = string.length-j;
              var tmp = string.slice(cutFrom, j);
              arrayOfStrings.push(tmp);
              cutFrom = j+1;
              i=j;
              limit = 0;
              done = true;
            }
          }
        }
      }
      var tmp = string.slice(cutFrom, string.length);
      arrayOfStrings.push(tmp);
    } else {
      arrayOfStrings.push(string);
    }
    console.log("Message split into arrays of suitable length");
    return arrayOfStrings;
  }

  /*
  * Delivery Confirmation Event
  *
  * This event is sent to confirm the delivery of a message. Read more about
  * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
  *
  */
  function receivedDeliveryConfirmation(event) {

    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
      messageIDs.forEach(function(messageID) {
        console.log("Received delivery confirmation for message ID: %s",
        messageID);
      });
    }

    console.log("All message before %d were delivered.", watermark);
  }


  /*
  * Postback Event
  *
  * This event is called when a postback is tapped on a Structured Message.
  * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-receivedcountSY
  *
  */
  function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called: " + payload);
  }

  /*
  * Message Read Event
  *
  * This event is called when a previously-sent message has been read.
  * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
  *
  */
  function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
  }

  /*
  * Account Link Event
  *
  * This event is called when the Link Account or UnLink Account action has been
  * tapped.
  * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
  *
  */
  function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
  }

  /*
  * Send an image using the Send API.
  *
  */
  function sendImageMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/rift.png"
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Send a Gif using the Send API.
  *
  */
  function sendGifMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: SERVER_URL + "/assets/instagram_logo.gif"
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Send audio using the Send API.
  *
  */
  function sendAudioMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "audio",
          payload: {
            url: SERVER_URL + "/assets/sample.mp3"
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Send a video using the Send API.
  *
  */
  function sendVideoMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "video",
          payload: {
            url: SERVER_URL + "/assets/allofus480.mov"
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Send a file using the Send API.
  *
  */
  function sendFileMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "file",
          payload: {
            url: SERVER_URL + "/assets/test.txt"
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  //function to attempt to call itself recursively to send messages in the right order?
  function recursivelySendMessage(recipientId, messageArray, alpha) {
    if (alpha<messageArray.length){
      console.log("sending msg "+alpha+" of "+messageArray.length);
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: messageArray[alpha],
        }
      };
      callSendAPI(messageData);
      recursivelySendMessage(recipientId, messageArray, alpha+1);
      console.log("Message sent: "+messageArray[alpha]);
    }
  }

  //used to send a text message using the Send API.
  //now I'm trying to make it do it recursively to avoid the message getting jumbled up
  //takes in a string, turns it into an array and passes it to recursivelySendMessage
  function sendTextMessage(recipientId, messageText) {
    var messageArray = splitMessage(messageText);
    recursivelySendMessage(recipientId, messageArray, 0);
  }


  /*
  * Send a button message using the Send API.
  *
  */
  function sendButtonMessage(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "This is test text",
            buttons:[{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Trigger Postback",
              payload: "DEVELOPER_DEFINED_PAYLOAD"
            }, {
              type: "phone_number",
              title: "Call Phone Number",
              payload: "+16505551234"
            }]
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Send a message with Quick Reply buttons.
  *
  */
  function sendQuickReply(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: "What's your favorite movie genre?",
        quick_replies: [
          {
            "content_type":"text",
            "title":"Action",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
          },
          {
            "content_type":"text",
            "title":"Comedy",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
          },
          {
            "content_type":"text",
            "title":"Drama",
            "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
          }
        ]
      }
    };

    callSendAPI(messageData);
  }


  function sendQuestion(recipientId) {

    var messageData = {
      recipient: {
        id: recipientId
      },
      "message":{
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text":"What do you want to do next?",
            "buttons":[
              {
                "type":"web_url",
                "url":"http://facebook.com/rhymebotbot",
                "title":"Visit our site"
              },
              {
                "type":"postback",
                "title":"Count to 9",
                "payload":"123456789"
              },
              {
                "type":"postback",
                "title":"Say something",
                "payload":"Something!"
              }
            ]
          }
        }
      }

    };

    callSendAPI(messageData);
  }

  /* Send a list of stuffs
  *
  *
  */ // IF THIS FUNCTION IS NEEDED WE NEED TO WHITELIST THE DOMAINS: https://developers.facebook.com/docs/messenger-platform/thread-settings/domain-whitelisting
  // function sendListData(recipientId) {
  //   console.log("Sending a list data message");
  //
  //
  //   var messageData = {
  //     recipient: {
  //       id: recipientId
  //     }, "message": {
  //     "attachment": {
  //         "type": "template",
  //         "payload": {
  //             "template_type": "list",
  //             "elements": [
  //                 {
  //                     "title": "Classic T-Shirt Collection",
  //                     "image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
  //                     "subtitle": "See all our colors",
  //                     "default_action": {
  //                         "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                         "messenger_extensions": true,
  //                         "webview_height_ratio": "tall",
  // "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                     },
  //                     "buttons": [
  //                         {
  //                             "title": "View",
  //                             "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                             "messenger_extensions": true,
  //                             "webview_height_ratio": "tall",
  // "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     "title": "Classic White T-Shirt",
  //                     "image_url": "https://peterssendreceiveapp.ngrok.io/img/white-t-shirt.png",
  //                     "subtitle": "100% Cotton, 200% Comfortable",
  //                     "default_action": {
  //                         "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                         "messenger_extensions": true,
  //                         "webview_height_ratio": "tall",
  //   "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                     },
  //                     "buttons": [
  //                         {
  //                             "title": "Shop Now",
  //                             "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                             "messenger_extensions": true,
  //                             "webview_height_ratio": "tall",
  // "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     "title": "Classic Blue T-Shirt",
  //                     "image_url": "https://peterssendreceiveapp.ngrok.io/img/blue-t-shirt.png",
  //                     "subtitle": "100% Cotton, 200% Comfortable",
  //                     "default_action": {
  //                         "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                         "messenger_extensions": true,
  //                         "webview_height_ratio": "tall",
  // "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                     },
  //                     "buttons": [
  //                         {
  //                             "title": "Shop Now",
  //                             "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                             "messenger_extensions": true,
  //                             "webview_height_ratio": "tall",
  // "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                         }
  //                     ]
  //                 },
  //                 {
  //                     "title": "Classic Black T-Shirt",
  //                     "image_url": "https://peterssendreceiveapp.ngrok.io/img/black-t-shirt.png",
  //                     "subtitle": "100% Cotton, 200% Comfortable",
  //                     "default_action": {
  //                         "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                         "messenger_extensions": true,
  //                         "webview_height_ratio": "tall",
  //                         "fallback_url": "https://www.facebook.com/RhymeBot-Playground-619995748207390"
  //                     },
  //                     "buttons": [
  //                         {
  //                             "title": "Shop Now",
  //                             "type": "web_url",
  //                         "url": "https://www.facebook.com/RhymeBot-Playground-619995748207390",
  //                             "messenger_extensions": true,
  //                             "webview_height_ratio": "tall",
  //                             "fallback_url": "https://peterssendreceiveapp.ngrok.io/"
  //                         }
  //                     ]
  //                 }
  //             ],
  //              "buttons": [
  //                 {
  //                     "title": "View More",
  //                     "type": "postback",
  //                     "payload": "payload"
  //                 }
  //             ]
  //         }
  //     }
  // }
  // };
  // callSendAPI(messageData);
  // }

  /*
  * Send a read receipt to indicate the message has been read
  *
  */
  function sendReadReceipt(recipientId) {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "mark_seen"
    };

    callSendAPI(messageData);
  }

  /*
  * Turn typing indicator on
  *
  */
  function sendTypingOn(recipientId) {
    console.log("Turning typing indicator on");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_on"
    };

    callSendAPI(messageData);
  }

  /*
  * Turn typing indicator off
  *
  */
  function sendTypingOff(recipientId) {
    console.log("Turning typing indicator off");

    var messageData = {
      recipient: {
        id: recipientId
      },
      sender_action: "typing_off"
    };

    callSendAPI(messageData);
  }

  /*
  * Send a message with the account linking call-to-action
  *
  */
  function sendAccountLinking(recipientId) {
    var messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "Welcome. Link your account.",
            buttons:[{
              type: "account_link",
              url: SERVER_URL + "/authorize"
            }]
          }
        }
      }
    };

    callSendAPI(messageData);
  }

  /*
  * Call the Send API. The message data goes in the body. If successful, we'll
  * get the message id in a response
  *
  */
  function callSendAPI(messageData) {
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: 'POST',
      json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        if (messageId) {
          console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
        } else {
          console.log("Successfully called Send API for recipient %s",
          recipientId);
        }
      } else {
        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
      }
    });
  }

  // Start server
  // Webhooks must be available via SSL with a certificate signed by a valid
  // certificate authority.
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });

  module.exports = app;
