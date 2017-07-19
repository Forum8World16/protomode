'use strict';

const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const dgram = require('dgram');
const udpSocket = dgram.createSocket('udp4');
var udpPortSend = 50000;
var udpPortRecv = 50001;

app.use(express.static(__dirname + '/public')); 

app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/js', express.static(__dirname + '/node_modules/three/build')); // redirect three JS
app.use('/js', express.static(__dirname + '/node_modules/three/examples/js')); // redirect three JS

process.env.PORT = 80;
var port = process.env.PORT || 5000;
server.listen(port);

var activeDevicesList = [];
/*
socket:alsdasdflaasdfdgj,
info:{
    type:webserver
    }
*/


udpSocket.on('error', (err) =>{
    console.log('udp socket error:\n${err.stack}');
    console.log('closing the udp socket');
    udpServer.close();
    //TODO add function to restart the udp socket
});

udpSocket.on('message', (msg, rinfo) => {
    concole.log('udp socket got: ${msg} from ${rinfo.address}:${rinfo.port}');
});

udpSocket.on('listening', () => {
    const address = udpSocket.address();
    console.log('udp socket listening ${address.address}:${address.port}');
});

udpSocket.bind(udpPortRecv, () => {});

var udpData = new Uint8Array(9); //9 bytes in array buffer
//command uint8_t (1 byte)
//cube id, uint16_t (2 bytes)
//x, float (4 bytes)
//y, float (4 bytes)
//z, float (4 bytes)

function prepareData(commandId,cubeId,x,y,z){
    
    var fArr = new Float32Array(3);
    fArr[0] = x;
    fArr[1] = y;
    fArr[2] = z;
    var bArr = new Int8Array(fArr.buffer);
    
    var oArr = new Uint8Array(15);
    oArr[0] = commandId;
    oArr[1] = (cubeId<<0)& 0xff;
    oArr[2] = (cubeId<<8)& 0xff;
    oArr[3] = bArr[0];
    oArr[4] = bArr[1];
    oArr[5] = bArr[2];
    oArr[6] = bArr[3];
    oArr[7] = bArr[4];
    oArr[8] = bArr[5];
    oArr[9] = bArr[6];
    oArr[10] = bArr[7];
    oArr[11] = bArr[8];
    oArr[12] = bArr[9];
    oArr[13] = bArr[10];
    oArr[14] = bArr[11];
    
    return new Buffer(oArr);
};

function udpSend(msg){
    udpSocket.send(msg,0,msg.length,udpPortSend,'192.168.1.101',function(){});
};




var modelData = {
    //'0':[0,0,0]
};

const COMMAND_DEL = 0;
const COMMAND_ADD = 1;
const COMMAND_MOV = 2;

function addModelListener(socket) {
    socket.on('addModel', function (data) {
        udpSend(
            prepareData(COMMAND_ADD,data.modelId,data.x,data.y,data.z)
        );
        socket.broadcast.emit('addModel',data);
        modelData[data.modelId] = [data.x,data.y,data.z];
    });
};

function delModelListener(socket) {
    socket.on('delModel', function (data) {
        udpSend(
            prepareData(COMMAND_DEL,data.modelId,data.x,data.y,data.z)
        );
        socket.broadcast.emit('delModel',data);
        delete modelData[data.modelId];
    });
};

function movModelListener(socket) {
    socket.on('movModel', function (data) {
        udpSend(
            prepareData(COMMAND_MOV,data.modelId,data.x,data.y,data.z)
        );
        socket.broadcast.emit('movModel',data);
        modelData[data.modelId] = [data.x,data.y,data.z];
    });
};

function syncModelData(socket){
    socket.on('syncModelData',function(data){
        Object.keys(data).forEach(function(key) {
          modelData[key] = data[key];
        });
        //broadcast the updates and change for other clients to process
        socket.broadcast.emit('syncModelData',data);
    });
}





var systemVariables = {
    'availableId':'0'
};

function syncSystemVariables(socket){
    socket.on('syncSystemVariables',function(data){
        Object.keys(data).forEach(function(key) {
          systemVariables[key] = data[key];
        });
        //broadcast the updates and change for other clients to process
        socket.broadcast.emit('syncSystemVariables',data);
    });
}

io.on('connection',function(socket){
    console.log("client "+socket['id']+" connected");
    
    
    
    socket.on('subscribe',function(roomName){
        socket.join(roomName);
        console.log("client "+socket['id']+" joined room "+roomName);
        
        if(roomName=='webclients'){
            socket.emit('activeDevicesList',activeDevicesList);
        }
    });
    
    socket.on('unsubscribe',function(roomName){
        socket.leave(roomName);
        console.log("client "+socket['id']+" left room "+roomName);
    });
    
    
    
    
    addModelListener(socket);
    delModelListener(socket);
    movModelListener(socket);
    
    syncSystemVariables(socket);
    socket.emit('syncSystemVariables',systemVariables);
    
    syncModelData(socket);
    Object.keys(modelData).forEach(function(key) {
        socket.emit('addModel',{
            'modelId':key,
            'x':modelData[key][0],
            'y':modelData[key][1],
            'z':modelData[key][2]
        });
    });
    
    
    socket.on('register',function(deviceInfo){
        var deviceEntry = {
            'socket':socket['id'],
            'info':deviceInfo
        };
        socket.join(deviceInfo['name']);
        console.log("client "+socket['id']+" added device "+deviceInfo['name']);
        activeDevicesList.push(deviceEntry);
        sycnDeviceList();
        socket.on('raw',function(data){
            socket.broadcast.to(deviceInfo['name']).emit('raw', data);
        });
    });
    
    socket.on('requestInfo',function(deviceName){
        for(var i=0;i<activeDevicesList.length;i++){
            if(activeDevicesList[i].info['name']==deviceName){
                socket.emit('requestInfo',activeDevicesList[i].info);
            }
        }
    });
    
    socket.on('disconnect', function(){
        activeDevicesList.forEach(function(item,index){
            if(item['socket'] == socket['id']){
                //remove from activeDevicesList array
                activeDevicesList.splice(index,1);
                //update web clients with activeDevices list
                sycnDeviceList();
            }
        });
        console.log("client "+socket+" disconnected");
    });
});






function test(){
    var cubeSize = 40;
    for ( var i = 0; i < 20; i ++ ) {
        var tempData = {
            'modelId':i,
            'x':Math.round(Math.random() * 10 - 5)*cubeSize,
            'y':Math.round(Math.random() * 6 - 3)*cubeSize,
            'z':Math.round(Math.random() * 4)*cubeSize+cubeSize/2
        };
        console.log(tempData);
        modelData[tempData.modelId] = [tempData.x,tempData.y,tempData.z];
        udpSend(
            prepareData(COMMAND_ADD,tempData.modelId,tempData.x,tempData.y,tempData.z)
        );
        //io.sockets.emit('addModel',tempData);
    };
};
test();