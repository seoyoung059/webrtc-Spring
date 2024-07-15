package study_webrtc.com.demo.handler;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.concurrent.ConcurrentHashMap;

public class WebSocketHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        System.out.println("WebSocket connection established: " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("Received message: " + payload);

        var jsonObject = new org.json.JSONObject(payload);
        String type = jsonObject.getString("type");
        String roomName = jsonObject.getString("roomName");

        switch (type) {
            case "join_room":
                handleJoinRoom(session, roomName);
                break;
            case "offer":
            case "answer":
            case "ice":
                var data = jsonObject.optJSONObject("data");
                if (data != null) {
                    switch (type) {
                        case "offer":
                            System.out.println("offer");
                            handleRtcOffer(session, roomName, data.toString());
                            break;
                        case "answer":
                            System.out.println("answer");
                            handleRtcAnswer(session, roomName, data.toString());
                            break;
                        case "ice":
                            System.out.println("ice");
                            handleIceCandidate(session, roomName, data.toString());
                            break;
                    }
                }
                break;
            default:
                break;
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    private void handleJoinRoom(WebSocketSession session, String roomName) throws Exception {
        session.sendMessage(new TextMessage("{\"type\":\"welcome\",\"message\":\"Welcome to room: " + roomName + "\"}"));
        System.out.println("Joined room: " + roomName);
    }

    private void handleRtcOffer(WebSocketSession session, String roomName, String offer) throws Exception {
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen() && !s.getId().equals(session.getId())) {
                s.sendMessage(new TextMessage("{\"type\":\"offer\",\"data\":" + offer + "}"));
            }
        }
        System.out.println("Sent offer to room: " + roomName);
    }

    private void handleRtcAnswer(WebSocketSession session, String roomName, String answer) throws Exception {
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen() && !s.getId().equals(session.getId())) {
                s.sendMessage(new TextMessage("{\"type\":\"answer\",\"data\":" + answer + "}"));
            }
        }
        System.out.println("Sent answer to room: " + roomName);
    }

    private void handleIceCandidate(WebSocketSession session, String roomName, String candidate) throws Exception {
        for (WebSocketSession s : sessions.values()) {
            if (s.isOpen() && !s.getId().equals(session.getId())) {
                s.sendMessage(new TextMessage("{\"type\":\"ice\",\"data\":" + candidate + "}"));
            }
        }
        System.out.println("Sent ICE candidate to room: " + roomName);
    }
}
