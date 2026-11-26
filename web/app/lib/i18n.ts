import { useState } from "react";

export type Lang = "en" | "id";

const DICT = {
  en: {
    startMeeting: "Start or join a meeting",
    roomPlaceholder: "Enter room name (e.g. standup-daily)",
    joinNow: "Join meeting",
    randomRoom: "Random room",
    hostSignIn: "Host sign in",
    hostSignedIn: "Host",
    recentRooms: "Active & recent rooms",
    noRooms: "No rooms created yet. Start your first instant meeting above.",
    yourName: "Your display name",
    joinMeeting: "Join room",
    passwordPlaceholder: "Room password (if locked)",
    waitingLobby: "Waiting in lobby",
    waitingDesc: "A host will let you in shortly.",
    mic: "Microphone",
    cam: "Camera",
    shareScreen: "Share screen",
    chat: "Chat",
    polls: "Polls",
    participants: "Participants",
    whiteboard: "Whiteboard",
    breakouts: "Breakout rooms",
    stats: "Speaker stats",
    security: "Security",
    leave: "Leave",
    tileView: "Tile view",
    speakerView: "Speaker view",
    blurBg: "Blur background",
    record: "Record",
    stopRecord: "Stop recording",
    raiseHand: "Raise hand",
    lowerHand: "Lower hand",
    admit: "Admit",
    reject: "Decline",
    send: "Send",
    createPoll: "Create poll",
    vote: "Vote",
    muteAll: "Mute all",
    copyInvite: "Copy invite link",
    copied: "Copied!",
  },
  id: {
    startMeeting: "Mulai atau gabung rapat",
    roomPlaceholder: "Masukkan nama ruang (mis. standup-harian)",
    joinNow: "Gabung rapat",
    randomRoom: "Acak ruang",
    hostSignIn: "Masuk Host",
    hostSignedIn: "Host",
    recentRooms: "Ruang aktif & terbaru",
    noRooms: "Belum ada ruang rapat. Mulai rapat baru di atas.",
    yourName: "Nama tampilan Anda",
    joinMeeting: "Masuk ruang",
    passwordPlaceholder: "Kata sandi ruang (jika terkunci)",
    waitingLobby: "Menunggu di lobi",
    waitingDesc: "Host akan segera mengizinkan Anda masuk.",
    mic: "Mikrofon",
    cam: "Kamera",
    shareScreen: "Bagikan layar",
    chat: "Obrolan",
    polls: "Polling",
    participants: "Peserta",
    whiteboard: "Papan tulis",
    breakouts: "Ruang kelompok",
    stats: "Statistik bicara",
    security: "Keamanan",
    leave: "Keluar",
    tileView: "Tampilan kotak",
    speakerView: "Tampilan pembicara",
    blurBg: "Buramkan latar",
    record: "Rekam",
    stopRecord: "Hentikan rekam",
    raiseHand: "Angkat tangan",
    lowerHand: "Turunkan tangan",
    admit: "Izinkan",
    reject: "Tolak",
    send: "Kirim",
    createPoll: "Buat polling",
    vote: "Pilih",
    muteAll: "Bisukan semua",
    copyInvite: "Salin tautan",
    copied: "Tersalin!",
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
