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

const Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
const config = require('../util/config');
const request = require('request');
const moment = require('moment');
const express = require('express');
const mysql = require('mysql');
const async = require('async');
require('moment-timezone');

moment.tz.setDefault("Asia/Seoul");

// Create a Service Wrapper
let conversation = new Conversation(config.conversation);

var con = mysql.createConnection({
  inseCureAuth : true,
  host : "localhost",
  user : "root",
  password : "thdus5102#",
  database : "knock"
});

var user_id;

let getConversationResponse = (message, context, user_key) => {
  user_id = user_key;
  let payload = {
    workspace_id:process.env.WORKSPACE_ID,
    context: context || {},
    input: message || {}
  };

  payload = preProcess(payload);

  return new Promise((resolved, rejected) => {
    // Send the input to the conversation service
    conversation.message(payload, function(err, data) {
      if (err) {
        rejected(err);
      }
      //resolved(postProcess(data));
      else{
        let processed = postProcess(data);
        if(processed){
          // return 값이 Promise 일 경우
          if(typeof processed.then === 'function'){
            processed.then(data => {
              resolved(data);
            }).catch(err => {
              rejected(err);
            })
          }
          // return 값이 변경된 data일 경우
          else{
            resolved(processed);
          }
        }
        else{
          // return 값이 없을 경우
          resolved(data);
        }
      }
    });
  })
}

let postMessage = (req, res) => {
  let message = req.body.input || {};
  let context = req.body.context || {};
  getConversationResponse(message, context, user_id).then(data => {
    return res.json(data);
  }).catch(err => {
    return res.status(err.code || 500).json(err);
  });
}

/**
* 사용자의 메세지를 Watson Conversation 서비스에 전달하기 전에 처리할 코드
* @param  {Object} user input
*/
let preProcess = payload => {
  var inputText = payload.input.text;
  console.log("User Input : " + inputText);
  console.log("Processed Input : " + inputText);
  console.log("--------------------------------------------------");
  return payload;
}

/**
 * Watson Conversation 서비스의 응답을 사용자에게 전달하기 전에 처리할 코드
 * @param  {Object} watson response
 */

let postProcess = response => {
  console.log("Conversation Output : " + response.output.text);
  console.log("--------------------------------------------------");
  if(response.context && response.context.action){
    return doAction(response, response.context.action);
  }
  //return response;
}

/**
 * 대화 도중 Action을 수행할 필요가 있을 때 처리되는 함수
 * @param  {Object} data : response object
 * @param  {Object} action
 */
var start_num=1;
let query = '';
let page=1;
let sorting_num;
let paper_num;
let n_paper;
let url_list=[];
let title_list=[];
let history_list=[];
let flag=0;
let doAction = (data, action) => {
  //let query = data.input.text;
  switch(action.command){
    case "giveUrl":
      query = data.input.text;
      //console.log(query);
      //return giveUrl(data, action,query);
      break;
    case "more":
      query=query;
      start_num=start_num+10;
      page=page+1;
      sorting_num=sorting_num;
      if(sorting_num==4)
       return giveUrl2(data, action,query);
      else
      {
        if(flag==1)
          return parsing2(data, action,query,sorting_num);
        else
          return parsing(data, action,query,sorting_num);
      }
      break;
    case "parsing_title":
     flag=0;
     query=query;
     sorting_num=action.sorting;
     console.log("sorting_num:"+sorting_num);
     if(sorting_num==4)
      return giveUrl(data, action,query);
     else
      return parsing(data, action,query,sorting_num);
     break;
    case "parsing_title2":
      query=query;
      console.log(action.selection);
      if(action.selection==1)
      {
        flag=2;
        if(sorting_num==4)
         return giveUrl(data, action,query);
        else
         return parsing(data, action,query,sorting_num);
      }
      else{
        flag=1;
        if(sorting_num==4){
            return giveUrl2(data, action,query);
       }
        else{
            return parsing2(data, action,query,sorting_num);
       }
      }
     break;
    case "information":
     paper_num=action.paper_num;
     console.log("논문정보");
     console.log(url_list[paper_num]);
     return information(data, action,paper_num);
     break;
     case "clear":
      flag=0;
      start_num=1;
      page=1;
      break;
    case "history":
      return get_history(data);
      break;
    case "history_information":
        paper_num=data.input.text;//action.paper_num;
       console.log("논문정보 from history");
       console.log(history_list);
       console.log(paper_num);
       console.log(history_list[paper_num]);
       return history_information(data, action,paper_num-1);
       break;
    default: console.log(action.command)
  }
}


