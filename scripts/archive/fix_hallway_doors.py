#!/usr/bin/env python3
"""
Fix door coordinate mismatches for TOWNYUUUpstairs hallway.
The hallway door positions should match the reverse arrival positions from rooms.

This script updates door_graph.json to fix the hallway entry points.
"""

import json

DOOR_GRAPH_PATH = "data/door_graph.json"


def main():
    print("Loading door_graph.json...")
    dg = json.load(open(DOOR_GRAPH_PATH, "r", encoding="utf-8"))

    # Get hallway doors
    hallway = dg.get("TOWNYUUUpstairs", [])
    if not hallway:
        print("ERROR: No hallway doors found!")
        return

    print("Checking hallway door consistency...")
    changes_made = False

    for hdoor in hallway:
        if hdoor["destMap"] == "TOWNYUUDownstairs":
            # Skip stairs door
            continue

        room_name = hdoor["destMap"]
        room_doors = dg.get(room_name, [])

        # Find reverse door (room -> hallway)
        reverse = None
        for rd in room_doors:
            if rd["destMap"] == "TOWNYUUUpstairs":
                reverse = rd
                break

        if reverse:
            hallway_arrival = (reverse["arrivalX"], reverse["arrivalY"])
            current_pos = (hdoor["x"], hdoor["y"])

            if hallway_arrival != current_pos:
                print(f"Fixing {hdoor['name']} -> {room_name}:")
                print(f"  OLD hallway door: {current_pos}")
                print(f"  NEW hallway door: {hallway_arrival}")

                # Update the hallway door position
                hdoor["x"] = reverse["arrivalX"]
                hdoor["y"] = reverse["arrivalY"]
                changes_made = True
        else:
            print(f"ERROR: No reverse door for {room_name}")

    if changes_made:
        print("\nWriting updated door_graph.json...")
        with open(DOOR_GRAPH_PATH, "w", encoding="utf-8") as f:
            json.dump(dg, f, indent=2, ensure_ascii=False)
        print("DONE - door_graph.json updated!")
    else:
        print("No changes needed.")


if __name__ == "__main__":
    main()
