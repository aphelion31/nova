import { useState } from "react";

export type Lang = "en" | "id";

const DICT = {
  en: {
    welcomeTitle: "Nova Meet",
    welcomeSubtitle: "Secure and high quality meetings",
    startMeeting: "Start meeting",
    roomPlaceholder: "Enter a name for your meeting",
    joinNow: "Start meeting",
    randomRoom: "Generate room name",
    hostSignIn: "Host sign in",
    hostSignedIn: "Host",
    recentTab: "Recent",
    activeRoomsTab: "Active rooms",
    noRecent: "Your recent meetings will appear here once you join a room.",
    noRooms: "No rooms created yet. Start your first instant meeting above.",
    prejoinTitle: "Join meeting",
    yourName: "Your display name",
    joinMeeting: "Join meeting",
    joinWithoutAudio: "Join without audio",
    joinAudioOnly: "Join audio-only",
    passwordPlaceholder: "Enter password",
    waitingLobby: "Waiting in lobby",
    waitingDesc: "The moderator has not admitted you yet.",
    mic: "Mute / Unmute",
    cam: "Start / Stop camera",
    shareScreen: "Share screen",
    chat: "Chat",
    polls: "Polls",
    closedCaptions: "Closed captions",
    files: "Files",
    participants: "Participants",
    inviteSomeone: "Invite Someone",
    whiteboard: "Whiteboard",
    sharedVideo: "Share a video",
    breakouts: "Breakout rooms",
    stats: "Speaker stats",
    security: "Security options",
    settings: "Settings",
    shortcuts: "View shortcuts",
    fullscreen: "Toggle full screen",
    pip: "Picture-in-picture",
    videoQuality: "Manage video quality",
    virtualBackground: "Select background",
    leave: "Leave meeting",
    endForAll: "End meeting for all",
    tileView: "Toggle tile view",
    record: "Start local recording",
    stopRecord: "Stop recording",
    raiseHand: "Raise hand",
    lowerHand: "Lower hand",
    admit: "Admit",
    reject: "Decline",
    send: "Send",
    createPoll: "Create a poll",
    vote: "Vote",
    muteAll: "Mute everyone",
    copyInvite: "Copy meeting link",
    copied: "Copied!",
    feedbackTitle: "How was the call quality?",
    feedbackThanks: "Thank you for the feedback!",
  },
  id: {
    welcomeTitle: "Nova Meet",
    welcomeSubtitle: "Rapat video aman dan berkualitas tinggi",
    startMeeting: "Mulai rapat",
    roomPlaceholder: "Masukkan nama untuk rapat Anda",
    joinNow: "Mulai rapat",
    randomRoom: "Acak nama ruang",
    hostSignIn: "Masuk Host",
    hostSignedIn: "Host",
    recentTab: "Terbaru",
    activeRoomsTab: "Ruang aktif",
    noRecent: "Riwayat rapat Anda akan tampil di sini setelah bergabung.",
    noRooms: "Belum ada ruang rapat. Mulai rapat baru di atas.",
    prejoinTitle: "Gabung rapat",
    yourName: "Nama tampilan Anda",
    joinMeeting: "Gabung rapat",
    joinWithoutAudio: "Gabung tanpa audio",
    joinAudioOnly: "Gabung audio saja",
    passwordPlaceholder: "Masukkan kata sandi",
    waitingLobby: "Menunggu di lobi",
    waitingDesc: "Moderator belum mengizinkan Anda masuk.",
    mic: "Bisukan / Aktifkan mik",
    cam: "Nyalakan / Matikan kamera",
    shareScreen: "Bagikan layar",
    chat: "Obrolan",
    polls: "Polling",
    closedCaptions: "Teks langsung",
    files: "Berkas",
    participants: "Peserta",
    inviteSomeone: "Undang Peserta",
    whiteboard: "Papan tulis",
    sharedVideo: "Bagikan video",
    breakouts: "Ruang kelompok",
    stats: "Statistik bicara",
    security: "Opsi keamanan",
    settings: "Pengaturan",
    shortcuts: "Pintasan keyboard",
    fullscreen: "Layar penuh",
    pip: "Gambar-dalam-gambar",
    videoQuality: "Atur kualitas video",
    virtualBackground: "Pilih latar belakang",
    leave: "Keluar rapat",
    endForAll: "Akhiri rapat untuk semua",
    tileView: "Tampilan kotak",
    record: "Rekam lokal",
    stopRecord: "Hentikan rekam",
    raiseHand: "Angkat tangan",
    lowerHand: "Turunkan tangan",
    admit: "Izinkan",
    reject: "Tolak",
    send: "Kirim",
    createPoll: "Buat polling",
    vote: "Pilih",
    muteAll: "Bisukan semua",
    copyInvite: "Salin tautan rapat",
    copied: "Tersalin!",
    feedbackTitle: "Bagaimana kualitas panggilan ini?",
    feedbackThanks: "Terima kasih atas masukan Anda!",
  },
} as const;

export function useLang() {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("nova.lang");
      if (saved === "id" || saved === "en") return saved;
    } catch {
      // ignore storage failure
    }
    return "en";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem("nova.lang", next);
    } catch {
      // ignore storage failure
    }
  };

  return { lang, setLang, t: DICT[lang] };
}
