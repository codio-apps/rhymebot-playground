/* RhymeBot is a Codio Apps Production */
/* Signed by ajstevens and ohmegamega */

/*rhymebot mk0.02 alpha */
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
var RHYME_TYPOS = "";
var GREETINGS = "";
var vowels = new Array('A', 'E', 'I', 'O', 'U');
var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

//array initialisation
var CURRENTDICTIONARY = new Array();
var SEARCHSTRING = new Array();
var OUTPUTSTRING = new Array();
var PHONEMES = new Array();
var ALPHABET_REFERENCE = new Array();

//file buffer
var fileBuffer = "";

//integers for array counting in sentences
var wordNumber =0;
var stringLength =0;

// Graph Profile fields by senderID
var name = "NONAMESET";
var last_name = "";
var nameFound = false;


var rhymeString = "";
var searchWord = "";
var lc_messageText = "";

//var for catching response state (replaces insulted)
var caughtCommand= false;

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

  console.log("***NEW MESSAGE RECIEVED***");
  console.log("Setting up local variables");
  setUpLocalVariables();
  alphabetReference();

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
    caughtCommand = false;
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
    // If the message starts with Syllable, change the key to "syllable"
    else if(lc_messageText.startsWith("syllable")) {
      intent = "syllable";
    }
    // If the message starts with Single, change the key to "single"
    else if(lc_messageText.startsWith("single")) {
      intent = "single";
    }
    // If the message starts with Rhyme, change the key to rhyme
    else if(lc_messageText.startsWith("rhyme")) {
      intent = "rhyme";
    }
    else {
      //Do nothing, key is set to messageText
    }
    console.log("Original message text is: "+messageText);


    // We convert the incoming message into a key, or we leave it as is and respond accordingly.
    // We use a key so we can take multiple messages (hi, hello hey) and convert them into the same
    // unser intent

    // Set up the default FINAL response
    var messageResponse = (messageText + "?")

    switch (intent) {
      //Case to handle GREETING messages
      // ************************************
      case 'welcome':
        caughtCommand=true;
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
                          "Type: rhyme - get a.\n" +
                          "Type single - get b.\n" +
                          "Type syllable - get c";
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
      messageResponse = "Are you looking for a rhyme? We'll only respond if you start your sentance with rhyme";
      break;

      // Case to handle the SYLLABLE command
      // ************************************
      case 'syllable':
      console.log("SYLLABLE STUFF GOES HERE ALSO");
      caughtCommand = true;
      //init arrays and counter
      wordNumber=0;
      var PHONEMEString = lc_messageText.slice(9);
      var tempString="";
      console.log("syllable check requested, parsing to upper case. \n"+stringLength+" word(s) detected in string");
      sendTextMessage(senderID, "I recognised the word, I am getting this data: "+ PHONEMEString);

      SEARCHSTRING = PHONEMEString.split(" ");
      stringLength = SEARCHSTRING.length;
      //send the string to be searched
      for (var i = 0, len = SEARCHSTRING.length; i < len; i++) {
        searchWord = SEARCHSTRING[i].toUpperCase();
        searchDictionary(senderID, searchWord, wordNumber);
        wordNumber++;
      }
      //return output in right order
      for (var i = 0, len =SEARCHSTRING.length; i < len; i++) {
        tempString = tempString+"\n"+SEARCHSTRING[i]+": "+OUTPUTSTRING[i];
      }

      sendTextMessage(senderID, tempString);

      break;

      // Handle the SINGLE command
      // ************************************
      case 'single':
      //test environment for single word perfect rhymes
      var searchWord = lc_messageText.slice(7)
      searchWord = searchWord.toUpperCase();
        caughtCommand=true;
        console.log("calling find rhyme, word is |" + searchWord);
        findRhyme(senderID, searchWord);
      break;

      // Handle the RHYME command
      // ************************************
      case 'rhyme':
      var rhymeString = messageText.slice(6);
      var messageArray = rhymeString.split(" ");
      messageResponse = "Rhyme Time! You said you want to rhyme: " + messageArray;
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
    console.log("Error getting user's name: " +  error);
  } else {
  }
  // CODE GOES HERE AFTER FUNCTION RETURNS
  console.log("Just received the name from Facebook, it is now: " + name +" "+ last_name);

});

}

/* ************************************************************************************************************************************
*/

