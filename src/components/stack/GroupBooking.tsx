"use client";

/*
 * The group-booking dropdown: a designed listbox (the ARIA "select-only combobox" pattern) on a non-modal
 * Radix Popover. It does not lock the page's scroll or hide the rest of the page from assistive tech, so
 * opening it costs no full-page style recalculation (Radix Select did, on this long page).
 *
 * Keyboard: on the trigger, Enter, Space, ArrowDown or ArrowUp open it; in the list, the arrows, Home and End
 * move; typing jumps to the next option starting with the typed text ("JB 205", "Map"); Enter or Space
 * chooses; Escape or Tab closes, with focus back on the trigger.
 */
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import type { SeatMapCopy } from "@/content";
import { Emblem } from "@/components/work/Emblem";
import type { ProjectRef } from "./SeatMap";
import styles from "./SeatMap.module.css";

interface Option {
  value: string; // a project slug, or "none"
  label: string;
  project?: ProjectRef;
}

interface Props {
  projects: ProjectRef[];
  value: string | null;
  onChange: (slug: string | null) => void;
  copy: SeatMapCopy;
}

export function GroupBooking({ projects, value, onChange, copy }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  // Every option in display order: "none", then the featured flights, then all the others.
  const { featured, others, options } = useMemo(() => {
    const featured = projects.filter((p) => p.featured);
    const others = projects.filter((p) => !p.featured);
    const options: Option[] = [
      { value: "none", label: copy.groupNone },
      ...[...featured, ...others].map((p) => ({ value: p.slug, label: `${p.flight} ${p.name}`, project: p })),
    ];
    return { featured, others, options };
  }, [copy.groupNone, projects]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === (value ?? "none")));
  const current = value ? options.find((o) => o.value === value) : undefined;
  const optionId = (i: number) => `${id}-option-${i}`;

  const show = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (i: number) => {
    const o = options[i];
    onChange(o.value === "none" ? null : o.value);
    setOpen(false);
  };

  const move = (i: number) => {
    const next = Math.min(options.length - 1, Math.max(0, i));
    setActive(next);
    document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show(e.key === "ArrowUp" ? Math.max(0, selectedIndex - 1) : selectedIndex);
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") move(active + 1);
    else if (e.key === "ArrowUp") move(active - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      // Space continues a typeahead in progress ("JB 2..."), and chooses otherwise.
      if (e.key === " " && e.timeStamp - typed.current.at < 600) return typeahead(e, " ");
      choose(active);
    } else if (e.key === "Tab") {
      setOpen(false);
      return;
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) return typeahead(e, e.key);
    else return;
    e.preventDefault();
  };

  const typeahead = (e: KeyboardEvent, key: string) => {
    e.preventDefault();
    const now = e.timeStamp; // the event's time, on the same clock as performance.now()
    const t = typed.current;
    t.text = now - t.at < 600 ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    // From the active option onwards (so repeating a letter cycles), the first label starting with the text,
    // or containing it after the flight code ("map" finds JB 205 Mapetite).
    const order = [...options.keys()].map((k) => (active + (t.text.length === 1 ? 1 : 0) + k) % options.length);
    const hit =
      order.find((k) => options[k].label.toLowerCase().startsWith(t.text)) ??
      order.find((k) => options[k].project?.name.toLowerCase().startsWith(t.text));
    if (hit !== undefined) move(hit);
  };

  const renderOption = (o: Option, i: number) => (
    <div
      key={o.value}
      id={optionId(i)}
      role="option"
      aria-selected={i === selectedIndex}
      data-slug={o.value}
      data-active={i === active || undefined}
      data-state={i === selectedIndex ? "checked" : undefined}
      className={styles.option}
      onPointerMove={() => active !== i && setActive(i)}
      onClick={() => choose(i)}
    >
      {o.project ? <Emblem emblem={o.project.emblem} size={26} /> : <span className={styles.optionNone} aria-hidden="true" />}
      <span>
        {o.project ? (
          <>
            <span className={styles.optionCode}>{o.project.flight}</span> {o.project.name}
          </>
        ) : (
          o.label
        )}
      </span>
      {i === selectedIndex && o.project ? <Check size={16} strokeWidth={2} className={styles.optionCheck} aria-hidden="true" /> : <span />}
    </div>
  );

  return (
    <Popover.Root open={open} onOpenChange={(next) => (next ? show() : setOpen(false))}>
      <Popover.Trigger asChild>
        <button
          id="group-booking"
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${id}-list` : undefined}
          aria-labelledby="group-booking-label group-booking"
          className={styles.select}
          data-state={open ? "open" : "closed"}
          data-placeholder={current ? undefined : ""}
          onKeyDown={onTriggerKey}
        >
          <span>
            {current?.project ? (
              <>
                <span className={styles.optionCode}>{current.project.flight}</span> {current.project.name}
              </>
            ) : (
              copy.groupPlaceholder
            )}
          </span>
          <span className={styles.selectIcon} aria-hidden="true">
            <ChevronDown size={16} strokeWidth={1.5} />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.selectContent}
          align="start"
          sideOffset={6}
          collisionPadding={16}
          data-lenis-prevent=""
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            listRef.current?.focus({ preventScroll: true });
            requestAnimationFrame(() => document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" }));
          }}
        >
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby="group-booking-label"
            aria-activedescendant={optionId(active)}
            className={styles.selectViewport}
            onKeyDown={onListKey}
          >
            {renderOption(options[0], 0)}
            <div role="group" aria-labelledby={`${id}-featured`}>
              <div id={`${id}-featured`} className={styles.optionHeading} role="presentation">
                {copy.groupHeadings.featured}
              </div>
              {featured.map((_, k) => renderOption(options[1 + k], 1 + k))}
            </div>
            <div role="group" aria-labelledby={`${id}-all`}>
              <div id={`${id}-all`} className={styles.optionHeading} role="presentation">
                {copy.groupHeadings.all}
              </div>
              {others.map((_, k) => renderOption(options[1 + featured.length + k], 1 + featured.length + k))}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
