import type { DutyFreeCopy } from "./types";

/** Labels for the Contact section (Gate 6), styled as Duty free: the last stop before the gate. */
export const dutyFree: DutyFreeCopy = {
  label: "DUTY FREE",
  line: "Before you fly, take something with you.",
  products: {
    resume: { tag: "RESUME · PDF", action: "TAKE AWAY →", name: "Resume (PDF)" },
    email: { tag: "EMAIL", action: "WRITE TO ME →", name: "Email" },
    linkedin: { tag: "LINKEDIN", action: "CONNECT →", name: "LinkedIn" },
    github: { tag: "GITHUB", action: "BROWSE THE CODE →", name: "GitHub" },
    instagram: { tag: "INSTAGRAM", action: "FOLLOW →", name: "Instagram" },
  },
  copy: { idle: "COPY", done: "COPIED", label: "Copy the email address" },
  // Shown only without JavaScript (the address itself is assembled in the browser).
  emailFallback: "jb.brubusiness3 [at] gmail.com",
};
