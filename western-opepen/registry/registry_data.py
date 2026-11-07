"""
Working index of all 80 artworks. This is a curatorial plan, not 80 prompts:
titles and subjects are provisional and are expected to change on site and
at the drawing table. Regenerate the CSV with:  python3 registry/registry_data.py

Columns
  id            WO-<edition>-<nn>   (stable; never reused even if a piece is cut)
  edition       1, 4, 5, 10, 20, 40 (Opepen edition group)
  group         group title
  title         provisional title
  subject       what is drawn / the idea
  treatment     formal treatment and silhouette relationship
  density       spare | mid | dense
  unique        what no other piece in the set does
  study         composition study that tests it (if any)
  status        planned | studied | drawing | drawn | scanned | approved | cut
"""
import csv
import os

G = {1: "One Square Mile", 4: "Quarter Section", 5: "Improvements", 10: "Stock", 20: "Field Notes", 40: "The Back Forty"}

R = []
def add(ed, title, subject, treatment, density, unique, study=""):
    n = sum(1 for r in R if r[1] == ed) + 1
    R.append([f"WO-{ed:02d}-{n:02d}", ed, G[ed], title, subject, treatment, density, unique, study, "studied" if study else "planned"])

# --- 1/1 ------------------------------------------------------------------
add(1, "One Square Mile", "Section 14 from altitude: two pivots, a row field, a farmstead and shelterbelt; a creek that ignores the grid and runs through the neck",
    "Aerial plat. The four forms ARE fields; the 8x8 Opepen grid and the survey section grid are drawn as one. Iron-oxide ink plus earth-red wash made from soil gathered on the drawn land. 24x24 in image.",
    "dense", "The only piece where the whole system is visible at once; the key to the other 79. 40+ hours.", "S01")

# --- 1/4: the same 160 acres, four times ---------------------------------
add(4, "Breaking", "Spring: first plowing of the quarter; a single team mid-furrow", "Plan view. Furrows follow each form's own geometry (rings in the eyes, rows in the mouth); unbroken sod outside as tick marks.", "mid", "The first marks ever made on this ground.", "S02")
add(4, "Stand", "Summer: the crop up, irrigation running, heat", "Plan view. Dense stipple for canopy; pivot wheel tracks as darker rings; one wash pass of diluted red for heat.", "dense", "The only 1/4 with wash; the fullest the land gets.")
add(4, "Windrows", "Fall: cut, raked into windrows, baled; dust from the swather", "Plan view. Long curving windrows inside forms; round bales as solid dots; dust plume dry-brushed.", "mid", "The land being taken back off itself; the forms written in bales.")
add(4, "After the Blow", "Winter: snow over everything; stubble along old furrows; one coyote crossed at night", "Plan view, almost blank paper. The silhouette survives only as stubble dashes.", "spare", "The figure is nearly erased and still unmistakable.", "S03")

# --- 1/5: the improvements a homesteader had to show to prove up ---------
add(5, "Dwelling", "A board-and-batten claim house; we look at a wall", "Elevation. The silhouette is the absence in the wall: openings through which the far horizon shows.", "dense", "Silhouette as void in a structure.", "S04")
add(5, "Well", "Windmill and stock tank", "Elevation. The wheel is the right eye, drawn as an engineer would; everything else must be found on site, not forced.", "mid", "The only mechanical drawing in the set.")
add(5, "Fence", "Three-wire fence, cedar posts", "Plan. The silhouette as a claim made in wire; a gate left open at the torso.", "spare", "Silhouette as boundary only — no fill, no subject inside.", "S05")
add(5, "Dugout", "The first dwelling: a room cut into a bank", "Cross-section. Soil strata, roots and stones hatched horizontally; the forms are excavated voids; a ladder in the torso.", "dense", "The only underground view in the set.")
add(5, "Grave", "The homestead grave nobody lists among the improvements", "Elevation/plan. A small iron fence encloses the torso as a mound; the rest of the figure in faint graphite only.", "spare", "The emotional turn of the set. Must be drawn from a real, respectfully chosen site.")

