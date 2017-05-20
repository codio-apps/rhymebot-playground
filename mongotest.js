var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

// Connection URL
var url = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {

  assert.equal(null, err);
  console.log("Connected successfully to server");

  db.close();
});


// var url = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/codio-apps?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";
