'use strict';

const express = require('express'),
  app = express(),
  mongoose = require('mongoose'),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  dns = require('dns');

var port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;

function initializeSequence() {
  db.createCollection("counters");
  db.collection('counters').insertOne({_id:"url_id", sequence_value: 0});
}

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});
  
function isValidDNS(url) {
  dns.lookup(url, function onLookUp(err, addresses, family) {
    console.log(addresses);
    if(addresses != null) {
      console.log("valid");
      return true;
    } else {
      console.log("invalid");
      return false;
    }
  });
}
       
app.post('/api/shorturl/new', function( req, res) {
  let urlFormat = req.body.url;
  let dnsURL = formatForDNS(urlFormat);
  
  // If not-exists save to document.
  dns.lookup(dnsURL, function onLookUp(err, addresses, family) {
    if(addresses != null) {
      ShortUrl.find({url: urlFormat}, (err, url) => {
        if(err) { console.log(err) }
        if(url == false) {
          var sequenceDocument = db.collection('counters').findOneAndUpdate(
            { _id: "url_id"},
            {$inc:{sequence_value:1}},
            {new: true}
          ).then(function(result) { 
            var nextSequence = result.value.sequence_value;
            var newUrl = new ShortUrl({
              _id: nextSequence,
              "url": urlFormat
            });

            newUrl.save(function(err) {
              if(err) throw err;
              console.log("URL sucessfully saved");
              res.json({"original_url": urlFormat, "short_url": nextSequence})
            })
          });
        } else {
          console.log("URL already exists");
          res.json({"exists": true, "original_url": urlFormat, "short_url": url[0]["_id"]});
        }
      });
    } else {
      res.json({"error": "Invalid URL"});
    }
  });
});
         
app.get('/api/shorturl/:url', function(req, res) {
  ShortUrl.find({_id: req.params.url}, (err, id) => {
    // if(err) { console.log(err) }
    if(id == false) {
      res.json({error: "No short url found for given input"});
    } else {
      res.redirect(id[0].url);
    }
  });  
});

function formatForDNS(url) {
  if(url.match(/^https/i)) {
    url = url.substring(8,url.length);
  } else if (url.match(/^https/i)) {
    url = url.substring(7,url.length);
  }
  return url;
}
      
app.listen(port, function () {
  console.log('Node.js listening ...');
});

// Schema
var shortUrlSchema = mongoose.Schema({
  _id: Number,
  "url": String
});

// Model
var ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);