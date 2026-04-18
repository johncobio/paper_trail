// paper_trail - steganography core
// every Lth bit of P gets swapped with bits from M, starting at S, stepped per mode C.
//
// layout we write into P:
//   [32-bit big-endian length of M in bytes][raw bytes of M]
// that way extract() knows when to stop.

const MODES = {
  0: "flat",   // step is always L
  1: "ramp",   // step cycles through multipliers [1, 2, 4, 2]
  2: "fib",    // step follows fibonacci * L
  3: "prime"   // step = L * (nth prime)
};

// small helpers -------------------------------------------------

function bytesToBits(bytes) {
  // MSB first. one byte -> 8 bits.
  const out = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    for (let j = 0; j < 8; j++) {
      out[i * 8 + j] = (b >> (7 - j)) & 1;
    }
  }
  return out;
}

function bitsToBytes(bits) {
  const n = Math.floor(bits.length / 8);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bits[i * 8 + j] & 1);
    }
    out[i] = b;
  }
  return out;
}

function u32ToBytes(n) {
  // big endian
  return new Uint8Array([
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff
  ]);
}

function bytesToU32(b) {
  return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
}

// primes + fib sequences used by modes --------------------------

function firstNPrimes(n) {
  const out = [];
  let k = 2;
  while (out.length < n) {
    let prime = true;
    for (let i = 2; i * i <= k; i++) {
      if (k % i === 0) { prime = false; break; }
    }
    if (prime) out.push(k);
    k++;
  }
  return out;
}

// short cycles so the step doesn't blow up and make the carrier useless.
// first 8 primes: 2,3,5,7,11,13,17,19  -> max step = 19L
// first 8 fibs:   1,1,2,3,5,8,13,21    -> max step = 21L
const PRIMES_CYC = firstNPrimes(8);
const FIB_CYC = [1, 1, 2, 3, 5, 8, 13, 21];

// step at iteration i (how far to jump from the previous target bit)
function stepForIter(i, L, mode) {
  switch (mode) {
    case 0: return L;
    case 1: {
      const cyc = [1, 2, 4, 2];
      return L * cyc[i % cyc.length];
    }
    case 2: return L * FIB_CYC[i % FIB_CYC.length];
    case 3: return L * PRIMES_CYC[i % PRIMES_CYC.length];
    default: return L;
  }
}

// get the bit positions in P that will be used to carry message bits
function positionsFor(totalBits, S, L, mode, need) {
  const pos = [];
  // first target bit = S (not S+L) - feels more natural for "skip S, then start"
  let p = S;
  let i = 0;
  while (pos.length < need && p < totalBits) {
    pos.push(p);
    p += stepForIter(i, L, mode);
    i++;
  }
  return pos;
}

// how many message bytes max can this carrier hold?
function capacityBytes(carrierLen, S, L, mode) {
  const totalBits = carrierLen * 8;
  // leave 32 bits for header
  // quick upper bound: (totalBits - S) / min_step / 8
  // but with modes the avg step changes so just walk it.
  let p = S, i = 0, count = 0;
  while (p < totalBits) { count++; p += stepForIter(i, L, mode); i++; }
  return Math.max(0, Math.floor((count - 32) / 8));
}

// embed ---------------------------------------------------------

function embed(carrierBytes, messageBytes, S, L, mode) {
  if (L < 1) throw new Error("L must be >= 1");
  if (S < 0) throw new Error("S must be >= 0");

  const carrier = new Uint8Array(carrierBytes); // copy, we'll mutate
  const totalBits = carrier.length * 8;

  // build payload = 32-bit length || message
  const header = u32ToBytes(messageBytes.length);
  const payload = new Uint8Array(header.length + messageBytes.length);
  payload.set(header, 0);
  payload.set(messageBytes, header.length);

  const payloadBits = bytesToBits(payload);
  const positions = positionsFor(totalBits, S, L, mode, payloadBits.length);

  if (positions.length < payloadBits.length) {
    throw new Error(
      `carrier too small. need ${payloadBits.length} slots, have ${positions.length}. ` +
      `try a smaller L or a bigger carrier.`
    );
  }

  for (let i = 0; i < payloadBits.length; i++) {
    const pos = positions[i];
    const byteIdx = pos >>> 3;
    const bitIdx = 7 - (pos & 7);     // MSB-first
    const mask = 1 << bitIdx;
    if (payloadBits[i]) carrier[byteIdx] |= mask;
    else carrier[byteIdx] &= ~mask;
  }
  return carrier;
}

// extract -------------------------------------------------------

function extract(stegoBytes, S, L, mode) {
  const totalBits = stegoBytes.length * 8;

  // pull 32 header bits first to know length
  const headerPos = positionsFor(totalBits, S, L, mode, 32);
  if (headerPos.length < 32) throw new Error("file too small to contain a header");

  const headerBits = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const p = headerPos[i];
    headerBits[i] = (stegoBytes[p >>> 3] >> (7 - (p & 7))) & 1;
  }
  const msgLen = bytesToU32(bitsToBytes(headerBits));

  // sanity check - message can't be bigger than carrier
  if (msgLen > stegoBytes.length) {
    throw new Error(
      `recovered length looks wrong (${msgLen} bytes). S, L, or C probably wrong.`
    );
  }

  const totalNeed = 32 + msgLen * 8;
  const allPos = positionsFor(totalBits, S, L, mode, totalNeed);
  if (allPos.length < totalNeed) {
    throw new Error("file ran out of room before message finished - parameters wrong?");
  }

  const msgBits = new Uint8Array(msgLen * 8);
  for (let i = 0; i < msgBits.length; i++) {
    const p = allPos[32 + i];
    msgBits[i] = (stegoBytes[p >>> 3] >> (7 - (p & 7))) & 1;
  }
  return bitsToBytes(msgBits);
}

// expose (attached to window for plain scripts)
window.PT = window.PT || {};
window.PT.stego = { embed, extract, capacityBytes, MODES };
