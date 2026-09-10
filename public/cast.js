/* Count encounters use full scene paintings. The steward's reception portrait shares that identity. */
var ManorCast = {
  count: { image: "assets/count.webp", format: "portrait" },
  butler: {
    image:
      typeof ManorPaintings === "object"
        ? ManorPaintings["butler-approach-day"].src
        : "assets/baptistin.png",
    format: "portrait",
  },
};
