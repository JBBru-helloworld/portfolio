import type { Landing } from "./types";

export const landing: Landing = {
  sceneLabel: "The view from a dark aircraft cabin window, looking out over clouds",
  scrollCue: "Scroll",
  skipIntro: "Skip intro",
  flightDeck: {
    serverGreeting: "Welcome aboard",
    suffix: "from the flight deck",
    srTemplate: "{greeting} from the flight deck",
    // The visitor's own clock: morning 05:00 to 11:59, afternoon 12:00 to 17:59, evening 18:00 to 04:59.
    hours: { morning: 5, afternoon: 12, evening: 18 },
    // English first, then the owner's journey, then German, Japanese, Korean and Spanish. Checked against
    // language references (Phase 5d): French uses "Bonjour" in the
    // afternoon ("Bon après-midi" is said when leaving, not on arrival); Malay "Selamat petang" covers the
    // afternoon ("Selamat tengah hari" only around midday).
    greetings: [
      { language: "English", morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
      { language: "French", morning: "Bonjour", afternoon: "Bonjour", evening: "Bonsoir" },
      { language: "Afrikaans", morning: "Goeiemôre", afternoon: "Goeiemiddag", evening: "Goeienaand" },
      {
        language: "Mauritian Creole",
        morning: "Bonzour",
        afternoon: "Bonzour",
        evening: "Bonswar",
        check: "CHECK(owner): confirm the Mauritian Creole greetings.",
      },
      { language: "Malay", morning: "Selamat pagi", afternoon: "Selamat petang", evening: "Selamat malam" },
      { language: "Mandarin", morning: "早上好", afternoon: "下午好", evening: "晚上好" },
      {
        language: "isiZulu",
        morning: "Sawubona",
        afternoon: "Sawubona",
        evening: "Sawubona",
        check: "CHECK(owner): confirm Sawubona for every time of day.",
      },
      // Then four more (Phase 5d): Spanish "Buenas noches" is the greeting from dusk as well as the
      // goodnight; Korean 안녕하세요 serves all day.
      { language: "German", morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend" },
      { language: "Japanese", morning: "おはようございます", afternoon: "こんにちは", evening: "こんばんは" },
      { language: "Korean", morning: "안녕하세요", afternoon: "안녕하세요", evening: "안녕하세요" },
      { language: "Spanish", morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches" },
    ],
    lines: { flight: "Flight JB 001 · Captain J. Bonham", cruising: "Cruising at 38,000 ft", localTime: "Your local time" },
    altitude: 38000,
  },
  passenger: { label: "You are passenger Nº", srTemplate: "You are passenger number {n}" },
};