# --- 1/10: stock — animals drawn as a sporting illustrator would ---------
add(10, "The Pens", "Corrals at the home place: round pen, square pen, holding pen, chute", "Plan. Rails define the figure; cattle crowd into the left eye's square corner — they always do.", "mid", "Animal behaviour proves the geometry.", "S06")
add(10, "Gather", "A herd bunched and drifting into the wind", "Plan from height. ~900 animals construct the silhouette; strays and two riders outside.", "dense", "The subject builds the silhouette by sheer count.", "S07")
add(10, "The Chute", "A bull loaded in the bucking chute, seen from the catwalk", "Close plan. Dense red crosshatch of the back and horns; the chute gate and boards hold the torso. From the artist's own PBR photography.", "dense", "The closest, heaviest view in the set; the artist's own photograph as source.")
add(10, "Round Pen, Morning", "A colt worked in the round pen; only its tracks are left", "Plan. Thousands of hoofprint crescents wear the right eye into a ring; the rest of the figure is untouched dirt.", "spare", "Animal absent; animal everywhere.")
add(10, "Remuda", "Saddle horses bunched at the wrangle, from above", "Plan. Packed horse backs outside; the silhouette is the open ground they leave.", "dense", "Negative-space silhouette made of bodies.")
add(10, "Calving", "A cow licking a newborn calf in late snow", "Elevation, sporting illustration. The pair sits in the mouth; the figure's other forms are snow left blank.", "mid", "The only birth. Tenderness without sentiment.")
add(10, "Saddle Horse", "A horse tied to a rail, weight shifted, one hind foot cocked", "Elevation. Full sporting-illustration finish; the rail and the barn's shadow carry the silhouette behind it.", "mid", "The set's single conventional 'portrait' — earned by being the best-drawn animal in it.")
add(10, "Coyote", "Tracks circling the pens at night", "Plan. The pens of WO-10-01 redrawn in faint line; a single track line orbits them.", "spare", "Predator's view of the stock; rhymes with WO-10-01.")
add(10, "Brand Book", "A page from a county brand book with one registered mark", "Facsimile-like ledger page, hand-lettered. The silhouette appears once, small, as a registered brand.", "mid", "The only place the 'brand' idea is allowed — as an archive, not a gimmick.")
add(10, "Bones", "A cow skull and vertebrae found in the pasture", "Natural-history plate. Skull and bones laid out so their placement — not their shapes — makes the figure.", "mid", "The herd's end; bridge into Field Notes.")

