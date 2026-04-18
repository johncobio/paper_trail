# paper_trail

CSE 5381/4381 Information Security II &mdash; Programming Assignment 3 (Steganography).
Spring 2026.

A small static web app that hides a message inside a carrier file and posts the
result on a public "board". Built as a single-page static site so it can be hosted
on GitHub Pages.

Link to the website: https://johncobio.github.io/paper_trail/register.html

## what's in it

- `index.html` &mdash; public board (anyone can view)
- `submit.html` &mdash; authenticated users can embed + post
- `extract.html` &mdash; pull the hidden message back out (no login required)
- `login.html` / `register.html` &mdash; localStorage-based accounts
- `about.html` &mdash; how the algorithm works
- `writeup.html` &mdash; the "find M or P given only L" discussion
- `js/stego.js` &mdash; the actual steganography (embed/extract, modes, capacity)
- `js/auth.js` &mdash; PBKDF2-SHA256 over passwords, sessions in localStorage
- `js/board.js` &mdash; posts stored as data URLs in localStorage
- `css/style.css` &mdash; plain courier + paper look, no frameworks

## the algorithm, short version

Given carrier P, message M, skip S, period L, mode C:

1. Prepend 32-bit big-endian length of M to form the payload.
2. Walk P starting at bit index S. At each step overwrite the current bit with the
   next payload bit and advance by `step(i, L, C)`.
3. Modes:
   - `C=0` flat: step = L
   - `C=1` ramp: step cycles `[L, 2L, 4L, 2L]`
   - `C=2` fib: step = L * fibonacci(i)
   - `C=3` prime: step = L * nth_prime(i)
4. Extract is the same walk in read mode &mdash; the 32-bit length prefix says when
   to stop.

The assignment mentioned "L = 8, then 16, then 28, then 8 again" &mdash; that is
essentially mode 1 (ramp). I added fib and prime to make the scheme a tiny bit less
trivially periodic for an attacker running a Chi-square detector.



No build step, no secrets, nothing to configure. This is why I picked GitHub Pages
over Azure / UTA.Cloud &mdash; the whole app is a pile of static files.


## files for testing

Any `.bmp` or `.wav` will work. Good starting parameters:

```
S = 64     # skip the BMP header area
L = 8      # every 8th bit (one bit per byte, classic LSB vibe)
C = 0      # flat mode
```

## references

- Stanford "Bit Twiddling Hacks" (linked from assignment)
- Fridrich et al., *Detecting LSB steganography in color and gray-scale images* (IEEE
  Multimedia, 2001) &mdash; for the chi-square detection angle in the writeup
- Hopper, Langford, von Ahn, *Provably Secure Steganography* (CRYPTO 2002) &mdash; linked
  from the assignment
- MDN docs for `SubtleCrypto.deriveBits`, `FileReader`, `Blob`
- WIRED and null-byte intros linked in the assignment

All code here is mine. Assignment statement `Assignment3-Stegp.pdf` is in the
parent folder.
