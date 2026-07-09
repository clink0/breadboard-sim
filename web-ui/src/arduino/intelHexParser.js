// Minimal Intel HEX parser. Written by hand instead of using the `intel-hex`
// npm package because that package unconditionally calls Node's `Buffer`
// global internally - fine under vitest (Node environment) but a hard crash
// in a real browser, which has no such global. This parser only needs
// Uint8Array, so it works identically in both places.
export function parseIntelHex(hexString, bufferSize) {
  const data = new Uint8Array(bufferSize).fill(0xff);
  let extendedAddress = 0;

  for (const rawLine of hexString.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line[0] !== ':') throw new Error(`Invalid Intel HEX line: ${line}`);

    const byteCount = parseInt(line.slice(1, 3), 16);
    const address = parseInt(line.slice(3, 7), 16);
    const recordType = parseInt(line.slice(7, 9), 16);
    const dataStart = 9;

    if (recordType === 0x00) {
      // Data record.
      const base = extendedAddress + address;
      for (let i = 0; i < byteCount; i++) {
        const byte = parseInt(line.slice(dataStart + i * 2, dataStart + i * 2 + 2), 16);
        const offset = base + i;
        if (offset < data.length) data[offset] = byte;
      }
    } else if (recordType === 0x01) {
      break; // end of file
    } else if (recordType === 0x04) {
      // Extended linear address: upper 16 bits of a 32-bit byte address.
      const upper = parseInt(line.slice(dataStart, dataStart + 4), 16);
      extendedAddress = upper << 16;
    }
    // 0x02/0x03/0x05 (segment addressing, start address) aren't produced
    // for AVR flash images and aren't needed here.
  }

  return { data };
}
