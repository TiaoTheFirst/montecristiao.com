/* Presentation policy only. Withheld source HTML lives outside public/.
   Enabling a capability also requires reviewed content and a release decision. */
var ManorAvailability = Object.freeze({
  manuscripts: false,
  visits: false,
  guidedReading: false,
  canRead(resource) {
    return resource === "introduction"
      ? this.manuscripts
      : ["friendship", "reply"].includes(resource) && this.visits;
  },
});