// Read text file data and store it into local variables for string comparisons
function setUpLocalVariables() {

  // Try to read from file
  try {
  fileBuffer = fs.readFileSync(greetings_file, "utf-8");
  GREETINGS = fileBuffer.split("\n");
}
// Catch an error and set default
  catch(err) {
    console.log("Unable to parse greetings file: " + err);
    GREETINGS = "hi";
  }
  // Try to read from file
  try {
  fileBuffer = fs.readFileSync(rhyme_typos, "utf-8");
  RHYME_TYPOS = fileBuffer.split("\n");
  }
  // Catch an error and set default
  catch(err) {
    console.log("Unable to parse rhyme file: " + err);
    RHYME_TYPOS = "rhymes";

  }
  try {
    fileBuffer = fs.readFileSync(dictionary, "utf-8");
    CURRENTDICTIONARY = fileBuffer.split("\n");
    console.log("dictionary successfully read");
  }
  // catch errors
  catch(err) {
    console.log("Unable to parse dictionary file: " + err);
  //try to read dictionary file
  console.log(GREETINGS + "/n " + RHYME_TYPOS);
  }
}


function StringSearch(input, key) {

  if (key.indexOf(input) >= 0){
  console.log("String was found in array");
  return true;
  }
  return false;
}

// FUNCTION TO SET UP THE ALPHABET array
//inputs: the dictionary
function alphabetReference() {

  //load the file
  fileBuffer = fs.readFileSync(abcdef, "utf-8");
  var DICTIONARY = fileBuffer.split("\n");

  //var index1 = 'a';
  //var index2 = 'b';

  var dictionary_length = DICTIONARY.length;
  var alphabetLength = 26;
  var FINAL_ALPHABET_REFERENCE = new Array();

  //var tempint = splitAlphabet(index1, index2);
  //console.log("Current index is " + tempint);
  //var i = 0;
  //var j = 0;
  console.log("alphabet is "+alphabet);

for (var i = 0; i < dictionary_length; i++) {
  console.log("made it into the loop, checking "+DICTIONARY[i]);
  for (var j = 0; j < alphabetLength; j++) {
    if(DICTIONARY[i].startsWith(alphabet[j])){
      console.log("match found :"+DICTIONARY[i]+" starts with "+alphabet[j]);
      FINAL_ALPHABET_REFERENCE[j] = i;
}
}
}
  console.log(FINAL_ALPHABET_REFERENCE);

  //Experiment
  var items = [
    [1, 2],
    [3, 4],
    [5, 6]
  ];
console.log("****************(((((^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^" + items[0] + "     " + items[1]); // 1
console.log(items);


}
//function splitAlphabet(index1, index2) {
//  return (alphabet.slice(alphabet.indexOf(index1), alphabet.indexOf(index2) + 1));
//}


//FUNCTION TO SEARCH FOR ONE WORD IN DICTIONARY
//inputs: who sent it, what is the word, where does it appear in the string
function searchDictionary(senderID, searchWord, wordNumber) {
  var wordFound = false;
  console.log("Dictionary search request received, word is: "+searchWord+" word number is "+wordNumber);
  //COMPARE START OF EACH LINE WITH SEARCH WORD
  for (var i = 0, len = CURRENTDICTIONARY.length; i < len; i++) {
    if(CURRENTDICTIONARY[i].startsWith(searchWord+"  ")){
      wordFound = true;
      console.log("word number "+wordNumber+" found in dictionary, it is "+CURRENTDICTIONARY[i]);
      //output rhyme data to the output array
      var wordLength = searchWord.length+2;
      fileBuffer = CURRENTDICTIONARY[i].slice(wordLength);
      OUTPUTSTRING[wordNumber]=temp;
    }
  }
  if (!wordFound) {
    OUTPUTSTRING[wordNumber]="**notfound**";
    sendTextMessage(senderID, "I don't know the word "+searchWord.toLowerCase()+" yet, sorry");
  }
  console.log("Dictionary search complete, searched "+i+" entries");
  sendTypingOff(senderID);
}