# --- 1/20: field notes — specimens collected along the section line ------
fn = [
    ("Prairie Sunflower", "Helianthus petiolaris, ditch on the north line", "Engraving vignette whose boundary is the figure; disk is the right eye; petals break the edge.", "dense", "Phyllotaxis disk; the specimen refuses the boundary.", "S08"),
    ("Nest", "Western meadowlark nest with three eggs, in the grass at a fence corner", "Specimen in the right eye; the rest of the figure survives only as pencil construction.", "spare", "Silhouette as unfinished underdrawing.", "S09"),
    ("Burrowing Owl", "Owl at the mouth of a prairie dog burrow", "Ink portrait, life size, standing in the mouth; the burrow mound shadows the torso.", "mid", "The only creature looking back at the viewer."),
    ("Soapweed", "Yucca glauca in seed", "Pen and dry brush; the spray of blades crosses all four forms; pods weight the eyes.", "mid", "Radiating line that cuts across the figure."),
    ("Buffalo Grass", "Bouteloua dactyloides, a single sod plug", "Root mass drawn below ground in the mouth and torso; leaves above. Cross-section like WO-05-04.", "dense", "Underground specimen; rhymes with the Dugout."),
    ("Horned Lark", "A horned lark on bare ground in February", "Tiny bird, enormous empty paper; the figure only in faint wind-scour marks.", "spare", "Smallest subject in the set."),
    ("Barn Swallow", "Swallows over the stock tank at evening", "Gestural flight lines: each swallow's path a single stroke; the paths' density defines the forms.", "spare", "The silhouette drawn by motion paths."),
    ("Grasshopper Year", "Hundreds of grasshoppers on a fence post and wire", "Specimen-plate rigor at swarm scale; insects cluster inside the figure.", "dense", "Plague as pattern."),
    ("Monarch", "Monarch on showy milkweed", "Watercolor-and-ink natural-history plate; the only piece where red stands in for orange.", "mid", "Colour substitution made explicit."),
    ("Big Bluestem", "Andropogon gerardii, turkey-foot seed heads", "Tall stems run full height, bottom to top; the figure appears where stems are drawn heavier.", "mid", "Silhouette by pressure only."),
    ("Pasqueflower", "Pulsatilla, first flower of spring, through old snow", "Spare: one flower in the left eye's square corner, everything else blank.", "spare", "Single specimen placed in the figure's only right angle."),
    ("Prickly Pear", "Opuntia pads and fruit", "Pads as overlapping ovals built into the forms; spines as stipple halos.", "mid", "Plant growth that happens to obey the geometry."),
    ("Barbed Wire", "Specimen card of three historical wire patterns", "Plate laid out as a collector's specimen board; wire twists describe the four forms.", "mid", "A human artifact catalogued as natural history."),
    ("Evidence", "Things found along the line: a horseshoe nail, a .30-30 case, a button, a bottle neck", "Each object drawn life size and placed in a form; museum-tag hand lettering.", "mid", "The traces of human lives — no person drawn."),
    ("Shed", "A bullsnake's shed skin across the gravel", "One continuous scaled line traces the outline of all four forms.", "mid", "Silhouette drawn by a found line."),
    ("Primary", "A red-tailed hawk primary feather", "Feather life size, vanes hatched vane-by-vane; the shaft cuts the figure diagonally; rest in pencil.", "dense", "The most finely worked single object."),
    ("Mud Daubers", "Mud-dauber nests under the eave of the claim house", "Cells of the nests built up as the forms; drawn from WO-05-01's wall.", "mid", "Animal architecture; links Field Notes to Improvements."),
    ("Cottonwood", "Cottonwood leaf and seed fluff in June", "Leaf in the mouth; seed fluff drifting across everything as broken line.", "spare", "The set's lightest, airiest marks."),
    ("Topsoil", "A soil core from the pivot, drawn with a hand lens", "Abstract: grain-by-grain stipple in the forms; no recognisable object.", "dense", "Pure abstraction born from observation."),
    ("Seed Head, December", "The same sunflower as WO-20-01, dead and seed-robbed", "Dry, broken disk in the right eye; stems bent; snow as blank paper.", "spare", "Closes the year opened by WO-20-01."),
]
for f in fn:
    add(20, *f)

