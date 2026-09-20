"use client";

import { useEffect, useId, useRef, useState } from "react";

type Topic = { q: string; a: string };

/**
 * Written against the actual screens rather than generated, so nothing here
 * can drift into describing a site that doesn't exist. If a label changes,
 * change it here too.
 */
const PLAYER_TOPICS: Topic[] = [
  {
    q: "How do I RSVP?",
    a: "Open the RSVP link for that game — the one shared in the group chat. Pick your name from the list, then tap I'm in, Maybe, or Can't make it. No account needed. Your browser remembers you, so next week your name is already selected.",
  },
  {
    q: "My name isn't in the list",
    a: "Only a league admin can add people to the roster, so message them and they'll add you. You'll be in the list straight away — no need for a new link.",
  },
  {
    q: "Which team am I on?",
    a: "You're put on your usual team automatically when you RSVP, and the confirmation tells you which one. Both rosters are also on the home page under \"Who's in\".",
  },
  {
    q: "Can I change my RSVP?",
    a: "Yes, as many times as you like right up until the game starts. Open the same link again and pick a different answer.",
  },
  {
    q: "Can I RSVP for games further ahead?",
    a: "Yes. The home page lists the upcoming games and the Schedule page lists them all, each with its own RSVP button. You can answer for several Fridays in one sitting.",
  },
  {
    q: "How do I update my stats?",
    a: "Go to the Stats tab. In the \"Your stats\" box, choose the game and your name, type in your goals and assists, then Save my line. The tables below update immediately. Goalies also get boxes for goals against and shots against.",
  },
  {
    q: "I entered the wrong numbers",
    a: "Use the same box on the Stats tab and pick the same game and name — it loads whatever you entered last time. Change the numbers and save again. There's no deadline and no limit on how often.",
  },
  {
    q: "Do I need a password?",
    a: "No. Players never sign in. Only the organizers who manage the schedule and results have accounts.",
  },
];

const ORGANIZER_TOPICS: Topic[] = [
  {
    q: "How do I create the games?",
    a: "Admin → Games. Use \"Schedule a run\" for a weekly series — give the first date, the time and a date to run until, and it creates them all. Use \"New game\" for a one-off. Nights already scheduled are skipped, so you can safely run it again to extend the season.",
  },
  {
    q: "Where do I get the RSVP link?",
    a: "Admin → Games, then \"Copy RSVP link\" beside the game. Each game has its own permanent link — send that to the group, not the home page address.",
  },
  {
    q: "How do I enter the score?",
    a: "Admin → Games → click the game → the Result section. Enter goals for Blue and White, fill in each player's line if you want, then Save result. That marks the game final and updates the standings. The Result section only appears once at least one player has RSVP'd yes.",
  },
  {
    q: "How do I fix a score I already saved?",
    a: "Exactly the same way — open the game and the Result section, which comes back filled in with what's stored. Change it and save again.",
  },
  {
    q: "How do I add a player or set their team?",
    a: "Admin → Players. Fill the top row and press Add for someone new. Each player has a Team setting — that's the side they land on automatically when they RSVP. Mark goalies as Goalie so the team counts warn you when a side has nobody in net.",
  },
  {
    q: "The teams are lopsided this week",
    a: "Open the game in Admin → Games. You can move anyone to the other side for that night without changing their usual team. \"Even the sides\" deals out only the players who have no team set, always to the thinner bench.",
  },
  {
    q: "How do I let someone else enter results?",
    a: "Ask them to sign in once at /login, then go to Admin → Access and set their role to Captain. Captains can enter scores and stats but can't change the schedule, the roster, or anyone's access.",
  },
  {
    q: "A game was cancelled",
    a: "Open it in Admin → Games and set Status to Cancelled. It stays in the record but counts for nobody. Delete is for a game that shouldn't have existed at all — it takes the RSVPs and stats with it.",
  },
];

export function HelpWidget({ isOrganizer }: { isOrganizer: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes, as it would any dialog.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const groups: { label: string; topics: Topic[] }[] = isOrganizer
    ? [
        { label: "Running the league", topics: ORGANIZER_TOPICS },
        { label: "Playing", topics: PLAYER_TOPICS },
      ]
    : [{ label: "", topics: PLAYER_TOPICS }];

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Help"
          className="flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-rink-700 bg-rink-900 shadow-2xl shadow-black/60"
        >
          <div className="flex items-center justify-between border-b border-rink-800 px-4 py-3">
            <h2 className="text-sm font-semibold">How do I…?</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="text-muted transition hover:text-chalk"
            >
              ✕
            </button>
          </div>

          {/* min-h-0 or this won't shrink inside the flex column, and the
              list gets clipped by the panel instead of scrolling. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {groups.map((group) => (
              <div key={group.label || "all"} className="mb-1">
                {group.label && (
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">
                    {group.label}
                  </p>
                )}
                {group.topics.map((topic) => {
                  const isOpen = expanded === topic.q;

                  return (
                    <div key={topic.q}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : topic.q)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-rink-850 ${
                          isOpen ? "text-chalk" : "text-muted"
                        }`}
                      >
                        <span aria-hidden className="mt-0.5 text-xs text-rink-600">
                          {isOpen ? "▾" : "▸"}
                        </span>
                        {topic.q}
                      </button>
                      {isOpen && (
                        <p className="px-2 pb-3 pl-6 text-sm leading-relaxed text-muted">
                          {topic.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-ice-600 text-xl font-bold text-white shadow-lg shadow-black/40 transition hover:bg-ice-500"
      >
        <span aria-hidden>{open ? "✕" : "?"}</span>
        <span className="sr-only">{open ? "Close help" : "Help"}</span>
      </button>
    </div>
  );
}
