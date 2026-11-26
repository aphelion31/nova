export function emitExternalEvent(room: string, event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ source: "nova-embed", room, event, payload }, "*");
}

export interface ExternalCommandHandlers {
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleShareScreen?: () => void;
  onToggleChat?: () => void;
  onToggleTileView?: () => void;
  onToggleRaiseHand?: () => void;
  onToggleWhiteboard?: () => void;
  onHangup?: () => void;
  onSendChat?: (body: string) => void;
  onDisplayName?: (name: string) => void;
  onSubject?: (subject: string) => void;
  onPassword?: (password: string) => void;
  onMuteEveryone?: () => void;
}

export function subscribeExternalCommands(handlers: ExternalCommandHandlers): () => void {
  const onMsg = (ev: MessageEvent) => {
    const data = ev.data;
    if (!data || data.source !== "nova-external-api") return;
    const args: unknown[] = Array.isArray(data.args) ? data.args : [];
    switch (data.command) {
      case "toggle-audio":
        handlers.onToggleAudio?.();
        break;
      case "toggle-video":
        handlers.onToggleVideo?.();
        break;
      case "toggle-share-screen":
        handlers.onToggleShareScreen?.();
        break;
      case "toggle-chat":
        handlers.onToggleChat?.();
        break;
      case "toggle-tile-view":
        handlers.onToggleTileView?.();
        break;
      case "toggle-raise-hand":
        handlers.onToggleRaiseHand?.();
        break;
      case "toggle-whiteboard":
        handlers.onToggleWhiteboard?.();
        break;
      case "video-hangup":
        handlers.onHangup?.();
        break;
      case "send-chat-message":
        if (typeof args[0] === "string") handlers.onSendChat?.(args[0]);
        break;
      case "display-name":
        if (typeof args[0] === "string") handlers.onDisplayName?.(args[0]);
        break;
      case "subject":
        if (typeof args[0] === "string") handlers.onSubject?.(args[0]);
        break;
      case "password":
        if (typeof args[0] === "string") handlers.onPassword?.(args[0]);
        break;
      case "mute-everyone":
        handlers.onMuteEveryone?.();
        break;
      default:
        break;
    }
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}
