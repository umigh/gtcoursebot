/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

require( 'dotenv' ).config( {silent: true} );

var express = require( 'express' );  // app server
var bodyParser = require( 'body-parser' );  // parser for post requests
var Watson = require( 'watson-developer-cloud/conversation/v1' );  // watson sdk

// The following requires are needed for logging purposes
var uuid = require( 'uuid' );
var vcapServices = require( 'vcap_services' );
var basicAuth = require( 'basic-auth-connect' );

var mysql = require('mysql');
// The app owner may optionally configure a cloudand db to track user input.
// This cloudand db is not required, the app will operate without it.
// If logging is enabled the app must also enable basic auth to secure logging
// endpoints
var cloudantCredentials = vcapServices.getCredentials( 'cloudantNoSQLDB' );
var cloudantUrl = null;
if ( cloudantCredentials ) {
  cloudantUrl = cloudantCredentials.url;
}
cloudantUrl = cloudantUrl || process.env.CLOUDANT_URL; // || '<cloudant_url>';
var logs = null;
var app = express();

// Bootstrap application settings
app.use( express.static( './public' ) ); // load UI from public folder
app.use( bodyParser.json() );

var pool  = mysql.createPool({
      host: "xxxxxx",
      user: "xxxxxx",
      password: 'xxxxxx',
      database: 'xxxxx',
      debug: false
});

var getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
};



// Create the service wrapper
var conversation = new Watson( {
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  // username: '<username>',
  // password: '<password>',
  url: 'https://gateway.watsonplatform.net/conversation/api',
  version_date: '2016-09-20',
  version: 'v1'
} );

