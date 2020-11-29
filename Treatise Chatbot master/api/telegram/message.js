/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
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

const conversation = require('../message');
const config = require('../../util/config');
const cloudant = require('../../util/db');
const db = cloudant.db;

const token = process.env.TELEGRAM_TOKEN;
const url = process.env.PUBLIC_URL;

const TelegramBot = require('node-telegram-bot-api');
let bot = new TelegramBot(token, { polling: true });

//웹 응답을 텔레그램에 전달

let postMessage = (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
};

bot.setWebHook(`${url}/bot${token}`);

/*
bot.on('message', msg => {
 bot.sendMessage(msg.chat.id, 'Message arrived : ' + msg.text);
});
*/


bot.on('message', msg => {

  console.log("message!!")
  let user_key = msg.chat.id;
  let content = {
  	text : msg.text
  };

  db.get(user_key).then(doc => {
    //message.js에서 getConversationResponse실행
    conversation.getConversationResponse(content, doc.context, user_key).then(data => {
      //coudant db에 context 넣음
      db.insert(Object.assign(doc, {
        'context': Object.assign(data.context, {
          'timezone' : "Asia/Seoul"
        }),
      }));


      //console.log('data'+getOutputText(data));
      if(getOutputText(data).match('변경완료!'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["처음으로"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('도와드릴까요?'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["논문검색", "히스토리","계정정보 수정"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('무슨 순으로'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["피인용순", "관련도순", "최신순", "오래된순"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('검색결과가 너무 많습니다.'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["KCI 등재", "세부선택 안함"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('논문검색 결과입니다'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["10개 더", "논문 정보","처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('KCI에 등록되어있는 논문의 결과입니다'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["논문 정보","처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('검색결과가 없습니다.'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('개의 피인용된 논문입니다'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["논문 정보","처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('정보를 보여드릴까요?'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["1", "2","3","4","5","6","7","8","9","10"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('논문의 정보입니다.'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["10개 더", "다른 논문 정보 보기", "처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('논문 정보가 없습니다.'))
      {
        let opts={
          "reply_markup": {
            "keyboard": [
              ["10개 더", "논문 정보", "처음으로"]
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('히스토리 목록입니다.'))
      {
        console.log("find");
        let opts={
          "reply_markup": {
            "keyboard": [
              ["논문 정보", "처음으로"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('히스토리가 없습니다.'))
      {
        console.log("find");
        let opts={
          "reply_markup": {
            "keyboard": [
              ["처음으로"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('논문의 url 및 관련 정보입니다.'))
      {
        console.log("find");
        let opts={
          "reply_markup": {
            "keyboard": [
              ["처음으로"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else if(getOutputText(data).match('범위를 초과했어요.'))
      {
        console.log("find");
        let opts={
          "reply_markup": {
            "keyboard": [
              ["처음으로", "히스토리 다시 보기"],
            ],
            "one_time_keyboard": true,
            "resize_keyboard": true
          }
        }
        bot.sendMessage(user_key, getOutputText(data),opts);
      //console.log(opts.reply_markup);
      }
      else{
      bot.sendMessage(user_key, getOutputText(data));
    }
    }).catch(function(err){
      bot.sendMessage(user_key, JSON.stringify(err.message));
    });
  }).catch(function(err) {
    // first communication
    conversation.getConversationResponse(content, {}, user_key).then(data => {
      db.insert({
        '_id' : user_key+"", // cloudant의 doc id는 반드시 string 타입이어야 합니다.
        'user_key' : user_key+"",
        'context': data.context,
        'type' : 'telegram'
      }).then(function(){
      }).catch(function(err){
      	console.log(err)
      });

      bot.sendMessage(user_key, getOutputText(data));

    }).catch(function(err){
      bot.sendMessage(user_key, JSON.stringify(err.message));
    });
  });


});



function getOutputText(data){
  var output = data.output;
  if(output.text && Array.isArray(output.text)){
    return output.text.join('\n');
  }
  else if(output.text){
    return output.text;
  }
  else return "";
}


module.exports = {
    'initialize' : (app, options) => {
       app.post(`/bot${token}`, postMessage);
    }
};
