export type GuideSlide = {
  image: any;
  title: string;
  body: string;
};

export const guideSlides: GuideSlide[] = [
  {
    image: require("../assets/images/scan.webp"),
    title: "Scan\nAny\nWatch",
    body: "Just point your camera — we'll\nrecognize the watch instantly.",
  },
  {
    image: require("../assets/images/unlock.webp"),
    title: "Unlock\nHidden\nInsights",
    body: "Get detailed specs and facts you\nwon't easily find online.",
  },
  {
    image: require("../assets/images/find.webp"),
    title: "Find the\nReal\nValue",
    body: "Explore the ratings for more\nthan 6000 watches.",
  },
];