// Endpoint to be call from the client side
app.post( '/api/message', function(req, res) {
var finalresponse="initial response";

  var setdataresponse = function(data) {
    console.log("finalresponse=",data);
    finalresponse.output.text=data;
    return res.json(finalresponse);
  }

  console.log("'/api/message'");
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if ( !workspace || workspace === '<workspace-id>' ) {
    return res.json( {
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' +
        'Once a workspace has been defined the intents may be imported from ' +
        '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    } );
  }
  console.log("user input:",req.body.input);
  var payload = {
    workspace_id: workspace,
    context: {},
    input: {}
  };
  if ( req.body ) {
    if ( req.body.input ) {
      payload.input = req.body.input;
    }
    if ( req.body.context ) {
      // The client must maintain context/state
      payload.context = req.body.context;
    }
  }
  // Send the input to the conversation service
  
  conversation.message( payload, function(err, data) {
    finalresponse=data;
    if ( err ) {
      return res.status( err.code || 500 ).json( err );
    }
    return updateMessage(res,payload, data );    
  } );
} );


 



function logoutput(response) {
  if ( !response.output ) {
    console.log("in response.output ");
    response.output = {};
  } else {
    console.log("logging...");
    if ( logs ) {
      // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
    }
  }
}



/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(res,input, response) {
  var setdataresponse = function(data) {
    console.log("finalresponse=",data);
    response.output.text=data;
    logoutput(response)
    return res.json(response);
  }

  /***********************************************************************
    Added by umashankar3 for GTCourseBot app - start
  ***********************************************************************/
  function getSqlData(intent,entity,value,callback) {
      var mysql = require('mysql'); //run 'npm install mysql' for this to work
      pool.getConnection(function (err, conn) {
          if (err) {
              if (eventNameIndex.error) {
                  eventNameIndex.error();
              }
          }
          if (conn) { 
              console.log("select "+intent+" as intent from "+entity+" where courseid='"+value+"'");
              conn.query("select "+intent+" as intent from "+entity+" where courseid='"+value+"'",[], function(err, rows) {
                  if (err) {
                      console.log(err);
                      return setdataresponse("SQL error");
                  } else 
                    console.log(rows);
                    if(rows.length>1) {
                      return setdataresponse("I am sorry. I did not have the answer. Please rephrase the question and try again.");
                    }       
                    else {
                      if(rows && rows.length>0) {
                        return setdataresponse(rows[0].intent)
                      }
                      else {
                        return setdataresponse("I am sorry. I don't have that information. Can rephrase your question and ask again? You can ask about a couse details such as professor, difficulty, average grades and etc. ")
                      }
                    }
                  }
              );
              conn.release();                
          }
      });
  }

  var responseText = null;
  var id = null;
  console.log("response",response.output);
  console.log("\n\n");
  console.log("intents",response.intents);
  console.log("\n\n");
  console.log("entities",response.entities);
  
  if(response.intents && response.intents.length > 0  && response.entities && response.intents && response.entities.length > 0 ) {
      console.log("------- response.intents[0]------",response.intents[0]);
      if(response.intents[0].intent == 'grade') {
        console.log("**** INTENET GRADE ******");
        response.output.text="I dont have grading information. It will be implemented in project 3.2. You can ask me for other info.";
        logoutput(response)
        return res.json(response);
      }
      else if(response.intents[0].intent == 'registration' || response.intents[0].intent == 'crn') {
        console.log("**** INTENET registration ******");
        response.output.text="I am sorry. I dont have registration info. It will  be implemented in project 3.2. You can ask me for other info.";
        logoutput(response)
        return res.json(response);
      } 
      else {
        console.log("**** UPDATE DB *******",response.intents[0].intent,response.entities[0].entity,response.entities[0].value);
        console.log("check=",response.entities[0].entity != 'omscs');
        if(response.entities[0].entity != 'omscs') { //take answers from workspace dialogue for omscs
          return getSqlData(response.intents[0].intent,response.entities[0].entity,response.entities[0].value,response);    
        }
      }
  }

  if ( response.intents && response.intents[0] ) {
    if(response.intents[0].intent == 'greeting') {
        response.output.text="Hello! How can I help you?";
        logoutput(response)
        return res.json(response);
    }


    if(response.intents[0].intent == 'grade') {
        response.output.text="I dont have grading information. It will be implemented in project 3.2. You can ask me for other info.";
        logoutput(response)
        return res.json(response);
    }
    
    if(response.intents[0].intent == 'registration') {
        response.output.text="I am sorry. I dont have registration info. It will  be implemented in project 3.2. You can ask me for other info.";
        logoutput(response)
        return res.json(response);
     }

    if(!response.entities || response.entities.length==0) {
      response.output.text="I understand your intent is "+response.intents[0].intent+" but the entity you entered is not valid.";        
      logoutput(response)
      return res.json(response);
    }
  }
  /***********************************************************************
    Added by umashankar3 for GTCourseBot app - start
  ***********************************************************************/
  /*
  if ( response.intents && response.intents[0] ) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if ( intent.confidence >= 0.75 ) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if ( intent.confidence >= 0.5 ) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
  }  
  */
  return res.json(response);
}

if ( cloudantUrl ) {
  console.log("cloudantUrl",cloudantUrl);
  // If logging has been enabled (as signalled by the presence of the cloudantUrl) then the
  // app developer must also specify a LOG_USER and LOG_PASS env vars.
  if ( !process.env.LOG_USER || !process.env.LOG_PASS ) {
    throw new Error( 'LOG_USER OR LOG_PASS not defined, both required to enable logging!' );
  }
  // add basic auth to the endpoints to retrieve the logs!
  var auth = basicAuth( process.env.LOG_USER, process.env.LOG_PASS );
  // If the cloudantUrl has been configured then we will want to set up a nano client
  var nano = require( 'nano' )( cloudantUrl );
  // add a new API which allows us to retrieve the logs (note this is not secure)
  nano.db.get( 'car_logs', function(err) {
    if ( err ) {
      console.error(err);
      nano.db.create( 'car_logs', function(errCreate) {
        console.error(errCreate);
        logs = nano.db.use( 'car_logs' );
      } );
    } else {
      logs = nano.db.use( 'car_logs' );
    }
  } );

  // Endpoint which allows deletion of db
  app.post( '/clearDb', auth, function(req, res) {
    nano.db.destroy( 'car_logs', function() {
      nano.db.create( 'car_logs', function() {
        logs = nano.db.use( 'car_logs' );
      } );
    } );
    return res.json( {'message': 'Clearing db'} );
  } );

  // Endpoint which allows conversation logs to be fetched
  app.get( '/chats', auth, function(req, res) {
    logs.list( {include_docs: true, 'descending': true}, function(err, body) {
      console.error(err);
      // download as CSV
      var csv = [];
      csv.push( ['Question', 'Intent', 'Confidence', 'Entity', 'Output', 'Time'] );
      body.rows.sort( function(a, b) {
        if ( a && b && a.doc && b.doc ) {
          var date1 = new Date( a.doc.time );
          var date2 = new Date( b.doc.time );
          var t1 = date1.getTime();
          var t2 = date2.getTime();
          var aGreaterThanB = t1 > t2;
          var equal = t1 === t2;
          if (aGreaterThanB) {
            return 1;
          }
          return  equal ? 0 : -1;
        }
      } );
      body.rows.forEach( function(row) {
        var question = '';
        var intent = '';
        var confidence = 0;
        var time = '';
        var entity = '';
        var outputText = '';
        if ( row.doc ) {
          var doc = row.doc;
          if ( doc.request && doc.request.input ) {
            question = doc.request.input.text;
          }
          if ( doc.response ) {
            intent = '<no intent>';
            if ( doc.response.intents && doc.response.intents.length > 0 ) {
              intent = doc.response.intents[0].intent;
              confidence = doc.response.intents[0].confidence;
            }
            entity = '<no entity>';
            if ( doc.response.entities && doc.response.entities.length > 0 ) {
              entity = doc.response.entities[0].entity + ' : ' + doc.response.entities[0].value;
            }
            outputText = '<no dialog>';
            if ( doc.response.output && doc.response.output.text ) {
              outputText = doc.response.output.text.join( ' ' );
            }
          }
          time = new Date( doc.time ).toLocaleString();
        }
        csv.push( [question, intent, confidence, entity, outputText, time] );
      } );
      res.csv( csv );
    } );
  } );
}



module.exports = app;
