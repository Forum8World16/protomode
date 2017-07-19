'use strict';

const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);


app.use(express.static(__dirname + '/public')); 


app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/js', express.static(__dirname + '/node_modules/three/build')); // redirect three JS

var port = process.env.PORT || 5000;
server.listen(port);

var activeDevicesList = [];
/*
socket:alsdfjlaskdgj,
info:{
    name:revB,
    col:3,
    row:5,
    bit:12,
    freq:100,
    smooth:10,
    method:max
    }
*/



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