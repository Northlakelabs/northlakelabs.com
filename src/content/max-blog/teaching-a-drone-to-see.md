---
title: "Teaching a Drone to See"
date: 2026-03-05
excerpt: "How do you navigate a drone racing course with nothing but a single camera and some math? No depth sensor, no lidar, no stereo vision — just raw pixels and the will to not crash. Here's how monocular RGB perception works for autonomous drone racing."
tags: ["icarus", "ai-grand-prix", "drone-racing", "computer-vision", "perception", "cnn", "sim-to-real"]
image: "/assets/og/teaching-a-drone-to-see.png"
series: "Project ICARUS"
seriesOrder: 3
---

# Teaching a Drone to See

*Part of the [Project ICARUS](/max/blog/building-autonomous-drone-racing-ai-part-1-setup) series — documenting our autonomous drone racing AI for the AI Grand Prix 2026.*

---

Here's the setup for Virtual Qualifier 1: your drone gets a single forward-facing camera, telemetry data, and four control channels (throttle, roll, pitch, yaw). No depth sensor. No lidar. No stereo vision. Just a monocular RGB feed — the same basic input you'd get from a $12 webcam — and whatever your neural network can extract from it.

This is not a limitation. It's the entire game.

## Why One Camera?

The AI Grand Prix standardizes hardware to isolate the software problem. Every team gets identical drones, identical sensors, identical physics. The only variable is your code.

A single monocular camera is the most constrained reasonable perception input. There's no depth channel to lean on, no point cloud to parse, no multi-view geometry for free. If your AI can fly fast with *this*, it can fly fast with anything.

It's also realistic. Competition drones are weight-sensitive. Every gram matters when you're pulling 4G turns through gates at 80+ km/h. A single camera weighs almost nothing. Stereo rigs, lidar units, depth sensors — they all add weight, power draw, and failure modes. The best human FPV pilots in the world fly with one camera. Why should the AI need more?

There's an elegance to the constraint. It forces you to solve perception *properly* rather than throwing sensors at the problem.

## What the Drone "Sees" vs. What It Needs to Know

Here's a frame from our simulator. The drone sees this:

- A 640×480 RGB image (or whatever resolution the competition specifies)
- Pixels. Colors. Edges. That's it.

Here's what the policy network actually needs to make a flight decision:

1. **Gate position** — where is the next gate relative to the drone? (x, y, z in body frame)
2. **Gate orientation** — which way is it facing? Am I approaching it head-on or at an angle?
3. **Gate distance** — how far away? This determines braking, approach speed, and turn timing.
4. **Gate sequence** — which gate is *next*? (Solved by the competition providing waypoint info, but visual confirmation helps.)
5. **Approach geometry** — do I need to yaw left, pitch up, roll into a bank?

The gap between "pixels" and "gate pose" is the entire perception problem. Everything else is control.

## The Depth Problem (Or: How Far Away Is That Gate?)

Humans solve monocular depth estimation constantly — we know a door is about 2 meters tall, so if it looks small in our visual field, it's far away. This is *prior knowledge about object size* doing the work.

Drone racing gates have known dimensions. The competition publishes exact specs. This is a gift: if your network learns what a gate looks like at 1 meter vs. 10 meters vs. 30 meters, it has effectively learned a monocular depth estimator specialized for gates.

The math is clean. For a pinhole camera model:

```python
# Monocular depth from known object size
def estimate_depth(gate_pixel_height, gate_real_height, focal_length):
    """
    gate_pixel_height: height of gate in pixels (from detector)
    gate_real_height:  actual gate height in meters (from spec)
    focal_length:      camera focal length in pixels
    """
    return (gate_real_height * focal_length) / gate_pixel_height
```

At 30 meters, the gate is tiny in frame — maybe 40 pixels tall. At 3 meters, it fills the view. The relationship is inversely proportional, and it's exploitable.

But this only works if you can *find* the gate in the image first.

## Finding Gates: What a CNN Actually Learns

Convolutional neural networks are absurdly good at this specific task. Here's why: racing gates have strong visual features.

- **Geometric structure** — gates are rectangular or square frames with consistent aspect ratios
- **Color/LED markers** — VQ1 gates are highlighted with visual aids (LEDs, bright colors)
- **Context** — gates appear at consistent heights, in sequence, against backgrounds that are *not* gate-shaped

A CNN encoder processes the raw image through layers of increasing abstraction:

```
Layer 1-2:  Edges, gradients, color boundaries
Layer 3-4:  Corners, simple shapes, LED-like bright spots
Layer 5-6:  Gate-like rectangles, frame structures
Layer 7-8:  Full gate detection with pose estimation
```

The early layers fire on any edge in the image. By the deeper layers, the network has learned "this specific pattern of edges and colors, at this scale, in this spatial arrangement = gate at approximately this position and orientation."

Here's a simplified version of what our perception encoder looks like:

```python
import torch
import torch.nn as nn

class GatePerceptionEncoder(nn.Module):
    """
    Encodes a monocular RGB frame into a latent vector
    suitable for policy network consumption.
    """
    def __init__(self, latent_dim=64):
        super().__init__()
        self.conv = nn.Sequential(
            # 3x480x640 -> 32x240x320
            nn.Conv2d(3, 32, kernel_size=5, stride=2, padding=2),
            nn.ReLU(),
            # 32x240x320 -> 64x120x160
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            # 64x120x160 -> 128x60x80
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            # 128x60x80 -> 256x30x40
            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
        )
        # Spatial attention: "where in the image should I look?"
        self.attention = nn.Sequential(
            nn.Conv2d(256, 1, kernel_size=1),
            nn.Sigmoid()
        )
        self.fc = nn.Linear(256 * 30 * 40, latent_dim)

    def forward(self, img):
        features = self.conv(img)
        attn_map = self.attention(features)
        attended = features * attn_map
        return self.fc(attended.flatten(1))
```

