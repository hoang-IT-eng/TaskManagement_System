# UI design notes

Direction: an operations notebook. Cool fog paper, ink text, one moss accent. Colour is spent on status only,
and status always comes with a text label or a count, never colour alone.

| Token | Value | Use |
|---|---|---|
| Fog | `#EEF1EE` | App background |
| Well | `#E4E8E5` | Board column wells |
| Sheet | `#FFFFFF` | Cards, panels |
| Ink | `#17201C` | Text |
| Muted | `#5D6862` | Secondary text (≥ 4.5:1 on every surface) |
| Moss | `#2F5D4A` | Primary actions, focus |
| To do / In progress / In review / Done | `#85919A` / `#2F6E9E` / `#B7791F` / `#3A7B58` | Column bands, status pills |
| Brick | `#B5482F` | Overdue, urgent, destructive |

- Type: Hanken Grotesk (self-hosted, variable), tabular figures for counts.
- Signature: the "strata". Each column carries a thin coloured band, and priority is a stack of one to four bars
  (`PriorityGlyph`), so a dense board reads at a glance without leaning on colour.
- No gradients, no emoji, no all-caps labels.
- References: Dribbble kanban shots (Taskify, Taske, Dedlen) for density and card anatomy; the
  [Impeccable](https://github.com/pbakaus/impeccable) guidelines for the anti-pattern review.

## Impeccable detector

`npx impeccable detect --cdp <port>` was run on 6 signed-in pages at 1440×900 and 390×844 (12 scans).
The first pass flagged low contrast in secondary text and on overdue chips, avatar initials under 11px,
a skipped heading level, one-word last lines, and the mobile task sheet sitting 12px off the edge. All of these are fixed.
The final pass reports only `nested-cards` on the board: cards inside column wells. That is the kanban pattern itself, so it stays.