# --- 1/40: forty stations, two chains apart, one mile around the forty ---
# Station n sits at (n-1)*2 chains, walking clockwise from the NE corner:
# east line 0-20 ch, south line 20-40, west line 40-60, north line 60-80.
st = [
    ("NE cor., looking W", "still morning; fence receding; cottonwood in the right eye", "Horizon study: figure laid in as faint construction, land drawn through it; horizon in the neck.", "mid", "S10"),
    ("E line, looking W", "frost on the wire", "Only frost crystals on three strands, crossing the figure.", "spare", ""),
    ("E line, looking E", "the road and a pickup's dust", "Horizon study; dust plume is the only mass.", "spare", ""),
    ("E line, looking W", "cattle watching the artist", "Six heads, close, drawn fast; figure in pencil behind.", "mid", ""),
    ("E line, looking S", "power line poles marching to the horizon", "Perspective; poles pierce the forms.", "spare", ""),
    ("E line, looking W", "mid-day, no shadows", "Bleached: almost nothing drawn inside the figure; outside dense.", "spare", ""),
    ("E line, looking E", "a stock tank reflecting sky", "Tank as right eye at ground level, water in horizontal strokes.", "mid", ""),
    ("E line, looking W", "a hawk hanging on wind", "One bird; long horizontal strokes for wind.", "spare", ""),
    ("E line, looking N", "back toward the start; the first post", "Rhymes with Sta. 1 from the other direction.", "mid", ""),
    ("E line, looking W", "thunderhead building", "Cloud mass crosshatched densely in the eyes.", "dense", ""),
    ("SE cor., looking NW", "corner post, brace, and stays", "Close drawing of the corner brace assembly; the figure's square corner echoed.", "mid", ""),
    ("S line, looking N", "sunflowers in the ditch", "Dense ditch vegetation in the torso; open field above.", "dense", ""),
    ("S line, looking N", "irrigation pivot passing", "Pivot tower and span drawn as engineering line across the eyes.", "mid", ""),
    ("S line, looking S", "neighbour's place, a light on", "Dusk: one lit window dot, otherwise heavy hatch.", "dense", ""),
    ("S line, looking N", "wind 30 mph", "Every mark pushed the same way; figure smeared NE.", "mid", ""),
    ("S line, looking N", "a dead calf in the grass", "Spare and exact; no drama.", "spare", ""),
    ("S line, looking N", "rain arriving from the SW", "Rain strokes only; figure where the rain falls harder.", "mid", "S11"),
    ("S line, looking N", "after rain; puddles in the tracks", "Puddles as the only marks: reflections in the forms.", "spare", ""),
    ("S line, looking N", "grasshopper on the paper", "Life-size insect drawn on the sheet where it landed.", "spare", ""),
    ("S line, looking S", "the county road, gravel", "Gravel stipple dense across the bottom half.", "dense", ""),
    ("SW cor., looking NE", "corner, all of the forty in view", "Panorama compressed; the whole forty inside the figure.", "mid", ""),
    ("W line, looking E", "first snow", "Paper left white; fence posts only.", "spare", ""),
    ("W line, looking E", "deer at dusk, five", "Five quick gestural deer in the mouth.", "mid", ""),
    ("W line, looking W", "sun setting directly into the right eye", "Radiating strokes from the right eye; figure as light source.", "mid", ""),
    ("W line, looking E", "fog", "Only the nearest post drawn; everything else lost.", "spare", ""),
    ("W line, looking E", "a hay stack", "Round and square bales stacked — found geometry close to the figure; drawn straight, not as a pun.", "mid", ""),
    ("W line, looking E", "burned ground after a grass fire", "Charred stubble: the densest black-red in the forty.", "dense", ""),
    ("W line, looking E", "green-up, two weeks after the fire", "Same view, new growth as ticks over char.", "mid", ""),
    ("W line, looking N", "trash pile: old car hood, bedsprings", "Found objects, drawn with respect.", "mid", ""),
    ("W line, looking E", "heat shimmer", "Every horizontal line doubled and broken.", "mid", ""),
    ("NW cor., looking E", "night; could not see the paper", "One continuous line, never lifted; a few stars.", "spare", "S12"),
    ("N line, looking S", "moonrise", "Moon as the right eye — the one time the eye is literally a circle in the sky; drawn plainly.", "spare", ""),
    ("N line, looking S", "the house lights from the forty", "Distant lights as dots inside the mouth.", "spare", ""),
    ("N line, looking S", "milkweed pods splitting", "Seed fluff drifting across the sheet.", "spare", ""),
    ("N line, looking N", "freight train on the far line", "One long horizontal mark across the neck; cars as ticks.", "mid", ""),
    ("N line, looking S", "a bird skeleton on a post", "Close, specimen-exact.", "mid", ""),
    ("N line, looking S", "harvest at night, combine lights", "Lights carving bright paths through hatched dark.", "dense", ""),
    ("N line, looking S", "eyes closed, from memory of Sta. 1", "Drawn blind; the only piece made from memory.", "spare", ""),
    ("N line, looking S", "wind-blown tumbleweeds caught in the fence", "Scribble masses piled against wire along the figure's edges.", "dense", ""),
    ("N line near NE cor., looking E", "back at the start, a year later", "Same view as Sta. 1, one year on; drawn without looking at Sta. 1.", "mid", ""),
]
assert len(st) == 40
for i, (where, subject, treatment, density, study) in enumerate(st, start=1):
    ch = (i - 1) * 2
    add(40, f"Sta. {i} — {ch} ch.", f"{where}: {subject}", treatment, density,
        f"The only drawing made from station {i}; station, time and weather pencilled in the margin.", study)

assert len(R) == 80, len(R)

if __name__ == "__main__":
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "artwork-registry.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "edition", "group", "title", "subject", "treatment", "density", "unique", "study", "status"])
        w.writerows(R)
    from collections import Counter
    print("rows:", len(R), dict(Counter(r[1] for r in R)), dict(Counter(r[6] for r in R)))
