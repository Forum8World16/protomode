'use strict';

const coreVersion = 1020;

const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const md5 = require('md5-file');
const color = require("rgb");
const base64js = require('base64-js');

//0,32,99 F8 Blue
const dgram = require('dgram');
const udpSocket = dgram.createSocket('udp4');
var udpPortSend = 50000;
var udpPortRecv = 50001;
var udpDestIP = '192.168.1.199';

app.use(express.static(__dirname + '/public')); 

app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/', express.static(__dirname + '/node_modules/bootstrap/dist')); // redirect bootstrap JS, CSS, and fonts
app.use('/js', express.static(__dirname + '/node_modules/three/build')); // redirect three JS
app.use('/js', express.static(__dirname + '/node_modules/three/examples/js')); // redirect three JS

app.get('/udp', function (req, res) {
    udpSendModelData();
    res.send('sending all model data to udp');
})

process.env.PORT = 80;
var port = process.env.PORT || 80;
server.listen(port);

var activeDevicesList = [];
/*
socket:alsdasdflaasdfdgj,
info:{
    type:webserver
    }
*/











//check github.com/esp8266/Arduino/issues/2228 for example
app.get('/update/core',function(req,res){
    //check version somehow

    console.log('a device is requesting an update');
    console.dir(req.headers);
    if(parseInt(req.headers['x-esp8266-version'])!=coreVersion){ //could be <
        var full_path = path.join(__dirname,'/bin/core'+coreVersion+'.bin');
        fs.readFile(full_path,"binary",function(err,file){
            if(err){
                console.log('error uploading new firmware');
                res.writeHeader(500, {"Content-Type": "text/plain"});
                res.write(err + "\n");
                res.end();
            }
            else{
                console.log('uploading new firmware');
                res.writeHeader(200,
                                {"Content-Type": "application/octect-stream",
                                 "Content-Disposition": "attachment;filename="+path.basename(full_path),
                                 "Content-Length": ""+fs.statSync(full_path)["size"],
                                 "x-MD5": md5.sync(full_path)});
                res.write(file, "binary");
                res.end();
            }
        });
    }
    else{
        console.log('not uploading new firmware');
        res.writeHeader(304, {"Content-Type": "text/plain"});
        res.write("304 Not Modified\n");
        res.end();
    }

});


function requestCheckForUpdatesListener(socket){
    socket.on('requestCheckForUpdates',function(){
        console.log('received requestCheckForUpdates');
        io.sockets.emit('checkForUpdate',"");
    });
}

function debugListener(socket){
    socket.on('debug',function(data){
        console.log(data);
    });
}
















udpSocket.on('error', (err) =>{
    console.log('udp socket error:\n${err.stack}');
    console.log('closing the udp socket');
    udpServer.close();
    //TODO add function to restart the udp socket
});

udpSocket.on('message', (msg, rinfo) => {
    console.log('udp socket got: ',msg,' from ',rinfo.address,':',rinfo.port);
    parseData(msg);
});

udpSocket.on('listening', () => {
    const address = udpSocket.address();
    console.log('udp socket listening ',address.address,':',address.port);
});

udpSocket.bind(udpPortRecv, () => {});

var udpData = new Uint8Array(9); //9 bytes in array buffer
//command uint8_t (1 byte)
//cube id, uint16_t (2 bytes)
//x, float (4 bytes)
//y, float (4 bytes)
//z, float (4 bytes)