/**
 * 찾은 키워드의 url제공
 * @param  {Object} data : response object
 * @param  {Object} action
 */

 let giveUrl = (data, action,query,paper_num) =>{

   // context에서 필요한 값을 추출합니다.

   //필요한 모듈, 변수
   var client_id = 'OFEho8YWfo6bmJ45eW4F';
   var client_secret = 'A4ZEwvdQuT';
   var api_url = 'https://openapi.naver.com/v1/search/doc.json?query=' + encodeURI(query)+'&display=10'+'&start='+start_num; // json 결과
//   var api_url = 'https://openapi.naver.com/v1/search/blog.xml?query=' + encodeURI(req.query.query); // xml 결과
   var options = {
       url: api_url,
       headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };


   // 하드코딩
return new Promise((resolved, rejected) => {
   var app = express();
      request.get(options, function (error, response, body) {
        data.context.action = {};
        if (!error && response.statusCode == 200) {
          //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
          //res.end(body);
          var parsedResponse = JSON.parse(body);
          n_paper=parsedResponse["total"];
          if(n_paper==0)
          {
            data.output.text='검색결과가 없습니다.';
          }
          else if(n_paper>100 && flag!=2){
            data.output.text='검색결과가 너무 많습니다. 세부선택을 해주세요';
          }
          else{
          var data_output=n_paper+'개의 논문검색 결과입니다'+'\r\n';
          for(var i=0;i<10;i++){
            //console.log(parsedResponse["items"][i]["link"]);
            url_list[i+1]=parsedResponse["items"][i]["link"];
            data_output=data_output+(i+1)+'. '+parsedResponse["items"][i]["title"].replace('<b>','').replace('</b>','')+'\r\n';
            }
            //console.log(data_output);
            data.output.text=data_output;
          }
        }
        else if (!error && response.statusCode == 404) {
          data.output.text='검색결과가 없습니다.';
        }
        else {
          //res.status(response.statusCode).end();
          console.log('error = ' + response.statusCode);
          rejected(error);
        }
        resolved(data);
      })
  });
 }
 let giveUrl2 = (data, action,query,paper_num) =>{

   // context에서 필요한 값을 추출합니다.
console.log("giveurl2");
   //필요한 모듈, 변수
   var client_id = 'OFEho8YWfo6bmJ45eW4F';
   var client_secret = 'A4ZEwvdQuT';
  var api_url = 'https://openapi.naver.com/v1/search/doc.json?query=' + encodeURI(query)+'&searchType=1&display=10'+'&start='+start_num; // json 결과
//   var api_url = 'https://openapi.naver.com/v1/search/blog.xml?query=' + encodeURI(req.query.query); // xml 결과
   var options = {
       url: api_url,
       headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };


   // 하드코딩
return new Promise((resolved, rejected) => {
   var app = express();
      request.get(options, function (error, response, body) {
        data.context.action = {};
        if (!error && response.statusCode == 200) {
          //res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
          //res.end(body);
          var parsedResponse = JSON.parse(body);
          n_paper=parsedResponse["total"];
          var data_output=n_paper+'개의 논문검색 결과입니다'+'\r\n';
          for(var i=0;i<10;i++){
            //console.log(parsedResponse["items"][i]["link"]);
            url_list[i+1]=parsedResponse["items"][i]["link"];
            data_output=data_output+(i+1)+'. '+parsedResponse["items"][i]["title"].replace('<b>','').replace('</b>','')+'\r\n';
            }
            //console.log(data_output);
            data.output.text=data_output;
        }
        else if (!error && response.statusCode == 404) {
          data.output.text='검색결과가 없습니다.';
        }
        else {
          //res.status(response.statusCode).end();
          console.log('error = ' + response.statusCode);
          rejected(error);
        }
        resolved(data);
      })
  });
 }
 /**
  * 논문 정보 제공
 * @param  {Object} data : response object
 * @param  {Object} action
 */
 let information = (data, action,paper_num) =>{
   var url = url_list[paper_num];
   var tit_text = []
   var info_text = []
   var cited = 0

   // 하드코딩
   return new Promise((resolved, rejected) => {
     var cheerio = require('cheerio');
     var request = require('request');
     request(url,function(error,response,html){
       data.context.action = {};
       if (!error && response.statusCode == 200) {
         var $ = cheerio.load(html);
         var tit_text = []
         var info_text = []
         $('.ui_listdetail.type2 > dl > dt').each(function(){
           var tit=$(this).text();
           tit_text.push(tit);
         })
         $('.ui_listdetail.type2 > dl > dd').each(function(){
           var info=$(this).text();
           info_text.push(info);
         })
        console.log( $('title').text().replace('NAVER 학술정보 > ',''));
         var data_output='논문의 정보입니다.'+'\r\n';
         tit_text.forEach(function(element){
           if(element == '저자'){
            //console.log('저자 : '+info_text[tit_text.indexOf(element)]);
             data_output=data_output + '저자 : '+info_text[tit_text.indexOf(element)]+'\r\n';
             //data_output= '저자 : '+info_text[tit_text.indexOf(element)];
           }
           if(element == '학술지정보'){
             var journal_info=$('.ui_listdetail.type2 > dl > dd > ul > li > a').text();
             //console.log('학술지 정보 : '+journal_info);
             data_output=data_output + '학술지 정보 : '+journal_info+'\r\n';
             //data_output= '학술지 정보 : '+journal_info;
           }
           if(element == '발행정보'){
             var year_info=$('.ui_listdetail.type2 > dl > dd > span').eq(1).text();
             //console.log('발행년도: '+year_info);
             data_output=data_output + '발행년도: '+year_info+'\r\n';
             //data_output= '발행년도: '+year_info;
           }
           if(element == '피인용횟수'){
             //console.log('피인용 횟수 : '+info_text[tit_text.indexOf(element)]);
             data_output=data_output + '피인용 횟수 : '+info_text[tit_text.indexOf(element)]+'\r\n';
             //data_output= '피인용 횟수 : '+info_text[tit_text.indexOf(element)];
           }
           if(element == '키워드'){
             //console.log('키워드 : '+info_text[tit_text.indexOf(element)]);
             data_output=data_output + '키워드 : '+info_text[tit_text.indexOf(element)]+'\r\n';
             //data_output= '키워드 : '+info_text[tit_text.indexOf(element)];
           }
           //console.log(data_output);
           data.output.text=data_output+url_list[paper_num];
         })

         var date = moment().format('YYYY-MM-DD HH:mm:ss');
         var tit_text = $('title').text().replace('NAVER 학술정보 > ','');
         console.log("INSERT INTO history (id, paper_name, url, date_time) VALUES('"+ user_id +"', '" + tit_text +"', '" + url+"', '" + date + "')");

         if(con.state === 'disconnected'){
           con.connect(function(err){
             if (err) throw err;
             console.log("DB Connected!");
           });
         }
         con.query("INSERT INTO history (id, paper_name, url, date_time) VALUES('"+ user_id +"', '" + tit_text +"', '" + url+"', '" + date + "')", function (err, result) {
           if (err) throw err;
           console.log("insert id and name in DB");
         });

       }
       else if (response.statusCode == 404)
       {
         data.output.text='논문 정보가 없습니다.';
       }
       else {
         //res.status(response.statusCode).end();
         console.log('error = ' + response.statusCode);
         rejected(error);
       }
       resolved(data);
     })
   });
 }
 /**
  * sorting 순서로 parsing
  * @param  {Object} data : response object
  * @param  {Object} action
  */
