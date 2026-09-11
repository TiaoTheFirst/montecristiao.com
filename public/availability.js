/* Presentation policy only. Withheld source HTML lives outside public/.
   Enabling a capability also requires reviewed content and a release decision. */
var ManorAvailability = Object.freeze({
  manuscripts: false,
  visits: true,
  guidedReading: false,
  canRead(resource) {
    return resource === "introduction"
      ? this.manuscripts
      : resource === "dinner-division" && this.visits;
  },
});
