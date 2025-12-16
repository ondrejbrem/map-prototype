#!/usr/bin/env python3
"""
Convert schema-driven curriculum data into the node/edge format used by the map prototype.

Usage:
    python convert_schema_dataset.py --source data_final_rvp_zss_basic_20251111.json \
                                     --output compiled_schema.json
"""
import argparse
import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# -----------------------------------------------------------------------------
# Mapping configuration
# -----------------------------------------------------------------------------
@dataclass
class ChildLink:
    field: str                   # key on the current object that holds child items
    entity: str                  # name of the NodeRule to use for each child
    edge_type: str = "contains"  # edge label between parent and child

@dataclass
class NodeRule:
    type: str                    # visualization node type (area/topic/goal/etc.)
    label_field: str = "nazev"
    description_field: Optional[str] = "charakteristika"
    order_field: Optional[str] = None
    root: bool = False           # set True for top-level arrays in the source data
    children: List[ChildLink] = field(default_factory=list)

# Example setup – tweak/add entries to match the schema sections you care about
NODE_RULES: Dict[str, NodeRule] = {
    "vzdelavaciOblasti": NodeRule(
        type="areaCluster",
        root=True,
        children=[
            ChildLink(field="vzdelavaciObory", entity="vzdelavaciObory")
        ],
    ),
    "vzdelavaciObory": NodeRule(
        type="cluster",
        children=[
            ChildLink(field="tematickeOkruhy", entity="tematickeOkruhy")
        ],
    ),
    "tematickeOkruhy": NodeRule(
        type="area",
        children=[
            ChildLink(field="uzloveBody", entity="uzloveBody")
        ],
    ),
    "uzloveBody": NodeRule(
        type="topic",
        children=[
            ChildLink(field="ocekavaneVysledkyUceni", entity="ocekavaneVysledkyUceni")
        ],
    ),
    "ocekavaneVysledkyUceni": NodeRule(
        type="educationalGoal"
    ),           
    # Extend with zakladniGramotnosti / klicoveKompetence etc. as needed.
}

# -----------------------------------------------------------------------------
# Conversion implementation
# -----------------------------------------------------------------------------
@dataclass
class Node:
    id: str
    type: str
    label: str
    description: str = ""
    order: Optional[int] = None
    areaId: Optional[str] = None

@dataclass
class Edge:
    id: str
    type: str
    source: str
    target: str

class Converter:
    def __init__(self, rules: Dict[str, NodeRule]):
        self.rules = rules
        self.nodes: List[Node] = []
        self.edges: List[Edge] = []

    def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.nodes.clear()
        self.edges.clear()

        root_entities = [key for key, rule in self.rules.items() if rule.root]
        if not root_entities:
            raise ValueError("No root entities defined in NODE_RULES (set rule.root=True).")

        for key in root_entities:
            for item in payload.get(key, []):
                self._walk(entity_key=key, source_obj=item, parent_id=None, incoming_edge="contains")

        return {
            "metadata": {
                "version": "1.0",
                "description": "Compiled from schema dataset"
            },
            "nodes": [node.__dict__ for node in self.nodes],
            "edges": [edge.__dict__ for edge in self.edges],
            "clusters": self._build_area_clusters()
        }

    def _walk(self, entity_key: str, source_obj: Dict[str, Any], parent_id: Optional[str], incoming_edge: str):
        rule = self.rules.get(entity_key)
        if not rule:
            print(f"Warning: entity '{entity_key}' missing from NODE_RULES; skipping.")
            return

        node_id = self._stable_id(source_obj) or str(uuid.uuid4())
        label = source_obj.get(rule.label_field, f"Unnamed {rule.type}")
        node = Node(
            id=node_id,
            type=rule.type,
            label=label,
            description=source_obj.get(rule.description_field, "") if rule.description_field else "",
            order=source_obj.get(rule.order_field) if rule.order_field else None,
            areaId=parent_id if rule.type != "area" else node_id
        )
        self.nodes.append(node)

        if parent_id:
            edge_id = f"{parent_id}__{node_id}"
            self.edges.append(Edge(id=edge_id, type=incoming_edge, source=parent_id, target=node_id))

        for child in rule.children:
            for child_obj in source_obj.get(child.field, []):
                # Default behavior: attach child to the current node when using "contains",
                # otherwise bubble up to the parent relationship.
                target_parent = node_id if child.edge_type == "contains" else parent_id
                self._walk(child.entity, child_obj, target_parent or node_id, incoming_edge=child.edge_type)

    def _stable_id(self, obj: Dict[str, Any]) -> Optional[str]:
        for key in ("kod", "id"):
            if key in obj and obj[key]:
                return str(obj[key])
        return None

    def _build_area_clusters(self) -> List[Dict[str, Any]]:
        clusters: Dict[str, Dict[str, Any]] = {}
        for node in self.nodes:
            if node.type != "area":
                continue
            clusters[node.id] = {
                "id": f"cluster_{node.id}",
                "type": "cluster",
                "label": node.label,
                "areaId": node.id,
                "nodes": [node.id]
            }
        for node in self.nodes:
            if node.areaId and node.areaId in clusters and node.id not in clusters[node.areaId]["nodes"]:
                clusters[node.areaId]["nodes"].append(node.id)
        return list(clusters.values())

# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Compile schema dataset into visualization JSON.")
    parser.add_argument("--source", required=True, help="Path to schema-based dataset (e.g., data_final_*.json)")
    parser.add_argument("--output", required=True, help="Output path for the visualization-ready JSON")
    args = parser.parse_args()

    with open(args.source, encoding="utf-8") as fh:
        payload = json.load(fh)

    converter = Converter(NODE_RULES)
    compiled = converter.run(payload)

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(compiled, fh, ensure_ascii=False, indent=2)
    print(f"Written {len(compiled['nodes'])} nodes and {len(compiled['edges'])} edges to {args.output}")

if __name__ == "__main__":
    main()
