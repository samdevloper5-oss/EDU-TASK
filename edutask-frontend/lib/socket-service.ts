import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

let socket: Socket | null = null;

export const initSocket = (token: string) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        withCredentials: true,
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected");
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
