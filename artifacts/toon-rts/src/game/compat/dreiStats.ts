/**
 * Compatibility export for Drei's optional FPS Stats helper.
 *
 * The installed stats.js build is ESM-only but Drei's Stats module imports it
 * as a default export. The game does not render Drei's Stats panel, yet the
 * package barrel still evaluates that import when battle modules load.
 */
export default class DreiStatsCompat {
  dom = document.createElement('div');
  domElement = this.dom;

  constructor() {
    this.dom.style.display = 'none';
  }

  begin() {}
  end() { return 0; }
  update() {}
  showPanel() {}
}