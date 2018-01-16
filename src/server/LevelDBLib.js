const unsafeChars = /[^-_a-zA-Z0-9]/g;
const windowsReserved = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const escapeSeq = /%([_0-9a-fA-F]+)%/g;

export default class LevelDBLib {
  /**
   * It escapes a namespace to a safe file name.
   * This function is injective.
   * @param {string} namespace namespace of Level DB
   * @returns {string}
   */
  static escapeNamespace(namespace) {
    if (!namespace) return '%_%';
    if (namespace.match(windowsReserved)) {
      return `%_%${namespace}`;
    }
    return namespace.replace(unsafeChars, substr => `%${substr.charCodeAt(0).toString(16)}%`);
  }
  /**
   * Reversed function of escapeNamespace.
   * @param {string} escapedNamedpace file name generated by escapeNamespace
   * @returns {string}
   */
  static unescapeNamespace(escapedNamedpace) {
    return escapedNamedpace.replace(escapeSeq, (substr, group) => {
      if (group === '_') return '';
      return String.fromCharCode(parseInt(group, 16));
    });
  }
}
