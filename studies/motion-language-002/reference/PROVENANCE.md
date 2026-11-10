# Provenance: approved reference files

These three files are byte-for-byte copies of the approved Freeman Material
pieces. They are read here and never edited. If one of them changes, the
verifier fails.

Source: `colemanvii/freeman`, tags `archive/material-no1-approved` and
`archive/material-no2-approved`. Both point to commit
`109ca715672f2c188587e7743af4eb0a40ec57ba` ("Material No. 1 and No. 2: approved
motion studies for X", 2026-11-08).

| Here | Freeman path at 109ca71 | SHA-256 |
| --- | --- | --- |
| `freeman-v5/pixel-mark.js` | `v5/pixel-mark.js` (production signature, 160 × 61) | `069f61eb69a8b6ae4d9b81ca199b3229bc52d8459f837f8b7a1ce560c33b1c5a` |
| `freeman-v5/eagle/stamp.pbm` | `v5/eagle/stamp.pbm` (approved Stamp eagle, 192 × 60) | `6dfa2d71e1103fc57604a8639230e6c76da2bc6c29a1dcdfa72bdc3040d30c78` |
| `x-motion-001/motion.js` | `studio/x-motion-001/motion.js` (Material No. 1 and No. 2) | `12b73462158d1045c8dc8698e3aa0affcb1d0905df30caf02fbfed78e5cc5ee2` |

`motion.js` fetches `../../v5/eagle/stamp.pbm`, its path inside the Freeman
repository. `engine/marks.js` answers that single request with the copy here,
so `motion.js` runs without any change.

To check the copies:

```sh
cd studies/motion-language-002/reference && sha256sum freeman-v5/pixel-mark.js freeman-v5/eagle/stamp.pbm x-motion-001/motion.js
```

`tools/verify.cjs` also checks R1 and R2 against the approved frame fingerprints
`-126761301` and `1734470243`, using the approved verifier's own hash over all
480 frames.

Nothing in the Freeman repository or on the production Freeman website was
modified.