function prepareData(commandId,cubeId,ix,iy,iz,is,ir,ig,ib){

    //    ix/=8;
    //    iy/=8;
    //    iz/=8;
    //    is/=8;

    var fArr = new Float32Array(4);
    fArr[0] = ix;
    fArr[1] = iz;
    fArr[2] = -iy;
    fArr[3] = is;
    var bArr = new Int8Array(fArr.buffer);

    var oArr = new Uint8Array(22);
    oArr[0] = commandId;
    oArr[1] = (cubeId>>8)& 0xff;
    oArr[2] = (cubeId>>0)& 0xff;
    oArr[3] = bArr[0];
    oArr[4] = bArr[1];
    oArr[5] = bArr[2];
    oArr[6] = bArr[3];
    oArr[7] = bArr[4];
    oArr[8] = bArr[5];
    oArr[9] = bArr[6];
    oArr[10] = bArr[7];
    oArr[11] = bArr[8]; //y
    oArr[12] = bArr[9]; //y
    oArr[13] = bArr[10];//y
    oArr[14] = bArr[11];//y
    oArr[15] = bArr[12];//s
    oArr[16] = bArr[13];//s
    oArr[17] = bArr[14];//s
    oArr[18] = bArr[15];//s
    oArr[19] = (ir<<0)& 0xff;//r
    oArr[20] = (ig<<0)& 0xff;//g
    oArr[21] = (ib<<0)& 0xff;//b

    //console.log(oArr);
    return new Buffer(oArr);
};

function parseData(iArr){
    //console.log(iArr);
    var nBuff = new ArrayBuffer(iArr.length);
    for(var i=0;i<iArr.length;i++){
        nBuff[i] = iArr[i];
    }
    //console.log(nBuff);

    var commandId,cubeId,x,y,z,s,r,g,b;
    commandId = nBuff[0];

    cubeId = (nBuff[1]<<8) + (nBuff[2]);
    //console.log(nBuff[1]);
    //console.log(nBuff[1]<<8);
    //console.log(nBuff[2]);
    //console.log(cubeId);




    var bArr = new Int8Array(4);
    bArr[0] = iArr[3];
    bArr[1] = iArr[4];
    bArr[2] = iArr[5];
    bArr[3] = iArr[6];
    var fArr = new Float32Array(bArr.buffer);
    x = fArr[0];

    bArr[0] = iArr[7];
    bArr[1] = iArr[8];
    bArr[2] = iArr[9];
    bArr[3] = iArr[10];
    var fArr = new Float32Array(bArr.buffer);
    y = fArr[0];

    bArr[0] = iArr[11];
    bArr[1] = iArr[12];
    bArr[2] = iArr[13];
    bArr[3] = iArr[14];
    var fArr = new Float32Array(bArr.buffer);
    z = fArr[0];

    bArr[0] = iArr[15];
    bArr[1] = iArr[16];
    bArr[2] = iArr[17];
    bArr[3] = iArr[18];
    var fArr = new Float32Array(bArr.buffer);
    s = fArr[0];

    r = nBuff[19];
    g = nBuff[20];
    b = nBuff[21];

    var tempData = {
        'modelId':cubeId.toString(),
        'x':x,
        'y':y,
        'z':z,
        's':s,
        'r':r,
        'g':g,
        'b':b
    };

    //console.log(tempData);

    if(commandId == COMMAND_DEL){
        console.log('deleting model ',tempData.modelId);
        io.sockets.emit('delModel',tempData);
        delete modelData[tempData.modelId];
    }

    if(commandId == COMMAND_ADD){
        console.log('adding model ',tempData.modelId);
        io.sockets.emit('addModel',tempData);
        modelData[tempData.modelId] = [tempData.x,tempData.y,tempData.z,tempData.s,tempData.r,tempData.g,tempData.b];
    }

    if(commandId == COMMAND_MOV){
        console.log('moving model ',tempData.modelId);
        io.sockets.emit('movModel',tempData);
        modelData[tempData.modelId] = [tempData.x,tempData.y,tempData.z,tempData.s,tempData.r,tempData.g,tempData.b];
    }

    //console.log('did something');
};

function udpSend(msg){
    udpSocket.send(msg,0,msg.length,udpPortSend,udpDestIP,function(){});
};




var modelData = {
    //'0':[0,0,0,4,0,0,127]
    //'1':[x,y,z,s,r,g,b]
};

const COMMAND_DEL = 0;
const COMMAND_ADD = 1;
const COMMAND_MOV = 2;