let parsing=(data, action,query,sorting_num) =>{
  //var sorting = action.sorting;
  var url = 'https://academic.naver.com/search.naver?query='+ encodeURI(query)+'&sort='+sorting_num+'&searchType=1&refineType=exist&docType=1&thesisLv=&journalLv=&access=&year=&category=&journal=&source=&page='+page;
  return new Promise((resolved,rejected)=>{
    var cheerio = require('cheerio');
    var request = require('request');
    request(url,function(error,response,html){
      data.context.action = {};
      if (!error && response.statusCode == 200){
        var $ = cheerio.load(html);
        n_paper=Number($('.ui_tabnavi_num').first().text().replace(',','').replace(',',''));
        console.log(n_paper);
        if(n_paper>100 && flag!=2){
          data.output.text='검색결과가 너무 많습니다. 세부선택을 해주세요';
        }
        else{
          if(sorting_num==1){
            var cited_num=[];
              $('.ui_listing_cited_num').each(function(){
              cited_num.push(Number($(this).text()));
            });
            //console.log(cited_num.indexOf(0));
            if(cited_num.indexOf(0)==-1){//10개 넘었을때
              var data_output=['피인용된 논문검색 결과입니다'];
              var i=1;
              $('.ui_listing_info > h4 > a').each(function(){
                var title=$(this).text();
                url_list[i]='https://academic.naver.com/'+$(this).attr('href');
                title=i+'. '+title;
                data_output.push(title+'('+cited_num[i-1]+'회)');
                i++;
              })
              data.output.text=data_output;
            }
            else{
            var data_output=[cited_num.indexOf(0)+'개의 피인용된 논문입니다'];
            var data_output2=[];
            var i=1;
            $('.ui_listing_info > h4 > a').each(function(){
              var title=$(this).text();
              url_list[i]='https://academic.naver.com/'+$(this).attr('href');
              title=i+'. '+title;
              data_output.push(title);
              i++;
            })
            data_output2.push(data_output[0]);
            for (var i=1; i<=cited_num.indexOf(0); i++) {
              data_output2.push(data_output[i]+'('+cited_num[i-1]+'회)');
            }
            data.output.text=data_output2;
          }
          }
          else{
            var data_output=[n_paper+'개의 논문검색 결과입니다'];
            var i=1;
            $('.ui_listing_info > h4 > a').each(function(){
              var title=$(this).text();
              url_list[i]='https://academic.naver.com/'+$(this).attr('href');
              title=i+'. '+title;
              data_output.push(title);
              i++;
            })
            data.output.text=data_output;
          }
      }
    }
    else if (!error && response.statusCode == 404) {
      data.output.text='검색결과가 없습니다.';
    }
      else{
        console.log('error = ' + response.statusCode);
        rejected(error);
      }
      resolved(data);
    })
  });
}
let parsing2=(data, action,query,sorting_num) =>{
  //var sorting = action.sorting;
  console.log("parsing2");
  var url = 'https://academic.naver.com/search.naver?query='+ encodeURI(query)+'&sort='+sorting_num+'&searchType=1&docType=1&journalLv=5&page='+page;
  return new Promise((resolved,rejected)=>{
    var cheerio = require('cheerio');
    var request = require('request');
    request(url,function(error,response,html){
      data.context.action = {};
      if (!error && response.statusCode == 200){
        var $ = cheerio.load(html);
        n_paper=Number($('.ui_tabnavi_num').first().text().replace(',',''));
        if(sorting_num==1){
          var cited_num=[];
           $('.ui_listing_cited_num').each(function(){
            cited_num.push(Number($(this).text()));
          });
          //console.log(cited_num.indexOf(0));
          if(cited_num.indexOf(0)==-1){//10개 넘었을때
            var data_output=['피인용된 논문중 KCI에 등록되어있는 논문검색 결과입니다'];
            var i=1;
            $('.ui_listing_info > h4 > a').each(function(){
              var title=$(this).text();
              url_list[i]='https://academic.naver.com/'+$(this).attr('href');
              title=i+'. '+title;
              data_output.push(title+'('+cited_num[i-1]+'회)');
              i++;
            })
            data.output.text=data_output;
          }
          else{
          var data_output=[cited_num.indexOf(0)+'개의 피인용된 논문중 KCI에 등록되어있는 논문의 결과입니다'];
          var data_output2=[];
          var i=1;
          $('.ui_listing_info > h4 > a').each(function(){
            var title=$(this).text();
            url_list[i]='https://academic.naver.com/'+$(this).attr('href');
            title=i+'. '+title;
            data_output.push(title);
            i++;
          })
          data_output2.push(data_output[0]);
          for (var i=1; i<=cited_num.indexOf(0); i++) {
            data_output2.push(data_output[i]+'('+cited_num[i-1]+'회)');
          }
          data.output.text=data_output2;
        }
        }
        else{
          var data_output=[n_paper+'개의 논문검색 결과입니다'];
          var i=1;
          $('.ui_listing_info > h4 > a').each(function(){
            var title=$(this).text();
            url_list[i]='https://academic.naver.com/'+$(this).attr('href');
            title=i+'. '+title;
            data_output.push(title);
            i++;
          })
          data.output.text=data_output;
        }

      }
      else if (!error && response.statusCode == 404) {
        data.output.text='검색결과가 없습니다.';
      }
      else{
        console.log('error = ' + response.statusCode);
        rejected(error);
      }
      resolved(data);
    })
  });
}

