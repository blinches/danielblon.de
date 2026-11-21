/* Stay With Me landing page settings. Edit this file only; no build step. */
window.SWM_CONFIG = {
  // "pre" = before release (follow + email). "out" = release day onward (listen buttons).
  mode: "pre",

  // The pre-save link (Feature.fm, made 2026-11-21). While this is set and mode is "pre", the main button is
  // PRE-SAVE ON SPOTIFY and goes here. Empty = the main button is FOLLOW ON SPOTIFY.
  presaveUrl: "https://ffm.to/danielblonde-staywithme",

  // The artist page: the main button when there is no pre-save link, and in "out" mode before the listen links are in.
  spotifyArtistUrl: "https://open.spotify.com/artist/6yMrV4acRLbSfL23756VgP",

  // Full URL of the signup Worker, ending in /signup.
  // While this is empty the form shows "signup opens soon" and sends nothing.
  signupEndpoint: "",

  // "out" mode listen buttons. Only the non-empty ones are shown, in this order.
  listen: {
    spotify: "",
    apple: "",
    youtube: "",
    bandcamp: ""
  },

  // Footer links.
  instagramUrl: "https://www.instagram.com/danielblonde/",
  tiktokUrl: "https://www.tiktok.com/@danielblondemusic"
};
