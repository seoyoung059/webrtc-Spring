const socket = new WebSocket('ws://localhost:8080/ws');

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initialConstraints);
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

getMedia();

function handleMuteClick() {
    myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick() {
    myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    roomName = input.value;
    await initCall();
    socket.send(JSON.stringify({ type: 'join_room', roomName }));
    console.log('joined room');
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// WebSocket message handling
socket.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data);
    console.log(event.data);
    console.log(message.type);
    switch (message.type) {
        case 'welcome':
            console.log(message.message);
            const offer = await myPeerConnection.createOffer();
            myPeerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({type:'offer', data:offer, roomName}));
            break;
        case 'offer':
            console.log('received offer');
            myPeerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
            const answer = await myPeerConnection.createAnswer();
            myPeerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', data: answer, roomName }));
            console.log('sent the answer');
            break;
        case 'answer':
            console.log('received answer');
            myPeerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
            break;
        case 'ice':
            console.log('received candidate');
            myPeerConnection.addIceCandidate(new RTCIceCandidate(message.data));
            break;
        default:
            break;
    }
});

// WebRTC code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log('send ice candidate');
    socket.send(JSON.stringify({ type: 'ice', data: data.candidate, roomName }));
}

function handleAddStream(data) {
    console.log('got an event from my peer');
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}