//FUNCTION TO SEARCH FOR ALL PERFECT RHYMES - doesn't work as intended yet
function findRhyme(senderID, searchWord) {
  var wordFound = false;
  sendTypingOn(senderID);
  //first find the word in the dictionary
  // need to add logic here that accounts for multiple pronunciations, only handles default "  " atm, not (1) (2) (3) etc
  for (var i = 0, len = CURRENTDICTIONARY.length; i < len; i++) {
    //insert or operator here
    if (CURRENTDICTIONARY[i].startsWith(searchWord+"  ")){
      wordFound = true;
      console.log("word found in dictionary, it is "+CURRENTDICTIONARY[i]);
      var wordLength = searchWord.length;
      var tempPHONEMES = CURRENTDICTIONARY[i].slice(wordLength+2);
      //for the found word, make an array containing each phoneme sound
      PHONEMES = tempPHONEMES.split(" ");
    }
  }
  //if we didnt' find the word in the dictionary
  if (!wordFound) {
    sendTextMessage(senderID, "I don't know the word "+searchWord.toLowerCase()+" yet, sorry");
  } else {
      //detect the first letter of phonemes sounds until you find a vowel
      var firstVowel = 0;
      var char = "";
      //check the first character of each phoneme, backwards
      for (var i = 0, phoLen = PHONEMES.length; i < phoLen; i++){
        //set char to the first letter of the phoneme
        var position = phoLen-i-1;
        var temp = PHONEMES[position];
        char = temp.charAt(0);
        //compare char to every vowel
        for (var j = 0, vowLen=vowels.length; j < vowLen; j++){
          //if we find a vowel at character 0, log the position as the first relevant one
          if (char == vowels[j]){
            firstVowel = position;
          }
        }
    }
    //figure out how many phonemes we want to compare
    phoLen = PHONEMES.length-firstVowel;
    //construct our phoneme string
    temp = "";
    for (i = firstVowel, len = PHONEMES.length; i < len; i++){
      temp = temp+" "+PHONEMES[i];
    }
    console.log("Succesfully constructed phoneme string: "+temp+" searching for matches now...");

    //now search the dictionary for rhymes
    var RHYMEOUTPUT = new Array;
    var found = 0;
    var arrayBin = new Array;
    var stringBin = "";
    //search the dictionary
    for (var i = 0, len = CURRENTDICTIONARY.length; i < len; i++) {
      //if the rhyme is a match
      if(CURRENTDICTIONARY[i].endsWith(temp)) {
        arrayBin = CURRENTDICTIONARY[i].split("  ");

        //if the found word ends in ")"
        if (arrayBin[0].endsWith(")")) {
            console.log("found word "+arrayBin[0]+" with bracket ending, of length : "+arrayBin[0].length+". Fixing it");
            var tmpLen = arrayBin[0].length-3;
            arrayBin[0] = arrayBin[0].slice(0, tmpLen);
            arrayBin[0] = arrayBin[0].toLowerCase()
            //if the last element in RHYMEOUTPUT is this fixed word, skip it
            if (arrayBin[0]==RHYMEOUTPUT[found-1]){
              //skip
              console.log("found duplicate for "+RHYMEOUTPUT[found-1]+", skipped it")
            } else {
              //save it
              RHYMEOUTPUT[found]=arrayBin[0];
              found++;
            }
        } else {
          //save the word to the output array
          RHYMEOUTPUT[found]=arrayBin[0].toLowerCase();
          found++;
        }
      }
    }
    //output stuff
    console.log("Search complete. Found: "+found+" rhyme(s).");
    var messageSplit = new Array;
    var sequence = 0;
    var messageChunk = 0;
    var chunkTotal = found/50;
    var splitNum = 0;
    chunkTotal = Math.round(chunkTotal);
    console.log("words found: "+found+". additional message chunks required: "+chunkTotal);

    if (found == 0) {
      console.log("NOT SEARCHING FOR RHYMES");
    } else {
      sendTextMessage(senderID, "I found "+found+" words that rhyme with "+searchWord);
      //for every word found
      //for (var i = 0, len = found; i < len; i++){
      messageSplit[messageChunk]="message : 0";
      //for how ever many there were words found
      for (var sequence = 0; sequence < found; sequence ++){
          //add the next word to a string in the array
          //if we have less than 50 in this message section
          if (splitNum <50){
            //assign this rhyme to the string
            messageSplit[messageChunk] = messageSplit[messageChunk]+"\n"+RHYMEOUTPUT[sequence];
            //increase the split number
            splitNum++;
            //otherwise, split the message into the next chunk
          } else {
            //go onto the next messageChunk
            messageChunk++;
            messageSplit[messageChunk]="message : "+messageChunk;
            messageSplit[messageChunk] = messageSplit[messageChunk]+"\n"+RHYMEOUTPUT[sequence];
            splitNum=0;
          }
        }
        console.log("Delivering results");
        sendTypingOff(senderID);
        chunkTotal++;
        for (var i = 0; i < chunkTotal; i++){
          sendTextMessage(senderID, messageSplit[i]);
        }
      }
    }
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
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
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
  sendTextMessage(senderID, "Postback called");
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

/*
 * Send a text message using the Send API.
 *
 */
 function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
  name = "";
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
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",
          timestamp: "1428444852",
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
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
