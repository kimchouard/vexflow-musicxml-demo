/**
 * Simple in-memory store for passing custom MusicXML between screens.
 * No persistence — the score lives only for the current session.
 */
let _customName = '';
let _customXml = '';

export const scoreStore = {
  setCustomScore(name: string, xml: string) {
    _customName = name;
    _customXml = xml;
  },
  getCustomScore() {
    return { name: _customName, xml: _customXml };
  },
  clear() {
    _customName = '';
    _customXml = '';
  },
};