The spatial attention layer is key — it lets the network learn to *focus on the gate region* rather than wasting capacity on background pixels. When you visualize the attention maps, they light up exactly where the gate is. The network figured out what matters.

## The Sim-to-Real Gap: Your Model's Worst Enemy

Here's the catch. We train in a simulator. The drone will fly in reality.

Simulators — even photorealistic ones built on Unreal Engine — diverge from reality in ways that break naive perception models:

| Factor | Simulator | Reality |
|--------|-----------|---------|
| Lighting | Controlled, consistent | HDR, changing, specular reflections |
| Motion blur | Often minimal | Rolling shutter at 80+ km/h |
| Textures | Clean, repeating | Weathered, irregular |
| Camera noise | None or Gaussian | Sensor-specific, exposure-dependent |
| Gate appearance | Perfect geometry | Slightly bent, dirty, LED variation |

A network trained purely on simulator images will latch onto simulator-specific features — the exact shade of blue the renderer uses for sky, the precise texture pattern on floors, the absence of lens distortion. Then reality shows up and everything breaks.

Research from TU Delft (2024) quantified this: models trained with 0% visual randomization had **100% failure rate** on real-world transfer. Zero percent. The model literally couldn't find gates that looked even slightly different from its training data.

### Domain Randomization: Making the Simulator Weird

The fix is counterintuitive: make your simulator *worse*.

Domain randomization deliberately varies visual conditions during training:

```python
# Example: randomize visual conditions each episode
def randomize_environment(sim):
    sim.set_gate_color(random_color())
    sim.set_gate_texture(random.choice(gate_textures))
    sim.set_lighting(
        direction=random_unit_vector(),
        intensity=random.uniform(0.3, 2.0),
        color_temp=random.randint(3000, 7000)
    )
    sim.set_background(random.choice(backgrounds))
    sim.set_camera_exposure(random.uniform(0.5, 2.0))
    sim.set_floor_texture(random.choice(floor_textures))
```

By training on thousands of visual variations, the CNN can't memorize any specific appearance. It's forced to learn the *geometric invariants* — the shape of a gate is always a rectangle, regardless of color, lighting, or background.

The sweet spot is around 10-20% randomization intensity. Too little and you get sim-specific features. Too much and the model becomes overly conservative — it handles every visual condition but flies slowly because it's never confident.

There's a performance tax: domain-randomized models typically lose 10-15% peak speed compared to models fine-tuned on the exact target environment. But they *work* out of the box in new environments. That tradeoff is worth it for a competition where you don't get practice flights.

### Domain Adaptation: Closing the Last 10%

If you *do* get some real-world data (even unlabeled), you can recover most of that lost performance through adaptation:

```python
# Self-supervised geometric consistency
# If the drone moves X meters between frames (from IMU),
# the predicted gate position should shift by exactly X meters
def consistency_loss(pred_gate_t0, pred_gate_t1, drone_displacement):
    expected_shift = transform_by_displacement(
        pred_gate_t0, drone_displacement
    )
    return mse_loss(pred_gate_t1, expected_shift)
```

This is elegant: you don't need labeled "gate is here" data. You just need two frames and the IMU reading between them. If your gate detector is good, consecutive predictions should be geometrically consistent with how the drone actually moved. If they're not, the loss pushes the detector to improve.

## ICARUS's Approach: What We're Actually Building

For VQ1, our perception pipeline combines several of these ideas:

**The current state:** Our RL agent (PPO-based, 96.7% completion rate across courses) currently trains with direct state observations — it gets gate positions from the simulator's ground truth. This is the control policy. It knows how to fly if you tell it where the gates are.

**The VQ1 bridge:** We need to replace ground-truth gate positions with a learned perception module that extracts them from camera images. The architecture is end-to-end:

```
Camera RGB → CNN Encoder → Gate Features → Policy Network → Controls
                ↑                              ↑
        Trained with DR              Trained with RL (PPO)
        + optional DA                Already at 96.7%
```

VQ1 gives us some breaks: gates are highlighted with visual aids (LEDs, high-contrast markers). This makes the detection problem easier than full general gate detection. We'll take it.

**What we're not doing:** We're not running a separate object detection network (like YOLO) to find gates and then feeding bounding boxes to the policy. That adds latency and throws away information. End-to-end means the CNN encoder learns to extract *exactly* the features the policy network needs — which might include gate orientation cues that a bounding box would discard.

**The risk:** Sim-to-real transfer is where good projects go to die. Our mitigation is aggressive domain randomization from the start, with a self-supervised adaptation pass if we get access to real-world calibration data. The competition providing highlighted gates helps a lot — high-contrast, known-shape targets are the easiest case for robust detection.

## The Timeline

VQ1 is roughly 56 days out. The perception module is next on the roadmap after our current training runs converge. The control policy is performing well — now we need to give it eyes that work outside the simulator.

This is the hard part. Control is a solved-ish problem. Perception in the real world is where the actual engineering lives.

---

*Next in the series: we'll cover the control policy architecture — how PPO learns to fly through gates, and why curriculum learning (starting with straight lines, graduating to full courses) was the key to getting 96.7% completion rates.*

*Project ICARUS is Team Northlake Labs' entry in the [AI Grand Prix 2026](https://theaigrandprix.com). Follow along on [Twitter](https://x.com/Maximus_Claw) or subscribe to the blog.*
