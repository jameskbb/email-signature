---
name: Email signature studio
description: A quiet stationery workspace for a personal sign-off.
colors:
  primary: "#315c49"
  primary-hover: "#244735"
  page: "#f5f4ef"
  paper: "#ffffff"
  field: "#fffefb"
  ink: "#242c27"
  muted: "#61685f"
  divider: "#d5d8ce"
  field-border: "#b9c0b5"
  focus: "#527e62"
  error: "#a13526"
  selection: "#d1e4d6"
  selection-ink: "#193a29"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "46px"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  control: "5px"
  paper: "4px"
spacing:
  label: "8px"
  pair: "16px"
  group: "30px"
  columns: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  email-paper:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.paper}"
    padding: "32px 28px"
---

# Design System: Email signature studio

## Overview

**Creative North Star: "Quiet stationery"**

A warm writing surface and a clean white email preview keep attention on the signature. The serif heading adds a personal note while familiar sans-serif controls make editing straightforward. This language follows the committed editor brief.

**Key Characteristics:**

- Warm page, white paper, dark ink.
- Restrained green actions and clear native controls.
- Generous space between groups with compact related fields.

## Colors

The palette pairs warm neutrals with a muted green accent.

### Primary

Green identifies actionable controls, links, the caret, and the default signature divider. Its darker variant provides hover feedback.

### Neutral

Page is the surrounding workspace; paper is the email canvas. Field is the nearly white input fill. Ink carries primary text; muted carries descriptions and optional labels. Divider and field-border organize the form without enclosing each section in cards.

Error identifies invalid fields and failed image loads. Focus and selection provide visible browser interaction states.

## Typography

Georgia gives the main heading a quiet editorial character. Arial and Helvetica keep the editor readable without network fonts. Exported signatures always use Arial, Helvetica, and sans-serif fallbacks for email portability.

The title role distinguishes form and preview regions. Legends use bold 15px type; helper copy uses 12px with generous line height. Mobile headings reduce to 38px at the 720px breakpoint. Numerical size and color readouts use tabular numerals.

## Layout

The desktop container caps at 1200px including 40px side padding. Equal flexible columns separate editing and preview; the preview sticks 28px below the viewport top. At 1000px, the gap drops to 32px and side padding to 24px. At 720px, the layout becomes one column and the preview follows the form, reachable from the header jump link. At 390px, side padding becomes 18px and paired fields stack. Keep overflow inside the email canvas when long signature content cannot fit.

## Elevation & Depth

Only the email paper uses ambient elevation: `0 8px 28px #273b2910`. The editor stays flat, divided by thin rules. The paper settles once over 0.5 seconds with `cubic-bezier(.16,1,.3,1)` through a small vertical movement and changing shadow. Reduced-motion preferences suppress the animation.

## Shapes

Controls have gently rounded corners. The email canvas uses a slightly tighter radius. Inputs have a one-pixel border; the signature's solid two-pixel vertical divider belongs to the email content rather than the workspace frame.

## Components

### Buttons

The primary filled green action copies the signature. Download is a quiet bordered secondary action. Save template and Load template use the same secondary style above the form, with local file status directly underneath. Text actions add links, clear details, and undo a clear or template load. Primary and secondary actions are at least 44px tall. Focus is a three-pixel green outline with four-pixel offset. Disabled actions have reduced opacity and a not-allowed cursor.

### Inputs / Fields

Every input has a persistent visible label. Related fields share a row when space allows. Invalid inputs use an error border and adjacent recovery text. Native range and color inputs retain familiar browser behavior with the green accent.

### Email paper

A white, softly elevated surface separates the rendered signature from the editor. A short email sign-off establishes context. The image appears left of the divider; identity and optional contact lines appear right. Blank optional values disappear from rendered content.

### Navigation

A simple underlined jump link moves to the preview heading, especially useful in the mobile single-column layout. Instructions use a native disclosure element to keep routine controls prominent.

### Attribution

The footer stacks "Made with" and a heart above the linked author name, `jameskbb`. It uses the body sans-serif with an eight-pixel gap. The README carries the same attribution and a prominent green "Use now" link to the hosted editor.

## Do's and Don'ts

### Do:

- Do preserve visible focus and native keyboard behavior.
- Do keep the email preview white and its typography portable.
- Do use examples that are explicitly identified as examples.

### Don't:

- Don't add external font requests or decorative illustration.
- Don't wrap each field group in a card.
- Don't hide field labels inside placeholders.
