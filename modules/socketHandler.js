const {Server} = require('socket.io');
const { verifyToken } = require('../src/jwt');
const { parseCookies } = require('../src/utils/cookie');

const socketHandler = (server) => {

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    const JWT_SECRET = process.env.JWT_SECRET;
    
    // 방 목록 관리
    const rooms = new Map(); // roomName -> { creator, createdAt, userCount }
    
    // 방 목록을 모든 클라이언트에게 전송하는 함수
    function broadcastRoomList() {
        const roomList = Array.from(rooms.entries()).map(([name, info]) => ({
            name,
            creator: info.creator,
            createdAt: info.createdAt,
            userCount: info.userCount
        }));
        io.emit('room_list_update', roomList);
    }
    
    // 방 참여자 수 업데이트 함수
    function updateRoomUserCount(roomName) {
        if (rooms.has(roomName)) {
            const room = io.sockets.adapter.rooms.get(roomName);
            rooms.get(roomName).userCount = room ? room.size : 0;
        }
    }
    
    io.on('connection', (socket) => {
        console.log('New connection attempt:', socket.id);
        
        // 쿠키에서 토큰 추출
        const req = socket.request;
        const token = parseCookies(req);
        
        console.log('Token from cookies:', token ? 'Present' : 'Missing');
        
        if (!token) {
            console.log('No token found, disconnecting socket');
            return socket.disconnect();
        }
        
        try {
            const user = verifyToken(token, JWT_SECRET);
            if (!user) {
                console.log('Invalid token, disconnecting socket');
                return socket.disconnect();
            }
            
            console.log(`User ${user.username} connected`);
            
            // 사용자 정보를 소켓에 저장
            socket.user = user;
            
            // 연결 시 기존 방 목록 전송
            const roomList = Array.from(rooms.entries()).map(([name, info]) => ({
                name,
                creator: info.creator,
                createdAt: info.createdAt,
                userCount: info.userCount
            }));
            socket.emit('room_list_update', roomList);
            
            socket.on('disconnect', () => {
                console.log(`User ${user.username} disconnected`);
                // 사용자가 연결 해제될 때 참여 중인 방의 사용자 수 업데이트
                if (socket.currentRoom) {
                    updateRoomUserCount(socket.currentRoom);
                    broadcastRoomList();
                }
            });
            
            // 채팅방 관련 이벤트들
            socket.on('create_room', (roomName) => {
                // 방 이름 유효성 검사
                if (!roomName || typeof roomName !== 'string' || roomName.trim().length === 0) {
                    socket.emit('error', { message: 'Invalid room name' });
                    return;
                }
                
                const trimmedRoomName = roomName.trim();
                
                // 방이 이미 존재하는지 확인
                if (rooms.has(trimmedRoomName)) {
                    socket.emit('error', { message: 'Room already exists' });
                    return;
                }
                
                // 새 방 생성
                rooms.set(trimmedRoomName, {
                    creator: user.username,
                    createdAt: new Date().toISOString(),
                    userCount: 0
                });
                
                console.log(`${user.username} created room: ${trimmedRoomName}`);
                
                // 모든 클라이언트에게 방 목록 업데이트 전송
                broadcastRoomList();
                
                // 방 생성 성공 알림
                socket.emit('room_created', { roomName: trimmedRoomName });
            });
            
            socket.on('delete_room', (roomName) => {
                // 방 이름 유효성 검사
                if (!roomName || typeof roomName !== 'string' || roomName.trim().length === 0) {
                    socket.emit('error', { message: 'Invalid room name' });
                    return;
                }
                
                const trimmedRoomName = roomName.trim();
                
                // 방이 존재하지 않으면 에러
                if (!rooms.has(trimmedRoomName)) {
                    socket.emit('error', { message: 'Room does not exist' });
                    return;
                }
                
                // 방 생성자만 삭제 가능
                const roomInfo = rooms.get(trimmedRoomName);
                if (roomInfo.creator !== user.username) {
                    socket.emit('error', { message: 'Only room creator can delete the room' });
                    return;
                }
                
                // 방에 참여 중인 모든 사용자에게 방 삭제 알림
                io.to(trimmedRoomName).emit('room_deleted', { roomName: trimmedRoomName });
                
                // 방 삭제
                rooms.delete(trimmedRoomName);
                
                console.log(`${user.username} deleted room: ${trimmedRoomName}`);
                
                // 모든 클라이언트에게 방 목록 업데이트 전송
                broadcastRoomList();
            });
            socket.on('join_room', (roomName) => {
                // 방 이름 유효성 검사
                if (!roomName || typeof roomName !== 'string' || roomName.trim().length === 0) {
                    socket.emit('error', { message: 'Invalid room name' });
                    return;
                }
                
                const trimmedRoomName = roomName.trim();
                
                // 방이 존재하지 않으면 에러
                if (!rooms.has(trimmedRoomName)) {
                    socket.emit('error', { message: 'Room does not exist' });
                    return;
                }
                
                socket.join(trimmedRoomName);
                socket.currentRoom = trimmedRoomName;
                console.log(`${user.username} joined room: ${trimmedRoomName}`);
                
                // 사용자 수 업데이트
                updateRoomUserCount(trimmedRoomName);
                broadcastRoomList();
                
                // 방에 참여했다는 알림을 다른 사용자들에게 전송
                socket.to(trimmedRoomName).emit('user_joined', {
                    username: user.username,
                    roomName: trimmedRoomName,
                    timestamp: new Date().toISOString()
                });
            });
            
            socket.on('leave_room', (roomName) => {
                socket.leave(roomName);
                if (socket.currentRoom === roomName) {
                    socket.currentRoom = null;
                }
                console.log(`${user.username} left room: ${roomName}`);
                
                // 사용자 수 업데이트
                updateRoomUserCount(roomName);
                broadcastRoomList();
                
                // 방을 나갔다는 알림을 다른 사용자들에게 전송
                socket.to(roomName).emit('user_left', {
                    username: user.username,
                    roomName: roomName,
                    timestamp: new Date().toISOString()
                });
            });
            
            socket.on('send_message', (data) => {
                // 메시지 유효성 검사
                if (!socket.currentRoom) {
                    socket.emit('error', { message: 'You must join a room first' });
                    return;
                }
                
                if (!data || !data.message || typeof data.message !== 'string') {
                    socket.emit('error', { message: 'Invalid message' });
                    return;
                }
                
                const trimmedMessage = data.message.trim();
                if (trimmedMessage.length === 0) {
                    socket.emit('error', { message: 'Message cannot be empty' });
                    return;
                }
                
                if (trimmedMessage.length > 500) {
                    socket.emit('error', { message: 'Message too long (max 500 characters)' });
                    return;
                }
                
                const messageData = {
                    username: user.username,
                    message: trimmedMessage,
                    timestamp: new Date().toISOString()
                };
                
                io.to(socket.currentRoom).emit('new_message', messageData);
                console.log(`${user.username} sent message in ${socket.currentRoom}: ${trimmedMessage.substring(0, 50)}...`);
            });
            
        } catch (e) {
            console.error('Token verification failed:', e);
            socket.disconnect();
        }
    });

    io.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
    });
}


module.exports = socketHandler;