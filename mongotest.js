// Connect to the MongoDB server
var MongoClient = require('mongodb').MongoClient;
console.log("got this far");
var uri = "mongodb://ajstevens:beatbrothers1!@cluster0-shard-00-00-7fr6a.mongodb.net:27017,cluster0-shard-00-01-7fr6a.mongodb.net:27017,cluster0-shard-00-02-7fr6a.mongodb.net:27017/codio-apps?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";
MongoClient.connect(uri, function(err, db) {
  if (err) throw err;
  console.log("db created");
db.close();
});