var packages = {};

let get_history=(data) => {
  data.context.action = {};
  console.log("history");

  return new Promise((resolved, rejected) => {

    if(con.state === 'disconnected'){
      con.connect(function(err){
        if (err) throw err;
        console.log("DB Connected!");
      });
    }

    con.query("SELECT * FROM history WHERE id = '"+ user_id +"'", function (err, rows, fields) {
      if (!err){
        var num = 30;
        var data_outputs = "";
        var date = moment().format('YYYY-MM-DD HH:mm:ss');
        history_list = [];
        if(rows.length < 30)
        {
          num = rows.length;
          data_outputs = "최근 "+ rows.length + "개 히스토리 목록입니다."+"\r\n\n";
        }
        else {
          data_outputs = "최근 30개 히스토리 목록입니다."+"\r\n\n";
        }

        var moon = "";

        if(rows.length > 0)
        {
          var temp = "";
          var k = 1;
          for(var i=num-1; i>=0;i--){
            var tmp = "";
            tmp = k + ". [";
            //console.log(i, rows[i]);
            temp =  "";
            //var dt = new Date(new Date(rows[i].date_time).toLocaleString());
            //data_output=data_output+"[" + dt.toString() + "] " + rows[i].paper_name +'\r\n';
            date = rows[i].date_time;
            temp = date.toISOString();
            for(var j=0;j<10;j++)
            {
              tmp = tmp + temp[j];
            }
            tmp = tmp+"] "
            tmp=tmp+rows[i].paper_name +'\r\n\n';
            moon = moon + tmp;
            //console.log(data_outputs)

            history_list.push(rows[i].url);
            k++;
          }
          //console.log(data_outputs);
          //packages.push(data_outputs);
          //console.log(history_list);
          data_outputs = data_outputs + moon;
          packages[user_id] = data_outputs;
          //console.log("!!",data_outputs);

        }
        else {
          //packages.push("히스토리가 없습니다.");
          packages[user_id] = "히스토리가 없습니다.";
        }

        console.log("****",packages[user_id]);
        data.output.text=packages[user_id];
      }
      else {
        console.log(err);
        rejected(err);
      }
      resolved(data);
    });
  });
}




