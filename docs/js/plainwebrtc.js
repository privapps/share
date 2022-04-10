var conf = {} // iceServers: [{ "urls": "stun:stun.l.google.com:19302" }] };
var initiator = false;
var firstUrl = true
var pc = new RTCPeerConnection(conf);
var localStream, _fileChannel, chatEnabled, context, source,
    _chatChannel, sendFileDom = {},
    recFileDom = {},
    receiveBuffer = [],
    receivedSize = 0,
    file,
    bytesPrev = 0;

function errHandler(err) {
    console.log(err);
}

function sendMsg() {
    var text = sendTxt.value;
    chat.innerHTML = "<pre><span class='tm'>" + new Date().toLocaleTimeString() + "</span><span class=sent>" + text + "</span></pre>" + chat.innerHTML;
    _chatChannel.send(text);
    sendTxt.value = "";
    return false;
}
pc.ondatachannel = function(e) {
    if (e.channel.label == "fileChannel") {
        console.log('fileChannel Received -', e);
        _fileChannel = e.channel;
        fileChannel(e.channel);
    }
    if (e.channel.label == "chatChannel") {
        console.log('chatChannel Received -', e);
        _chatChannel = e.channel;
        chatChannel(e.channel);
    }
};

pc.onicecandidate = function(e) {
    var cand = e.candidate;
    if (!cand) {
        //console.log('iceGatheringState complete\n', pc.localDescription.sdp);
        localOffer.value = JSON.stringify(pc.localDescription);
        if (!initiator && localOffer.value.length > 10) { // accepter send info back as last step
            const url = getSignalUrl()
            signalSync(url, localOffer.value).then(() => {})
        }
    } else {
        console.log(cand.candidate);
    }
}
pc.oniceconnectionstatechange = function() {
    console.log('iceconnectionstatechange: ', pc.iceConnectionState);
    pstatus.innerHTML = pc.iceConnectionState
    const ok = pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed'

    Array.from(document.getElementsByClassName('btn')).forEach(element => {
        element.disabled = ok
    })
    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        pstatus.innerHTML += '! Refresh the Page!'
    } else if (!ok) {
        operation.style.display = "block"
    }

}

pc.onaddstream = function(e) {
    console.log('remote onaddstream', e.stream);
    remote.srcObject = e.stream;
}
pc.onconnection = function(e) {
    console.log('onconnection ', e);
}

remoteOfferGot.onclick = function() {
    var _remoteOffer = new RTCSessionDescription(JSON.parse(remoteOffer.value));
    // console.log('remoteOffer \n', _remoteOffer);
    pc.setRemoteDescription(_remoteOffer).then(function() {
        console.log('setRemoteDescription ok');
        if (_remoteOffer.type == "offer") {
            pc.createAnswer().then(function(description) {
                // console.log('createAnswer 200 ok \n', description);
                pc.setLocalDescription(description).then(() => {}).catch(errHandler);
            }).catch(errHandler);
        }
    }).catch(errHandler);
}
localOfferSet.onclick = function() {
    _chatChannel = pc.createDataChannel('chatChannel');
    _fileChannel = pc.createDataChannel('fileChannel');
    // _fileChannel.binaryType = 'arraybuffer';
    chatChannel(_chatChannel);
    fileChannel(_fileChannel);
    pc.createOffer().then(des => {
        console.log('createOffer ok ');
        pc.setLocalDescription(des).then(() => {
            const senderInfo = JSON.stringify(pc.localDescription);
            if (localOffer.value.length < 1 && senderInfo.length > 10) {
                localOffer.value = senderInfo
            }
            const url = getSignalUrl()
            signalSync(url, senderInfo).then(f => {
                f.text().then(() => {
                    signalSync(getSignalUrl(), null).then(r => {
                        console.log('got', r)
                        r.text().then(txt => {
                            console.log('recieved remote', txt)
                            remoteOffer.value = txt
                            remoteOfferGot.onclick()
                        })
                    })
                })
            })
            console.log('setLocalDescription ok', pc.localDescription);
        }).catch(errHandler);
        // For chat
    }).catch(errHandler);
}
detailOps.onclick = () => {
    if (details.style.display === "none") {
        details.style.display = "block";
    } else {
        details.style.display = "none";
    }
}

//File transfer
fileTransfer.onchange = function(e) {
    var files = fileTransfer.files;
    if (files.length > 0) {
        file = files[0];
        sendFileDom.name = file.name;
        sendFileDom.size = file.size;
        sendFileDom.type = file.type;
        sendFileDom.fileInfo = "areYouReady";
        console.log(sendFileDom);
    } else {
        console.log('No file selected');
    }
}

function sendFile() {
    if (!fileTransfer.value) return;
    var fileInfo = JSON.stringify(sendFileDom);
    _fileChannel.send(fileInfo);
    console.log('file info sent');
}


