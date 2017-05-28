var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');



    var myobj = [
   { name: 'Adam1', surname: 'Stevens1', messageCount: 1}
 ];

 var lookUp = {
   name: 'Adam1'
   };

// Connection URL
var dataBaseNamespace = "messageData";
var url = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/" +  dataBaseNamespace + "?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {

  //console.log(db);
if (err) throw err;


  // Insert an object into the database
  // Database name: users
  // Inserting: myobj

  // db.collection("users").insert(myobj, function(err, res) {
  //   if (err) throw err;
  //   console.log("Number of records inserted: " + res.insertedCount);
  //   db.close();
  // });


  // Read an entry from the database - the findOne method returns the first parameter
  // Database name: users
  // Results: result.item

// db.collection("users").findOne({}, function(err, result) {
//   if (err) throw err;
//   console.log("Name is: " + result.name + " and Surname is: " + result.surname);
//   db.close();
//     });


// Read all entries from the database - the find() method returns all occurrences in the selection
// Database name: users
// Results: result

db.collection("users").find(lookUp).toArray(function(err, obj) {
  if (err) throw err;

  if(obj) {

    console.log(obj);
    console.log("FOUND");
    
  var currentMessageCount = obj[0].messageCount;
  var newMessageCount = currentMessageCount + 1;



  var newElement = { $set: { messageCount: newMessageCount } };
  db.collection("users").update(lookUp, newElement, function(err, res) {

    if (err) throw err;

   db.close();
 });

} else {

}
  db.close();
});







// Clears the Database
// Database: users
//Remove: all

 // db.collection("users").remove({}, function(err, result) {
 //   if (err) throw err;
 //   console.log(result.name);
 //   db.close();
 //     });




  });


// var url = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/codio-apps?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";