let history_information = (data, action,paper_num) =>{
  if(paper_num < history_list.length)
  {
    var history = history_list[paper_num];
    var tit_text = []
    var info_text = []
    var cited = 0
    // 하드코딩
    return new Promise((resolved, rejected) => {
      var cheerio = require('cheerio');
      var request = require('request');
      request(history,function(error,response,html){
        data.context.action = {};
        if (!error && response.statusCode == 200) {
          var $ = cheerio.load(html);
          var tit_text = []
          var info_text = []
          $('.ui_listdetail.type2 > dl > dt').each(function(){
            var tit=$(this).text();
            tit_text.push(tit);
          })
          $('.ui_listdetail.type2 > dl > dd').each(function(){
            var info=$(this).text();
            info_text.push(info);
          })
         console.log( $('title').text().replace('NAVER 학술정보 > ',''));
          var data_output='논문의 url 및 관련 정보입니다.'+'\r\n';
          tit_text.forEach(function(element){
            if(element == '저자'){
             //console.log('저자 : '+info_text[tit_text.indexOf(element)]);
              data_output=data_output + '저자 : '+info_text[tit_text.indexOf(element)]+'\r\n';
              //data_output= '저자 : '+info_text[tit_text.indexOf(element)];
            }
            if(element == '학술지정보'){
              var journal_info=$('.ui_listdetail.type2 > dl > dd > ul > li > a').text();
              //console.log('학술지 정보 : '+journal_info);
              data_output=data_output + '학술지 정보 : '+journal_info+'\r\n';
              //data_output= '학술지 정보 : '+journal_info;
            }
            if(element == '발행정보'){
              var year_info=$('.ui_listdetail.type2 > dl > dd > span').eq(1).text();
              //console.log('발행년도: '+year_info);
              data_output=data_output + '발행년도: '+year_info+'\r\n';
              //data_output= '발행년도: '+year_info;
            }
            if(element == '피인용횟수'){
              //console.log('피인용 횟수 : '+info_text[tit_text.indexOf(element)]);
              data_output=data_output + '피인용 횟수 : '+info_text[tit_text.indexOf(element)]+'\r\n';
              //data_output= '피인용 횟수 : '+info_text[tit_text.indexOf(element)];
            }
            if(element == '키워드'){
              //console.log('키워드 : '+info_text[tit_text.indexOf(element)]);
              data_output=data_output + '키워드 : '+info_text[tit_text.indexOf(element)]+'\r\n';
              //data_output= '키워드 : '+info_text[tit_text.indexOf(element)];
            }
            //console.log(data_output);
            data.output.text=data_output+history_list[paper_num];
          })
        }
        else {
          //res.status(response.statusCode).end();
          console.log('error = ' + response.statusCode);
          rejected(error);
        }
        resolved(data);
      })
    });
  }
  else {
    data.output.text = "범위를 초과했어요. 다시 시도 해주세요."
  }


}

module.exports = {
    'initialize': (app, options) => {
        app.post('/api/message', postMessage);
    },
    'getConversationResponse' : getConversationResponse
};
