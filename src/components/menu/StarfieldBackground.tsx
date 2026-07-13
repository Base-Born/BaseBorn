export function StarfieldBackground() {
  return (
    <div className="bbStarfield" aria-hidden="true">
      <span className="bbStars bbStars--near" />
      <span className="bbStars bbStars--far" />
      <span className="bbNebula bbNebula--cyan" />
      <span className="bbNebula bbNebula--violet" />
      <span className="bbPlanet bbPlanet--left" />
      <span className="bbPlanet bbPlanet--right" />
      <span className="bbOrbit" />
    </div>
  );
}
