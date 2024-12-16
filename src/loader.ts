const concept = new URLSearchParams(window.location.search).get("concept");

if (!concept) {
  document.querySelector(".concepts")?.removeAttribute("style");
}

switch (concept) {
  case "storyboard": {
    import("./storyboard");
    break;
  }
}
