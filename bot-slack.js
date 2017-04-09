/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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


var Botkit = require('botkit');
var express = require('express');
var middleware = require('botkit-middleware-watson')({
  username: '321ed1bf-721e-437d-8708-66ed7a4876fc',
  password: 'WNCKfj4Ai7YY',
  workspace_id: '945d68d6-1477-482a-991f-79f517220a69',
  version_date: '2016-09-20'
});

// Configure your bot.
var slackController = Botkit.slackbot();
var slackBot = slackController.spawn({
  token: 'xoxb-154292610336-2x4MESRK4KnIavzV0tg4GheH'
});
slackController.hears(['.*'], ['direct_message', 'direct_mention', 'mention'], function(bot, message) {
  slackController.log('Slack message received');
  middleware.interpret(bot, message, function(err) {
    if (!err)
		  bot.reply(message, message.watsonData.output.text.join('\n'));
	});
});

slackBot.startRTM();

// Create an Express app
var app = express();
var port = process.env.PORT || 5000;
app.set('port', port);
app.listen(port, function() {
  console.log('Client server listening on port ' + port);
});