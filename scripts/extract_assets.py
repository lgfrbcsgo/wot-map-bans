"""
Extracts minimap images and icons from the game files.
Requires https://github.com/jindrapetrik/jpexs-decompiler to extract icons from SWF.
Requires https://github.com/lgfrbcsgo/wot-data-exporter mod to be installed and
the game language set to English.
"""

import argparse
import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from functools import reduce
from itertools import groupby
from os import path
from typing import Any, List
from zipfile import ZipFile

from PIL import Image


@dataclass
class Context:
    wot_dir: str
    out_dir: str
    ffdec_jar: str


def main(ctx: Context):
    if not path.exists(ctx.out_dir):
        os.makedirs(ctx.out_dir)

    exported_data = load_exported_data(ctx)

    arena_types = [
        arena_type
        for arena_type in exported_data["arena_types"].values()
        if is_arena_type_relevant(arena_type)
    ]

    def get_map_id(arena_type: Any):
        return arena_type["map_id"]

    arena_types_sorted = sorted(arena_types, key=get_map_id)
    arena_types_grouped = {
        mapd_id: merge_arena_types(arena_types)
        for mapd_id, arena_types in groupby(arena_types_sorted, get_map_id)
    }

    with open(path.join(ctx.out_dir, "maps.json"), "w") as f:
        json.dump(arena_types_grouped, f)

    for map_id in arena_types_grouped.keys():
        extract_minimap(ctx, map_id)

    extract_map_icons(ctx)


def load_exported_data(ctx: Context):
    exported_data_dir = path.join(ctx.wot_dir, "exported_data")

    def get_sort_key(file_name: str):
        parts = [int(part) for part in file_name.split(".") if part.isdigit()]
        return reduce(lambda acc, part: acc << 8 | part, parts)

    latest_export = max(os.listdir(exported_data_dir), key=get_sort_key)

    with open(path.join(exported_data_dir, latest_export), "r") as f:
        return json.load(f)


def is_arena_type_relevant(arena_type: Any):
    return arena_type["mode_id"] in ["ctf", "domination", "assault"] and \
        len(arena_type["team_bases"]) == 2 and len(arena_type["team_spawns"]) == 2


def merge_arena_types(arena_types: List[Any]):
    head, *tail = arena_types

    merged = {
        "name": head["map"],
        "modes": {
            head["mode_id"]: get_mode_params(head)
        }
    }

    for arena_type in tail:
        merged["modes"][arena_type["mode_id"]] = get_mode_params(arena_type)

    return merged


def get_bounding_box(arena_type: Any):
    bottom_left, top_right = arena_type["bounding_box"]
    return 1000 / (top_right[0] - bottom_left[0])


def get_mode_params(arena_type: Any):
    return {
        "team_bases": get_team_bases(arena_type),
        "team_spawns": get_team_spawns(arena_type),
        "neutral_bases": get_neutral_bases(arena_type),
    }


def get_team_bases(arena_type: Any):
    green, red = arena_type["team_bases"]
    return {
        "green": [make_coord(*xy, arena_type["bounding_box"]) for xy in green],
        "red": [make_coord(*xy, arena_type["bounding_box"]) for xy in red],
    }


def get_team_spawns(arena_type: Any):
    green, red = arena_type["team_spawns"]
    return {
        "green": [make_coord(*xy, arena_type["bounding_box"]) for xy in green],
        "red": [make_coord(*xy, arena_type["bounding_box"]) for xy in red],
    }


def get_neutral_bases(arena_type: Any):
    return [make_coord(*xy, arena_type["bounding_box"]) for xy in arena_type["neutral_bases"]]


def make_coord(x: float, y: float, bounding_box: Any):
    (min_x, min_y), (max_x, max_y) = bounding_box
    return {
        "x": (x - min_x) / (max_x - min_x) * 1000,
        "y": 1000 - (y - min_y) / (max_y - min_y) * 1000,
    }


def extract_minimap(ctx: Context, map_id: str):
    package_path = path.join(ctx.wot_dir, f"res/packages/{map_id}.pkg")
    with ZipFile(package_path, "r") as pkg:
        with pkg.open(f"spaces/{map_id}/mmap.dds", "r") as f:
            image = Image.open(f)
            image.save(path.join(ctx.out_dir, f"{map_id}.png"), "PNG")


def extract_map_icons(ctx: Context):
    icons_dir = path.join(ctx.out_dir, "icons")
    if not path.exists(icons_dir):
        os.makedirs(icons_dir)

    swf_path = path.join(icons_dir, "minimap.swf")

    package_path = path.join(ctx.wot_dir, "res/packages/gui-part1.pkg")
    with ZipFile(package_path, "r") as pkg, open(swf_path, "wb") as swf:
        with pkg.open("gui/flash/MinimapLobby.swf") as f:
            shutil.copyfileobj(f, swf)

    subprocess.run(
        ["java", "-jar", ctx.ffdec_jar, "-export", "image", icons_dir, swf_path],
        check=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--wot-dir', type=str)
    parser.add_argument('--out-dir', type=str)
    parser.add_argument('--ffdec-jar', type=str)

    args = parser.parse_args()
    main(Context(wot_dir=args.wot_dir, out_dir=args.out_dir, ffdec_jar=args.ffdec_jar))
