# PDF Dark

A simple, browser-based PDF reader (built w/ Mozilla's library, [pdf.js](https://github.com/mozilla/pdf.js/)) that allows the user to read the document in "dark mode". It is intended for use on larger screens (keyboard shortcuts and better viewing experience) but is decently responsive on smaller, mobile screens.

To invert the colors of the PDF, we apply a simple CSS filter rule to the canvas:

```css
#pdf-canvas {
  filter: invert(1) hue-rotate(180deg);
}
```

This viewer is super limited; you cannot select text, images and graphics look goofy, no storage of docs, etc. But I wanted to make a simple tool that does one thing well so this is it.

You can check it out live at [pdfdark.com](https://pdfdark.com)
