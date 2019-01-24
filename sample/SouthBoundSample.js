var wisecore = require('../lib/SouthBound');

var strServerIP = '127.0.0.1';
var iServerPort = 1883;
var strConnID = 'admin';
var strConnPW = '05155853';
var strMAC = '000BAB5487JS';
var strClientID = 'JS_SamplePlugin';
var strHostName = strClientID;
var strProductTag = 'RMM';
var strSN = strMAC;

var get_timetick = function (userdata) {
	var tick = new Date().getTime();
	return tick;
};

var client = new wisecore();
client.core_initialize(strClientID, strHostName, strMAC, null);
client.core_tag_set(strProductTag);
client.core_product_info_set(strSN, null /*no parent*/, '3.3.0', 'Service', '', '');
client.core_account_bind('anonymous', '');
client.core_time_tick_callback_set(get_timetick);
client.core_connection_callback_set(On_Connect, On_Lostconnect, On_Disconnect, On_MsgRecv);
client.core_action_callback_set(On_Rename, On_Update);
client.core_server_reconnect_callback_set(On_Server_Reconnect);
client.core_iot_callback_set(On_GetCapability, On_StartReport, On_StopReport);
client.core_heartbeat_callback_set(On_Query_HeartbeatRate, On_Update_HeartbeatRate);
//client.core_tls_psk_set('05155853','000BAB548765', null);
console.log('Ｃonnect to: '+strServerIP +":"+iServerPort);
client.core_connect(strServerIP, iServerPort, strConnID, strConnPW);


var iHeartbeat = 60; // 60 sec.
var pHeartbeatHandle = 0; //the Handle to clear heartbeat interval.
var pReportHandle = 0; //the Handle to clear report data interval.

// function to handle connect event
function On_Connect() {
	console.log('On connected');
	client.core_device_register();
	client.core_heartbeat_send();

	if(pHeartbeatHandle != 0) {
		clearInterval(pHeartbeatHandle);
		pHeartbeatHandle = 0;
	}
	pHeartbeatHandle = setInterval(function () {
		client.core_heartbeat_send();
	}, iHeartbeat*1000);
}

// function to handle lostconnect event
function On_Lostconnect() {
	console.log('On lostconnect');
	clearInterval(pHeartbeatHandle);
	pHeartbeatHandle = 0;
	clearInterval(pReportHandle);
	pReportHandle = 0;
}

// function to handle disconnect event
function On_Disconnect() {
	console.log('On disconnect');
	clearInterval(pHeartbeatHandle);
	pHeartbeatHandle = 0;
	clearInterval(pReportHandle);
	pReportHandle = 0;
}

// function to handle Received message
function On_MsgRecv(strTopic, strMsg, packet) {
	console.log([strTopic, strMsg].join(': '));
}

// function to handle Update event
function On_Update(strUserName, strPwd, iPort, strPath, strMD5, iReplyID, strSessionID, strClientID, userdata) {
	console.log('Get update from: ftp://' + strUserName + ":" + strPwd + "@" + strServerIP + "/" + strPath + " with md5: " + strMD5);
	client.core_action_response(iReplyID, strSessionID, true, strClientID);
}

// function to handle Rename event
function On_Rename(strName, iReplyID, strSessionID, strClientID, userdata) {
	strHostName = strName;
	console.log('Rename to' + strHostName);
	client.core_action_response(iReplyID, strSessionID, true, strClientID);
}

// function to handle Server Reconnect event
function On_Server_Reconnect(strClientID, userdata) {
	console.log('On_Reconnect');
	// client.core_disconnect(false);
	// setTimeout(() => {
	// 	client.core_connect(strServerIP, iServerPort, strConnID, strConnPW);
	// }, 5000);
	client.core_device_register();
};

// function to handle GetCapability event
function On_GetCapability(strMessage, strClientID, userdata) {
	var ts = get_timetick();

	return sendCapability(ts);
}

// function to handle StartReport event
function On_StartReport(strMessage, strClientID, userdata) {
	var root = JSON.parse(strMessage);
	var interval = root['susiCommData']['autoUploadIntervalSec'];
	if (pReportHandle != 0) {
		clearInterval(pReportHandle);
		pReportHandle = 0;
	}
	var ts = get_timetick();
	sendSensorData(ts);
	pReportHandle = setInterval(function () {
		var ts = get_timetick();
		sendSensorData(ts);
	}, interval * 1000);
}

// function to handle StopReport event
function On_StopReport(strMessage, strClientID, userdata) {
	clearInterval(pReportHandle);
	pReportHandle = 0;
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

// send capability to describe supported sensor data
function sendCapability(ts) {
	var data1 = getRandomInt(5, 10);
	var data2 = getRandomInt(5, 10);
	var data3 = getRandomInt(5, 10);
	var strpluginname = strHostName;
	var root = {"susiCommData":{ "agentID": strClientID, "commCmd": 2052, "handlerName": "general", "infoSpec": {"<PluginName>": { "SensorGroup": { "bn": "SensorGroup", "e": [{ "n": "data1", "v": data1 }, { "n": "data2", "v": data2 }, { "n": "data3", "v": data3 }] } },"opTS": { "$date": ts } }, "sendTS": { "$date": ts } } }
	var msg = JSON.stringify(root);
	var strmsg = msg.replace('<PluginName>', strpluginname);
	var topic = '/cagent/admin/' + strClientID + '/agentactionack';
	client.core_publish(topic, strmsg);
}

// send report data
function sendSensorData(ts) {
	var data1 = getRandomInt(5, 10);
	var data2 = getRandomInt(5, 10);
	var data3 = getRandomInt(5, 10);
	var strpluginname = strHostName;
	var root = {"susiCommData":{ "agentID": strClientID, "commCmd": 2055, "handlerName": "general", "data": { "opTS": { "$date": ts }, "<PluginName>": { "SensorGroup": { "bn": "SensorGroup", "e": [{ "n": "data1", "v": data1 }, { "n": "data2", "v": data2 }, { "n": "data3", "v": data3 }] } } }, "sendTS": { "$date": ts } } }
	var msg = JSON.stringify(root);
	var strmsg = msg.replace('<PluginName>', strpluginname);
	var topic = '/cagent/admin/' + strClientID + '/devinfoack';
	client.core_publish(topic, strmsg);
}

function On_Query_HeartbeatRate(strSessionID, strClientID, userdata) {
	return client.core_heartbeatratequery_response(iHeartbeat, strSessionID, strClientID);
}

function On_Update_HeartbeatRate(iRate, strSessionID, strClientID, userdata) {
	iHeartbeat = iRate;
	if(pHeartbeatHandle != 0) {
		clearInterval(pHeartbeatHandle);
		pHeartbeatHandle = 0;
	}
	pHeartbeatHandle = setInterval(function () {
		client.core_heartbeat_send();
	}, iHeartbeat*1000);
	return client.core_action_response(130, strSessionID, true, strClientID);
}


process.on('exit', function(code){
	console.log('Disconnect');
	client.core_disconnect(false);
	client.core_uninitialize();	
})