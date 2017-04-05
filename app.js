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
/*
* branch cs6460bot. This is created from gtcoursebot master repository.  ** arana9
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
      host: "us-cdbr-iron-east-04.cleardb.net",
      user: "b314a0a53a4703",
      password: '619231dc',
      database: 'ad_cd8f6c0bd75ae1b',
      debug: false
});

var getConnection = function(callback) {
    pool.getConnection(function(err, connection) {
        callback(err, connection);
    });
};

//var app = express();
//app.use(express.cookieParser());
//app.use(express.session({secret: '1234567890QWERTY'}));


app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));




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
  console.log(req.session);
  
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
    return updateMessage(req,res,payload, data );   
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
function updateMessage(req,res,input, response) {
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
              console.log("select name, "+intent+" as result from "+entity+" where courseid='"+value+"'");
              var selectList;
              if(intent=='grade') {
                selectList="concat('A ',A,' %,  B ',B,' %,  C ',C,' %, D ',D,' %, W ',W,' %')";
              }
              else if(intent=="registration") {
                selectList="name";
              }
              else {
                selectList=intent;
              }
              conn.query("select name,cap,wlcap,"+selectList+" as result from "+entity+" where courseid='"+value+"'",[], function(err, rows) {
              if (err) {
                  console.log(err);
                  return setdataresponse("I am sorry. I don't have that information. Ask something else.");
              } else                 
                if(rows.length>1) {
                  return setdataresponse("I have too many answers. Please rephrase the question and try again.");
                }       
                else if(rows && rows.length==0) {
                  return setdataresponse("I am sorry. I don't have that information. Can rephrase your question and ask again? You can ask about a couse details such as professor, difficulty, average grades and etc. ");
                }
                else {
                    var output;
                    console.log("intent--",intent);
                    if(intent=="registration") {
                      output="I cannot register the course but I can provide information of the course that can help you decide register. The name of the course is "+rows[0].result+". Do you want to know anything else about this course?";
                    }
                    else if(intent=="A" || intent=="B" || intent=="C" || intent=="D" || intent=="W") {
                      output="The average percentage of students who got grade "+intent+" in course "+rows[0].name+" is "+rows[0].result;
                    }
                    else if(intent=="grade") {
                      output="The average percentage of students grades in course "+rows[0].name+" are "+rows[0].result;
                    }
                    else if(intent=="workload") {
                      output="On an average "+rows[0].result+" hours per week required for course "+rows[0].name;
                    }
                    else if(intent=="foundational") {
                      if(rows[0].result=="Yes") {
                        output=rows[0].name+" is a foundational course";
                      }
                      else {
                        output=rows[0].name+" is NOT a foundational course";
                      }
                    }
                    else if(intent=="difficulty") {
                      output="Average difficulty level for course  "+rows[0].name+ " is "+rows[0].result+" in a scale of 1 to 5";
                    }
                    else if(intent=="rating") {
                      output="Average rating for course  "+rows[0].name+ " is "+rows[0].result+" in a scale of 1 to 5";
                    }
                    else if(intent=="cap") {
                      output="Capacity of the course  "+rows[0].name+ " is "+rows[0].result;
                    }
                    else if(intent=="act") {
                      output=rows[0].result+" seats out of "+rows[0].cap+" are filled in the course "+rows[0].name;
                    }
                    else if(intent=="rem") {
                      output=rows[0].result+" seats remaining in the course "+rows[0].name;
                    }
                    else if(intent=="wlcap") {
                      output="Capacity of the waitlist for course  "+rows[0].name+ " is "+rows[0].result;
                    }
                    else if(intent=="wlact") {
                      output=rows[0].result+" seats out of "+rows[0].wlcap+" are filled in the waitlist for course "+rows[0].name;
                    }
                    else if(intent=="wlrem") {
                      output=rows[0].result+" seats remaining in the waitlist for course "+rows[0].name;
                    }
                    else {
                      console.log("else registration....");
                      output=rows[0].result;
                    }

                    return setdataresponse(output);
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

  console.log("intent",response.intents);

  console.log("entities",response.entities);

  var intent;
  var entity;
  var entityValue;

  if(response.intents[0] && (response.intents[0].intent=='greeting' || response.intents[0].intent=='gesture' || response.intents[0].intent=='thankyou' || response.intents[0].intent=='negetive_reaction')) {
      return res.json(response);
  }

  if(response.intents && response.intents.length > 0  && response.entities && response.intents && response.entities.length > 0 ) {
      if(response.intents[0].intent=='previous') {
        intent=req.session.intent
      }
      else {
        intent=response.intents[0].intent;
      }

      entity=response.entities[0].entity;
      entityValue=response.entities[0].value;
      req.session.intent=intent;
      req.session.entity=entity;
      req.session.entityValue=entityValue;
  }
  else if(response.intents && response.intents.length == 0 && response.entities  && response.entities.length>0) {
      intent=req.session.intent
      entity=response.entities[0].entity;
      entityValue=response.entities[0].value;
      req.session.intent=intent;
      req.session.entity=entity;
      req.session.entityValue=entityValue;
  }
  else if(response.intents && response.intents.length > 0 && response.entities  && response.entities.length==0) {
    if(response.intents[0].intent == 'greeting') {
        response.output.text="Hello! How can I help you?";
        logoutput(response)
        return res.json(response);
    }
    else if(response.intents[0].intent=='previous') {
        intent=req.session.intent
    }
    else {
      intent=response.intents[0].intent;
    }

    entity=req.session.entity;
    entityValue=req.session.entityValue
    req.session.intent=intent;
    req.session.entity=entity;
    req.session.entityValue=entityValue;
  }
  else {
    response.output.text="Welcome to GT Course Bot. How can I help you?";
    return res.json(response);
  }

  if(response.intents && response.intents.length > 0 && response.intents[0].intent=='previous') {
    intent=req.session.intent
  }

  console.log("--------------------------------------------------------------");
  console.log("response",response.output);
  console.log("\n\n");
  console.log("intent",intent);
  console.log("\n\n");
  console.log("entitiy",entity);
  console.log("\n\n");
  console.log("entitiyValue",entityValue);


  if(intent  && entity && entityValue ) {
      if(entity == 'omscs') { //take answers from workspace dialogue for omscs
        var output;
        if(intent=="cost") {
          output="OMSCS costs about 7000 dollors.";
          response.output.text=output;
        }
        else if(intent=="name") {
          output="Online Master of Science in Computer Science.";
          response.output.text=output;
        }
        else if(intent=="sponsor") {
          output="Georgia Tech  teamed up with Udacity and AT&T to offer the first online Master of Science in Computer Science from an accredited university that students can earn exclusively through the 'massive online' format and for a fraction of the normal cost.";
          response.output.text=output;
        }
        else if(intent=="admission") {
          output="Preferred qualifications for admitted OMS CS students are an undergraduate degree in computer science or related field (typically mathematics, computer engineering or electrical engineering) from an accredited institution with a cumulative GPA of 3.0 or higher. Applicants who do not meet these criteria will be evaluated on a case-by-case basis; however, work experience will not take the place of an undergraduate degree. The following are required for admission: Evidence of award of a 4-year bachelor's degree or its equivalent (prior to matriculation) from a recognized institution, demonstrated academic excellence and evidence of preparation in their chosen field sufficient to ensure successful graduate study For international applicants, satisfactory scores on the Test of English as a Foreign Language (TOEFL)";
          response.output.text=output;
        }
        else if(intent=="specialization") {
          output="Specializations Currently Offered are   1. Computational Perception & Robotics  2. Computing Systems  3. Interactive Intelligence  4. Machine Learning";
          response.output.text=output;
        }
        else  {
          output="I know you asked about OMSCS but I did not understand what you want to know about OMSCS. Please ask again.";
          response.output.text=output;
        }

        return res.json(response);
      }
      else {
        return getSqlData(intent,entity,entityValue); 
      }
  }
  else if(intent && !entity){
    if(intent == 'registration') {
      response.output.text="I understand that you want register a course. Which course you want to register?";
      return res.json(response);
    }
    response.output.text="I am sorry I did not understand your question. Please rephrase your question. I can help with OMSCS and course information.";
    return res.json(response);
  } else {
    response.output.text="I am sorry I did not understand your question. Please rephrase your question. I can help with OMSCS and course information.";
    return res.json(response);
  }

  
  /***********************************************************************
    Added by umashankar3 for GTCourseBot app - start
  ***********************************************************************/
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