function fileChannel(e) {
    _fileChannel.onopen = function(e) {
        console.log('file channel is open', e);
    }
    _fileChannel.onmessage = function(e) {
        // Figure out data type
        var type = Object.prototype.toString.call(e.data),
            data;
        if (type == "[object ArrayBuffer]") {
            data = e.data;
            receiveBuffer.push(data);
            receivedSize += data.byteLength;
            recFileProg.value = receivedSize;
            if (receivedSize == recFileDom.size) {
                var received = new window.Blob(receiveBuffer);
                file_download.href = URL.createObjectURL(received);
                file_download.innerHTML = "download";
                file_download.download = recFileDom.name;
                file_download.classList.add("button")
                file_download.classList.add("success")
                file_download.classList.add("fill-all")
                    // rest
                receiveBuffer = [];
                receivedSize = 0;
                // clearInterval(window.timer);	
            }
        } else if (type == "[object String]") {
            data = JSON.parse(e.data);
        } else if (type == "[object Blob]") {
            data = e.data;
            file_download.href = URL.createObjectURL(data);
            file_download.innerHTML = "download";
            file_download.download = recFileDom.name;
        }

        // Handle initial msg exchange
        if (data.fileInfo) {
            if (data.fileInfo == "areYouReady") {
                recFileDom = data;
                recFileProg.max = data.size;
                var sendData = JSON.stringify({ fileInfo: "readyToReceive" });
                _fileChannel.send(sendData);
                // window.timer = setInterval(function(){
                // 	Stats();
                // },1000)				
            } else if (data.fileInfo == "readyToReceive") {
                sendFileProg.max = sendFileDom.size;
                sendFileinChannel(); // Start sending the file
            }
            console.log('_fileChannel: ', data.fileInfo);
        }
    }
    _fileChannel.onclose = function() {
        console.log('file channel closed');
    }
}

function chatChannel(e) {
    _chatChannel.onopen = function(e) {
        console.log('chat channel is open', e);
    }
    _chatChannel.onmessage = function(e) {
        chat.innerHTML = "<pre><span class='tm'>" + new Date().toLocaleTimeString() + "</span><code>" + e.data + "</code></pre>" + chat.innerHTML
    }
    _chatChannel.onclose = function() {
        console.log('chat channel closed');
    }
}

function sendFileinChannel() {
    var chunkSize = 16384;
    var sliceFile = function(offset) {
        var reader = new window.FileReader();
        reader.onload = (function() {
            return function(e) {
                _fileChannel.send(e.target.result);
                if (file.size > offset + e.target.result.byteLength) {
                    window.setTimeout(sliceFile, 0, offset + chunkSize);
                }
                sendFileProg.value = offset + e.target.result.byteLength
            };
        })(file);
        var slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    };
    sliceFile(0);
}

function Stats() {
    pc.getStats(null, function(stats) {
        for (var key in stats) {
            var res = stats[key];
            console.log(res.type, res.googActiveConnection);
            if (res.type === 'googCandidatePair' &&
                res.googActiveConnection === 'true') {
                // calculate current bitrate
                var bytesNow = res.bytesReceived;
                console.log('bit rate', (bytesNow - bytesPrev));
                bytesPrev = bytesNow;
            }
        }
    });
}

function roleChange(bt) {
    rolei.disabled = true
    rolea.disabled = true
    if (bt.value === 'i') {
        initiator = true
        localOfferSet.onclick()
    } else if (bt.value === 'a') {
        const url = getSignalUrl()
        signalSync(url, null).then(r => {
            r.text().then(data => {
                remoteOffer.value = data
                remoteOfferGot.onclick()
            })
        })
    }
}

function signalSync(url, data) {
    console.log('re', url, data === null, data)
    debug.innerHTML = debug.innerHTML + '<br/>' + url
    return fetch(url, {
        method: data === null ? 'GET' : 'POST',
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache',
        body: data
    })
}

function getSignalUrl() {
    var r = firstUrl ? window.location.href + uniqStr.value :
        uniqStr.value + window.location.href
    firstUrl = false
    const d = new Date()
    const salt = d.getFullYear().toString() + d.getMonth().toString()
    return piping.value + salt + r.replace(/[\W]+/g, "_")
}
(function() {
    rolei.disabled = false
    rolea.disabled = false
    details.style.display = "none";
    operation.style.display = "none"
    Array.from(document.getElementsByClassName('btn')).forEach(element => {
        element.disabled = true
    });
    rolei.checked = false
    rolea.checked = false
    localOffer.value = ''
    remoteOffer.value = ''
    setTimeout(() => {
        getIPs().then(ip => {
            if (ip !== undefined && ip.length > 0) {
                uniqStr.value = ip[ip.length - 1].toString()
            }
        })
    }, 10)
    firstUrl = true
    fileTransfer.file = []
})();