function addModelListener(socket) {
    socket.on('addModel', function (data) {
        udpSend(
            prepareData(COMMAND_ADD,data.modelId,data.x,data.y,data.z,data.s,data.r,data.g,data.b)
        );
        socket.broadcast.emit('addModel',data);
        modelData[data.modelId] = [data.x,data.y,data.z,data.s,data.r,data.g,data.b];
    });
};

function delModelListener(socket) {
    socket.on('delModel', function (data) {
        udpSend(
            prepareData(COMMAND_DEL,data.modelId,data.x,data.y,data.z,data.s,data.r,data.g,data.b)
        );
        socket.broadcast.emit('delModel',data);
        delete modelData[data.modelId];
    });
};

function movModelListener(socket) {
    socket.on('movModel', function (data) {
        udpSend(
            prepareData(COMMAND_MOV,data.modelId,data.x,data.y,data.z,data.s,data.r,data.g,data.b)
        );
        socket.broadcast.emit('movModel',data);
        modelData[data.modelId] = [data.x,data.y,data.z,data.s,data.r,data.g,data.b];
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
    'availableId':0
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

    debugListener(socket);
    
    setTimeout(function(){
        socket.emit('checkForUpdate',"");
    },10000);

    socket.on('subscribe',function(roomName){
        socket.join(roomName);
        console.log("client "+socket['id']+" joined room "+roomName);

        if(roomName=='webclient'){
            socket.emit('activeDevicesList',activeDevicesList);
            requestCheckForUpdatesListener(socket);

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
                    'z':modelData[key][2],
                    's':modelData[key][3],
                    'r':modelData[key][4],
                    'g':modelData[key][5],
                    'b':modelData[key][6]
                });
            });
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
        console.log("client "+socket['id']+" disconnected");
    });
});



function udpSendModelData(){
    Object.keys(modelData).forEach(function(key) {
        udpSend(
            prepareData(
                COMMAND_ADD,
                key,
                modelData[key][0],//center x
                modelData[key][1],//center y
                modelData[key][2],//center z
                modelData[key][3],//size
                modelData[key][4],//red
                modelData[key][5],//green
                modelData[key][6] //blue
            )
        );
    });  
};


function test0(){
    var cubeSize = 4;
    for ( var i = 0; i < 20; i ++ ) {
        var tempData = {
            'modelId':i,
            'x':Math.round(Math.random() * 10 - 5)*cubeSize,
            'y':Math.round(Math.random() * 6 - 3)*cubeSize,
            'z':Math.round(Math.random() * 4)*cubeSize+cubeSize/2,
            's':cubeSize*(Math.round(Math.random()*0+1)),
            'r':Math.round(Math.random()*255),
            'g':Math.round(Math.random()*255),
            'b':Math.round(Math.random()*255)
        };
        console.log(tempData);
        modelData[tempData.modelId] = [tempData.x,tempData.y,tempData.z,tempData.s,tempData.r,tempData.g,tempData.b];
        //        udpSend(
        //            prepareData(COMMAND_ADD,tempData.modelId,tempData.x,tempData.y,tempData.z)
        //        );
        //io.sockets.emit('addModel',tempData);
        udpSendModelData();
        systemVariables.availableId = 20;

    };
    console.log(modelData);
};


function test1(){
    console.log("\n *LOADING JSON* \n");
    fs.readFile(__dirname+'/public/data/1.json', 'utf8', function (err, data) {
        if (err) throw err; // we'll not consider error handling for now
        var obj = JSON.parse(data);
        var keys = Object.keys( obj );
        for( var i = 0,length = keys.length; i < length; i++ ) {
            //console.log(obj[ keys[ i ] ]);
            var tArr = obj[keys[i]];
            modelData[keys[i]] = [tArr[0],tArr[1],tArr[2],tArr[3],tArr[4],tArr[5],tArr[6]];
        }
        udpSendModelData();
        systemVariables.availableId = keys.length;
    });

    console.log("\n *DONE LOADING* \n");

}

test0();