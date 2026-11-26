export async function deriveRoomAesKey(passphrase: string, room: string, generation = 1): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode(`nova-e2ee:${room}:${generation}`),
      info: enc.encode("nova-media-frame-aes-256-gcm"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function supportsEncodedInsertableStreams(): boolean {
  const proto = RTCRtpSender.prototype as unknown as { createEncodedStreams?: unknown };
  return typeof proto.createEncodedStreams === "function";
}

export function attachSenderE2ee(sender: RTCRtpSender, key: CryptoKey): void {
  const anySender = sender as unknown as {
    createEncodedStreams?: () => { readable: ReadableStream; writable: WritableStream };
  };
  if (typeof anySender.createEncodedStreams !== "function") return;
  const { readable, writable } = anySender.createEncodedStreams();
  const transform = new TransformStream({
    async transform(frame: { data: ArrayBuffer }, controller) {
      try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, frame.data);
        const out = new Uint8Array(12 + ct.byteLength);
        out.set(iv, 0);
        out.set(new Uint8Array(ct), 12);
        frame.data = out.buffer;
      } catch {
        // pass through on failure
      }
      controller.enqueue(frame);
    },
  });
  readable.pipeThrough(transform).pipeTo(writable).catch(() => undefined);
}

export function attachReceiverE2ee(receiver: RTCRtpReceiver, key: CryptoKey): void {
  const anyReceiver = receiver as unknown as {
    createEncodedStreams?: () => { readable: ReadableStream; writable: WritableStream };
  };
  if (typeof anyReceiver.createEncodedStreams !== "function") return;
  const { readable, writable } = anyReceiver.createEncodedStreams();
  const transform = new TransformStream({
    async transform(frame: { data: ArrayBuffer }, controller) {
      try {
        const buf = new Uint8Array(frame.data);
        if (buf.byteLength > 28) {
          const iv = buf.slice(0, 12);
          const ct = buf.slice(12);
          frame.data = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
        }
      } catch {
        // drop/skip decrypt error cleanly
      }
      controller.enqueue(frame);
    },
  });
  readable.pipeThrough(transform).pipeTo(writable).catch(() => undefined);
}
