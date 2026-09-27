import { callApi } from "@/lib/api";
import type { Schema } from "@/lib/api-types";

/** The same STUN server the voice service uses: both sides are behind a NAT. */
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

/** The voice service takes the whole offer at once, with every candidate in it. */
const GATHERING_LIMIT_MS = 3000;

export interface Rehearsal {
  /** The Owner hangs up. */
  stop(): void;
}

/**
 * Opens a rehearsal of a Call: the Owner's microphone goes to the Public Agent's voice,
 * and its answer plays in the page. `onEnded` runs once, however it ends, and says whether
 * the audio could not connect (a network that blocks it).
 */
export async function startRehearsal(onEnded: (failed: boolean) => void): Promise<Rehearsal> {
  const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const speaker = new Audio();
  speaker.autoplay = true;

  let ended = false;
  const release = () => {
    ended = true;
    connection.close();
    microphone.getTracks().forEach((track) => track.stop());
    speaker.srcObject = null;
  };
  const end = (failed: boolean) => {
    if (ended) return;
    release();
    onEnded(failed);
  };

  connection.ontrack = (event) => {
    speaker.srcObject = event.streams[0] ?? new MediaStream([event.track]);
  };
  // "disconnected" may be a passing network blip; ICE recovers from it on its own.
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "failed") end(true);
    if (connection.connectionState === "closed") end(false);
  };

  try {
    microphone.getTracks().forEach((track) => connection.addTrack(track, microphone));
    await connection.setLocalDescription(await connection.createOffer());
    await gathered(connection);
    const { sdp_answer } = await callApi<Schema<"RehearsalAnswer">>("/dashboard/calls/rehearsal", {
      method: "POST",
      body: JSON.stringify({ sdp_offer: connection.localDescription?.sdp }),
    });
    await connection.setRemoteDescription({ type: "answer", sdp: sdp_answer });
  } catch (error) {
    release();
    throw error;
  }
  return { stop: () => end(false) };
}

function gathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    connection.addEventListener("icegatheringstatechange", check);
    setTimeout(done, GATHERING_LIMIT_MS);
  });
}
