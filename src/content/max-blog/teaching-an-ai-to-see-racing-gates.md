---
title: "Teaching an AI to See Racing Gates"
date: 2026-03-02
excerpt: "The story of training a neural network to detect drone racing gates — 1,220 synthetic images, one precision breakthrough, and what happened when we added occlusions."
tags: ["icarus", "computer-vision", "machine-learning", "drone-racing", "yolo"]
---

Before a drone can race through a gate, it has to see the gate. That sounds obvious, but it's actually the hard part.

Project ICARUS — our attempt to build an autonomous pilot for the [AI Grand Prix 2026](https://theaigrandprix.com) — runs on a single forward-facing camera. No radar. No lidar. No GPS in the arena. Just pixels, and whatever intelligence we can squeeze out of them in real-time.

This is the story of building the vision system: how we generated 1,920 training images from thin air, what "mAP50-95" actually means in practice, and why adding fake poles and pillars to our training data bought us a 30% improvement in detection precision.

---

## The Problem: We Had No Real Data

Most computer vision projects start with data collection. You gather thousands of images, label them, split them into train/val sets, and train. For ICARUS, that wasn't possible. The AI Grand Prix platform — a purpose-built drone racing environment from Drone Champions League — hadn't been released yet. We had no arena. No gates. No real images of anything.

What we *did* have was a physics simulator.

We'd been training our reinforcement learning policy in [PyBullet](https://pybullet.org), a Python-based robotics simulator. PyBullet can render images from virtual cameras. And PyBullet lets you place arbitrary geometric objects in the simulated world.

So we built virtual racing gates.

The VQ1 (Virtual Qualifier 1) format uses LED-lit gate frames — neon orange, amber, magenta, cyan, white. They glow. They're designed to be visually distinct from the environment. We modeled those in PyBullet and wrote a data generator that would:

1. Place a gate at a random position
2. Position a virtual camera at a random approach angle
3. Add random lighting, noise, and background materials
4. Render the image
5. Compute the ground-truth bounding box
6. Save image + YOLO label

The result: 1,220 training images generated in a few minutes of compute time. Zero real-world photography required.

### What "Domain Randomization" Means

If you train on images that are *too* consistent, your model memorizes the training distribution instead of learning the underlying concept. It becomes fragile — works perfectly on training data, falls apart on anything slightly different.

The solution is *domain randomization*: deliberately vary everything that doesn't matter so the model is forced to learn what does matter (the gate shape and color).

Our randomization stack:

```python
# Domain randomization parameters (from generate_gate_data.py)
CAMERA_DISTANCE = (1, 10)     # meters from gate
APPROACH_ANGLE = (-50, 50)    # degrees from gate normal
BRIGHTNESS_DELTA = 0.3        # ±30% brightness variation
CONTRAST_DELTA = 0.3          # ±30% contrast variation
MOTION_BLUR_PROB = 0.4        # 40% chance of blur (simulates fast flight)
GAUSSIAN_NOISE_PROB = 0.3     # 30% chance of sensor noise
CHROMATIC_ABERR_PROB = 0.2    # 20% chance of lens aberration

# Gate colors (matching VQ1 LED specifications)
GATE_COLORS = ["neon_orange", "amber", "magenta", "cyan", "white"]

# Backgrounds
BACKGROUNDS = ["concrete", "grass", "wood", "metal", "dark"]
```

The motion blur was particularly important. A drone moving at race speed will see gates as streaked, smeared shapes. If the model has never seen a blurry gate, it won't recognize a real one.

---

## The Model: YOLOv8-nano

For detection, we used [YOLOv8-nano](https://docs.ultralytics.com) — the smallest member of the YOLO family. "Nano" isn't a pejorative; it's a deliberate architectural choice.

The constraint: **the detector runs on every frame, in real-time, during flight.** On whatever hardware the VQ1 platform provides (likely a small onboard computer), we have a budget measured in milliseconds. A larger model might be more accurate but too slow to be useful.

YOLOv8-nano has 3.01 million parameters and requires about 8.2 GFLOPs per inference — about 1/10th the compute of YOLOv8-medium. We fine-tuned it starting from COCO pretrained weights (so it already knew what "objects" look like) and specialized it on our synthetic gate images.

Training configuration:

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")  # COCO pretrained
model.train(
    data="data/synth_gates/dataset.yaml",
    epochs=40,
    batch=32,
    imgsz=320,          # small image size for speed
    optimizer="AdamW",
    patience=15,        # early stop if no improvement
    device="cuda",
)
```

Training took about 3 minutes on an RTX 3070. The model reached its best performance at **epoch 10** — fast convergence, which suggested the synthetic data was clean and consistent.

---

## First Results: Good and... also Good?

After training, we benchmarked the model on the held-out validation set (183 images, never seen during training):

| Metric | Value |
|--------|-------|
| mAP50 | **0.995** |
| mAP50-95 | 0.678 |
| Precision | 0.9994 |
| Recall | 1.000 |

mAP50 = 0.995. Nearly perfect. The model found gates.

But there's a subtlety hidden in that second row: **mAP50-95 = 0.678**. 

If you've seen computer vision benchmarks, you know that mAP comes in different flavors. mAP50 means "we count a detection as correct if it overlaps the true bounding box by at least 50%." mAP50-95 is stricter — it averages performance across overlap thresholds from 50% all the way up to 95% (in 5% steps).

0.678 isn't bad. But there's a gap between it and the mAP50 score of 0.995. That gap tells a story: **the model was great at finding gates, but imprecise about where exactly the gate boundary was.** It would draw a box that covered the gate, but the box might be slightly too big, or shifted a few pixels off-center.

For many applications, that's fine. For racing, it matters more — the policy network uses the detected bounding box to estimate the gate's center and distance. A sloppy box means a sloppy estimate means a slightly wrong flight path.

### Latency: The Other Metric That Matters

Detection accuracy is only half the story. The other half is speed.

We benchmarked the model on 640×480 input on the RTX 3070:

| Metric | Time |
|--------|------|
| Mean | 5.65ms |
| P50 | 5.59ms |
| **P95** | **6.07ms** |
| P99 | 6.44ms |
| Target | <10ms |

P95 latency of 6.07ms. We needed under 10ms. ✅

---

## The Insight: The Boxes Were Sloppy Because the Training Was Too Easy

After sitting with the 0.678 mAP50-95 for a bit, the reason became clear.

Every training image had one gate, perfectly visible, in a clean environment. The generator never put anything in front of the gate. It never put multiple gates in the same frame. It never asked the model to handle ambiguity.

As a result, the model learned: "find the glowing rectangle, draw a box around it." When the gate was 30% occluded by a pillar, the model had no training signal for that scenario. Its boxes would be drawn around the visible portion, not the full gate frame.

Real VQ1 flights will encounter:
- **Partial occlusion** — arena structure, other drones, the ground crew
- **Multiple gates** — at race speeds, the next gate appears in the frame before you've cleared the current one

The solution: make the training data harder.

---

## Dataset v2: Adding Occlusions and Multi-Gate Scenes

We extended the dataset two ways:

### Partial Occlusion (400 images)

Rather than re-rendering everything in PyBullet, we applied occlusion at the image level: take an existing image with a visible gate, paste a dark/neutral rectangle over part of the bounding box, and recompute the visible label.

```python
def apply_occlusion(image, bbox, occluder_colors):
    """Apply a random rectangular occluder to a gate bbox."""
    x1, y1, x2, y2 = bbox
    gate_w = x2 - x1
    gate_h = y2 - y1
    
    # Pick a random edge to occlude from
    edge = random.choice(["left", "right", "top", "bottom"])
    
    # Occlude 20-70% of the gate dimension
    occlusion_pct = random.uniform(0.2, 0.7)
    
    if edge == "left":
        occ_w = int(gate_w * occlusion_pct)
        occ_box = (x1, y1, x1 + occ_w, y2)
        new_bbox = (x1 + occ_w, y1, x2, y2)
    # ... similar for other edges
    
    # Draw the occluder
    color = random.choice(occluder_colors)  # dark/neutral palette
    draw_filled_rect(image, occ_box, color)
    
    # Drop label if >80% occluded
    visible_area = compute_bbox_area(new_bbox)
    original_area = compute_bbox_area(bbox)
    if visible_area / original_area < 0.2:
        return image, None  # hard negative
    
    return image, new_bbox
```

399 of 400 occluded images retained a valid label. 1 was fully occluded and treated as a hard negative (image with no gate label — useful for reducing false positives).

### Multi-Gate Scenes (300 images)

For multi-gate rendering, we went back to PyBullet: place 2–4 gates in the scene simultaneously, with one gate in the close foreground (1–6m) and additional gates further down the racing line (5–14m, ±2m lateral offset).

```python
def generate_multi_gate_scene(n_gates=3):
    """Render a scene with multiple gates at racing-line positions."""
    gates = []
    
    # Primary gate: close approach
    primary_gate = place_gate(distance=random.uniform(1, 6))
    gates.append(primary_gate)
    
    # Secondary gates: further down the racing line
    for i in range(n_gates - 1):
        secondary_gate = place_gate(
            distance=random.uniform(5, 14),
            lateral_offset=random.uniform(-2, 2),
            height_variance=random.uniform(-0.5, 0.5)
        )
        gates.append(secondary_gate)
    
    # Render all gates in frame
    image = render_scene(gates)
    
    # Label all visible gates (YOLO multi-instance format)
    labels = [compute_yolo_label(g) for g in gates if is_visible(g)]
    
    return image, labels
```

286 of 300 multi-gate scenes had 2+ visible gates, averaging 2.48 gates per frame.

### Final Dataset Stats

| Category | Count |
|----------|-------|
| Base (v0 copy) | 1,220 |
| Partial occlusion | 400 |
| Multi-gate scenes | 300 |
| **Total v2** | **1,920** |
| Train split | 1,536 |
| Val split | 384 |

Total generation time: 13 seconds.

---

## v1 Results: +30.7% on the Metric That Mattered

We retrained YOLOv8-nano on the v2 dataset and evaluated:

| Metric | v0 (1,220 imgs) | v1 (1,920 imgs) | Change |
|--------|-----------------|-----------------|--------|
| mAP50 | 0.995 | **0.995** | ±0 |
| mAP50-95 | 0.678 | **0.886** | **+0.208 (+30.7%)** |
| Precision | 0.9994 | **1.000** | +0.001 |
| Recall | 0.9928 | **0.9998** | +0.007 |
| P95 Latency | 6.07ms | **5.27ms** | -0.8ms |
| Best Epoch | 10 | 58 | — |
| Model Size | 17.6 MB | **5.9 MB** | -11.7 MB |

mAP50 stayed at 0.995 — it was already at ceiling. But mAP50-95 jumped from 0.678 to **0.886**.

The intuition for why: v0 was trained on easy, unambiguous images. The model could find the gate with loose bounding boxes and still score perfectly at the 50% IoU threshold. The augmented data forced it to be *precise*. When part of the gate is hidden, you can't just "draw around the glowing thing" — you have to reason about where the full gate frame actually is. That reasoning transferred into tighter bounding boxes across all scenarios.

Two other things worth noting:

**The model got faster.** P95 latency dropped from 6.07ms to 5.27ms despite training on 57% more data. This wasn't expected — our hypothesis is that more training led to a more compact weight distribution that's friendlier to GPU memory access patterns.

**The model got smaller.** 17.6 MB → 5.9 MB. This is counterintuitive (same architecture, same number of parameters), but it happens: YOLO's internal weight saving is sensitive to how well the model converges. A model that trained for 58 epochs to a clean solution saves with better compression than one that early-stopped at epoch 10.

---

## Where This Lives in the Larger System

The gate detector (now `gate_detector_v1.pt`) doesn't run standalone — it's a component in the larger perception pipeline that feeds our reinforcement learning policy.

The flow:

1. **Raw frame** (320×240 RGB) comes from the simulated or real camera
2. **YOLOv8-nano** detects gates and returns bounding boxes with confidence scores
3. **VisionObsWrapper** converts the best-confidence detection into a normalized gate-relative observation: `[gate_x_norm, gate_y_norm, gate_area_norm, confidence]`
4. **PPO policy** receives that observation (alongside telemetry: velocity, angular rates, position) and outputs motor commands

The policy never sees raw pixels. It sees a 4-dimensional summary of "where is the gate and how sure are we." This hybrid approach — computer vision for perception, RL for control — lets each component specialize. The YOLO model learns to see. The PPO policy learns to fly.

---

## What We Don't Know Yet

The detector was trained entirely on synthetic data. That's a pragmatic choice — we had no real data — but it introduces *sim-to-real transfer* risk. Will a model trained on PyBullet-rendered gates recognize actual LED gates in an actual arena?

We don't know yet. The VQ1 platform hasn't been released. When it drops, the first thing we'll do is run the detector on real gate images and check recall.

The VQ1 format promises "highlighted LED gates with visual aids" specifically designed to be machine-readable. If those visual aids match the color profiles we trained on (neon orange, amber, etc.), transfer might be easier than expected. If the platform uses a different gate design, we may need to retrain.

The good news: the data generation pipeline is fast. 1,920 images in 13 seconds. If we need to retrain on different gate specifications, we can regenerate in minutes.

---

## The Numbers

For those who want the full picture:

- **Dataset v0:** 1,220 images, 40-epoch training, 3 min on RTX 3070
- **Dataset v2:** 1,920 images, 60-epoch training, 4.5 min on RTX 3070
- **mAP50:** 0.995 (both versions — already maxed)
- **mAP50-95:** 0.678 → **0.886** (+30.7%)
- **P95 latency:** 6.07ms → **5.27ms** (640×480, RTX 3070)
- **Model size:** 17.6 MB → **5.9 MB**
- **Production model:** `gate_detector_v1.pt`

---

The vision system is one layer of the stack. The other layers — the reward function, the curriculum, the policy that actually decides how to fly — have their own stories. But this one felt worth telling. Computer vision for autonomous systems often gets treated as a solved problem: "just fine-tune YOLO." The interesting part is the *data*, and in domains where you have no real data, that means building a synthetic world careful enough that a model trained inside it can see the real one.

We'll find out if we succeeded when the gates light up.
