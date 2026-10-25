import type { DutyFreeCopy } from "./types";

/** Labels for the Contact section (Gate 6), styled as Duty free: the last stop before the gate. */
export const dutyFree: DutyFreeCopy = {
  label: "DUTY FREE",
  line: "Before you fly, take something with you.",
  // Each `name` (the link's accessible name) follows its tag word for word, so the visible words come first.
  products: {
    resume: { tag: "RESUME · PDF", action: "TAKE AWAY →", name: "Resume, PDF, take away" },
    email: { tag: "EMAIL", action: "WRITE TO ME →", name: "Email, write to me" },
    linkedin: { tag: "LINKEDIN", action: "CONNECT →", name: "LinkedIn, connect" },
    github: { tag: "GITHUB", action: "BROWSE THE CODE →", name: "GitHub, browse the code" },
    instagram: { tag: "INSTAGRAM", action: "FOLLOW →", name: "Instagram, follow" },
    x: { tag: "X", action: "FOLLOW →", name: "X, follow" },
  },
  copy: { idle: "COPY", done: "COPIED", label: "Copy the email address" },
  // Shown only without JavaScript (the address itself is assembled in the browser).
  emailFallback: "jb.brubusiness3 [at] gmail.com",
};
