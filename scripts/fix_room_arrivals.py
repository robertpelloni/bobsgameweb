#!/usr/bin/env python3
"""
Fix arrival positions for hallway doors (TOWNYUUUpstairs -> rooms).
For each door in the hallway map we locate the *reverse* door in the
destination room (i.e., a door whose `destMap` is 'TOWNYUUUpstairs').
We then set the hallway door's `arrivalX` and `arrivalY` to that
reverse door's `x` and `y`, which represent the walkable tile where the
player should appear inside the room.

Only doors in TOWNYUUUpstairs (excluding the stairs) are touched – this
prevents the runaway cross‑map updates we saw in the earlier global
script.
"""

import json

DOOR_GRAPH = "data/door_graph.json"
HALLWAY_MAP = "TOWNYUUUpstairs"


def main():
    # Load the current graph
    dg = json.load(open(DOOR_GRAPH, "r", encoding="utf-8"))
    hallway_doors = dg.get(HALLWAY_MAP, [])
    if not hallway_doors:
        print(f"No doors found for {HALLWAY_MAP}. Exiting.")
        return

    changes = []
    for door in hallway_doors:
        # Skip the stairs door – we only want room doors
        if door["destMap"] == "TOWNYUUDownstairs":
            continue
        dest_map = door["destMap"]
        # Find the reverse door in the destination map that points back to the hallway
        reverse_candidates = [
            d for d in dg.get(dest_map, []) if d.get("destMap") == HALLWAY_MAP
        ]
        if not reverse_candidates:
            # No reverse door – nothing to sync
            continue
        # If there are multiple, pick the one whose name suggests the pair (optional)
        reverse = reverse_candidates[0]
        old_arrival = (door.get("arrivalX"), door.get("arrivalY"))
        new_arrival = (reverse["x"], reverse["y"])
        if old_arrival != new_arrival:
            changes.append((door["name"], old_arrival, new_arrival))
            door["arrivalX"], door["arrivalY"] = reverse["x"], reverse["y"]

    if not changes:
        print("All hallway arrival positions already consistent.")
        return

    # Show a concise diff
    print("Updating arrival positions for the following hallway doors:")
    for name, old, new in changes:
        print(f"  {name}: {old} -> {new}")

    # Backup current file just in case
    backup_path = DOOR_GRAPH + ".bak"
    with open(backup_path, "w", encoding="utf-8") as bf:
        json.dump(dg, bf, indent=2, ensure_ascii=False)
    # Write the updated graph
    with open(DOOR_GRAPH, "w", encoding="utf-8") as f:
        json.dump(dg, f, indent=2, ensure_ascii=False)
    print(f"door_graph.json updated (backup saved as {backup_path}).")


if __name__ == "__main__":
    main()
