# paper_trail

CSE 5381/4381 Information Security II &mdash; Programming Assignment 3 (Steganography).
Spring 2026.

A small static web app that hides a message inside a carrier file and posts the
result on a public "board". Built as a single-page static site so it can be hosted
on GitHub Pages.

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

## running it

Entirely static. Either open `index.html` directly, or serve the folder:

```sh
# any of these works
python -m http.server 8080
# or
npx http-server .
```

Then visit `http://localhost:8080`.

## deploying on GitHub Pages

1. Make a new public repo (e.g. `paper_trail`).
2. Drop the contents of this folder into the repo root.
3. Commit + push.
4. Repo Settings &rarr; Pages &rarr; Source: `Deploy from a branch`, Branch: `main`,
   Folder: `/ (root)`. Save.
5. Wait ~1 minute. The site will be at
   `https://<your-github-username>.github.io/paper_trail/`.

No build step, no secrets, nothing to configure. This is why I picked GitHub Pages
over Azure / UTA.Cloud &mdash; the whole app is a pile of static files.

## limitations (honest list)

- **Accounts are client-side.** localStorage is per-browser. A server-backed auth
  (Flask + bcrypt, or an OAuth provider) is what you'd want in production. GitHub
  Pages can't run server code so this is what fits inside the constraint.
- **The board is per-browser too.** Same reason. If I wanted a shared board I'd add
  a tiny Firebase / Supabase / jsonbin backend and have the client read/write JSON.
  I kept it pure-static so the whole thing works offline.
- **Carrier files should be "raw" formats for visibility.** A `.bmp` or `.wav` is
  ideal; if you flip bits in a compressed JPEG stream you'll corrupt the decoder.
  The tool will still embed, but the preview on the board may not render. For the
  board demo I used `.bmp` screenshots.
- **4 MB soft limit on posts** so localStorage doesn't blow up (browsers typically
  give each origin 5&ndash;10 MB).
- **S, L, C are not stored on the post.** That's intentional &mdash; the point of
  stego is that the extractor needs the key parameters. Share them out-of-band.

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
