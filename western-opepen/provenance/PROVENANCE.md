# Authorship and provenance policy

1. **Two kinds of image live in this project and never mix.**
   - *Studies* (`studies/`, `directions/`): AI/procedural composition diagrams, stamped
     "AI COMPOSITION STUDY · NOT ARTWORK" on the image. Reproducible from
     `tools/make_studies.py`. Never uploaded to Opepen, never sold, never traced.
   - *Works* (`originals/`): drawings made by Cole Calfee's hand on paper, and faithful
     captures of them.
2. **What AI does here:** research, composition studies, critique, cataloguing, production
   tooling, and presentation drafts. **What it does not do:** make, trace, extend, fill,
   "enhance" or upscale any final artwork.
3. **Every work has a chain:** registry ID → process photos (start, middle, finished,
   with the sheet's ID visible) → raw capture → master → export, each with a SHA-256
   hash in `registry/hashes.csv`, plus ink batch, paper and date.
4. **Retouching log:** every digital change to a master (dust, scanner artefact) is noted
   with the tool and the reason. Marks are never removed.
5. **Public description** of the set states this process plainly, including that AI was
   used for research and composition studies and not for the artwork.
6. **The physical drawings** are the primary objects. Store flat, interleaved with
   glassine, in archival boxes, away from light, until framed.
