import AgoraRTC from "agora-rtc-sdk-ng";

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localAudioTrack; 

const APP_ID = "b5f067d91e464121a2cefd6af05e7345";

// وظيفة الدخول للغرفة
export async function joinVoiceRoom(roomName) {
    try {
        await client.join(APP_ID, roomName, null);
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await client.publish([localAudioTrack]);
        console.log("🎤 راك دابا فالمباشر فغرفة: " + roomName);
    } catch (error) {
        console.error("❌ مشكل فالميكروفون:", error);
    }
}

// وظيفة الخروج
export async function leaveVoiceRoom() {
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
    }
    await client.leave();
    console.log("🚪 خرجتي من الغرفة الصوتية.");
}
